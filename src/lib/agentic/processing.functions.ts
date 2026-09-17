import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * Server functions for the queued document pipeline.
 *
 * This module ships to the client bundle, so every server-only dependency
 * (service-role Supabase client, model adapters, pgmq helpers) is imported
 * dynamically inside a handler and never at the top level.
 */

const RequestAnalysisSchema = z.object({ documentId: z.string().uuid() });

/** Carries the caller's Supabase session to the server function request. */
const withAccessToken = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return next(token ? { headers: { Authorization: `Bearer ${token}` } } : {});
});

async function requireMember(orgId: string): Promise<string> {
  const request = getRequest();
  const authHeader = request?.headers.get("authorization") ?? "";
  const token = /^Bearer (.+)$/.exec(authHeader)?.[1];
  if (!token || token.split(".").length !== 3) {
    throw new Error("Sign in to request document analysis.");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("The backend is not configured for server-side analysis.");

  // Deliberately a user-scoped client: membership is proven by RLS returning the
  // row, not by anything the caller sent us.
  const userClient = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claims?.claims?.sub)
    throw new Error("Your session has expired. Sign in again.");

  const { data: membership, error } = await userClient
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", claims.claims.sub)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!membership) throw new Error("This document belongs to another organization.");

  return claims.claims.sub as string;
}

/**
 * Starts (or joins) the durable run for one uploaded document and then drains a
 * bounded amount of queued work. The browser does not need to stay connected:
 * the run and its queue message outlive the request, and the operational drain
 * picks up anything left behind.
 */
export const requestDocumentAnalysis = createServerFn({ method: "POST" })
  .middleware([withAccessToken])
  .validator((input: unknown) => RequestAnalysisSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: document, error } = await supabaseAdmin
      .from("documents")
      .select("id, org_id, status")
      .eq("id", data.documentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!document) throw new Error("That document no longer exists.");

    const userId = await requireMember(document.org_id);
    if (document.status === "pending") throw new Error("The upload has not finished yet.");

    const { data: runId, error: runError } = await supabaseAdmin.rpc("start_document_run", {
      _document_id: document.id,
      _triggered_by: userId,
    });
    if (runError) throw new Error(runError.message);

    const { drainAgenticWork } = await import("./document-pipeline.server");
    const summary = await drainAgenticWork({ limit: 2 });

    return {
      runId: runId as string,
      processed: summary.runs.filter((run) => run.status !== "skipped").length,
      embeddedChunks: summary.embeddedChunks,
    };
  });

/**
 * Operational drain for scheduled execution. Authenticated with the cron bearer
 * secret rather than a user session, and scoped to nothing in particular: it
 * advances whatever durable work is outstanding.
 */
export const runAgenticWorker = createServerFn({ method: "POST" }).handler(async () => {
  const request = getRequest();
  if (!request) throw new Error("No request context available.");

  const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
  const denied = await authenticateCronRequest(request);
  if (denied) throw new Error("Unauthorized");

  const { drainAgenticWork } = await import("./document-pipeline.server");
  const summary = await drainAgenticWork({ limit: 5 });
  return {
    processed: summary.runs.filter((run) => run.status !== "skipped").length,
    failed: summary.runs.filter((run) => run.status === "failed").length,
    embeddedChunks: summary.embeddedChunks,
  };
});
