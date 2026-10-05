# Ringlume

Static marketing site for Ringlume, a Voice AI receptionist product.

- **Framework:** Astro 7 (fully static pages)
- **Styling:** Tailwind CSS v4
- **Package manager:** pnpm
- **Hosting:** Netlify
- **No CMS, no database, no payment integration:** plan CTAs link to a sales
  meeting instead of a checkout

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
