import { useEffect, useRef, useState, type FormEvent } from "react";
import "./waitlist-section.css";

const media = import.meta.env.BASE_URL + "media/waitlist/";

export function WaitlistSection() {
  const video = useRef<HTMLVideoElement>(null);
  const [motion, setMotion] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotion(!query.matches);
    sync(); query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element || !motion) { element?.pause(); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void element.play().catch(() => setMotion(false));
      else element.pause();
    }, { threshold: .2 });
    observer.observe(element);
    return () => { observer.disconnect(); element.pause(); };
  }, [motion]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setState("sending");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "fundmatch", email: String(values.get("email") || "").trim(), audience: String(values.get("audience") || ""), consent: values.get("consent") === "on", source: "homepage" }),
      });
      const result = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
      if (!response.ok || result?.ok !== true) throw new Error("Waitlist unavailable");
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
          <label htmlFor="fm-beta-email">Email for your beta invitation</label>
          <div className="fm-waitlist-fields"><input id="fm-beta-email" type="email" name="email" autoComplete="email" placeholder="you@company.com" required disabled={state === "sending"}/><button className="fm-button" type="submit" disabled={state === "sending"}>{state === "sending" ? "Joining…" : "Join the beta"}</button></div>
          <fieldset><legend>I'm here as a</legend><label><input type="radio" name="audience" value="founder" required disabled={state === "sending"}/> Founder</label><label><input type="radio" name="audience" value="investor" required disabled={state === "sending"}/> Investor</label></fieldset>
          <label className="fm-waitlist-consent"><input type="checkbox" name="consent" required disabled={state === "sending"}/> Email me about the FundMatch beta and my invitation. I can unsubscribe at any time.</label>
          <p className="fm-waitlist-feedback" role="status" aria-live="polite">{state === "success" ? "You're on the list. We'll email when your beta invitation is ready." : state === "error" ? "We couldn't add you yet. Please try again later." : "Explore the fictional demo now. Beta access is separate."}</p>
        </form>
      </div>
      <div className="fm-waitlist-visual">
        <video ref={video} muted loop playsInline preload="none" poster={media + "fundmatch-poster.webp"} aria-label="Two editorial dossiers align beneath an arch"><source src={media + "fundmatch-loop.mp4"} type="video/mp4"/></video>
        <button type="button" aria-label={motion ? "Pause waitlist motion" : "Play waitlist motion"} aria-pressed={motion} onClick={() => setMotion(value => !value)}>{motion ? "Pause motion" : "Play motion"}</button>
      </div>
    </div>
  </section>;
}
