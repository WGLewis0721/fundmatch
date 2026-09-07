import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthCard, FormError, RequireSession } from "@/components/fundmatch/app-shell";
import { useAcceptInvitation } from "@/lib/app-queries";
import { useAuth } from "@/lib/auth";
import { describeError } from "@/lib/backend";

export const Route = createFileRoute("/app/invite")({
  validateSearch: (s: Record<string, unknown>): { token: string } => ({
    token: typeof s["token"] === "string" ? s["token"] : "",
  }),
  component: Invite,
});

function Invite() {
  const { status } = useAuth();
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  // Signed-out visitors go to login, then come straight back here.
  useEffect(() => {
    if (status === "signed_out")
      void navigate({
        to: "/app/login",
        search: {
          next: `/app/invite?token=${encodeURIComponent(token)}`,
          notice: "Sign in or create an account with the invited email to accept.",
        },
        replace: true,
      });
  }, [status, navigate, token]);
  return (
    <RequireSession>
      <AcceptInvite token={token} />
    </RequireSession>
  );
}

function AcceptInvite({ token }: { token: string }) {
  const accept = useAcceptInvitation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  return (
    <AuthCard
      kicker="TEAM INVITATION"
      title="Join your team’s organization."
      lead={`You are signed in as ${user?.email ?? "your account"}. The invitation must have been sent to this email address.`}
      footer={<Link to="/app">Back to your workspace</Link>}
    >
      <FormError error={token ? error : "This invitation link is missing its token."} />
      <div className="demo-controls">
        <button
          className="fm-button"
          disabled={!token || accept.isPending}
          onClick={async () => {
            setError(null);
            try {
              await accept.mutateAsync(token);
              void navigate({ to: "/app", replace: true });
            } catch (err) {
              setError(describeError(err));
            }
          }}
        >
          {accept.isPending ? "Joining…" : "Accept invitation"}
        </button>
      </div>
    </AuthCard>
  );
}
