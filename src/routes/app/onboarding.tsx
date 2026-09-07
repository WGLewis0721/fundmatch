import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { AuthCard, FormError, RequireSession } from "@/components/fundmatch/app-shell";
import { useAuth } from "@/lib/auth";
import { useCreateOrganization, useWorkspace } from "@/lib/app-queries";
import { describeError } from "@/lib/backend";

export const Route = createFileRoute("/app/onboarding")({ component: Onboarding });

function Onboarding() {
  return (
    <RequireSession>
      <OnboardingForm />
    </RequireSession>
  );
}

function OnboardingForm() {
  const { signOut } = useAuth();
  const ws = useWorkspace();
  const create = useCreateOrganization();
  const navigate = useNavigate();
  const [type, setType] = useState<"startup" | "investment_firm">("startup");
  const [error, setError] = useState<string | null>(null);
  const hasOrg = (ws.data?.memberships.length ?? 0) > 0;
  return (
    <AuthCard
      kicker={hasOrg ? "NEW ORGANIZATION" : "STEP 2 OF 2"}
      title={hasOrg ? "Create another organization." : "Set up your organization."}
      lead="A company gets a founder workspace with profile, readiness checklist and private materials. An investment firm gets discovery, thesis matching and a pipeline. You become the owner and can invite teammates by email."
      footer={
        <>
          {hasOrg && (
            <>
              <Link to="/app">Back to your workspace</Link> ·{" "}
            </>
          )}
          Got an invitation link? Open it while signed in. ·{" "}
          <button className="demo-link" onClick={() => void signOut()}>
            Sign out
          </button>
        </>
      }
    >
      <form
        className="demo-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setError(null);
          try {
            await create.mutateAsync({
              name: String(f.get("name")).trim(),
              type,
              website: String(f.get("website") || "").trim(),
              description: String(f.get("description") || "").trim(),
            });
            void navigate({ to: "/app", replace: true });
          } catch (err) {
            setError(describeError(err));
          }
        }}
      >
        <div className="full app-choice" role="radiogroup" aria-label="Organization type">
          {(
            [
              ["startup", "I’m raising", "Founder workspace"],
              ["investment_firm", "I invest", "Investor workspace"],
            ] as const
          ).map(([value, label, sub]) => (
            <button
              type="button"
              key={value}
              role="radio"
              aria-checked={type === value}
              className={"demo-card app-choice-card" + (type === value ? " active" : "")}
              onClick={() => setType(value)}
            >
              <strong>{label}</strong>
              <span>{sub}</span>
            </button>
          ))}
        </div>
        <label className="full">
          {type === "startup" ? "Company name" : "Firm name"}
          <input name="name" required minLength={2} maxLength={120} />
        </label>
        <label className="full">
          Website (optional)
          <input name="website" type="url" placeholder="https://" />
        </label>
        <label className="full">
          One-line description (optional)
          <input name="description" maxLength={240} />
        </label>
        <div className="full">
          <FormError error={error} />
        </div>
        <div className="full">
          <button className="fm-button" type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create organization"} <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
