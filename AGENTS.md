# AGENTS.md — Ringlume Voice AI Marketing Site

Instructions for AI coding agents working in this repository.

---

## What this project is

**Ringlume** is a static marketing site for a Voice AI receptionist product.

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
    Hero
    FomoSection
    Capabilities
    DemoSection        # live Retell voice demo; renders nothing when PUBLIC_RETELL_* unset
    Pricing
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

1. **Static first.** Prefer zero client JS. Interactive bits are tiny vanilla `<script>` blocks inside `.astro` files (menu, pricing toggle, hero word rotation).
2. **No heavy frameworks.** Do not add React, Vue, Framer Motion, GSAP, analytics SDKs, or chat widgets unless explicitly requested.
3. **No third-party render-blocking scripts.** The Retell demo widget (`~1.4 MB`) is injected only when someone clicks a demo CTA — never at page load.
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
  (pricing cards, capability cards). Tiers also drop blur below 768px (perf rule).
- `.grain` = noise overlay; it also sets `position: relative` so the `::after` never escapes.
- `.scrim` / `.scrim-soft` = base-color wash so small text keeps contrast over the
  fixed `.scene` backdrop (static near-black + masked 28px dot grid + one green
  spotlight at top centre). **Do not add orbs or drifting blobs**: the scene never
  animates; the only ambient motion is the hero's ripple rings, paused via
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
- `.hero-rings` / `.hero-ring` — hero-only ripple rings: concentric 1px brand outlines
  expanding with `transform: scale` + opacity only (no filter, no backdrop-filter),
  6-9s staggered loops, 3 rings at <=768px, static fixed scales under
  `prefers-reduced-motion`, paused while the tab is hidden
- `.stat-strip` / `.stat-number` / `.stat-divider` — hero trust bar: one in-flow
  `glass-regular` strip, two equal columns split by a fading 1px hairline
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
- Legal pages are otherwise untouched: only the approved setup-time clause and
  channel removal were authorized. Do not renumber existing sections or rewrite
  other legal wording without explicit approval. The setup clause is 7.1 under
  Service Availability & Uptime, anchored at `/terms#setup-time`.
- The footer links to Free Demo, Terms, Privacy, and Contact. There is no refund page; Terms states the no-refund policy.

### Demo-first conversion and offer facts

- Primary conversion: `/book-demo`, a personalized demo request. Header CTA:
  **Free Demo**. Hero/pricing/CtaSection CTA: **Get Your Free Demo**.
- Secondary conversion: homepage `#demo`, the generic live Retell demo.
  Header navigation says **Live Demo**, hero says **Try the Live Demo**.
  The Pricing nav anchor remains `/#pricing`.
- `src/lib/offer.ts` is the single source for offer facts, `SUPPORTED_STACK`,
  and `CAL_BOOKING_URL`. Meeting links appear only on `/book-demo/thanks`
  and inside the Terms setup clause.
- Demo delivery: **within 1 hour** by email from form submission, any time of
  day. Show this only below the demo form button and on `/book-demo/thanks`.
- Demo allowance: **free for up to 10 minutes**, from `DEMO_FREE_MINUTES`.
  Hero stat is `{DEMO_FREE_MINUTES} Min / Free Demo`; its other stat stays
  `24/7 / Always Working`.
- Production agent target: **within 12 hours** with preferred tools, starting
  only after a conversation and confirmed requirements. This figure belongs
  only in the Terms clause and existing setup FAQ answer, never in plan cards,
  hero, CTAs, metadata, or `/book-demo`.
- **Go live in an afternoon** must have **under best circumstances** beside
  it, or the full explanation in Terms/FAQ. The pricing disclosure is below
  the cards, with a 12px qualifier linking to `/terms#setup-time`.
- Preferred tools are recommendations, not requirements or guaranteed native
  integrations. Existing PBX/custom CRM setups are more complex and take
  longer; give no time figure for them. Setup times are targets, not guarantees.
- `src/data/faqs.ts` feeds the FAQ component. `faqs.md` is a docs-only mirror,
  checked by tests but not consumed by site generation.

### Static Netlify forms

- `DemoRequestForm.astro` uses `src/lib/demo-form.ts` for the website pattern
  and stable referral choices. Its six fields submit as `demo-request` to
  `/book-demo/thanks`.
- `ContactForm.astro` has two required fields, email and message, and submits
  as `contact-message` to `/contact/thanks`.
- Preserve POST, hidden `form-name`, and the `bot-field` honeypot. Field names
  are stable Netlify schema keys. No AJAX, client scripts, or captcha.
- Thanks pages use `BaseLayout noindex`, a home-linked logo, no Header/Footer,
  and the existing scene backdrop. No sitemap or robots.txt currently exists.
- Forms work on a Netlify deploy, not localhost. Make.com delivery, notifications,
  and the voice-platform duration cap are owner tasks outside this repository.

### Pricing CTAs

- Plans live in `Pricing.astro` frontmatter.
- All four CTAs are `<a href="/book-demo">Get Your Free Demo</a>`
  elements carrying `data-plan` and an `aria-describedby` link to the legal
  notice under the button. There is no payment or checkout integration.
- The only script in the section is the Monthly/Annually display toggle.

### Contact

- WhatsApp: `https://wa.me/8801951284128`
- Email: `support@ringlume.com`

### Retell voice demo

- **Embedding method: Retell website widget v2 (script tag), not the
  `retell-client-js-sdk` npm package.** The bundle
  `https://dashboard.retellai.com/retell-widget-v2.js` is injected on demand by
  `src/components/DemoSection.astro` when someone clicks **Talk to the demo**
  (it is never loaded at page load — see performance rules). The injected tag
  must keep `id="retell-widget"`: the widget reads its config from
  `data-voice-public-key` / `data-voice-agent-id` / branding `data-*` attributes
  on that exact element (`document.getElementById('retell-widget')`). It mounts
  its whole UI in a shadow root (`#retell-widget-root`), so queries must pierce
  shadow DOM (the component already does this).
- **Config flow:** `.env` → `PUBLIC_RETELL_VOICE_PUBLIC_KEY`,
  `PUBLIC_RETELL_VOICE_AGENT_ID`, `PUBLIC_RETELL_RECAPTCHA_KEY` (optional,
  currently empty — calls work without reCAPTCHA) →
  `src/lib/retell-config.ts` (`getRetellConfig()`, placeholders rejected) →
  rendered as `data-retell-*` on `#demo`. Values are baked into static HTML at
  build time; the section renders nothing if unset. Both Retell values are
  public (browser-exposed, domain-scoped) and are listed in
  `netlify.toml` `SECRETS_SCAN_OMIT_KEYS`. The `ALLOWED_ORIGINS` list in
  `DemoSection.astro` mirrors the Retell dashboard allowlist — keep in sync.
- **Root cause of "widget opens but agent never responds":** the public key is
  **domain-restricted in the Retell dashboard to `https://ringlume.com` and
  `https://www.ringlume.com` only.** On any other origin (`localhost:4321`,
  `astro preview`, `*.netlify.app`, tunnels) `POST
  https://api.retellai.com/v3/create-web-call` returns **401**, and the widget
  swallows the error: the panel opens, "Start to call" works, the timer stays
  `00:00`, no greeting, no visible error. Key + agent ID themselves are valid
  (a `create-web-call` with `Origin: https://ringlume.com` returns 201).
  `DemoSection.astro` now logs a `console.warn` on non-allowlisted origins so
  the failure is no longer silent.
- **Second root cause (browser-side): autoplay blocking.** If the call connects
  (timer ticks, network shows `201 create-web-call` + healthy
  `/webrtc-proxy/.../webrtc/sessions`) but *no* agent audio is heard, check the
  browser's autoplay policy. The widget plays the agent's audio through an
  autoplay `<audio>` element (`srcObject` + `setSinkId`) plus an `AudioContext`
  graph — **Brave (and Chrome with autoplay set to "Block") silently suppress
  it**, producing a perfectly silent but otherwise healthy call. Confirmed
  2026-09-27: enabling autoplay for `ringlume.com` in Brave fixed it with zero
  code changes. Distinguish this from the 401 case above by checking the
  network tab first: 401 = domain allowlist; 201 + silent = autoplay/output.
- **Fix / verification:**
  1. To test locally, add the dev origin (e.g. `http://localhost:4321`) to the
     public key's allowed domains in the Retell dashboard — or test on
     production. This is a dashboard change; do not attempt it from the repo.
  2. Quick API check:
     `curl -X POST https://api.retellai.com/v3/create-web-call -H 'Content-Type: application/json' -H 'Authorization: Bearer <public key>' -H 'Origin: <origin>' --data '{"agent_id":"<agent id>"}'`
     → expect `201` for allowlisted origins, `401` otherwise.
  3. In-browser: open the demo, click **Start to call**, and watch the network
     tab — healthy is `201 /v3/create-web-call` followed by `201/204
     /webrtc-proxy/<call_id>/v1/webrtc/sessions` and a running call timer.
  4. Microphone still needs a secure context (HTTPS or `localhost`) and
     permission — a mic denial looks the same (silent call) but produces
     `NotAllowedError`, so check the console before blaming the domain list.
     Test with extensions/ad blockers disabled; the widget loads from
     `dashboard.retellai.com` + `api.retellai.com`.

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
| Change pricing copy            | `src/components/Pricing.astro`                             |
| Change meeting URL / offer facts | `src/lib/offer.ts`                                      |
| Demo request fields / choices | `DemoRequestForm.astro` + `src/lib/demo-form.ts`             |
| Contact message fields        | `src/components/ContactForm.astro`                         |
| Nav links                      | `src/components/Header.astro`                              |
| Footer / legal links           | `src/components/Footer.astro`                              |
| Brand colors / fonts           | `src/styles/global.css` `@theme` + `@font-face`            |
| SEO title/description defaults | `src/layouts/BaseLayout.astro`                             |
| Landing section order          | `src/pages/index.astro`                                    |
| Live voice demo (Retell)       | `src/components/DemoSection.astro` + `PUBLIC_RETELL_*`      |
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
