# FundMatch Brand Guide

This guide preserves the current FundMatch visual and verbal direction so future agents do not restart the brand from scratch.

## Brand core

**Name:** FundMatch

**Primary line:** Great companies. Right investors.

**Serious positioning:** AI-powered deal discovery and matching for founders and investment teams.

**Plain-language promise:** Tell your story once. Get discovered by investors who actually fit.

## What FundMatch should feel like

- clear
- credible
- investor-grade
- modern
- calm
- efficient
- founder-friendly
- analytical without feeling cold

FundMatch should not feel like a crypto hype page, gambling app, childish dating app, or generic SaaS template.

## Approved narrative

FundMatch sits between fragmented founder/investor data and better capital conversations.

Use the swipe/feed metaphor only as a quick shorthand. The serious product is:

- structured company profiles
- investor thesis understanding
- explainable fit scoring
- founder readiness
- standardized investor packets
- diligence workflow
- provenance
- human-reviewed AI suggestions

## Copy rules

Say:

- “Great companies. Right investors.”
- “Tell your story once.”
- “Find what fits.”
- “Standardize the company story before the meeting.”
- “Explain why a company matches the thesis.”
- “Founder readiness before fundraising outreach.”
- “AI-assisted, human-reviewed.”

Avoid saying:

- “Tinder for VC” as the only description.
- “AI replaces analysts.”
- “Guaranteed funding.”
- “Guaranteed investor matches.”
- “Live investor introductions” unless that feature is actually implemented.
- “Production AI extraction” unless the worker is actually live.

## Current visual tokens

The current app CSS defines these core FundMatch tokens in `src/fundmatch.css`:

```css
--fm-ink: #28352e;
--fm-paper: #f8f7f2;
--fm-mint: #a5b89c;
--fm-peri: #909be8;
--fm-muted: #626a61;
--fm-line: #d8ddd1;
```

Use these as the default brand base unless a future full redesign is explicitly requested.

## September 2026 visual refresh

The user-approved balance is **60% off-white / 30% sage green / 10% periwinkle blue**, measured as an approximate hierarchy of visible surfaces rather than an exact pixel count. Charcoal-green is reserved for typography and fine detail. The `--fm-mint` compatibility token now means sage, not mint.

The direction is a premium venture journal: Instrument Serif regular/italic for expressive headlines, self-hosted Manrope for product controls, original ceramic/glass artwork, sage workspace navigation, layered discovery cards and periwinkle thesis-fit rings. The current homepage campaign line is “Big ideas. Right people. Real possibility.” The second pass puts a working company preview ahead of abstract artwork. See [PRODUCT_POLISH.md](PRODUCT_POLISH.md).

`src/fundmatch-personality.css` carries this treatment across the public homepage, demo and authenticated workspace. `src/styles.css` supplies matching semantic tokens for shared controls. Fonts are self-hosted with their OFL license. Keep actionable information as real HTML, keep source and demo labels visible, and honor reduced-motion preferences.

See [VISUAL_REFRESH.md](VISUAL_REFRESH.md) for references, asset provenance and validation.

## Visual direction

- off-white editorial canvas
- charcoal typography
- sage green structure and periwinkle accents
- rounded cards
- clear status chips
- investor/pipeline dashboards
- match-score modules
- source/provenance labels
- simple founder/investor duality
- restrained motion and accessible reduced-motion support

## Repo-native graphics

These SVG files are included for README, docs, and future design reference:

- `docs/brand/assets/fundmatch-brand-board.svg`
- `docs/brand/assets/fundmatch-product-story.svg`
- `docs/brand/assets/fundmatch-founder-readiness.svg`
- `docs/brand/assets/fundmatch-investor-feed.svg`
- `docs/brand/assets/fundmatch-standardized-packet.svg`

These earlier concept diagrams remain editable; their original colors predate the September visual refresh. Use the tokens above for new implementation.

## Prior generated graphics

The source/asset index in the Gray Matter Google Drive FundMatch folder points to earlier generated graphics, including:

- Dual Startup Pitch Deck Showcase
- Dual Startup Proposal Documents
- FundMatch fundraising readiness check
- FundMatch deck readiness checklist

Use those as visual inspiration and marketing collateral context. Keep repo assets lightweight unless production-ready originals are intentionally added.

## Brand promise by audience

### Founder

“You should not have to rebuild your company story every time you talk to capital.”

### Investor

“You should not have to burn analyst time on companies that clearly do not fit the firm’s thesis.”

### Ecosystem

“Better-matched capital conversations should create less noise and more opportunity.”

## Product surfaces to design around

1. Founder readiness dashboard.
2. Company profile builder.
3. Investor packet/profile preview.
4. Investor thesis builder.
5. Discover feed.
6. Company card with match score.
7. Pipeline and diligence board.
8. Profile provenance/source trail.
9. AI suggestions review screen.
10. Intro/request workflow.

## Accessibility and trust rules

- Keep contrast high enough for serious reading.
- Do not rely on color alone for readiness or pipeline state.
- Label demo data clearly.
- Label AI-generated content clearly.
- Keep source/provenance visible near important claims.
- Never suggest that a fictional company is a live investment opportunity.
