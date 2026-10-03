# FundMatch waitlist product film

## Purpose

Create a 20-second, silent, investor-grade FundMatch film for the waitlist. The last shot is the reward: a founder sees a credible investor fit and the exact reasons it fits—not a dating-app “match” celebration or a promise of funding.

## Product truth to preserve

FundMatch lets a founder tell their story once through a canonical company profile, then ranks compatible investor theses with transparent rationale. Matching is deterministic plus semantic augmentation; it is not an automatic introduction, investment guarantee, or exposure of contact details. Use fictional companies/investors and state `Illustrative profile` where appropriate.

## Reference grammar

Use [Affinity’s Pathfinder launch video](https://www.affinity.co/videos/affinity-pathfinder-launch-video) for its product-led relationship-intelligence narrative: workflow first, meaningful decision second. Do not reuse its copy, brand, interface, or claims.

## Deliverable and placement

- Master: 3840 × 2160, 16:9, 20.0 seconds, 30 fps, ProRes 422 HQ.
- Web: 1440 × 810 muted H.264 MP4 plus WebP poster, under 8 MB.
- In the waitlist section, autoplay in view, do not loop, hold the final card, offer replay, and replace motion with the final poster for reduced motion.
- Use current FundMatch type, editorial spacing, and dark/investor-grade presentation. The film should feel like a precise investment memo, not crypto, gambling, or a generic AI dashboard.

## Film sentence

**Tell your story once; see the investor thesis it can genuinely fit.**

## Beat grid

| Time | Picture and motion | On-screen copy | Product proof |
| --- | --- | --- | --- |
| 0:00–0:02.5 | Fragments of a founder’s materials—traction note, market sentence, team line—sit in a disciplined editorial field. A single profile column draws them into order. | `Your story is already scattered.` | Acknowledges the founder’s actual starting point. |
| 0:02.5–0:05.5 | The fragments settle into `Northstar Health · Company profile` with clear fields: stage, sector, geography, traction. No magical auto-writing sequence. | `Tell it once.` | Canonical company profile. |
| 0:05.5–0:08.5 | The profile’s highlighted terms travel through a quiet matching field: `Seed`, `care delivery`, `US`. Investor thesis cards remain partially obscured until evidence is found. | `Match the thesis, not the hype.` | Explicit fit criteria, not vague similarity. |
| 0:08.5–0:12.0 | One investor card comes into focus: `Northline Ventures · Seed health software`. Three exact fit reasons appear beside it. | `Why this fit` | Transparent ranking explanation. |
| 0:12.0–0:15.0 | A concise readiness panel completes: company profile, investor packet, and one `Review fit` action. The camera stays on the same profile/card pair. | `Ready before the introduction.` | Founder-controlled review and packet preparation. |
| 0:15.0–0:17.5 | The profile and thesis cards align like pages in a deal memo. The explanatory reasons become highlighted lines between them—not a heart, confetti, or percentage score. | `A clearer next conversation.` | A match supports a conversation; it does not guarantee capital. |
| 0:17.5–0:20.0 | **Final reward.** Full investor-fit view: founder company, investor thesis, and `Why it fits` evidence held in one premium composition. | `Great companies. Right investors.`<br>`Join the beta` | Delivers the central value visibly and credibly. |

## Art and motion direction

- Treat content as editorial objects: paper-like panels, data underlines, confident whitespace, slow lens moves, and restrained reveal masks.
- One match should feel earned. Avoid fast grids of investor logos, fake notifications, invented investment totals, charts that imply success, or a “you matched!” moment.
- Transitions should use a line of text or a profile field as the object that carries us into the next state. Make reasons legible long enough to read.
- Optional audio is restrained paper movement and a low confirmation tone; the web film is silent-first.

## Required assets before animation

1. Current FundMatch profile, readiness, investor-thesis, and explanation UI captures.
2. Approved fictional demo data for one company and one investor, including the three evidence-backed fit reasons.
3. Logo, typefaces, current color variables, and a small set of current UI tokens.
4. A deliberately designed end-state that can double as the reduced-motion poster.

## Honest-demo rules and acceptance test

- Never state or imply FundMatch secures funding, makes introductions automatically, or exposes investor contact details.
- Avoid real founder/investor names and real investment data unless written approval exists.
- A viewer should be able to name the three steps when muted: profile → thesis comparison → reasons to review the fit.
- The final two and a half seconds must make the fit rationale more prominent than the score or any decorative metric.

## Implemented production treatment

The final render is a silent 20-second product walkthrough with seven workflow beats, a short Higgsfield materials transition, and a held final UI outcome. Exact UI and copy are deterministic, fixture-based reconstructions of the current components. Native 3840×2160 H.264 masters and 1440×810 web exports are produced by `scripts/film/render.py`; H.264 replaces the proposed ProRes archival format. See `scripts/film/README.md` for reproducible rendering and playback acceptance. The original waitlist form contract remains unchanged.
