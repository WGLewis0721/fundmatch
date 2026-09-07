import { useEffect, useRef, useState } from "react";
import { Upload, FileCheck2, Sparkles } from "lucide-react";
import type {
  Confirmation,
  ConfirmedProfile,
  Extraction,
  IntelligenceGateway,
  InvestorPreferences,
} from "@/lib/intelligence/contracts";
import { IntelligenceError } from "@/lib/intelligence/contracts";
import { readDocument, validateDocumentFile } from "@/lib/intelligence/documents";
import { browserPdfReader } from "@/lib/intelligence/pdf-reader";
import { extractLiteral } from "@/lib/intelligence/extraction";
import { confirmExtraction, readinessSuggestions } from "@/lib/intelligence/review";
import { matchProfile } from "@/lib/intelligence/matching";
import "./profile-intelligence.css";
const label = (value: string) => value.replaceAll("_", " ");
/** Fable mounts with a scoped gateway + canonical profile. No document content enters browser storage. */
export function ProfileIntelligence({
  profileId,
  preferences,
  gateway,
  initialProfile,
  onConfirmed,
}: {
  profileId: string;
  preferences: InvestorPreferences;
  gateway?: IntelligenceGateway;
  initialProfile?: ConfirmedProfile;
  onConfirmed?: (profile: ConfirmedProfile) => void;
}) {
  const [profile, setProfile] = useState<ConfirmedProfile>(
    initialProfile ?? { id: profileId, version: 0, claims: [] },
  );
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const abort = useRef<AbortController | null>(null);
  const confirmation = useRef<Confirmation | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  function change() {
    confirmation.current = null;
    setNotice("");
  }
  async function upload(file: File) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError("");
    setNotice("");
    setExtraction(null);
    setSelected({});
    setValues({});
    setReasons({});
    confirmation.current = null;
    try {
      validateDocumentFile(file);
      const result = gateway
        ? await gateway.process(
            (await gateway.upload(file, controller.signal)).documentId,
            controller.signal,
          )
        : extractLiteral(await readDocument(file, browserPdfReader, controller.signal));
      if (controller.signal.aborted) return;
      setExtraction(result);
      setValues(Object.fromEntries(result.claims.map((c) => [c.id, c.value])));
      setNotice(`${result.claims.length} proposed claims. Nothing has been added to your profile.`);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof IntelligenceError
            ? e.message
            : "Could not process this document. No profile changes were made.",
        );
    } finally {
      if (abort.current === controller) {
        abort.current = null;
        setBusy(false);
      }
    }
  }
  async function confirm() {
    if (!extraction) return;
    setError("");
    setBusy(true);
    try {
      const input: Confirmation = confirmation.current ?? {
        extractionId: extraction.id,
        expectedVersion: profile.version,
        idempotencyKey: crypto.randomUUID(),
        decisions: extraction.claims.map((c) => ({
          claimId: c.id,
          action:
            selected[c.field] === c.id
              ? values[c.id] === c.value
                ? "accept"
                : "correct"
              : "reject",
          correctedValue: values[c.id] ?? "",
          reason: reasons[c.id] ?? "",
        })),
      };
      confirmation.current = input;
      const next = gateway
        ? await gateway.confirm(input)
        : confirmExtraction(extraction, input, profile, "local-session-reviewer");
      setProfile(next);
      setReviewed([]);
      setSelected({});
      confirmation.current = null;
      setNotice(
        gateway
          ? "Confirmed profile saved."
          : `Session profile updated to version ${next.version}. This profile is not saved to a server or browser storage.`,
      );
      onConfirmed?.(next);
    } catch (e) {
      setError(
        e instanceof IntelligenceError
          ? e.message
          : "Confirmation failed. Your profile has not been updated here. Retry or reload the current profile.",
      );
    } finally {
      setBusy(false);
    }
  }
  const match = matchProfile(profile, preferences);
  const suggestions = readinessSuggestions(profile);
  return (
    <section className="intelligence" aria-label="Profile intelligence">
      <ol className="intel-steps" aria-label="Profile building steps">
        {[
          { name: "Bring your evidence", text: "Upload a deck", icon: Upload },
          { name: "Make it yours", text: "Review sourced claims", icon: FileCheck2 },
          { name: "Find the fit", text: "Compare your thesis", icon: Sparkles },
        ].map((step, i) => (
          <li key={step.name}>
            <span className="intel-step-icon">
              <step.icon size={22} />
            </span>
            <div>
              <small>0{i + 1}</small>
              <strong>{step.name}</strong>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <article className="demo-card intel-upload">
        <div className="intel-icon">
          <Sparkles size={24} />
        </div>
        <h2>Your deck. A clearer profile.</h2>
        <p>
          Extract the evidence, review each claim, then choose what becomes part of your profile.
        </p>
        <p className="demo-note">
          {gateway
            ? "Connected workspace · AI proposals require your review."
            : "Local extraction · Session only · AI and private storage are not connected."}
        </p>
        {!gateway && (
          <p>
            PDF with selectable text or UTF-8 text, up to 10 MB / 60 pages. Local extraction
            recognizes labeled fields such as “Team:” and “Funding ask:”. Unlabeled content needs
            the AI service. Files stay in this tab and are cleared when you leave this screen.
          </p>
        )}
        <label className="intel-file">
          <Upload size={18} />
          <span>{busy ? "Processing…" : "Choose a deck"}</span>
          <input
            aria-label="Upload deck"
            type="file"
            accept=".pdf,.txt"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
        {busy && abort.current && (
          <button
            onClick={() => {
              abort.current?.abort();
              setBusy(false);
              setNotice("Processing cancelled.");
            }}
          >
            Cancel processing
          </button>
        )}
        {!gateway && (
          <button
            onClick={() =>
              setError(
                "AI extraction is unavailable. Fable must connect authenticated document storage and the server model adapter. Local extraction remains available.",
              )
            }
          >
            Check AI availability
          </button>
        )}
      </article>
      {error && (
        <div className="intel-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p role="status" className="intel-notice">
          {notice}
        </p>
      )}
      {extraction && (
        <article className="demo-card">
          <h2>Review extracted claims</h2>
          <p>
            {extraction.document.name} · {extraction.document.pages.length} page(s) ·{" "}
            {extraction.method === "literal" ? "Literal extraction" : "AI-assisted extraction"}
          </p>
          <p className="demo-note">
            Unknown: {extraction.missing.map(label).join(", ") || "None"}. Extracted does not mean
            verified. Selecting a claim confirms your reviewed value; it does not validate the
            document.
          </p>
          {extraction.warnings.map((w, i) => (
            <p className="intel-warning" key={i}>
              {w}
            </p>
          ))}
          <div className="intel-claims">
            {extraction.claims.map((c) => (
              <fieldset className="intel-claim" key={c.id}>
                <legend>
                  {label(c.field)} {c.conflict ? "· conflicting values" : ""}{" "}
                  {c.uncertainty === "ambiguous" ? "· uncertain" : ""}
                </legend>
                <label>
                  <input
                    type="radio"
                    name={c.field}
                    checked={selected[c.field] === c.id}
                    disabled={busy}
                    onChange={() => {
                      change();
                      setSelected((s) => ({ ...s, [c.field]: c.id }));
                    }}
                  />{" "}
                  Use this claim: {c.value}
                </label>
                <label>
                  Reviewed value
                  <input
                    aria-label={`Reviewed ${c.field} page ${c.page}`}
                    value={values[c.id] ?? ""}
                    disabled={busy}
                    maxLength={2000}
                    onChange={(e) => {
                      change();
                      setValues((s) => ({ ...s, [c.id]: e.target.value }));
                    }}
                  />
                </label>
                <label>
                  Reason for correction or conflict resolution
                  <input
                    aria-label={`Reason ${c.field} page ${c.page}`}
                    value={reasons[c.id] ?? ""}
                    disabled={busy}
                    maxLength={2000}
                    onChange={(e) => {
                      change();
                      setReasons((s) => ({ ...s, [c.id]: e.target.value }));
                    }}
                  />
                </label>
                <blockquote>“{c.quote}”</blockquote>
                <small>
                  {c.source.documentName} · Page {c.page}
                </small>
                <details>
                  <summary>Read source page</summary>
                  <pre>{extraction.document.pages.find((p) => p.number === c.page)?.text}</pre>
                  <small>SHA-256: {c.source.sha256}</small>
                </details>
              </fieldset>
            ))}
          </div>
          <button
            className="intel-primary"
            disabled={busy || !Object.keys(selected).length}
            onClick={() => void confirm()}
          >
            <FileCheck2 size={17} />
            {gateway ? "Confirm profile changes" : "Confirm session profile"}
          </button>
          <button
            disabled={busy}
            onClick={() => {
              change();
              setSelected({});
            }}
          >
            Clear selection
          </button>
          <p className="demo-note">
            Only selected claims update the profile. Unselected claims are excluded. Corrections and
            conflict resolutions require a reason.
          </p>
        </article>
      )}
      <article className="demo-card">
        <h2>
          Confirmed profile <span className="demo-note">Version {profile.version}</span>
        </h2>
        {!profile.claims.length ? (
          <p>No confirmed claims yet. Demo company metrics are never used to fill these gaps.</p>
        ) : (
          <dl className="intel-profile">
            {profile.claims.map((c) => (
              <div key={c.field}>
                <dt>{label(c.field)}</dt>
                <dd>
                  {c.value}
                  <small>
                    {c.citation.documentName} · Page {c.citation.page} · {c.uncertainty}
                    {c.correctionReason ? ` · Reviewer note: ${c.correctionReason}` : ""}
                  </small>
                  {c.correctionReason && <small>Original source value: {c.originalValue}</small>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </article>
      <div className="intel-columns">
        <article className="demo-card">
          <h2>Thesis comparison</h2>
          <p className="intel-score">{match.score === null ? "—" : `${match.score}/100`}</p>
          <p>Preference alignment · {match.coverage}% evidence coverage</p>
          <p className="demo-note">
            Not a funding probability. Unknown evidence earns no points.{" "}
            {match.eligible
              ? "No confirmed filter mismatch; unknowns still need review."
              : "One or more confirmed filters do not match."}
          </p>
          {match.criteria.map((c, i) => (
            <p key={i}>
              <strong>{c.status}: </strong>
              {c.detail}
              {c.citation && (
                <small>
                  {c.citation.documentName} · Page {c.citation.page}
                </small>
              )}
            </p>
          ))}
          {match.questions.length > 0 && (
            <>
              <h3>Questions to resolve</h3>
              <ul>
                {match.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </>
          )}
        </article>
        <article className="demo-card">
          <h2>Readiness suggestions</h2>
          <p>Evidence suggests a review, never automatic completion.</p>
          {!suggestions.length && <p>Confirm claims to see evidence-backed suggestions.</p>}
          {suggestions.map((s) => (
            <div className="intel-suggestion" key={s.id}>
              <h3>{s.title}</h3>
              <p>{s.explanation}</p>
              {s.evidence.map((e, i) => (
                <small key={i}>
                  {e.documentName} · Page {e.page}
                </small>
              ))}
              <button
                onClick={() => setReviewed((r) => [...r, s.id])}
                disabled={reviewed.includes(s.id)}
              >
                {reviewed.includes(s.id)
                  ? "Reviewed in this session"
                  : "Confirm suggestion for review"}
              </button>
              <small>
                Session acknowledgement only. Checklist persistence awaits the workspace backend.
              </small>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}
