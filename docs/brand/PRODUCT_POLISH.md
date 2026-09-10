# FundMatch product polish — second pass

The previous design put an abstract brand sculpture ahead of the product and made the discovery view read like two long text panels. This pass centers company discovery and investor/founder actions while keeping the owner's 60/30/10 off-white, sage and periwinkle palette.

## What changed

- A functional homepage preview switches between investor and founder perspectives, cycles through Dippi and Soapbox Caddie, and opens the corresponding real demo view.
- Manrope gives the interface stronger weight and readability; Instrument Serif is reserved for selected editorial moments. Both are self-hosted with their OFL licenses.
- A shared discovery card shows company imagery or sector identity, stage, thesis fit, company story, metrics and decision controls.
- Drag/swipe horizontally to pass or mark interested. Taps, short drags and vertical/diagonal scrolling do not decide. When the card itself is keyboard-focused, left/right arrows and S invoke Pass/Interested/Save. Nested controls keep normal keyboard behavior.
- The same decision callbacks and pending states are used in demo and authenticated surfaces. No scoring, introduction, account or storage rules change.
- Cards use restrained entrance/press feedback, readable controls, visible focus and reduced-motion support.

## Original assets

Two original 1536×1024 stills were generated with built-in Create Image and encoded to WebP. They are concept images for fictional demo businesses. Real private company profiles use a sector icon treatment; these photos are never inferred from a real company name.

**Dippi prompt:** Create exactly one landscape 3:2 premium editorial product photograph for fictional Dippi, a local liquor delivery startup. A structured sage green reusable delivery tote with two sealed elegant unlabeled dark glass wine bottles partly visible, and a folded ivory receipt with no readable text. Warm off-white apartment doorway with a pale sage wall and small periwinkle door trim accent. Expensive realistic campaign photography; close-up product still life, refined framing, tactile materials. Hard afternoon sunlight and stylish shadows. Muted green and cream. No people, text, logos, UI or watermark.

**Soapbox prompt:** Create exactly one landscape 3:2 premium editorial product photograph for fictional Soapbox Caddie, a pickup laundry startup. A sculptural stack of neatly folded cream cotton towels and sage linen on a light oak bench alongside a sage green canvas laundry bag with a small periwinkle fabric tab. Warm off-white interior, expensive realistic campaign photography, tactile fabric details, close-up product still life, strong natural side daylight and editorial shadows. Muted sage, cream and pale oak. No people, text, logos, UI or watermark.

## Verification

Typecheck, full app build, Pages build, and 43 unit tests pass, including three focused gesture checks. Existing database isolation tests run in CI. The supervised preview starts, but its internal address is blocked by the cloud-browser environment. No private backend acceptance is claimed; GitHub Pages still hosts the public demo.
