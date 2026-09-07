import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthCard, FormError, LoadingCard, NotConfigured } from "@/components/fundmatch/app-shell";
import { useAuth } from "@/lib/auth";
import { backendConfigured, describeError } from "@/lib/backend";

// Supabase opens this route from the recovery email with a session already
// established (PASSWORD_RECOVERY event), so it only needs the new password.
export const Route = createFileRoute("/app/reset")({ component: Reset });

function Reset() {
  const { status, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!backendConfigured) return <NotConfigured />;
  if (status === "loading") return <LoadingCard text="Verifying your reset link…" />;
  if (status === "signed_out") {
    return (
      <AuthCard
        kicker="ACCOUNT RECOVERY"
        title="This reset link isn’t valid anymore."
        lead="Reset links expire quickly. Request a new one and open it on this device."
        footer={<Link to="/app/login">Back to sign in</Link>}
      >
        <Link to="/app/recover" className="fm-button">
          Request a new link
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard kicker="ACCOUNT RECOVERY" title="Choose a new password.">
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
            await updatePassword(password);
            void navigate({ to: "/app", replace: true });
          } catch (err) {
            setError(describeError(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
          />
        </label>
        <label>
          Confirm
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
        </div>
        <div className="full">
          <button className="fm-button" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save password"}
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
