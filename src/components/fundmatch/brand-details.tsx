import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";

/** A transparent visual scale, never a probability or funding prediction. */
export function MatchScore({ score }: { score: number }) {
  const bounded = Math.max(0, Math.min(100, score));
  return (
    <div className="fm-match" aria-label={`Thesis fit: ${bounded} out of 100`}>
      <div
        className="fm-match-ring"
        style={{ "--fit": `${bounded}%` } as CSSProperties}
        aria-hidden="true"
      >
        <strong>{bounded}</strong>
      </div>
      <span>
        THESIS FIT<small>out of 100</small>
      </span>
    </div>
  );
}

export function WorkspaceSignature({ persona }: { persona: "investor" | "founder" }) {
  return (
    <div className="fm-workspace-signature" aria-hidden="true">
      <img
        src={import.meta.env.BASE_URL + "media/fundmatch-arch.webp"}
        alt=""
        width="1536"
        height="1024"
        loading="lazy"
      />
      <div>
        <span>{persona === "investor" ? "A little chemistry." : "Your next chapter."}</span>
        <ArrowUpRight size={20} />
      </div>
      <p>
        {persona === "investor"
          ? "Find the overlap. Follow the possibility."
          : "Big ambition deserves a beautiful beginning."}
      </p>
    </div>
  );
}
