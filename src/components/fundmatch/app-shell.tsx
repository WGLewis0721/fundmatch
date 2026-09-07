import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Brand } from "@/routes/index";
import { useAuth } from "@/lib/auth";
import { backendConfigured } from "@/lib/backend";

/** Centered card used by every authentication screen. Matches the demo styling. */
export function AuthCard({
  kicker,
  title,
  lead,
  children,
  footer,
}: {
  kicker: string;
  title: string;
  lead?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fm-demo app-auth">
      <header className="demo-header">
        <Link to="/">
          <Brand />
        </Link>
        <div>
          <span className="demo-label">FUNDMATCH ACCOUNT</span>
        </div>
      </header>
      <main className="app-auth-main">
        <article className="demo-card app-auth-card">
          <span className="fm-kicker">{kicker}</span>
          <h1>{title}</h1>
          {lead && <p>{lead}</p>}
          {children}
        </article>
        {footer && <p className="fm-micro app-auth-footer">{footer}</p>}
      </main>
    </div>
  );
}

export function NotConfigured() {
  return (
    <AuthCard
      kicker="SETUP REQUIRED"
      title="The FundMatch backend isn’t configured for this build."
      lead="Accounts, saved workspaces and private documents need the Supabase project described in docs/BACKEND.md. The no-signup demo still works."
    >
      <div className="demo-controls">
        <Link
          to="/demo"
          search={{ persona: "investor", view: "discover", company: "dippi" }}
          className="fm-button"
        >
          Open the demo
        </Link>
      </div>
    </AuthCard>
  );
}

export function LoadingCard({ text = "Opening your workspace…" }: { text?: string }) {
  return (
    <div className="fm-demo app-auth">
      <main className="app-auth-main">
        <div className="demo-card" role="status" aria-live="polite">
          {text}
        </div>
      </main>
    </div>
  );
}

/** Redirects to login while signed out; renders children once a session exists. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (status === "signed_out") void navigate({ to: "/app/login", replace: true });
  }, [status, navigate]);
  if (!backendConfigured) return <NotConfigured />;
  if (status !== "signed_in") return <LoadingCard text="Checking your session…" />;
  return <>{children}</>;
}

/** Redirects signed-in users away from auth screens. */
export function RedirectIfSignedIn({
  children,
  to = "/app",
}: {
  children: ReactNode;
  to?: "/app" | "/app/onboarding";
}) {
  const { status } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (status === "signed_in") void navigate({ to, replace: true });
  }, [status, navigate, to]);
  if (!backendConfigured) return <NotConfigured />;
  if (status === "loading") return <LoadingCard text="Checking your session…" />;
  return <>{children}</>;
}

export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="app-form-error" role="alert">
      {error}
    </p>
  );
}
