import { defineEventHandler } from "h3";
import { waitlistHandlerFromEnv } from "@/lib/waitlist.server";

/**
 * Public beta waitlist → Google Sheets (docs/WAITLIST_API.md).
 *
 * Server-side env vars only. The Vercel app is same-origin; the GitHub Pages
 * demo is a different origin and is allowed by default so its form can post here.
 */
const handler = waitlistHandlerFromEnv(process.env, {
  product: "FundMatch",
  siteUrl: "https://fundmatch-eight.vercel.app/",
  allowedOrigins: ["https://wglewis0721.github.io"],
});

export default defineEventHandler((event) => handler(event.req));
