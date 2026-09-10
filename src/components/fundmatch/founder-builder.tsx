import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { BUSINESS_MODELS, GEOGRAPHIES, SECTORS, STAGES } from "@/lib/domain";
import { FounderProfileSchema, type FounderProfile } from "@/lib/founder-readiness";
import "./founder-readiness.css";

const steps = ["Company basics", "Your story", "Traction & raise"];

export function FounderBuilder({
  profile,
  onSave,
  onContinue,
  demo = false,
}: {
  profile: FounderProfile;
  onSave: (profile: FounderProfile) => Promise<void>;
  onContinue: () => void;
  demo?: boolean;
}) {
  const [draft, setDraft] = useState(profile);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const baseline = useRef(profile);
  useEffect(() => {
    const previous = baseline.current;
    if (JSON.stringify(previous) === JSON.stringify(profile)) return;
    // Preserve unsaved edits, while reflecting accepted suggestions / team changes
    // in fields the founder has not edited locally.
    setDraft(
      (current) =>
        Object.fromEntries(
          Object.entries(profile).map(([key, value]) => {
            const field = key as keyof FounderProfile;
            return [
              key,
              JSON.stringify(current[field]) === JSON.stringify(previous[field])
                ? value
                : current[field],
            ];
          }),
        ) as FounderProfile,
    );
    baseline.current = profile;
  }, [profile]);
  const form = useRef<HTMLFormElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  function change<K extends keyof FounderProfile>(key: K, value: FounderProfile[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
    setError("");
  }
  function move(next: number) {
    if (next > step && !form.current?.reportValidity()) return;
    setStep(next);
    setError("");
    requestAnimationFrame(() => title.current?.focus());
  }
  async function save(continueToMaterials = false) {
    const result = FounderProfileSchema.safeParse(draft);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check your profile details.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(result.data);
      setDraft(result.data);
      setSaved(true);
      if (continueToMaterials) onContinue();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Your profile could not be saved. Please retry.",
      );
    } finally {
      setSaving(false);
    }
  }
  function text(key: "name" | "tagline" | "website", label: string, max: number, required = false) {
    return (
      <label>
        {label}
        <input
          value={draft[key]}
          onChange={(e) => change(key, e.target.value)}
          maxLength={max}
          required={required}
          type={key === "website" ? "url" : "text"}
          autoComplete={key === "website" ? "url" : "off"}
        />
      </label>
    );
  }
  function select(
    key: "sector" | "stage" | "geography" | "businessModel",
    label: string,
    options: readonly string[],
  ) {
    const values = [...new Set([draft[key], ...options])].filter(Boolean);
    return (
      <label>
        {label}
        <select value={draft[key]} onChange={(e) => change(key, e.target.value)}>
          <option value="">Choose…</option>
          {values.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <section className="fm-founder-builder demo-card">
      <nav className="fm-builder-steps" aria-label="Profile steps">
        {steps.map((label, i) => (
          <button
            type="button"
            key={label}
            aria-current={step === i ? "step" : undefined}
            onClick={() => move(i)}
            disabled={saving}
          >
            <span>{i + 1}</span>
            {label}
          </button>
        ))}
      </nav>
      <div className="fm-builder-heading">
        <div>
          <span className="fm-kicker">STEP {step + 1} OF 3</span>
          <h2 ref={title} tabIndex={-1}>
            {steps[step]}
          </h2>
        </div>
        <span className="fm-chip">{saved ? "Saved" : "Draft"}</span>
      </div>
      <p>
        {
          [
            "Start with what you know. You can save an incomplete profile and come back.",
            "Explain who you help, why your approach works and who is building it.",
            "Use actual results. Leave unknown numbers blank; enter zero only when it is accurate.",
          ][step]
        }
      </p>
      <form
        ref={form}
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 2) move(step + 1);
          else void save(true);
        }}
      >
        <fieldset disabled={saving} className="demo-form fm-builder-fields">
          {step === 0 && (
            <>
              {text("name", "Company name", 120, true)}
              {text("tagline", "One-line story", 160)}
              {select("sector", "Sector", SECTORS)}
              {select("stage", "Stage", [...STAGES, "Growth", "Established"])}
              {select("geography", "Location", GEOGRAPHIES)}
              {select("businessModel", "Business model", [
                ...BUSINESS_MODELS,
                "Services",
                "Licensing",
              ])}
              {text("website", "Company website (optional)", 2000)}
            </>
          )}
          {step === 1 && (
            <>
              <label className="full">
                Company overview
                <textarea
                  value={draft.summary}
                  maxLength={2000}
                  rows={5}
                  placeholder="What problem do you solve, for which customers, and how do you make money?"
                  onChange={(e) => change("summary", e.target.value)}
                />
              </label>
              <label className="full">
                Team, market and funding plan
                <textarea
                  value={draft.story}
                  maxLength={4000}
                  rows={8}
                  placeholder={
                    "Team: Who is building this and why are you qualified?\nMarket: Who buys, and what evidence supports demand?\nUse of funds: What will the investment fund?\nMilestones: What will it let you achieve?"
                  }
                  onChange={(e) => change("story", e.target.value)}
                />
              </label>
              <label className="full">
                Tags (comma separated)
                <input
                  defaultValue={draft.tags.join(", ")}
                  maxLength={500}
                  onBlur={(e) =>
                    change(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              {(["revenue", "growth", "ask", "team"] as const).map((key) => (
                <label key={key}>
                  {
                    {
                      revenue: "Annual revenue (USD)",
                      growth: "Year-over-year growth (%)",
                      ask: "Funding sought (USD)",
                      team: "Team size",
                    }[key]
                  }
                  <input
                    type="number"
                    min={key === "growth" ? undefined : 0}
                    step={key === "team" ? 1 : "any"}
                    value={draft[key] ?? ""}
                    placeholder="Not provided"
                    onChange={(e) =>
                      change(key, e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </label>
              ))}
              <p className="full demo-note">
                Saving does not list your company or contact investors. Listing is a separate choice
                in Overview.
              </p>
            </>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="fm-builder-error">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="fm-builder-saved">
            <Check size={16} />
            {demo ? "Demo profile saved in this session." : "Company profile saved."}
          </p>
        )}
        <div className="fm-builder-actions">
          {step > 0 && (
            <button
              type="button"
              className="fm-button secondary"
              disabled={saving}
              onClick={() => move(step - 1)}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          <button
            type="button"
            className="fm-button secondary"
            disabled={saving}
            onClick={() => void save()}
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button type="submit" className="fm-button" disabled={saving}>
            {step === 2 ? "Save & add materials" : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}
