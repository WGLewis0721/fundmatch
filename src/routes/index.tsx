import { ProductPreview } from "@/components/fundmatch/discovery-card";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  Check,
  Plus,
  Sparkles,
  ShieldCheck,
  Compass,
  Layers,
  Pause,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { backendConfigured } from "@/lib/backend";
import "../fundmatch.css";
import "../fundmatch-personality.css";

export const Route = createFileRoute("/")({ component: Home });

export function Brand() {
  return (
    <span className="fm-brand">
      <span className="fm-mark" aria-hidden="true">
        f<span>m</span>
      </span>
      FundMatch<span className="brand-dot">.</span>
    </span>
  );
}

export function Home() {
  const media = import.meta.env.BASE_URL + "media/";
  const video = useRef<HTMLVideoElement>(null);
  const [film, setFilm] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.current?.play().catch(() => setPlaying(false));
    }
  }, []);
  return (
    <div className="fm-site">
      <header className="fm-nav">
        <a href="#" aria-label="FundMatch home">
          <Brand />
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#for-founders">For founders</a>
          <a href="#for-investors">For investors</a>
        </nav>
        <div className="fm-nav-actions">
          {backendConfigured && (
            <a href="/app/login" className="fm-text-button">
              Sign in
            </a>
          )}
          <Link
            to="/demo"
            search={{ persona: "investor", view: "discover", company: "dippi" }}
            className="fm-button compact"
          >
            Explore the demo <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main>
        <section className="fm-hero">
          <div className="fm-hero-copy">
            <div className="fm-eyebrow">
              <span /> GOOD COMPANIES. GREAT CHEMISTRY.
            </div>
            <h1>
              Big ideas.
              <br />
              Right people.
              <br />
              <em>Real possibility.</em>
            </h1>
            <p>
              Meet the investors who share your vision. Discover the companies that fit your thesis.
              A better connection starts here.
            </p>
            <div className="fm-actions">
              <Link
                to="/demo"
                search={{ persona: "investor", view: "discover", company: "dippi" }}
                className="fm-button"
              >
                Find your fit <ArrowRight size={17} />
              </Link>
              <button className="fm-text-button" onClick={() => setFilm(true)}>
                Watch the film <Play size={15} fill="currentColor" />
              </button>
            </div>
            <div className="fm-hero-footnote">
              <span className="fm-live-dot" /> For founders, angels and investment teams.
            </div>
          </div>
          <ProductPreview />
          <div className="fm-hero-index">
            <span>BUILT AROUND WHAT MATTERS</span>
            <span>
              <span>Thesis fit</span>
              <span>Company stories</span>
              <span>Next moves</span>
            </span>
          </div>
        </section>
        <section className="fm-cinema" aria-label="Meet FundMatch in motion">
          <div className="fm-cinema-intro">
            <span className="fm-kicker">THE 24-SECOND INTRODUCTION</span>
            <h2>
              Less searching.
              <br />
              <em>More finding.</em>
            </h2>
            <p>Take a 24-second look inside FundMatch.</p>
          </div>
          <div className="fm-film-frame">
            <video
              ref={video}
              muted
              loop
              playsInline
              preload="metadata"
              poster={media + "fundmatch-poster.jpg"}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setFailed(true)}
              aria-label="FundMatch product film: discover companies, understand fit, and prepare to raise capital"
            >
              <source src={media + "fundmatch-film.mp4"} type="video/mp4" />
              <track
                kind="captions"
                src={media + "fundmatch-film.vtt"}
                srcLang="en"
                label="English"
              />
            </video>
            <div className="fm-film-bottom">
              <span>
                FUNDMatch IN MOTION <i>01 / THE INTRODUCTION</i>
              </span>
              <div>
                <button
                  onClick={() => setFilm(true)}
                  aria-label="Watch full product film with sound"
                >
                  <Play size={16} />
                </button>
                <button
                  onClick={() =>
                    playing
                      ? video.current?.pause()
                      : video.current?.play().catch(() => setFailed(true))
                  }
                  aria-label={playing ? "Pause background video" : "Play background video"}
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
            </div>
            {failed && (
              <div className="fm-video-error">
                The film couldn’t load. <a href={media + "fundmatch-film.mp4"}>Open the video</a>
              </div>
            )}
          </div>
          <p className="fm-micro">
            An interactive product preview. Fictional companies and illustrative data.
          </p>
        </section>
        <section id="how-it-works" className="fm-section">
          <div className="fm-section-heading">
            <div>
              <span className="fm-kicker">A CLEARER PATH FORWARD</span>
              <h2>
                From first look.
                <br />
                To what’s next.
              </h2>
            </div>
            <p>
              Bring the important details into focus.
              <br />
              Keep the next move beautifully simple.
            </p>
          </div>
          <div className="fm-three">
            <article>
              <span className="fm-step">01</span>
              <Layers size={26} />
              <h3>Your story, together.</h3>
              <p>
                Company details, traction and materials. One profile that makes the bigger picture
                easier to see.
              </p>
            </article>
            <article>
              <span className="fm-step">02</span>
              <Compass size={26} />
              <h3>Fit you can understand.</h3>
              <p>
                Compare companies against an investor’s thesis. See the overlap, the gaps and the
                questions worth asking.
              </p>
            </article>
            <article>
              <span className="fm-step">03</span>
              <ArrowUpRight size={26} />
              <h3>Momentum, organized.</h3>
              <p>
                Save an opportunity. Move it into review. Keep notes and preparation in the same
                workspace.
              </p>
            </article>
          </div>
        </section>
        <section id="for-investors" className="fm-feature fm-dark">
          <div className="fm-feature-copy">
            <span className="fm-kicker">FOR INVESTORS</span>
            <h2>
              Less noise.
              <br />
              <span>More “tell me more.”</span>
            </h2>
            <p>
              A focused discovery experience, built around your thesis. Understand why a company
              fits before you make your next move.
            </p>
            <Link
              to="/demo"
              search={{ persona: "investor", view: "discover", company: "dippi" }}
              className="fm-button light"
            >
              Explore investor view <ArrowUpRight size={16} />
            </Link>
            <small>Transparent, rules-based matching in this demo.</small>
          </div>
          <div className="fm-preview-card">
            <div className="fm-card-top">
              <span className="fm-company-logo">d.</span>
              <span className="fm-chip">ILLUSTRATIVE COMPANY</span>
            </div>
            <h3>
              Dippi<span>↗</span>
            </h3>
            <p>Your neighborhood. Delivered.</p>
            <div className="fm-preview-metrics">
              <div>
                <strong>$1.8M</strong>
                <span>Annual revenue</span>
              </div>
              <div>
                <strong>140%</strong>
                <span>YoY growth</span>
              </div>
              <div>
                <strong>Seed</strong>
                <span>Stage</span>
              </div>
            </div>
            <div className="fm-fit">
              <Sparkles size={18} />
              <div>
                <strong>Why it might fit</strong>
                <p>
                  Consumer marketplace. Seed stage.
                  <br />
                  Aligned with your focus.
                </p>
              </div>
            </div>
            <div className="fm-card-actions">
              <span>Pass</span>
              <span>
                Save <Plus size={13} />
              </span>
              <span>
                Interested <ArrowUpRight size={13} />
              </span>
            </div>
          </div>
        </section>
        <section id="for-founders" className="fm-feature fm-founder">
          <div className="fm-readiness-preview">
            <div className="fm-readiness-top">
              <span className="fm-chip">YOUR NEXT CHAPTER</span>
              <ShieldCheck size={24} />
            </div>
            <h3>Ready for the room.</h3>
            <p>Your fundraising preparation, in one place.</p>
            <div className="fm-progress-label">
              <strong>Fundraising readiness</strong>
              <span>3 of 5 complete</span>
            </div>
            <div className="fm-progress">
              <span style={{ width: "60%" }} />
            </div>
            {[
              "Company & ownership",
              "Founder profiles",
              "Pitch deck",
              "Financial forecast",
              "Use of funds",
            ].map((x, i) => (
              <div className="fm-check-row" key={x}>
                <span className={i < 3 ? "is-checked" : ""}>{i < 3 && <Check size={12} />}</span>
                {x}
                <small>{i < 3 ? "Complete" : "In progress"}</small>
              </div>
            ))}
            <small className="fm-micro">
              Illustrative checklist. Preparation, not a funding guarantee.
            </small>
          </div>
          <div className="fm-feature-copy">
            <span className="fm-kicker">FOR FOUNDERS</span>
            <h2>
              Big ambition.
              <br />
              <span>Ducks in a row.</span>
            </h2>
            <p>
              Know what’s ready, what’s missing and who’s on it. Your fundraising checklist keeps
              the whole team moving toward the same conversation.
            </p>
            <Link
              to="/demo"
              search={{ persona: "founder", view: "interest", company: "dippi" }}
              className="fm-button"
            >
              Explore founder view <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
        <section className="fm-final">
          <span className="fm-kicker">THE RIGHT CONVERSATION CAN CHANGE EVERYTHING</span>
          <h2>
            Make room
            <br />
            for possibility.
          </h2>
          <Link
            to="/demo"
            search={{ persona: "investor", view: "discover", company: "dippi" }}
            className="fm-button"
          >
            Meet FundMatch <ArrowRight size={17} />
          </Link>
          <p>No signup needed to explore.</p>
        </section>
      </main>
      <footer className="fm-footer">
        <Brand />
        <p>A better beginning for what comes next.</p>
        <a href="https://github.com/WGLewis0721/fundmatch" target="_blank" rel="noreferrer">
          Built in the open <ArrowUpRight size={14} />
        </a>
        <small>
          © {new Date().getFullYear()} FundMatch. Product demo. No investments or introductions are
          executed.
        </small>
      </footer>
      <Dialog open={film} onOpenChange={setFilm}>
        <DialogContent className="fm-film-dialog">
          <DialogTitle>Meet FundMatch.</DialogTitle>
          <DialogDescription>
            A 24-second introduction. Original motion design and soundtrack.
          </DialogDescription>
          <video
            controls
            autoPlay
            playsInline
            preload="metadata"
            poster={media + "fundmatch-poster.jpg"}
          >
            <source src={media + "fundmatch-film.mp4"} type="video/mp4" />
            <track
              kind="captions"
              src={media + "fundmatch-film.vtt"}
              srcLang="en"
              label="English"
              default
            />
          </video>
          <p>
            Bring your story together. Find the fit. Get ready for the conversation. Fictional data;
            the demo uses rules-based scoring.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
