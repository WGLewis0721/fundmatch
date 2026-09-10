# FundMatch Asset Manifest

This manifest records the repo-native graphics and the prior concept assets gathered for FundMatch.

## Repo-native SVG graphics

These assets are lightweight, editable text/SVG files stored in the repo.

| Asset | Path | Purpose |
| --- | --- | --- |
| Brand board | `docs/brand/assets/fundmatch-brand-board.svg` | Color/copy/interface reference board for future builders. |
| Product story | `docs/brand/assets/fundmatch-product-story.svg` | README hero graphic explaining founder/investor matching. |
| Founder readiness | `docs/brand/assets/fundmatch-founder-readiness.svg` | Shows the founder-readiness wedge and investor packet direction. |
| Investor feed | `docs/brand/assets/fundmatch-investor-feed.svg` | Shows the Pass / Save / Interested investor workflow. |
| Standardized packet | `docs/brand/assets/fundmatch-standardized-packet.svg` | Shows the standardized FundMatch profile/packet idea. |

## Prior generated graphics found in Library / Drive context

These were identified in the FundMatch context consolidation and indexed in the Gray Matter LLC Google Drive FundMatch folder.

| Asset | Notes |
| --- | --- |
| Dual Startup Pitch Deck Showcase.png | Pitch-deck style FundMatch/APEX concept showcase with FundMatch executive-summary page and product-stack comparison. |
| Dual Startup Proposal Documents.png | Proposal-style visual with FundMatch executive summary, How It Works, Dippi, Soapbox Caddie, and capital ecosystem framing. |
| FundMatch fundraising readiness check.png | Social/marketing graphic context around fundraising-readiness positioning. |
| FundMatch deck readiness checklist.png | Social/marketing graphic context around deck-readiness positioning. |

## Current brand tokens

Defined in `src/fundmatch.css`:

```css
--fm-ink: #24272b;
--fm-paper: #f8f7f3;
--fm-mint: #c6efde;
--fm-peri: #9caafa;
--fm-muted: #727579;
--fm-line: #e5e4df;
```

## Image usage guidance

Use the SVGs for repo docs and implementation handoffs.

Use the prior generated PNG/JPG style only for marketing/pitch context unless production-ready originals are intentionally added. Avoid filling the repo with oversized binary mockups unless they are directly used by the app or docs.

## Naming rules

- Use lowercase kebab-case for new assets.
- Keep source files under `docs/brand/assets/` unless they are part of the running app.
- Put production app media under `public/media/` only when it is used by the live product.
- Put implementation reference graphics under `docs/brand/assets/`.

## Trust and demo labels

Every graphic that implies matching, scoring, investor interest, readiness, or introductions must make clear whether the state is demo, simulated, planned, or live.
