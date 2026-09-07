import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthCard, FormError, RedirectIfSignedIn } from "@/components/fundmatch/app-shell";
import { useAuth } from "@/lib/auth";
import { describeError } from "@/lib/backend";

export const Route = createFileRoute("/app/recover")({ component: Recover });

function Recover() {
  const { requestPasswordReset } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <RedirectIfSignedIn>
      <AuthCard
        kicker="ACCOUNT RECOVERY"
        title="Reset your password."
        lead="Enter your email and we’ll send a link to choose a new password."
        footer={<Link to="/app/login">Back to sign in</Link>}
      >
        {sent ? (
          <p className="demo-note" role="status">
            If an account exists for that email, a reset link is on its way. The link opens the
            password screen in this app.
          </p>
        ) : (
          <form
            className="demo-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await requestPasswordReset(
                  String(new FormData(e.currentTarget).get("email")).trim(),
                );
                setSent(true);
              } catch (err) {
                setError(describeError(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="full">
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <div className="full">
              <FormError error={error} />
            </div>
            <div className="full">
              <button className="fm-button" type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </div>
          </form>
        )}
      </AuthCard>
    </RedirectIfSignedIn>
  );
}
