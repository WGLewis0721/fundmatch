import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { AuthCard, FormError, RedirectIfSignedIn } from "@/components/fundmatch/app-shell";
import { useAuth } from "@/lib/auth";
import { describeError } from "@/lib/backend";

export const Route = createFileRoute("/app/signup")({ component: Signup });

function Signup() {
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  if (confirm) {
    return (
      <RedirectIfSignedIn to="/app/onboarding">
        <AuthCard
          kicker="ONE MORE STEP"
          title="Check your inbox."
          lead={`We sent a confirmation link to ${confirm}. Open it to activate your account, then sign in.`}
          footer={<Link to="/app/login">Back to sign in</Link>}
        >
          <p className="demo-note">Didn’t get it? Check spam, or try again in a minute.</p>
        </AuthCard>
      </RedirectIfSignedIn>
    );
  }
  return (
    <RedirectIfSignedIn to="/app/onboarding">
      <AuthCard
        kicker="GET STARTED"
        title="Create your FundMatch account."
        lead="Next you’ll create or join an organization. Nobody else can add you to theirs without an invitation sent to this email."
        footer={
          <>
            Already have an account? <Link to="/app/login">Sign in</Link>
          </>
        }
      >
        <form
          className="demo-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const password = String(f.get("password"));
            if (password !== String(f.get("confirm"))) {
              setError("Passwords don’t match.");
              return;
            }
            setBusy(true);
            setError(null);
            try {
              const email = String(f.get("email")).trim();
              const result = await signUp({
                email,
                password,
                fullName: String(f.get("name")).trim(),
              });
              // With confirmation disabled a session exists now and
              // RedirectIfSignedIn moves on to onboarding.
              if (result.needsConfirmation) setConfirm(email);
            } catch (err) {
              setError(describeError(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="full">
            Your name
            <input name="name" autoComplete="name" required maxLength={120} />
          </label>
          <label className="full">
            Work email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
            />
          </label>
          <label>
            Confirm password
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
            />
          </label>
          <div className="full">
            <FormError error={error} />
            <p className="fm-micro">
              Use at least 10 characters. You can change it later from the recovery flow.
            </p>
          </div>
          <div className="full">
            <button className="fm-button" type="submit" disabled={busy}>
              {busy ? "Creating account…" : "Create account"} <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </AuthCard>
    </RedirectIfSignedIn>
  );
}
