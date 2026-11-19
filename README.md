# Ringlume

Static marketing site for Ringlume, a virtual receptionist product.

- **Framework:** Astro 7 (static pages with on-demand editor preview endpoints)
- **Styling:** Tailwind CSS v4
- **Package manager:** pnpm
- **Hosting:** Cloudflare Workers
- **CMS:** TinaCMS, Git-backed content with TinaCloud authentication
- **No application database or payment integration:** plan CTAs link to
  the shared free demo destination (defaults to `/book-demo`), not a checkout

## Forms and offer facts

`/book-demo` submits the six-field `demo-request` form to `/api/book-demo`.
`/contact` submits the email/message `contact-message` form to `/api/contact`.
The Worker validates submissions and delivers them through Cloudflare email.
Successful submissions redirect to the existing noindex thanks pages.

Editable text, shared link destinations, and offer settings live in
`content/site/site.json`.
`src/lib/offer.ts` formats the offer and owns the fixed meeting URL.
Email delivery notifies the team; it does not fulfill the personalized demo.
The owner manages demo fulfillment and the call-duration limit.

## Quick commands

```sh
pnpm install    # install deps
pnpm dev        # http://localhost:4321
pnpm build      # TinaCloud production build for Workers
pnpm build:local # credential-free local verification only, never deploy
pnpm preview    # preview the built Worker
pnpm preview:local # preview the isolated local build in Wrangler
```

## Deploy

Connect `GregHabiskis/ringlume` to the `ringlume` Worker using **Workers Builds**.
Set the repository root as the build root, `pnpm build` as the build command,
and `pnpm exec wrangler deploy` as the deploy command. The repository pins
Node 22.23.5 and pnpm 11.15.0. The Astro adapter produces the Worker and static
assets; there is no standalone publish-directory setting.

Set `PUBLIC_RETELL_VOICE_PUBLIC_KEY` and `PUBLIC_RETELL_VOICE_AGENT_ID` as
build variables if using the homepage voice demo, plus
`PUBLIC_RETELL_RECAPTCHA_KEY` if reCAPTCHA is enabled. For Tina credentials and
branch setup, see [TinaCMS setup](docs/tinacms.md). Do not deploy output from
`pnpm build:local`. For a manual production build and deploy, use `pnpm deploy`.

Worker configuration lives in `wrangler.jsonc`; static response headers live
in `public/_headers`. Configure email and verify both forms before moving
production traffic.

### Form delivery

The `FORM_EMAIL` binding uses Cloudflare Email Routing. Ringlume's MX records
already point to Cloudflare Email Routing; do not change them for this migration.

1. In Cloudflare **Email Routing > Destination addresses**, verify the actual
   mailbox that should receive submissions, not a forwarding alias.
2. In the production Worker's **Settings > Variables and Secrets**, add
   `FORM_EMAIL_FROM` (a sender on `ringlume.com`) and `FORM_EMAIL_TO` (the
   verified mailbox) as runtime secrets, not Workers build variables.
3. Submit each form on the deployed site and confirm the email arrives before
   relying on it. A rejected or unconfigured send returns an error instead of
   showing the thank-you page.

Local Worker email simulation does not send real mail. Do not enable a remote
email binding for local tests.

See `AGENTS.md` for design system and repository conventions.
