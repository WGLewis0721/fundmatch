/**
 * Backend configuration for the authenticated application.
 *
 * The public GitHub Pages demo is built without these variables and never
 * touches Supabase. The authenticated app (`/app`) requires them and shows a
 * clear "not configured" state instead of crashing when they are absent.
 */
export const BACKEND_URL: string | undefined =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) || undefined;
export const BACKEND_KEY: string | undefined =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) || undefined;

export const backendConfigured = Boolean(BACKEND_URL && BACKEND_KEY);

/** Human-readable error text for UI states. Never leaks credentials. */
export function describeError(error: unknown): string {
  if (!error) return "Something went wrong.";
  if (typeof error === "string") return error;
  const e = error as { message?: unknown; error_description?: unknown; details?: unknown };
  const message =
    (typeof e.message === "string" && e.message) ||
    (typeof e.error_description === "string" && e.error_description) ||
    "Something went wrong.";
  if (/row-level security/i.test(message)) return "You don't have access to that record.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(message))
    return "We couldn't reach the FundMatch backend. Check your connection and try again.";
  return message;
}

export const DOCUMENT_MIME_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "text/csv": "CSV",
  "text/plain": "Text",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
};
export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;
export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_MIME_TYPES).join(",");

/** Client-side validation that mirrors the database and bucket constraints. */
export function validateDocument(file: File): string | null {
  if (!file.name || file.name.length > 200 || /[/\\]/.test(file.name))
    return "Use a file name under 200 characters without slashes.";
  if (file.size <= 0) return "This file is empty.";
  if (file.size > DOCUMENT_MAX_BYTES) return "Files must be 25 MB or smaller.";
  if (!DOCUMENT_MIME_TYPES[file.type])
    return "Upload a PDF, PowerPoint, Word, Excel, CSV, text, PNG or JPEG file.";
  return null;
}
