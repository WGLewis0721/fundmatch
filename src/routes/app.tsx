import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import "../fundmatch.css";
import "../app.css";

// The authenticated application is client-rendered: it depends on the
// browser session and is never part of the static GitHub Pages demo build.
export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
