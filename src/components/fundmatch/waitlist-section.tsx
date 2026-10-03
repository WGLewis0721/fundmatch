import { useState, type FormEvent } from "react";
import { useProductFilm } from "./use-product-film";
import "./waitlist-section.css";

const media = import.meta.env.BASE_URL + "media/waitlist/";

export function WaitlistSection() {
  const { video, playing, ended, failed, posterVisible, toggle, expand } = useProductFilm();
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setState("sending");
    try {
      const response = await fetch(window.location.hostname === "wglewis0721.github.io" ? "https://fundmatch-eight.vercel.app/api/waitlist" : "/api/waitlist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: String(values.get("name") || "").trim(), email: String(values.get("email") || "").trim(), website: String(values.get("website") || ""), consent: values.get("consent") === "on" }),
      });
      const result = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
      if (!response.ok || result?.ok !== true) throw new Error("Waitlist unavailable");
      // The Sheet is the record. The alert is best-effort and cannot change signup status.
      void fetch("https://formsubmit.co/ajax/graymattertechllc@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `[FundMatch] New beta waitlist signup: ${String(values.get("email") || "").trim()}`,
          _template: "table", _captcha: "false",
          _replyto: String(values.get("email") || "").trim(),
          product: "FundMatch",
          name: String(values.get("name") || "").trim(),
          email: String(values.get("email") || "").trim(),
        }),
      }).catch(() => {});
      form.reset(); setState("success");
    } catch { setState("error"); }
  }

  return <section className="fm-waitlist" id="waitlist" aria-labelledby="fm-waitlist-title">
    <div className="fm-waitlist-inner">
      <div className="fm-waitlist-copy">
        <span className="fm-kicker">A BETTER BEGINNING</span>
        <h2 id="fm-waitlist-title">Tell your story once.<br/><em>Find what fits.</em></h2>
        <p>Founders need the right room. Investors need the right reasons. Join the FundMatch beta to help shape a clearer way for both to find the right conversation.</p>
        <form className="fm-waitlist-form" onSubmit={submit}>
          <label htmlFor="fm-beta-name">Your name</label>
          <input className="fm-waitlist-name" id="fm-beta-name" type="text" name="name" autoComplete="name" placeholder="Your name" maxLength={100} required disabled={state === "sending"}/>
          <label htmlFor="fm-beta-email">Email for your beta invitation</label>
          <input className="fm-waitlist-trap" name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
          <div className="fm-waitlist-fields"><input id="fm-beta-email" type="email" name="email" autoComplete="email" placeholder="you@company.com" required disabled={state === "sending"}/><button className="fm-button" type="submit" disabled={state === "sending"}>{state === "sending" ? "Joining…" : "Join the beta"}</button></div>
          <label className="fm-waitlist-consent"><input type="checkbox" name="consent" required disabled={state === "sending"}/> Email me about the FundMatch beta and my invitation. I can unsubscribe at any time.</label>
          <p className="fm-waitlist-feedback" role="status" aria-live="polite">{state === "success" ? "You're on the list. We'll email when your beta invitation is ready." : state === "error" ? "We couldn't add you yet. Please try again later." : "Explore the fictional demo now. Beta access is separate."}</p>
        </form>
      </div>
      <div className="fm-waitlist-visual">
        <img className="product-film-poster" src={media + "fundmatch-product-film-v2.webp"} hidden={!posterVisible} alt="Final product walkthrough frame with illustrative data" />
          <video style={{ visibility: posterVisible ? "hidden" : undefined }} ref={video} muted playsInline preload="none" poster={media + "fundmatch-product-film-v2.webp"} aria-label="Fundmatch product walkthrough with illustrative data"><source src={media + "fundmatch-product-film-v2.mp4"} type="video/mp4"/></video>
        <button type="button" aria-label={ended ? "Replay product film" : playing ? "Pause product film" : "Play product film"} aria-pressed={playing} onClick={toggle}>{failed ? "Retry film" : ended ? "Replay film" : playing ? "Pause film" : "Play film"}</button>
          <button type="button" className="product-film-expand" aria-label="Watch product film full screen" onClick={expand}>Expand film</button>
      </div>
    </div>
  </section>;
}
