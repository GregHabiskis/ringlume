# Ringlume

Static marketing site for Ringlume, a virtual receptionist product.

- **Framework:** Astro 7 (fully static pages)
- **Styling:** Tailwind CSS v4
- **Package manager:** pnpm
- **Hosting:** Netlify
- **No CMS, no database, no payment integration:** plan CTAs link to
  `/book-demo` for a free personalized demo, not a checkout

## Forms and offer facts

`/book-demo` submits the six-field `demo-request` Netlify form to
`/book-demo/thanks`. `/contact` submits the email/message `contact-message`
form to `/contact/thanks`. Both thanks pages are noindex.

Offer constants and the meeting URL live in `src/lib/offer.ts`.
Demo delivery automation and the call-duration limit are managed by the owner,
outside this repository. Form submissions must be tested on a Netlify deploy.

## Quick commands

```sh
pnpm install    # install deps
pnpm dev        # http://localhost:4321
pnpm build      # static build → dist/
pnpm preview    # serve dist/
```

## Deploy

Netlify builds from Git on every push: build command `pnpm build`, publish
directory `dist`, Node 22. Build settings and the cache/security headers live
in `netlify.toml`.

See `AGENTS.md` for design system and repository conventions.
