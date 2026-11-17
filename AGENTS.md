# AGENTS.md — Ringlume Virtual Receptionist Marketing Site

Instructions for coding agents working in this repository.

---

## What this project is

**Ringlume** is a static marketing site for a virtual receptionist product.

### Brand terminology

- Use virtual receptionist terminology throughout first-party code, website
  copy, metadata, tests, comments, and documentation. Never reintroduce the
  retired technical acronym or its expanded form; `brand-copy.test.ts` enforces
  this rule. Preserve required third-party identifiers, URLs, and original
  historical reports and logs.
- The embedded demo receptionist is **Ava**. Its heading is **Talk to Ava** and
  its description is **Ringlume's virtual receptionist. A real conversation.
  Not a recording.** The hero starts with **Virtual receptionist for arborists.**

| Fact                   | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| Framework              | **Astro 7** (static pages + on-demand Netlify API routes)   |
| CSS                    | **Tailwind CSS v4** via `@tailwindcss/vite`                 |
| Package manager        | **pnpm** (never npm / yarn / npx — use `pnpm` / `pnpm dlx`) |
| Node                   | `>=22.12.0`                                                 |
| Hosting                | **Netlify** (`netlify.toml` → `dist/`)                      |
| CMS                    | **None**                                                    |
| React / Next / Payload | **Not used**                                                |

Do **not** assume Next.js App Router, Payload CMS, or a monorepo app stack. This repo is a lean Astro landing site only.

---

## Quick commands

```sh
pnpm install          # install deps
pnpm dev              # http://localhost:4321
pnpm build            # static build → dist/
pnpm preview          # serve dist/
```

After meaningful UI/CSS changes, always run `pnpm build` and confirm it succeeds.

Vitest covers forms, demo-first CTAs, offer facts, FAQ content, legal-page
guardrails, and Retell config. Run `pnpm test`, `pnpm check` (Astro's checker),
and `pnpm build` as verification gates. There is no lint script.

---

## Repository map

```
/
├── AGENTS.md                 # this file
├── astro.config.mjs          # Vite + Tailwind, compressHTML, inlineStylesheets
├── package.json              # Astro, Tailwind CSS, and build tooling
├── netlify.toml              # build + cache/security headers
├── pnpm-lock.yaml
├── public/
│   ├── fonts/                # self-hosted Comfortaa woff2 (latin + latin-ext)
│   ├── images/               # optimized logos (webp + png fallbacks)
│   ├── favicons / PWA icons
│   └── Ringlume-Logo-No-Background.png  # source logo (prefer /images/* in UI)
└── src/
    ├── layouts/BaseLayout.astro   # HTML shell, meta, font/logo preload
    ├── styles/global.css          # Tailwind @theme, @font-face, utilities
    ├── pages/
    │   ├── index.astro            # landing composition
    │   ├── contact.astro
    │   ├── contact/thanks.astro    # noindex message confirmation
    │   ├── book-demo.astro        # personalized demo request
    │   ├── book-demo/thanks.astro # noindex demo confirmation
    │   ├── faq.astro
    │   ├── pricing.astro          # detailed plan comparison
    │   ├── privacy.astro
    │   └── terms.astro
    ├── components/                # section + chrome components (*.astro)
    └── assets/                    # leftover SVGs (mostly unused)
```

### Landing page composition (`src/pages/index.astro`)

```
BaseLayout
  Header
  main
    Hero                 # includes DemoSection (#demo), click-loaded Retell
    ReceptionistVisual   # #visual, one illustrative call-to-booking storyboard
    ReceptionistComparison # cited 2025 O*NET/BLS wage benchmark, not guaranteed savings
    Pricing              # plain-English benefits and plan caps; links to /pricing
    FomoSection          # #fomo, missed-call calculator only
    FAQ
    CtaSection
  Footer
```

Reuse this pattern for new marketing pages: layout → chrome → sections.

There is **no floating contact FAB**: `ContactWidget.astro` was deleted.
Channels (WhatsApp and support@ringlume.com) live on `/contact` only.
Footer and CtaSection link to `/contact`, with no direct channel links.
Existing legal-page contact lists remain unchanged except for the removed channel.

---

## Architecture rules

1. **Static first.** Prefer zero client JS. Interactive bits are tiny vanilla `<script>` blocks inside `.astro` files (menu, pricing toggle, missed-call calculator). The hero headline is static.
2. **No heavy frameworks.** Do not add React, Vue, Framer Motion, GSAP, analytics SDKs, or chat widgets unless explicitly requested.
3. **No third-party render-blocking scripts.** The Retell Web SDK and its audio dependencies are dynamically imported only after clicking **Try it now** inside `#demo`, never at page load or through a module preload. There is no Retell popup widget.
4. **Keep deps minimal.** The site has no payment integration, application database, account, entitlement, or webhook layer.
5. **pnpm only.**

---

## Design system

The site uses a **liquid-glass** design language, all defined in `src/styles/global.css`.

### Theming (dark only)

- One token block in `global.css` with `color-scheme: dark` on `:root`, mirrored by
  `<meta name="color-scheme" content="dark">` in `BaseLayout.astro`.
- There is **no light mode**: no dual-value color function, no `html` theme data
  attribute, no color-scheme media query, no toggle button, and no stored theme
  preference. Do not reintroduce any of them.
- Accessibility media queries are kept and are not theme code: `prefers-reduced-motion`,
  `prefers-reduced-transparency`, `prefers-contrast`, `hover/pointer`.

### Semantic tokens (use these, not raw hex)

| Utility / token              | Meaning                                        |
| ---------------------------- | ---------------------------------------------- |
| `text-fg-1/2/3`              | Primary / body / muted text                    |
| `text-brand-text`            | AA-safe green text on the dark page            |
| `bg-brand` / `border-brand`  | Static brand green fills/edges                  |
| `text-brand-ink`             | Near-black text on green CTAs                   |
| `border-line` / `border-line-strong` | Hairlines                               |
| `bg-surface-1/2`             | Page / panel surfaces                           |
| `text-danger` / `warn` / `info` / `violet` | Status colors                   |
| `text-h1`…`h3`, `text-lead`, `text-stat`, `text-display` | Fluid type scale    |
| `shadow-lift`                | Raised hover shadow (`--shadow-*` live in `@theme` so utilities generate) |

### Glass material

- `.glass` + one tier: `.glass-thin` / `.glass-regular` / `.glass-thick`
  (translucent fill + gradient edge + backdrop blur + specular inset + shadow stack).
- `.glass-fill` = same material **without** `backdrop-filter`; use for repeated items
  (pricing cards and other repeated panels). Tiers also drop blur below 768px (perf rule).
- `.glass-card` is the shared modifier for the homepage demo, receptionist
  storyboard, calculator shell, closing CTA, full FAQ panel,
  contact form/channel cards, demo-request form, confirmation pages, and Terms/Privacy
  cards. Pair with `.glass .glass-fill .glass-regular`: the shared `--card-fill`
  (`rgba(14, 18, 27, 0.66)`) matches the `/pricing` comparison table and standard
  pricing-card backgrounds exactly; grey borders/dividers, no white bevel,
  grain, per-card gradients, hover tint, or backdrop filter. Text stays opaque.
  Calculator inner panels stay clear to avoid stacking opacity. Reduced-transparency
  and high-contrast preferences retain an opaque fallback. Do not apply this
  modifier to header or pricing without being asked; their existing treatments stay.
- `.grain` = noise overlay; it also sets `position: relative` so the `::after` never escapes.
- `.scrim` / `.scrim-soft` are transparent section wrappers so the fixed `.scene`
  remains visible on every page (static near-black + persistent 28px dot grid at
  9% white + one green spotlight at top centre). Do not add masks or opaque section
  washes that hide the dots. **Do not add orbs or drifting blobs**: the scene never
  animates; ambient motion stays inside the hero demo (ripple rings, waveform,
  and rotating glass rim), paused via
  `html.is-paused`.
- Refraction: `.refract` only works under `html.refract` (Chromium-only, set in
  `BaseLayout` from `navigator.userAgentData`) + the `#liquid-glass` SVG filter.
  Keep it on the header nav pill only (amendment: header + at most one hero element).

### Utility classes (do not duplicate)

- `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-quiet` — pill CTAs (≥44px, light sweep)
- `.chip` + `.chip-danger` / `.chip-warn` / `.chip-brand` — uppercase pills
- `.eyebrow`, `.gradient-green-text` / `.gradient-text`, `.gradient-bg`, `.gradient-bg-muted`
- `.reveal` (boxes) / `.reveal-text` (text, blur allowed) — one shared IntersectionObserver
  in `BaseLayout.astro`; hidden state only exists after `html.reveal-ready`, and both the
  reveal classes and inline `--reveal-delay` are removed once the transition ends
- `.pricing-card` / `.pricing-card-popular` / `.toggle-active` / `.toggle-inactive`
- `.specular` — cursor-tracked glow (fine pointers + motion allowed; one rAF-throttled
  `pointermove` listener in `BaseLayout.astro` sets `--mx/--my`. Uses `::before` so it
  coexists with `.grain::after`)
- `.hero-rings` / `.hero-ring` are scoped to the hero's `DemoSection.astro`: concentric 1px brand outlines
  expanding with `transform: scale` + opacity only (no filter, no backdrop-filter),
  three staggered 8s loops, static fixed scales under
  `prefers-reduced-motion`, paused while the tab is hidden
- The demo waveform scales seven staggered bars; a separate pseudo-element
  rotates the glass rim while the core stays upright. Animate transform/opacity
  only, disable under reduced motion, and pause via `html.is-paused`. This is
  decorative animation, not a real-time audio meter; no new client JS is needed.
- Hero offer facts use a simple definition list, not nested glass cards.
- `ReceptionistComparison.astro` has the headline and content-width demo CTA
  beside one wage-versus-Basic comparison on desktop, stacked on mobile. Show
  Ringlume Basic and its enlarged monthly price only once, beside the green bar,
  at the same type scale as the wage benchmark. Do not restore the removed
  left-hand offer details, setup fee, feature list, overage line, or duplicate
  price in this section; those facts remain in pricing. Cost bars derive their
  proportions from the displayed monthly amounts.
  Highlight the wage benchmark in large type with a static soft-red diagonal
  5px strike, using `--danger`. Keep its receptionist-wage label; it is not a former
  Ringlume price or an actual sale discount.
  Keep the source and non-equivalence/savings qualifications. No glow, animated
  bars, new client JS, or glowing CTA treatment in this section.
- Homepage feature previews are illustrative tree-care examples, visibly labelled
  illustrative. Do not present them as real customer activity or performance data.
- `ReceptionistVisual.astro` is the single homepage call demonstration, directly
  after Hero. Its `#visual` storyboard follows one fictional after-hours tree-care
  call through captured details, an agreed estimate booking, and a team summary.
  A short static note explains that booking is only one possible outcome;
  transfers or messages depend on the business's rules and availability.
  Do not restore the removed Capabilities/CapabilityCard demonstration or a
  second version of the same caller's story. A zero-height `#capabilities`
  bookmark alias remains inside `#visual`; Features and its scroll-spy mapping
  target `/#visual`. Desktop places conversation and outcomes side by side;
  mobile stacks them with a compact single-slot calendar. Timing and example
  data live in `src/lib/receptionist-visual.ts`, covered by Vitest. The conversation
  is a continuous 18rem inbox with eight alternating, compact glass/green bubbles,
  speaking dots, a message counter, and automatic scrolling, not replacing pairs
  of messages. Use the former capabilities first-step cadence: messages arrive
  at 200, 850, 1500, 2250, 3100, 3900, 4700, and 5600ms. This is a one-shot
  7.82-second timeline, never a loop. Each bottom progress border progressively
  fills around its card, synchronized with its stage, then stays as a full green
  outline. Use an accumulating stroke, not a circulating short loading dash.
  At each stage's completion, draw a persistent top-right checkmark along its curved SVG path over
  420ms, using the same clock. Replay appears after the timeline's final tick;
  pausing freezes the ink mid-stroke. The three progress buttons seek to their
  stage boundaries, retain earlier stages as complete, and continue through all
  remaining stages and the final check. Never stop at an intermediate stage.
  Replay repeats from the selected starting point through the timeline's end;
  after a full run it restarts the full timeline. Static/no-JS and reduced motion
  show all three full outlines and checks without drawing motion; reduced-motion
  playback controls are disabled.
  Captured name/address/phone/request/time details
  highlight 500ms after their message appears. Booking and team-summary cards
  slide from measured inbox origins into reserved destination mounts, using the
  same clock as the borders; no independent repeating CSS animations. Preserve
  offscreen/hidden-tab pauses; keep playback active while the scene or its event
  controls are onscreen. At full timeline completion stop the clock and replace
  Pause with Replay; scrolling back into view must not restart it. Replay and
  progress-button selection reset the messages, highlights, transfers, and
  borders to the selected segment's start. The completed inbox supports
  manual scrolling. Reduced motion shows the completed static view immediately.
  Control, calendar/team labels, and the call subtitle share `--visual-ui-size`;
  the company name is 0.125rem larger. Preserve these size relationships.
  Preserve the illustrative-example badge, pause/resume/replay control,
  offscreen and hidden-tab pausing, complete screen-reader transcript, static
  no-JS/reduced-motion view, and contrast/transparency fallbacks. Add no animation
  dependencies or blurred glow.
- `FAQ compact` enables the homepage-only split layout; `/faq` keeps its full layout.
- `@utility content-auto` — `content-visibility: auto` for below-the-fold sections
- Shared component classes live in `@layer components`, so Tailwind utilities in markup
  always win (e.g. `hidden md:inline-flex` over `.btn`).

### Typography

- Headings: **Comfortaa** (self-hosted variable 400–700). Body/UI: **Plus Jakarta Sans**
  (self-hosted variable 200–800). Both in `public/fonts/` (latin + latin-ext).
- Loaded via `@font-face` in `global.css` with `font-display: swap`; latin subsets preloaded
  in `BaseLayout.astro`. Metric-adjusted fallback faces keep CLS near zero.
- **Do not** reintroduce Google Fonts CDN links

**CSS minify gotcha:** never use `U+0000` in `unicode-range` — some minifiers corrupt it to `U+??`. Use `U+0020-00FF` (or similar) for latin.

**Vendor-prefix gotcha:** Vite 8 minifies CSS with LightningCSS using `build.cssTarget`
(default `baseline-widely-available`), which drops `-webkit-backdrop-filter`.
`astro.config.mjs` pins `cssTarget: ['chrome100','firefox100','safari17']` — it must stay
an **array** (Vite's converter does not split comma strings, so a string silently
degrades to Chrome-only and the prefix is lost again).

---

## Performance conventions (mandatory)

Mobile PageSpeed (LCP, FCP, CLS, INP, TBT) is a first-class concern.

### Fonts

- Self-host only; keep latin (+ latin-ext if needed).
- Preload the primary woff2 in `BaseLayout`.
- Keep the metric-adjusted `Comfortaa Fallback` face.

### Images

- Prefer `public/images/*` optimized assets over the full-size source PNG.
- Current logos:
  - Header: `/images/logo-240.webp` (+ `.png` fallback), 240×96
  - Footer: `/images/logo-320-trimmed.webp` (+ `.png` fallback), 292×128
    (trimmed copy of `logo-320`: the original's 28px transparent left padding
    is cropped off so the logo renders flush with the column text; keep the
    originals for reference)
- Always set explicit `width` and `height`.
- Above-fold: `fetchpriority="high"`, `decoding="async"`.
- Below-fold: `loading="lazy"`, `decoding="async"`.
- Prefer `<picture>` with WebP + PNG fallback.
- When adding new images: resize to display size, export WebP, keep a PNG/SVG fallback, put under `public/images/`.

### Paint / GPU

- Avoid many stacked `blur-3xl` / `backdrop-blur` layers on mobile.
- Header: glass pill on all sizes (`.glass-regular`; blur is dropped below 768px by the tier media query).
- Ambient colour comes from the fixed `.scene` backdrop; do not stack per-section blur orbs.
- Glass: tiers drop `backdrop-filter` below 768px; `.glass-fill` never has it.
- Respect `prefers-reduced-motion` for animations and motion-heavy effects.

### JS

- Keep scripts tiny and local to the component.
- Non-critical timers (e.g. hero rotation) should start via `requestIdleCallback` (with `setTimeout` fallback).
- Do not load Lemon Squeezy, GTM, Meta Pixel, chat widgets, or other third-party JS unless asked.

### CSS / HTML

- Below-fold sections should use `content-auto` where appropriate.
- Do not resurrect dead Lemon Squeezy overlay CSS (removed).
- `astro.config.mjs`: `compressHTML: true`, `inlineStylesheets: 'auto'`.

### Caching

`netlify.toml` already sets long-cache immutable headers for:

- `/fonts/*`, `/images/*`, `/_astro/*`
- static extensions (`ico|svg|png|jpg|jpeg|webp|avif|woff2`)

Plus basic security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`). Preserve these when editing deploy config.

---

## Component conventions

### Astro components

- One section / concern per file under `src/components/`.
- Frontmatter (`---`) for data and imports; markup below.
- Use Tailwind utility classes + shared utilities from `global.css`.
- Client JS only inside a component-scoped `<script>` when necessary.
- Use semantic HTML (`header`, `main`, `section`, `footer`, `nav`) and accessible labels on icon buttons.

### Pages

- Every page wraps content in `BaseLayout` with `title` + `description`.
- Legal pages (`privacy`, `terms`) are long static content — keep English-only unless asked otherwise.
- Do not renumber existing legal sections or rewrite unrelated legal wording
  without explicit approval. The approved technical-detail relocation adds
  Terms 2.1 (`#service-details`), 3.1 (`#billing-details`), and 3.2 (`#estimates`).
  The approved setup-fee upgrade credit is explained in 3.3 (`#setup-fee-upgrades`).
  The existing setup clause remains 7.1, anchored at `/terms#setup-time`.
- The footer links to Free Demo, Terms, Privacy, and Contact. There is no refund page; Terms states the no-refund policy.

### Demo-first conversion and offer facts

- Primary conversion: `/book-demo`, a personalized demo request. Header CTA:
  **Free Demo**. Hero/pricing/CtaSection CTA: **Get Your Free Demo**.
- Secondary conversion: homepage `#demo`, the generic live Retell demo.
  All live-demo links and launcher buttons say **Try it now**. Header links to
  the actual `#demo` card inside the hero, using native smooth scrolling with
  header clearance. There is no duplicate live-demo CTA beside the hero copy.
- Header Pricing links directly to `/pricing`. There is no homepage pricing
  anchor or pricing scroll-spy mapping.
- `src/lib/offer.ts` is the single source for offer facts, `SUPPORTED_STACK`,
  and `CAL_BOOKING_URL`. Meeting links appear only on `/book-demo/thanks`
  and inside the Terms setup clause.
- Demo delivery: **within 1 hour** by email from form submission, any time of
  day. Show this only below the demo form button and on `/book-demo/thanks`.
- Demo allowance: **free for up to 10 minutes**, from `DEMO_FREE_MINUTES`.
  Hero stat is `{DEMO_FREE_MINUTES} Min / Free Demo`; its other stat stays
  `24/7 / Always Working`.
- Production setup uses an estimated launch date for the agreed scope, not a
  universal hourly or daily deadline. Do not publish an unvalidated numeric
  range. Terms 7.1 (`/terms#setup-time`) defines straightforward versus custom
  setup, confirmed scope and required information/access, Ringlume's setup
  queue, configuration, testing, customer approval, and timing dependencies.
  Ready for testing is not live; launch requires approved production routing.
- The homepage hero's text below its `/book-demo` CTA is
  **Talk to a receptionist that knows your business.** It reinforces the
  personalized demo, not the production setup process.
- Only `Pricing detailed` shows the short setup/testing explanation and Terms
  setup link below the cards; homepage pricing does not repeat it.
  The setup FAQ stays brief and links to Terms. Keep full prerequisites,
  preferred tool lists, and timing explanations in Terms, not marketing copy.
- Preferred tools are recommendations, not requirements or guaranteed native
  integrations. Complex routing, PBX/custom CRM work, number porting, and
  regulated requirements are scoped individually. Explain timing changes and
  confirm revised estimates. Setup dates are estimates, not guarantees.
  Business-day estimates use Saturday-Thursday, excluding U.S. federal holidays,
  in Eastern Time (America/New_York); the separate demo offer is unchanged.
- `src/data/faqs.ts` feeds the FAQ component. `src/data/faqs.md` is a docs-only
  mirror, checked by tests but not consumed by site generation. Keep each answer
  short; use Terms links for technical explanations.

### Static Netlify forms

- `DemoRequestForm.astro` uses `src/lib/demo-form.ts` for the website pattern
  and stable referral choices. Its six fields submit as `demo-request` to
  `/book-demo/thanks`. Label the website field “Company website”; keep Terms
  and Privacy links in the notice below the submit button.
- `ContactForm.astro` has two required fields, email and message, and submits
  as `contact-message` to `/contact/thanks`.
- Preserve POST, hidden `form-name`, and the `bot-field` honeypot. Field names
  are stable Netlify schema keys. No AJAX, client scripts, or captcha.
- Thanks pages use `BaseLayout noindex`, a home-linked logo, no Header/Footer,
  and the existing scene backdrop. No sitemap or robots.txt currently exists.
- Forms work on a Netlify deploy, not localhost. Make.com delivery, notifications,
  and the voice-platform duration cap are owner tasks outside this repository.

### Pricing CTAs

- Plan facts live in `src/lib/pricing.ts`, shared by `Pricing.astro`, the wage
  comparison, `/pricing`, and Terms billing details. Preserve the current four prices and fees; upstream
  Trillet agency-wide pricing is not a per-client Ringlume package cost.
- Additional-minute rates are per-plan (`overagePerMinute`), not one global rate.
  Agent bundles (`agents`) and card benefits must stay consistent with that same
  shared plan data.
- SMS rates (`smsPerMessage`) are $0.04 on Basic/Pro and $0.03 on Plus/Max.
  Live transfers (`liveTransferPerMinute`) are $0.10/minute on Basic/Pro and
  $0.08/minute on Plus/Max. Shared `USAGE_RATES` sets additional phone numbers
  at $5/month per number for every plan.
- Upgrades credit all Service Setup Fees already paid, including earlier setup
  top-ups. Only a positive difference is due; subscription proration is separate.
  Show a short linked note below both pricing grids and keep the full policy and
  examples in `/terms#setup-fee-upgrades`. Derive example amounts from `PLANS`.
- Homepage cards show five practical benefits on Basic/Pro and six on Plus/Max,
  including simultaneous-call caps and included phone numbers. Plus/Max include
  "Everything included in Pro". Other technical allowances, integrations,
  and support detail live in the `/pricing` comparison table.
- Keep public copy short and practical. Billing mechanics, setup constraints,
  compliance qualifications, and estimate methodology live in Terms. Prices,
  setup fees, extra-minute rates, source citations, and essential limitations
  remain visible where relevant.
- `/pricing` starts with `Pricing detailed`, which renders the page's H1 without
  a second introduction. On mobile below 640px, the comparison table's first
  column is sticky with an opaque background; wider layouts are unchanged.
  Group its rows into Usage & rates, Agents & phone numbers, Tools & reporting,
  and Support & compliance. Do not repeat monthly/annual subscriptions or setup
  fees in the table. Live transfers immediately follow additional call minutes.
  User Dashboard is Included and HIPAA & BAA Compliance is Available on all
  plans, subject to the linked scope/configuration qualification.
- Annual monthly equivalents retain the existing approximate displays. Show the
  actual annual charge beside them; never calculate the charge from the rounded display.
- Do not assert HIPAA/GDPR/SOC 2 certification from a plan name or an upstream
  platform claim. Compliance and regulated workflows require confirmed scope.
- All four CTAs are `<a href="/book-demo">Get Your Free Demo</a>`
  elements carrying `data-plan`. Neither homepage nor `/pricing` cards show
  per-CTA legal notices or their `aria-describedby` references. Footer legal
  links and the setup-fee upgrade note remain. There is no payment or checkout
  integration.
- The only script in the section is the Monthly/Annually display toggle.
- The Annually savings badge uses `--annual-discount-fill: #F50909EB` exactly,
  including its alpha, with the existing white text on both the homepage and
  `/pricing`. Do not recolor other danger/status treatments to match it.

### Contact

- WhatsApp: `https://wa.me/8801951284128`
- Email: `support@ringlume.com`

### Retell voice demo

- **Integration: `retell-client-js-sdk` 3.0.3**, using
  `RetellClient({ key: publicKey }).createWebCall({ agent_id, hooks })`.
  Retell's current SDK supports public-key browser authentication directly;
  do not add a backend or put a secret API key in client code. Consult the
  current [web-call documentation](https://docs.retellai.com/deploy/web-call)
  before upgrading: older 2.x examples use a different API.
- **Inline interface:** `src/components/DemoSection.astro` keeps the existing
  glass card and decorative waveform. One **Try it now** click starts connecting
  inside `#demo`, with browser microphone permission when needed. The card owns
  cancellation, connection status, timer, mute/unmute, hangup, errors, and retry.
  There is no popup, floating launcher, injected widget script, shadow-DOM
  polling, or second **Start to call** step. Do not restore those workarounds.
- **Lifecycle:** `src/lib/retell-demo.ts` prevents duplicate calls and ignores
  stale callbacks after cancellation/retry. Connections time out after 45 seconds;
  page exit (`pagehide`) and offline events terminate active/pending sessions.
  The elapsed timer uses the connection timestamp, not interval tick counts, and
  stays outside the status live region. Hidden-tab animation pausing does not
  hang up a call. Lifecycle tests use injected mocks, never billable calls.
- **Browser preparation:** `src/lib/retell-browser.ts` dynamically imports the
  SDK only after the click, checks secure context/connectivity, and obtains
  microphone permission before creating a session. It immediately stops every
  temporary permission-check track, even if permission arrives after cancellation.
  The SDK owns the actual call's audio resources. Optional reCAPTCHA is loaded
  on demand and executed with a fresh token for each attempt.
- **Config flow:** `.env` → `PUBLIC_RETELL_VOICE_PUBLIC_KEY`,
  `PUBLIC_RETELL_VOICE_AGENT_ID`, `PUBLIC_RETELL_RECAPTCHA_KEY` (optional,
  currently empty — calls work without reCAPTCHA) →
  `src/lib/retell-config.ts` (`getRetellConfig()`, placeholders rejected) →
  rendered as `data-retell-*` on `#demo`. Values are baked into static HTML at
  build time; the section renders nothing if unset. Both Retell values are
  public (browser-exposed, domain-scoped) and are listed in
  `netlify.toml` `SECRETS_SCAN_OMIT_KEYS`. Only a Google site key belongs in
  `PUBLIC_RETELL_RECAPTCHA_KEY`; its secret stays in the dashboard.
- **Domain restrictions:** the public key's known allowed origins are
  `https://ringlume.com` and `https://www.ringlume.com`. Other origins, including
  localhost and deploy previews, require owner approval in the Retell dashboard.
  A rejected `/v3/create-web-call` now produces a visible authorization error
  instead of the old widget's silent `00:00` failure. Do not change dashboard
  settings or create real calls without confirmation.
- **Autoplay:** Brave and other browsers can block agent audio even when the
  call connects successfully. The card keeps **No sound? Enable audio** available
  throughout live calls, calling `startAudioPlayback()` directly from that click.
  A browser-level sound/autoplay block may still require a site permission change.
  The SDK can swallow initial playback errors, so do not assume a successful
  connection or playback method call proves audible output.
- **Verification:** run `pnpm test`, `pnpm check`, and `pnpm build`; verify the
  SDK chunk is absent from initial HTML scripts/module preloads. Its separate
  ~571 kB minified chunk currently triggers Vite's 500 kB warning; keep it deferred,
  not a higher warning limit. Manually test permission denial/allow, cancellation,
  retries, two-way audio, mute, hangup, offline/page exit, Brave, and mobile Safari
  on an allowed domain. A healthy create request returns `201`, followed by a
  working audio transport and a running timer. The 10-minute duration cap and
  abuse-prevention settings are separate owner-managed Retell dashboard settings;
  domain restrictions alone are not comprehensive abuse protection.

Keep the channel details on `/contact` unchanged. Footer and CtaSection link
to `/contact`; neither contains WhatsApp or email links. The retired messaging
channel is removed, including its legal-page mentions.

---

## Editing guidelines

### Do

- Match existing visual language (liquid-glass panels, brand greens, rounded-full CTAs).
- Prefer Server-rendered static HTML; minimize client JS.
- Optimize new media before commit.
- Run `pnpm build` after structural/CSS changes.
- Keep responses and code comments minimal unless complexity requires explanation.

### Don't

- Add Storyblok / CMS scaffolding without being asked.
- Switch package managers.
- Introduce Google Fonts or other render-blocking third-party CSS.
- Add analytics or heatmaps without explicit request (TBT/privacy impact).
- Commit `.env`, secrets, or large unoptimized binary assets.
- Use `npm` / `npx` in docs or scripts.

### Code style

- Prettier: single quotes, trailing commas, printWidth 80, **tabs** (see `.prettierrc`).
- TypeScript config extends `astro/tsconfigs/strict`.
- Prefer clear names over clever abstractions in a small site.

---

## Deploy

| Setting           | Value            |
| ----------------- | ---------------- |
| Platform          | Netlify          |
| Build command     | `pnpm build`     |
| Publish directory | `dist`           |
| Node version      | `22`             |

Push-triggered deploys from Git. No server runtime, no edge middleware in-repo.

---

## Common tasks (cheatsheet)

| Task                           | Where / how                                                |
| ------------------------------ | ---------------------------------------------------------- |
| Change hero copy               | `src/components/Hero.astro`                                |
| Change pricing facts / copy    | `src/lib/pricing.ts` + `src/components/Pricing.astro`        |
| Detailed plan comparison       | `src/pages/pricing.astro`                                  |
| Wage comparison / source       | `src/components/ReceptionistComparison.astro`              |
| Change meeting URL / offer facts | `src/lib/offer.ts`                                      |
| Demo request fields / choices | `DemoRequestForm.astro` + `src/lib/demo-form.ts`             |
| Contact message fields        | `src/components/ContactForm.astro`                         |
| Nav links                      | `src/components/Header.astro`                              |
| Footer / legal links           | `src/components/Footer.astro`                              |
| Brand colors / fonts           | `src/styles/global.css` `@theme` + `@font-face`            |
| SEO title/description defaults | `src/layouts/BaseLayout.astro`                             |
| Landing section order          | `src/pages/index.astro`                                    |
| Receptionist storyboard / timing | `src/components/ReceptionistVisual.astro` + `src/lib/receptionist-visual.ts` |
| Talk to Ava (Retell)          | `src/components/DemoSection.astro` + `PUBLIC_RETELL_*`      |
| Cache / security headers       | `netlify.toml`                                             |
| New page                       | `src/pages/<slug>.astro` + link from Header/Footer         |

### Adding a new below-fold section

1. Create `src/components/MySection.astro`.
2. Root element: `<section class="... content-auto">`.
3. Import and place in `index.astro` (or the target page).
4. Avoid heavy blur stacks on mobile.
5. `pnpm build`.

### Replacing the logo

1. Export WebP (+ PNG) at display size into `public/images/`.
2. Update `Header.astro` / `Footer.astro` `<picture>` sources and dimensions.
3. Update logo preload in `BaseLayout.astro` if the header asset path changes.
4. Keep aspect ratio consistent (source logo is ~790×316).

---

## Known pitfalls

1. **`package.json` name** is `ringlume`; this is not a monorepo.
2. **`public/Ringlume-Logo-No-Background.png`** is large; UI must use `/images/logo-*` variants.
3. **Unicode-range minify bug** — see Typography section.
4. **No browser automation** — visual/regression checks are manual + production PSI.

---

## Verification checklist (before finishing a task)

- [ ] `pnpm build` succeeds
- [ ] No new Google Fonts / third-party blocking tags in layout
- [ ] Images have dimensions + correct loading priority
- [ ] Mobile-friendly: limited blur, no layout shift from fonts/images
- [ ] Contact/pricing links still correct
- [ ] No secrets committed

---

## Out of scope (unless user explicitly asks)

- Migrating to Next.js / Payload / another backend
- Wiring Storyblok or another CMS
- Adding auth, dashboards, or app backend
- Installing analytics / pixels / chat SDKs
- AUR packages or system-wide installs without confirmation

---

## Agent communication

- Be concise and direct.
- Prefer implementing over long plans once direction is clear.
- Do not commit unless the user asks.
- Keep the site payment-free; do not add a payment or checkout integration unless asked.
- Never commit `.env` or its values.
