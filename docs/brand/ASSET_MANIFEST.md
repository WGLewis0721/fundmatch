# FundMatch Asset Manifest

This manifest records the repo-native graphics and the prior concept assets gathered for FundMatch.

## Live visual identity

| Asset | Path | Purpose |
| --- | --- | --- |
| Founders and investors arch | `public/media/fundmatch-arch.webp` | Original Create Image ceramic/glass sculpture. Hero and decorative workspace signature. 1536 × 1024, approximately 33 KB WebP. |
| Instrument Serif regular / italic | `public/fonts/instrument-serif-regular.ttf`, `public/fonts/instrument-serif-italic.ttf` | Self-hosted editorial headings. License: `public/fonts/InstrumentSerif-OFL.txt`. |

The raster is original generated art, not a screenshot or copied reference. See [VISUAL_REFRESH.md](VISUAL_REFRESH.md) for its prompt and generation record. The companion Higgsfield generation was rejected by its plan requirement; no Higgsfield output is included.

## Second-pass product assets

| Asset | Path | Purpose |
| --- | --- | --- |
| Dippi editorial still | `public/media/dippi-editorial.webp` | Original generated delivery concept for the fictional demo company. |
| Soapbox editorial still | `public/media/soapbox-editorial.webp` | Original generated laundry concept for the fictional demo company. |
| Manrope variable | `public/fonts/manrope-variable.ttf` | Self-hosted interface/display sans. License: `public/fonts/Manrope-OFL.txt`. |

These concept photos are explicitly demo-only. They are never attached to real private companies based on a matching name. The previous arch is retained as an available brand asset. See [PRODUCT_POLISH.md](PRODUCT_POLISH.md).

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
--fm-ink: #28352e;
--fm-paper: #f8f7f2;
--fm-mint: #a5b89c;
--fm-peri: #909be8;
--fm-muted: #626a61;
--fm-line: #d8ddd1;
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
