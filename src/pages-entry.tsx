import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  Outlet,
  Link,
} from "@tanstack/react-router";
import { Home } from "./routes/index";
import { Demo, Route as demoRoute } from "./routes/demo";
import "./styles.css";
// Same route IDs as TanStack Start so the shared route search hooks work in
// both builds. This static demo intentionally never loads the auth backend.
const root = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <main className="fm-site fm-final">
      <h1>Let’s find your way back.</h1>
      <Link to="/">Return to FundMatch</Link>
    </main>
  ),
  errorComponent: () => (
    <main className="fm-site fm-final">
      <h1>This page couldn’t load.</h1>
      <p>Your demo edits remain on this device.</p>
      <a href={import.meta.env.BASE_URL}>Return to FundMatch</a>
    </main>
  ),
});
const index = createRoute({ getParentRoute: () => root, path: "/", component: Home });
const demo = createRoute({
  getParentRoute: () => root,
  path: "/demo",
  validateSearch: demoRoute.options.validateSearch!,
  component: Demo,
});
const router = createRouter({
  routeTree: root.addChildren([index, demo]),
  basepath: import.meta.env.BASE_URL,
  scrollRestoration: true,
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
