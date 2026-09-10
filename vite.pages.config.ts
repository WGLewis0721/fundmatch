// Static browser-only build for GitHub Pages. The authenticated TanStack Start
// application remains separate in vite.config.ts.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
export default defineConfig({
  root: ".",
  base: process.env["PAGES_BASE"] || "/fundmatch/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rolldownOptions: { input: resolve(import.meta.dirname, "pages/index.html") },
  },
});
