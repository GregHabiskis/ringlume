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

Vitest covers Paddle configuration, hosted portal redirects, and pricing checkout launchers.
There is no lint or dedicated typecheck script in `package.json`; run Astro's
checker and `pnpm build` as verification gates.

---

## Repository map

```
/
├── AGENTS.md                 # this file
├── astro.config.mjs          # Vite + Tailwind, compressHTML, inlineStylesheets
├── package.json              # Astro, Paddle.js, Tailwind CSS, and build tooling
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
    │   ├── privacy.astro
    │   ├── terms.astro
    │   └── refund.astro
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

The homepage deliberately has **no** `ContactWidget` — the Retell demo FAB takes
that corner after it loads. Every other page still mounts it.

---

## Architecture rules

1. **Static first.** Prefer zero client JS. Interactive bits are tiny vanilla `<script>` blocks inside `.astro` files (menu, pricing toggle, hero word rotation, contact FAB).
2. **No heavy frameworks.** Do not add React, Vue, Framer Motion, GSAP, analytics SDKs, or chat widgets unless explicitly requested.
3. **No third-party render-blocking scripts.** Checkout uses the installed Paddle.js package and opens an overlay only after user interaction. The Retell demo widget (`~1.4 MB`) is injected only when someone clicks a demo CTA — never at page load.
4. **Keep deps minimal.** Paddle Billing supports checkout and the hosted portal; the site has no application database, account, entitlement, or webhook layer.
5. **pnpm only.**

---

## Design system

Defined in `src/styles/global.css` under `@theme`:

| Token                        | Value                 | Use                             |
| ---------------------------- | --------------------- | ------------------------------- |
| `navy`                       | `#0A1120`             | Dark sections                   |
| `green-primary`              | `#4CD964`             | Brand accent                    |
| `green-accent`               | `#6EEB83`             | Gradients / highlights          |
| `green-dark`                 | `#34C759`             | Darker green text on light CTAs |
| `green-muted` / `green-deep` | `#2A8C3E` / `#1C6B30` | Muted gradient backgrounds      |
| `slate-bg`                   | `#1E1F21`             | Cards                           |
| Body bg                      | `#111213`             | Page chrome                     |

### Utility classes (do not duplicate)

- `.gradient-text` / `.gradient-green-text` — green gradient clipped text
- `.gradient-bg` / `.gradient-bg-muted` / `.gradient-green` — filled gradients
- `.glass-effect` — frosted cards (**backdrop-blur only from `md` up**)
- `.glow-green` / `.glow-green-lg` — soft green shadows
- `.pricing-card` / `.pricing-card-popular` / `.toggle-active` / `.toggle-inactive`
- `.orb` / `.orb-sm` — decorative blurs (prefer these over ad-hoc `blur-3xl`)
- `.content-auto` — `content-visibility: auto` for below-the-fold sections

### Typography

- Family: **Comfortaa** (self-hosted variable 400–700) + metric-adjusted fallback
- Fonts live in `public/fonts/comfortaa-latin.woff2` and `comfortaa-latin-ext.woff2`
- Loaded via `@font-face` in `global.css` with `font-display: swap`
- Preloaded in `BaseLayout.astro`
- **Do not** reintroduce Google Fonts CDN links

**CSS minify gotcha:** never use `U+0000` in `unicode-range` — some minifiers corrupt it to `U+??`. Use `U+0020-00FF` (or similar) for latin.

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
  - Footer: `/images/logo-320.webp` (+ `.png` fallback), 320×128
- Always set explicit `width` and `height`.
- Above-fold: `fetchpriority="high"`, `decoding="async"`.
- Below-fold: `loading="lazy"`, `decoding="async"`.
- Prefer `<picture>` with WebP + PNG fallback.
- When adding new images: resize to display size, export WebP, keep a PNG/SVG fallback, put under `public/images/`.

### Paint / GPU

- Avoid many stacked `blur-3xl` / `backdrop-blur` layers on mobile.
- Header: solid bg on small screens; `backdrop-blur` from `md` only.
- Decorative orbs: use `.orb` / `.orb-sm`; hide extras below `md` when possible.
- Glass: no backdrop-filter on small viewports.
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
- Legal pages (`privacy`, `terms`, `refund`) are long static content — keep English-only unless asked otherwise.

### Pricing / checkout

- Plans and Paddle price IDs live in `Pricing.astro` frontmatter.
- CTAs are `<button>` elements with `data-plan`, `data-monthly-price-id`, and `data-annual-price-id` attributes. Paddle checkout overlay opens on click.
- Paddle.js is imported from `@paddle/paddle-js` and initialized with the client-side token.
- A shared setup-fee price ID (`PUBLIC_PADDLE_SETUP_FEE_PRICE_ID`) is added to every checkout.
- Provisioning script: `scripts/provision-paddle.mjs` (idempotent, one-off catalog administration only).

### Contact

- WhatsApp: `https://wa.me/8801951284128`
- Telegram: `https://t.me/fshahariar`
- Email: `support@ringlume.com`
- Floating FAB: `ContactWidget.astro`

### Customer portal

- `/portal` links to `/api/paddle/portal`.
- The site has no customer sign-in. Paddle authenticates customers with the
  purchase email and an emailed magic link.
- The API route redirects only to the permanent, environment-specific general
  Paddle portal URL. It must not mint or cache authenticated portal sessions.
- Tokenized customer portal-session URLs and subscription `management_urls`
  are temporary and must never be stored.
- Paddle displays cancellation timing and effective dates in its hosted portal.

Keep contact channels consistent across Footer, CtaSection, Contact page, and widget.

---

## Editing guidelines

### Do

- Match existing visual language (dark navy/slate, green gradients, rounded-full CTAs).
- Prefer Server-rendered static HTML; minimize client JS.
- Optimize new media before commit.
- Run `pnpm build` after structural/CSS changes.
- Keep responses and code comments minimal unless complexity requires explanation.

### Don't

- Add Storyblok / CMS scaffolding from the stale README without being asked.
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
| Setting           | Value            |
| ---------         | --------         |
| Platform          | Netlify          |
| Build command     | `pnpm run build` |
| Publish directory | `dist`           |
| Node version      | `22`             |

Push-triggered deploys from Git. No server runtime, no edge middleware in-repo.

---

## Common tasks (cheatsheet)

| Task                           | Where / how                                                |
| ------------------------------ | ---------------------------------------------------------- |
| Change hero copy               | `src/components/Hero.astro`                                |
| Change pricing / price IDs     | `src/components/Pricing.astro` + `.env`                    |
| Provision Paddle catalog       | `pnpm paddle:provision` (one-off admin key required)       |
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

1. **`package.json` name** is still `all-in-one-system` — cosmetic; not a monorepo.
2. **`public/Ringlume-Logo-No-Background.png`** is large; UI must use `/images/logo-*` variants.
3. **`site.webmanifest`** has empty `name` / `short_name` — fix if shipping PWA polish.
4. **Unicode-range minify bug** — see Typography section.
5. **No browser automation** — visual/regression checks are manual + production PSI.

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
- Do not invent Paddle IDs; run the one-off provisioning script or use IDs from `.env`.
- `PADDLE_API_KEY` is only for that local catalog-administration script and must never be exposed in client code. The `PUBLIC_PADDLE_*` env vars are safe for client-side use.
