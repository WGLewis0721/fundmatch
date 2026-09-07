// An optional static build of the same UI for GitHub Pages. The original
// TanStack Start/Lovable build remains in vite.config.ts, unchanged.
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
