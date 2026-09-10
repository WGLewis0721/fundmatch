import { copyFile, mkdir, readFile, writeFile, stat } from "node:fs/promises";
// Emit real entrypoints for the app route, so refreshing /fundmatch/demo/
// doesn't depend on a custom server or a GitHub Pages redirect workaround.
await copyFile("dist/pages/index.html", "dist/index.html");
await mkdir("dist/demo", { recursive: true });
await copyFile("dist/index.html", "dist/demo/index.html");
await copyFile("dist/index.html", "dist/404.html");
await writeFile("dist/.nojekyll", "");
const html = await readFile("dist/index.html", "utf8");
if (!html.includes("/fundmatch/assets/") && !process.env.PAGES_BASE)
  throw new Error("Incorrect asset base for GitHub Pages");
for (const path of [
  "media/fundmatch-film.mp4",
  "media/fundmatch-poster.jpg",
  "media/fundmatch-film.vtt",
  "media/fundmatch-arch.webp",
  "fonts/instrument-serif-regular.ttf",
  "fonts/instrument-serif-italic.ttf",
  "favicon.svg",
])
  await stat("dist/" + path);
console.log("Static Pages build validated: homepage, demo route, film, brand artwork and fonts.");
