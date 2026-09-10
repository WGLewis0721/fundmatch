# FundMatch — a little chemistry

September 2026 visual identity milestone, requested by the product owner.

## Design direction

A premium venture journal: generous editorial type, tactile materials and a warm working environment. Off-white carries approximately 60% of the surfaces, sage 30%, and periwinkle 10%. Ink supports legibility. This replaces the previous charcoal-heavy/mint direction.

The homepage introduces the brand with an asymmetric composition and a ceramic/glass arch. Sage frames the existing product film. Inside the product, the sage navigation rail, layered discovery cards, a visible thesis-fit scale, and founder preparation panels carry the same identity. Cards enter on company changes; buttons and navigation respond to hover/press. Reduced-motion preferences disable these transitions.

## References

- [Dribbble: Investment Platform Landing Page by Awsmd](https://dribbble.com/tags/startup-funding): inspected the investment-platform reference image. Adopted its restrained accent use, clear CTA hierarchy and spacious composition; no reference artwork or layout was copied.
- [Awwwards: OVA Investment](https://www.awwwards.com/sites/ova-investment): its clean, 3D and motion-led investment presentation informed the material-led direction. FundMatch retains its own palette and working product controls.
- [Aura design systems](https://www.aura.build/design-systems): requested reference; the public page returned only a client-rendered shell to text retrieval, so no specific Aura template or tokens are claimed as inspected or reused.

## Original artwork

Created with built-in Create Image/imagegen: one 1536 × 1024 landscape PNG, encoded to `public/media/fundmatch-arch.webp` for the product (approximately 33 KB). The image is decorative, not a representation of real investor/company activity. The homepage has descriptive alt text; its repeated workspace treatment is hidden from assistive technology.

Prompt:

> One premium 3D editorial still in landscape 3:2 format, showing exactly two beautiful complementary sculptural ribbon forms curving toward one another to create an elegant open arch, symbolic of founders and investors finding fit. Warm off-white (#F8F7F2) seamless studio ground. One matte sage ceramic ribbon (#A5B89C), one translucent periwinkle glass ribbon (#909BE8). Tactile frosted surfaces, museum and product-design quality, clean striking silhouette. Composition weighted toward center-right, airy top-left negative space. Approximately 60% off-white, 30% sage, 10% periwinkle, charcoal only in fine details. Strong soft daylight shadows, sophisticated quiet studio atmosphere. No text, letters, numbers, UI, coins, dollar symbols, charts, people, stock-photo handshake, or watermark.

Higgsfield was consulted and cost-estimated for a companion readiness still. Generation returned `Requires basic plan or higher`. No trial was activated and no Higgsfield asset is represented as delivered. The existing product film is retained; it was not created in this pass.

## Typography and implementation

Instrument Serif regular/italic is self-hosted under `public/fonts/`, with its SIL Open Font License. System sans-serif keeps interface text familiar. No additional runtime dependencies or remote font calls were added.

- `src/fundmatch.css`: shared brand colors and existing structural rules.
- `src/fundmatch-personality.css`: visual treatment and responsive/reduced-motion rules.
- `src/styles.css`: semantic colors for shared controls.
- `src/components/fundmatch/brand-details.tsx`: score scale and workspace signature, shared by demo and private workspace.
- Scores retain their original rules-based values and labels; the visual ring is not investment probability.
- Current links, forms, decisions, storage and founder-packet boundaries stay functional.

## Validation

TypeScript validation, the full app build, static Pages build and 40 local unit tests pass. Database isolation tests require the separate CI database environment. The Pages finalizer checks the new art and font files alongside the existing media. Browser visual QA was not performed.

This milestone does not deploy or verify the private Supabase backend. GitHub Pages remains the public demo.
