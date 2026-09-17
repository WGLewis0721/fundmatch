import { defineEventHandler } from "h3";
import { drainAgenticWork } from "@/lib/agentic/document-pipeline.server";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Stable HTTP entry point for Vercel Cron.
 *
 * Vercel invokes cron paths with GET and, when CRON_SECRET is configured,
 * sends Authorization: Bearer <CRON_SECRET>. The actual queue/run semantics
 * stay in drainAgenticWork; this route is only the authenticated transport.
 */
export default defineEventHandler(async (event) => {
  const denied = await authenticateCronRequest(event.req);
  if (denied) return denied;

  const summary = await drainAgenticWork({ limit: 5 });
  return {
    processed: summary.runs.filter((run) => run.status !== "skipped").length,
    failed: summary.runs.filter((run) => run.status === "failed").length,
    embeddedChunks: summary.embeddedChunks,
  };
});
