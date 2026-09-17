import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { IntelligenceError } from "../intelligence/contracts";
import type { Claim, Extraction, SourceDocument } from "../intelligence/contracts";
import { readDocument } from "../intelligence/documents";
import { buildExtraction, literalCandidates } from "../intelligence/extraction";
import { openAIExtractor } from "../intelligence/openai.server";
import { serverPdfReader } from "../intelligence/pdf-reader";
import { chunkDocument, type DocumentChunk } from "./chunking";
import type { AgentContext, AgentRunEvent, AgentTask, AgentWorker } from "./contracts";
import {
  chunksToEvidence,
  readinessProposals,
  suggestionsFromExtraction,
  unsupportedFileReason,
  type ReadinessItemView,
  type SuggestionInput,
} from "./document-workflow";
import { createOpenAIEmbeddings, DEFAULT_EMBEDDING_MODEL } from "./openai-embeddings.server";
import { defaultWorkerInstructions, openAIModelWorker } from "./openai-worker.server";
import { AgentOrchestrator } from "./orchestrator";
import {
  archiveQueueMessage,
  readQueueMessages,
  releaseQueueMessage,
  sendQueueMessage,
} from "./queue.server";
import { initialTasksForWorkflow } from "./workflows";

export const WORKFLOW_VERSION = "agentic-v1";
const EMBEDDING_BATCH = 32;
const MAX_DELIVERIES = 3;
/** A run left `running` longer than this is assumed abandoned and reclaimable. */
const STALE_RUN_MS = 10 * 60 * 1000;

/** Terminal outcomes: never retried, always surfaced to the founder verbatim. */
export class DocumentProcessingError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DocumentProcessingError";
  }
}

export interface ProcessRunOutcome {
  runId: string;
  documentId: string | null;
  status: "processed" | "needs_review" | "failed" | "skipped";
  chunks: number;
  suggestions: number;
  errorCode?: string;
  message?: string;
}

interface DocumentRow {
  id: string;
  org_id: string;
  startup_id: string | null;
  storage_path: string;
  bucket: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: string;
  status: string;
}

/** Null when no provider key is configured, which the pipeline treats as "no model available" rather than as a failure. */
function modelConfig(): { apiKey: string; model: string } | null {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) return null;
  return { apiKey, model: process.env["FUNDMATCH_AGENT_MODEL"] ?? "gpt-4.1-mini" };
}

export function modelConfigured(): boolean {
  return modelConfig() !== null;
}

// ---------------------------------------------------------------------------
// Canonical state helpers
// ---------------------------------------------------------------------------

async function loadDocument(documentId: string): Promise<DocumentRow> {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select(
      "id, org_id, startup_id, storage_path, bucket, file_name, mime_type, size_bytes, kind, status",
    )
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw new Error(`Could not load document: ${error.message}`);
  if (!data)
    throw new DocumentProcessingError("DOCUMENT_MISSING", "The document no longer exists.");
  return data as DocumentRow;
}

async function setDocumentStatus(
  documentId: string,
  status: "processing" | "processed" | "failed",
  options: { error?: string; extraction?: Json } = {},
) {
  const { error } = await supabaseAdmin.rpc("set_document_processing", {
    _document_id: documentId,
    _status: status,
    _error: options.error,
    _extraction: options.extraction,
  });
  if (error) throw new Error(`Could not set document status: ${error.message}`);
}

async function finishRun(
  runId: string,
  status: "completed" | "needs_review" | "failed",
  patch: { errorCode?: string; metadata?: Record<string, Json> } = {},
) {
  const { data: current } = await supabaseAdmin
    .from("agent_runs")
    .select("metadata")
    .eq("id", runId)
    .maybeSingle();
  await supabaseAdmin
    .from("agent_runs")
    .update({
      status,
      error_code: patch.errorCode ?? null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        ...((current?.metadata as Record<string, Json>) ?? {}),
        ...(patch.metadata ?? {}),
      },
    })
    .eq("id", runId);
}

// ---------------------------------------------------------------------------
// Source text, chunks and embeddings
// ---------------------------------------------------------------------------

/** There is no OCR, PPTX, DOCX, spreadsheet or image extraction behind this. */
function assertProcessable(document: DocumentRow) {
  const reason = unsupportedFileReason(document.file_name);
  if (reason) throw new DocumentProcessingError("UNSUPPORTED_TYPE", reason);
}

async function downloadSource(document: DocumentRow): Promise<SourceDocument> {
  const { data, error } = await supabaseAdmin.storage
    .from(document.bucket)
    .download(document.storage_path);
  if (error || !data) {
    throw new DocumentProcessingError(
      "DOWNLOAD_FAILED",
      "The stored file could not be read. Re-upload the document and try again.",
    );
  }

  const blob = data;
  const source = await readDocument(
    {
      name: document.file_name,
      size: blob.size,
      type: document.mime_type,
      arrayBuffer: () => blob.arrayBuffer(),
    },
    serverPdfReader,
  );
  source.id = document.id;
  return source;
}

/**
 * Chunk writes are keyed by (org, source type, locator, content hash), so the
 * same source content always lands on the same rows. Reprocessing is a no-op.
 */
async function persistChunks(
  document: DocumentRow,
  source: SourceDocument,
  chunks: DocumentChunk[],
): Promise<void> {
  // Content is immutable once uploaded, but a re-uploaded file under the same
  // record must never leave chunks from the previous bytes behind.
  const { data: existing } = await supabaseAdmin
    .from("document_chunks")
    .select("id, metadata")
    .eq("document_id", document.id);
  const stale = (existing ?? []).filter(
    (row) => (row.metadata as { documentSha256?: string })?.documentSha256 !== source.sha256,
  );
  if (stale.length) {
    await supabaseAdmin
      .from("document_chunks")
      .delete()
      .in(
        "id",
        stale.map((row) => row.id),
      );
  }

  if (!chunks.length) return;
  const { error } = await supabaseAdmin.from("document_chunks").upsert(
    chunks.map((chunk) => ({
      org_id: document.org_id,
      startup_id: document.startup_id,
      document_id: document.id,
      source_type: "document" as const,
      source_locator: chunk.sourceLocator,
      content: chunk.content,
      content_sha256: chunk.contentSha256,
      metadata: {
        documentId: document.id,
        documentSha256: source.sha256,
        fileName: document.file_name,
        kind: document.kind,
        label: chunk.label,
        page: chunk.page,
        part: chunk.part,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
      },
    })),
    { onConflict: "org_id,source_type,source_locator,content_sha256", ignoreDuplicates: true },
  );
  if (error) throw new Error(`Could not persist document chunks: ${error.message}`);
}

/** Only chunks without a vector are queued, so redelivery cannot re-bill embeddings. */
async function enqueueMissingEmbeddings(document: DocumentRow, runId: string): Promise<number> {
  if (!modelConfigured()) return 0;

  const { data: chunks, error } = await supabaseAdmin
    .from("document_chunks")
    .select("id")
    .eq("document_id", document.id);
  if (error) throw new Error(`Could not inspect document chunks: ${error.message}`);

  const chunkIds = (chunks ?? []).map((row) => row.id);
  if (!chunkIds.length) return 0;
  const { data: embedded, error: embeddedError } = await supabaseAdmin
    .from("chunk_embeddings")
    .select("chunk_id")
    .in("chunk_id", chunkIds);
  if (embeddedError)
    throw new Error(`Could not inspect chunk embeddings: ${embeddedError.message}`);

  const done = new Set((embedded ?? []).map((row) => row.chunk_id));
  const pending = chunkIds.filter((id) => !done.has(id));
  for (let index = 0; index < pending.length; index += EMBEDDING_BATCH) {
    await sendQueueMessage("embeddings", {
      runId,
      organizationId: document.org_id,
      documentId: document.id,
      chunkIds: pending.slice(index, index + EMBEDDING_BATCH),
      workflowVersion: WORKFLOW_VERSION,
    });
  }
  return pending.length;
}

// ---------------------------------------------------------------------------
// Agent execution
// ---------------------------------------------------------------------------

async function recordStep(input: {
  runId: string;
  orgId: string;
  sequence: number;
  task: AgentTask;
  status: "completed" | "failed" | "needs_review";
  validationStatus?: string | null;
  output?: Record<string, Json>;
  modelName?: string | null;
  errorCode?: string | null;
}) {
  await supabaseAdmin.from("agent_steps").insert({
    run_id: input.runId,
    org_id: input.orgId,
    sequence: input.sequence,
    agent_type: input.task.agent,
    status: input.status,
    attempt: input.task.attempt,
    input_summary: {
      taskId: input.task.id,
      depth: input.task.depth,
      evidenceCount: input.task.evidence.length,
    },
    output_summary: input.output ?? {},
    validation_status: input.validationStatus ?? null,
    model_provider: input.modelName ? "openai" : null,
    model_name: input.modelName ?? null,
    prompt_version: WORKFLOW_VERSION,
    error_code: input.errorCode ?? null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });
}

/**
 * Runs the document worker over the document's own authorized chunks. The
 * evidence worker is registered so the orchestrator can delegate one bounded
 * follow-up when the document worker reports a conflict, which is the only
 * situation that justifies the extra model call.
 */
async function runDocumentAgent(input: {
  runId: string;
  document: DocumentRow;
  chunks: DocumentChunk[];
  triggeredBy: string | null;
}): Promise<{ status: "completed" | "needs_review" | "failed"; summary: string | null }> {
  const { runId, document, chunks } = input;
  const config = modelConfig();
  if (!config) return { status: "completed", summary: null };

  const evidence = chunksToEvidence({ documentId: document.id, chunks });
  if (!evidence.length) return { status: "completed", summary: null };

  const workers: AgentWorker[] = (["document", "evidence"] as const).map((agent) =>
    openAIModelWorker({
      id: agent,
      apiKey: config.apiKey,
      model: config.model,
      instructions: defaultWorkerInstructions(agent),
    }),
  );

  const context: AgentContext = {
    userId: input.triggeredBy ?? "",
    organizationId: document.org_id,
    subjectType: "document",
    subjectId: document.id,
    trigger: "document_uploaded",
    workflowVersion: WORKFLOW_VERSION,
  };

  let sequence = 0;
  const orchestrator = new AgentOrchestrator(workers, {
    maxTasks: 4,
    onEvent: async (event: AgentRunEvent) => {
      if (event.type !== "task_completed" && event.type !== "task_failed") return;
      sequence += 1;
      await recordStep({
        runId,
        orgId: document.org_id,
        sequence,
        task: event.task,
        status:
          event.type === "task_failed"
            ? "failed"
            : event.validation?.outcome === "needs_review"
              ? "needs_review"
              : "completed",
        validationStatus: event.validation?.outcome ?? null,
        output: {
          summary: event.result?.summary?.slice(0, 2000) ?? null,
          claims: event.result?.claims.length ?? 0,
          reasons: event.validation?.reasons.slice(0, 10) ?? [],
        },
        modelName: config.model,
        errorCode: event.error ? "AGENT_STEP_FAILED" : null,
      });
    },
  });

  const tasks = initialTasksForWorkflow({
    runId,
    trigger: "document_uploaded",
    payload: {
      documentKind: document.kind,
      fileName: document.file_name,
      instruction:
        "Summarize what this document evidences about the company and flag contradictions. Cite supplied evidence IDs only.",
    },
    evidence,
  });

  const result = await orchestrator.run(tasks, context);
  const summary = result.completed.find((entry) => entry.task.agent === "document")?.result.summary;
  return {
    status:
      result.status === "failed"
        ? "failed"
        : result.status === "needs_review"
          ? "needs_review"
          : "completed",
    summary: summary ?? null,
  };
}

/**
 * Field/value proposals stay quote-anchored: `buildExtraction` drops anything it
 * cannot find verbatim on the cited page. Without a provider key this falls back
 * to deterministic label reading, and the method is recorded either way so the
 * founder always knows what produced a suggestion.
 */
async function extractFields(source: SourceDocument): Promise<Extraction> {
  const config = modelConfig();
  if (!config) return buildExtraction(source, literalCandidates(source), "literal");
  return buildExtraction(source, await openAIExtractor(config).extract(source), "openai");
}

// ---------------------------------------------------------------------------
// Suggestion assembly
// ---------------------------------------------------------------------------

async function currentProfileValues(startupId: string): Promise<Record<string, string | null>> {
  const [{ data: profile }, { data: metrics }] = await Promise.all([
    supabaseAdmin
      .from("startup_profiles")
      .select(
        "name, tagline, summary, story, sector, stage, geography, website, business_model, funding_ask",
      )
      .eq("id", startupId)
      .maybeSingle(),
    supabaseAdmin
      .from("company_metrics")
      .select("metric_key, value_display")
      .eq("startup_id", startupId),
  ]);

  const values: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(profile ?? {})) {
    values[key] = value === null || value === undefined ? null : String(value);
  }
  for (const metric of metrics ?? []) {
    values[`metric:${metric.metric_key}`] = metric.value_display ?? null;
  }
  return values;
}

async function readinessViews(
  startupId: string,
): Promise<Array<{ template: "vc" | "pe"; items: ReadinessItemView[] }>> {
  const { data } = await supabaseAdmin
    .from("readiness_items")
    .select("template, item_key, title, category, status")
    .eq("startup_id", startupId);

  const grouped = new Map<"vc" | "pe", ReadinessItemView[]>();
  for (const row of data ?? []) {
    const template = row.template as "vc" | "pe";
    if (template !== "vc" && template !== "pe") continue;
    const list = grouped.get(template) ?? [];
    list.push({
      itemKey: row.item_key,
      title: row.title,
      category: row.category,
      status: row.status as string,
    });
    grouped.set(template, list);
  }
  return [...grouped].map(([template, items]) => ({ template, items }));
}

async function persistSuggestions(
  document: DocumentRow,
  runId: string,
  items: SuggestionInput[],
): Promise<number> {
  if (!items.length) return 0;
  const { data, error } = await supabaseAdmin.rpc("record_document_suggestions", {
    _document_id: document.id,
    _run_id: runId,
    _items: items as unknown as Json,
  });
  if (error) throw new Error(`Could not record suggestions: ${error.message}`);
  return data ?? 0;
}

// ---------------------------------------------------------------------------
// Run execution
// ---------------------------------------------------------------------------

/**
 * Processes one durable run. Safe to call concurrently and repeatedly: the run
 * is claimed with a conditional update, and every write below is keyed so that
 * redelivery converges instead of duplicating.
 */
export async function processDocumentRun(runId: string): Promise<ProcessRunOutcome> {
  const { data: run, error: runError } = await supabaseAdmin
    .from("agent_runs")
    .select("id, org_id, subject_id, subject_type, status, triggered_by, started_at, metadata")
    .eq("id", runId)
    .maybeSingle();
  if (runError) throw new Error(`Could not load agent run: ${runError.message}`);
  if (!run) return { runId, documentId: null, status: "skipped", chunks: 0, suggestions: 0 };
  if (run.subject_type !== "document") {
    return { runId, documentId: null, status: "skipped", chunks: 0, suggestions: 0 };
  }

  // Claim the run. Only a queued run, or one abandoned mid-flight, may be taken.
  const claimable =
    run.status === "queued" ||
    (run.status === "running" &&
      Date.now() - new Date(run.started_at ?? 0).getTime() > STALE_RUN_MS);
  if (!claimable) {
    return { runId, documentId: run.subject_id, status: "skipped", chunks: 0, suggestions: 0 };
  }
  const { data: claimed } = await supabaseAdmin
    .from("agent_runs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("status", run.status)
    .select("id");
  if (!claimed?.length) {
    return { runId, documentId: run.subject_id, status: "skipped", chunks: 0, suggestions: 0 };
  }

  const documentId = run.subject_id;
  let chunkCount = 0;

  try {
    const document = await loadDocument(documentId);

    // Authorization is re-derived from canonical state; the queue payload is
    // only ever a pointer.
    if (document.org_id !== run.org_id) {
      throw new DocumentProcessingError(
        "ORG_MISMATCH",
        "This document belongs to a different organization.",
      );
    }
    if (document.status === "pending") {
      throw new DocumentProcessingError("NOT_UPLOADED", "The upload never completed.");
    }
    if (!document.startup_id) {
      throw new DocumentProcessingError(
        "NO_COMPANY",
        "Link this document to your company profile so suggestions have somewhere to go.",
      );
    }
    assertProcessable(document);

    await setDocumentStatus(documentId, "processing");

    const source = await downloadSource(document);
    const chunks = await chunkDocument(source);
    chunkCount = chunks.length;
    if (!chunks.length) {
      throw new DocumentProcessingError(
        "NO_TEXT",
        "No readable text was found in this document, so there is nothing to analyze.",
      );
    }
    await persistChunks(document, source, chunks);
    const queuedEmbeddings = await enqueueMissingEmbeddings(document, runId);

    const agentOutcome = await runDocumentAgent({
      runId,
      document,
      chunks,
      triggeredBy: run.triggered_by,
    });

    const extraction = await extractFields(source);
    const sourceKey =
      extraction.method === "openai" ? "fundmatch_document_agent" : "fundmatch_literal";
    const currentValues = await currentProfileValues(document.startup_id);

    const proposals: SuggestionInput[] = suggestionsFromExtraction({
      extraction,
      currentValues,
      sourceKey,
    });

    // Readiness runs off the same anchored claims, and only for checklists the
    // founder has already created.
    const claims: Claim[] = extraction.claims;
    for (const view of await readinessViews(document.startup_id)) {
      proposals.push(
        ...readinessProposals({
          template: view.template,
          items: view.items,
          claims,
          documentKind: document.kind,
          sourceKey,
        }),
      );
    }

    await recordStep({
      runId,
      orgId: document.org_id,
      sequence: 90,
      task: {
        id: `${runId}:readiness`,
        runId,
        agent: "readiness",
        attempt: 1,
        depth: 0,
        payload: {},
        evidence: [],
      },
      status: "completed",
      validationStatus: "valid",
      output: {
        method: "deterministic-rules",
        proposals: proposals.filter((item) => item.fieldKey.startsWith("readiness:")).length,
      },
    });

    const recorded = await persistSuggestions(document, runId, proposals);

    const needsReview =
      agentOutcome.status === "needs_review" || claims.some((claim) => claim.conflict);

    await setDocumentStatus(documentId, "processed", {
      extraction: {
        method: extraction.method,
        workflowVersion: WORKFLOW_VERSION,
        chunks: chunks.length,
        claims: claims.length,
        suggestions: recorded,
        queuedEmbeddings,
        warnings: extraction.warnings.slice(0, 10),
        summary: agentOutcome.summary?.slice(0, 4000) ?? null,
        documentSha256: source.sha256,
      },
    });

    await finishRun(runId, needsReview ? "needs_review" : "completed", {
      metadata: {
        chunks: chunks.length,
        suggestions: recorded,
        extractionMethod: extraction.method,
        queuedEmbeddings,
      },
    });

    return {
      runId,
      documentId,
      status: needsReview ? "needs_review" : "processed",
      chunks: chunks.length,
      suggestions: recorded,
    };
  } catch (error) {
    const terminal =
      error instanceof DocumentProcessingError || error instanceof IntelligenceError ? error : null;
    const code = terminal?.code ?? "PROCESSING_ERROR";
    const message = terminal
      ? terminal.message
      : "Analysis could not be completed. The document was not changed.";

    if (terminal) {
      // Authorization, unsupported content and invalid relationships must never
      // be retried: they would burn model calls without any chance of success.
      await setDocumentStatus(documentId, "failed", { error: message }).catch(() => {});
      await finishRun(runId, "failed", { errorCode: code });
      return {
        runId,
        documentId,
        status: "failed",
        chunks: chunkCount,
        suggestions: 0,
        errorCode: code,
        message,
      };
    }

    // Transient: hand the run back so a later delivery can retry it.
    await supabaseAdmin
      .from("agent_runs")
      .update({ status: "queued", error_code: code, updated_at: new Date().toISOString() })
      .eq("id", runId);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Queue draining
// ---------------------------------------------------------------------------

export async function drainDocumentQueue(limit = 3): Promise<ProcessRunOutcome[]> {
  const messages = await readQueueMessages<{ runId?: string }>("agent_runs", { quantity: limit });
  const outcomes: ProcessRunOutcome[] = [];

  for (const message of messages) {
    const runId = message.message?.runId;
    if (!runId) {
      await archiveQueueMessage("agent_runs", message.msgId);
      continue;
    }
    try {
      outcomes.push(await processDocumentRun(runId));
      await archiveQueueMessage("agent_runs", message.msgId);
    } catch (error) {
      if (message.readCount >= MAX_DELIVERIES) {
        // Dead-letter: stop redelivering and leave the failure visible on both
        // the run and the document the founder is watching.
        await archiveQueueMessage("agent_runs", message.msgId);
        const { data: run } = await supabaseAdmin
          .from("agent_runs")
          .select("subject_id")
          .eq("id", runId)
          .maybeSingle();
        await finishRun(runId, "failed", { errorCode: "RETRIES_EXHAUSTED" });
        if (run?.subject_id) {
          await setDocumentStatus(run.subject_id, "failed", {
            error: "Analysis kept failing and was stopped. Try uploading the document again.",
          }).catch(() => {});
        }
        outcomes.push({
          runId,
          documentId: run?.subject_id ?? null,
          status: "failed",
          chunks: 0,
          suggestions: 0,
          errorCode: "RETRIES_EXHAUSTED",
          message: error instanceof Error ? error.message : String(error),
        });
      } else {
        await releaseQueueMessage("agent_runs", message.msgId);
      }
    }
  }

  return outcomes;
}

/**
 * Backstop for work the queue never delivered: an upload callback that never
 * arrived, a lost message, or a deployment without pgmq installed. The run
 * ledger is the source of truth, so this converges with the queue path.
 */
export async function sweepPendingRuns(limit = 3): Promise<ProcessRunOutcome[]> {
  const { data: uploaded } = await supabaseAdmin
    .from("documents")
    .select("id")
    .eq("status", "uploaded")
    .order("created_at", { ascending: true })
    .limit(limit);

  for (const document of uploaded ?? []) {
    const { error } = await supabaseAdmin.rpc("start_document_run", { _document_id: document.id });
    if (error) console.error(`[agentic] could not queue ${document.id}: ${error.message}`);
  }

  const { data: queued } = await supabaseAdmin
    .from("agent_runs")
    .select("id")
    .eq("status", "queued")
    .eq("subject_type", "document")
    .order("created_at", { ascending: true })
    .limit(limit);

  const outcomes: ProcessRunOutcome[] = [];
  for (const run of queued ?? []) {
    try {
      outcomes.push(await processDocumentRun(run.id));
    } catch (error) {
      console.error(`[agentic] run ${run.id} failed:`, error);
    }
  }
  return outcomes;
}

export async function drainEmbeddingQueue(limit = 5): Promise<number> {
  const config = modelConfig();
  if (!config) return 0;
  const messages = await readQueueMessages<{ chunkIds?: string[]; organizationId?: string }>(
    "embeddings",
    { quantity: limit },
  );
  let embedded = 0;

  for (const message of messages) {
    const chunkIds = message.message?.chunkIds ?? [];
    if (!chunkIds.length) {
      await archiveQueueMessage("embeddings", message.msgId);
      continue;
    }
    try {
      const { data: chunks, error } = await supabaseAdmin
        .from("document_chunks")
        .select("id, org_id, content")
        .in("id", chunkIds);
      if (error) throw new Error(error.message);

      const pending = chunks ?? [];
      if (pending.length) {
        const result = await createOpenAIEmbeddings(
          pending.map((chunk) => chunk.content),
          {
            apiKey: config.apiKey,
            model: process.env["FUNDMATCH_EMBEDDING_MODEL"] ?? DEFAULT_EMBEDDING_MODEL,
          },
        );
        const { error: upsertError } = await supabaseAdmin.from("chunk_embeddings").upsert(
          pending.map((chunk, index) => ({
            chunk_id: chunk.id,
            org_id: chunk.org_id,
            embedding_model: result.model,
            embedding_dimensions: result.dimensions,
            embedding: JSON.stringify(result.vectors[index]),
            embedded_at: new Date().toISOString(),
          })),
          { onConflict: "chunk_id" },
        );
        if (upsertError) throw new Error(upsertError.message);
        embedded += pending.length;
      }
      await archiveQueueMessage("embeddings", message.msgId);
    } catch (error) {
      if (message.readCount >= MAX_DELIVERIES) {
        await archiveQueueMessage("embeddings", message.msgId);
        console.error("[agentic] embedding batch exhausted retries:", error);
      } else {
        await releaseQueueMessage("embeddings", message.msgId);
      }
    }
  }

  return embedded;
}

export interface DrainSummary {
  runs: ProcessRunOutcome[];
  embeddedChunks: number;
}

/** One operational pass: queued runs first, then the embedding backlog. */
export async function drainAgenticWork(options: { limit?: number } = {}): Promise<DrainSummary> {
  const limit = options.limit ?? 3;
  const runs = await drainDocumentQueue(limit);
  if (runs.length < limit) {
    runs.push(...(await sweepPendingRuns(limit - runs.length)));
  }
  const embeddedChunks = await drainEmbeddingQueue(limit + 2);
  return { runs, embeddedChunks };
}
