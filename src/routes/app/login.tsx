import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { AuthCard, FormError, RedirectIfSignedIn } from "@/components/fundmatch/app-shell";
import { useAuth } from "@/lib/auth";
import { describeError } from "@/lib/backend";

export const Route = createFileRoute("/app/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string; notice?: string } => ({
    ...(typeof s["next"] === "string" && s["next"].startsWith("/app") ? { next: s["next"] } : {}),
    ...(typeof s["notice"] === "string" ? { notice: s["notice"] } : {}),
  }),
  component: Login,
});

function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <RedirectIfSignedIn>
      <AuthCard
        kicker="WELCOME BACK"
        title="Sign in to FundMatch."
        lead="Your workspace, pipeline and documents are private to your organization."
        footer={
          <>
            New here? <Link to="/app/signup">Create an account</Link> · Just exploring?{" "}
            <Link to="/demo" search={{ persona: "investor", view: "discover", company: "dippi" }}>
              Try the demo
            </Link>
          </>
        }
      >
        {search.notice && (
          <p className="demo-note" role="status">
            {search.notice}
          </p>
        )}
        <form
          className="demo-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError(null);
            try {
              await signIn({
                email: String(f.get("email")).trim(),
                password: String(f.get("password")),
              });
              void navigate({ to: search.next ?? "/app", replace: true });
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
          <label className="full">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
            />
          </label>
          <div className="full">
            <FormError error={error} />
          </div>
          <div className="full demo-controls">
            <button className="fm-button" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"} <ArrowRight size={15} />
            </button>
            <Link to="/app/recover" className="demo-link">
              Forgot your password?
            </Link>
          </div>
        </form>
      </AuthCard>
    </RedirectIfSignedIn>
  );
}
