import { ConfirmationSchema, IntelligenceError } from "./contracts";
import type { Confirmation, ConfirmedProfile, Extraction, Extractor } from "./contracts";
import { readDocument } from "./documents";
import type { PdfTextReader } from "./documents";
import { buildExtraction } from "./extraction";
import { confirmExtraction } from "./review";
/** Must be derived from verified server authentication, never request JSON. */
export interface WorkspaceContext {
  userId: string;
  organizationId: string;
  companyId: string;
}
/** Fable owns implementation and storage schema. Every method MUST scope all three context IDs. */
export interface IntelligenceRepository {
  requireEditor(context: WorkspaceContext): Promise<void>;
  readDocument(
    context: WorkspaceContext,
    id: string,
  ): Promise<Pick<File, "name" | "size" | "type" | "arrayBuffer">>;
  saveExtraction(context: WorkspaceContext, extraction: Extraction): Promise<void>;
  readExtraction(context: WorkspaceContext, id: string): Promise<Extraction>;
  readProfile(context: WorkspaceContext): Promise<ConfirmedProfile>;
  /** Return original result for an identical retry; reject reused key with different payload. */
  findConfirmation(
    context: WorkspaceContext,
    input: Confirmation,
  ): Promise<ConfirmedProfile | null>;
  /** Atomic compare-and-swap + idempotency + audit. Reject changed version or mismatched company. */
  commitConfirmation(
    context: WorkspaceContext,
    input: Confirmation,
    profile: ConfirmedProfile,
  ): Promise<ConfirmedProfile>;
}
export function intelligenceService(
  repo: IntelligenceRepository,
  pdf: PdfTextReader,
  extractor: Extractor,
) {
  return {
    async process(context: WorkspaceContext, documentId: string, signal?: AbortSignal) {
      await repo.requireEditor(context);
      if (!documentId.trim())
        throw new IntelligenceError("INVALID_DOCUMENT", "A document ID is required.");
      const file = await repo.readDocument(context, documentId);
      const doc = await readDocument(file, pdf, signal);
      doc.id = documentId;
      const result = buildExtraction(doc, await extractor.extract(doc, signal), "openai");
      await repo.saveExtraction(context, result);
      return result;
    },
    async confirm(context: WorkspaceContext, input: Confirmation) {
      await repo.requireEditor(context);
      const request = ConfirmationSchema.parse(input);
      const prior = await repo.findConfirmation(context, request);
      if (prior) return prior;
      const extraction = await repo.readExtraction(context, request.extractionId);
      const current = await repo.readProfile(context);
      const profile = confirmExtraction(extraction, request, current, context.userId);
      return repo.commitConfirmation(context, request, profile);
    },
  };
}
