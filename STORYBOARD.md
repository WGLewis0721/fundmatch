# FundMatch — Waitlist Promo Video Storyboard

Replaces the current 4s silent Higgsfield loop in the homepage waitlist section (`src/components/fundmatch/waitlist-section.tsx`). Target: confident fintech polish that uses the swipe hook honestly, then pivots to the serious product underneath — per the README's own framing: **"not just Tinder for VC."**

## The one thing this video proves

**The swipe is the front door; the real product is a founder's story told once, understood by the right investors, and turned into a real introduction.** The emotional arc: a familiar, fun interaction (swipe) → a surprising reveal that something substantial is happening underneath → a human payoff (an accepted intro). The reward is the moment "Interested" becomes an actual conversation, not an automatic match.

Tone: sleek, confident B2B fintech — more Ramp/Mercury than consumer dating app. Use the swipe motion as a hook, then deliberately slow down and get serious.

## Production note (read first)

Generative video cannot render legible company cards, thesis text, or dashboard data. **Split the work:**

- **Real screen capture** for the swipe deck, company card, thesis editor, match-explanation card, and the introduction-accepted state — all must be legible and accurate to the actual demo at `/demo`.
- **Higgsfield-generated b-roll** only for the transition material: the "card flips into a stack of documents" morph, abstract data-flow visuals, and the closing brand card.
- Never show a specific fit score or match percentage as if it's a guarantee — CLAUDE.md-equivalent honesty for FundMatch (per its own README) is that a fit score "is not a probability of investment."

## Reference videos

1. **Tinder brand/ad spots** — the swipe gesture itself as hero motion: card lifts, tilts, flies off with physical weight. Borrow the gesture physics directly — it's literally FundMatch's UI pattern — but drop the flirtatious tone entirely.
2. **Robinhood product films** — confident, clean fintech motion graphics, a reward moment (confetti, a number ticking up) used sparingly and tastefully. Borrow: the restrained "number resolves cleanly" payoff style for the match/fit explanation.
3. **Ramp brand videos** — crisp 3D card and document motion, lots of negative space, type that moves with real physical weight. Borrow: the document/card choreography for the "underneath the swipe" reveal.
4. **Mercury (the bank) brand films** — minimalist, high-trust, muted palette, zero hype language. Borrow: the overall restraint and trust-first tone — this is who FundMatch should visually resemble more than Tinder.
5. **Carta cap-table / startup-finance explainer spots** — turns dry structured data (equity, rounds) into clean, legible motion graphics that still feel premium. Borrow: how to make "structured profile, readiness, matching" visually interesting without faking a flashy AI.

## Spec sheet

- Length: 18–22s hero cut; seamless 4–6s loop cutdown for the homepage slot.
- Resolution: 1920×1080 min, H.264 mp4 + webp poster matching `public/media/waitlist/fundmatch-*` naming.
- No voiceover; captions/on-screen text only.
- Palette/type: pull from `docs/brand/BRAND.md` and the existing waitlist CSS — do not invent new brand colors.
- Loop seam: end on the same clean title-card composition the video opens toward, so the cutdown tiles.

## Storyboard

| # | Time | Visual | Motion / camera | On-screen text | Why |
|---|---|---|---|---|---|
| 1 | 0:00–0:03 | Real screen capture: a company discovery card on screen, investor's thumb/cursor swipes it right ("Interested") with real physical card-tilt-and-fly motion | Fast, confident swipe gesture, card exits frame with weight | — | Open on the familiar hook — no context needed, it reads instantly |
| 2 | 0:03–0:06 | Hard cut: the card that just flew off-screen *doesn't disappear* — it's caught mid-air and flips to reveal it's actually the front page of a structured, multi-section founder profile (readiness, thesis-fit, materials) | Higgsfield b-roll morph: card-flip-into-document-stack, camera orbits slightly | small label: "Not just a swipe." | This is the thesis of the whole video — the swipe is the surface, the profile underneath is the product |
| 3 | 0:06–0:10 | Real screen capture: investor's thesis editor — a few structured fields (stage, check size, sector) visibly inform the next card shown, i.e., the deck isn't random | Quick, clean cuts between thesis fields and the resulting card | — | Shows matching is *explainable*, not a black box |
| 4 | 0:10–0:14 | Real screen capture: a match-explanation card appears next to a company — specific, legible reasons listed (not a bare percentage) | Card snaps into place with a clean, restrained motion (Robinhood-style — no confetti yet) | small label beneath: "Explained fit. Not a probability of investment." | Required honesty beat, matching the README's own guardrail on what a fit score is not |
| 5 | 0:14–0:17 | Real screen capture: founder receives a permissioned "Interested" notification, taps Accept | Simple, human-scaled motion — this is a person responding, not an algorithm firing | — | Reinforces README's "interest is a workflow, not an automatic match" |
| 6 | 0:17–0:20 (**the reward**) | Real screen capture: the accepted interest resolves into an introduction thread opening — two names, a clean "connected" state, understated success treatment (a single clean checkmark/glow, not fireworks) | Slow, confident settle — camera holds a beat longer than anywhere else in the video | **"Real introductions. Not an automatic match."** | The reward is a *human connection made real*, which is FundMatch's actual differentiator over "Tinder for VC" — deliberately the quietest, most confident beat in the cut |
| 7 | 0:20–0:22 | Settle on FundMatch wordmark over the muted brand palette | Static hold | **"Great companies. Right investors. Join the beta."** | Matches the live tagline and CTA; sets up the loop seam |

## Reward design note

Resist the urge to make the "match" moment loud. Robinhood and Ramp both earn trust by staying quiet at the exact moment a cheaper competitor would throw confetti. The accepted-introduction beat (Scene 6) should be the calmest, most deliberate shot in the entire video — that calm *is* the premium signal.

## Higgsfield production guidance

- Use **generate_video** for Scene 2's card-to-document-stack morph only — prompt for "a sleek card flipping mid-air to reveal a stack of structured document pages, clean fintech aesthetic, muted navy/graphite palette, subtle camera orbit, no text, no logos."
- Do not attempt to generate the thesis fields, match-explanation text, or any numeric fit score — these must be real captures.
- Avoid any Higgsfield preset that reads as "dating app" (hearts, flirtatious framing, warm pink tones) — FundMatch's visual register is Mercury/Ramp, not Tinder's own brand palette, even though the gesture is borrowed from Tinder.
