# Ringlume — Voice AI Receptionist

Astro marketing site for a Voice AI receptionist product, with Paddle Billing
checkout and a hosted customer portal redirect.

| Stack           |                                                      |
| --------------- | ---------------------------------------------------- |
| Framework       | **Astro 7** (static pages with on-demand API routes) |
| Styling         | **Tailwind CSS v4**                                  |
| Package manager | **pnpm**                                             |
| Hosting         | **Netlify**                                          |

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # static build → dist/
pnpm preview   # serve dist/
pnpm test      # Vitest unit and integration tests
```

## Paddle Billing

Checkout uses Paddle Billing in the environment explicitly selected by
`PUBLIC_PADDLE_ENVIRONMENT`. The server-side `PADDLE_ENVIRONMENT` must match it
for the hosted portal redirect. Both values must be either `sandbox` or
`production`; mismatches fail instead of silently selecting another Paddle
account.

`/portal` explains Paddle-hosted subscription management. Its CTA calls
`/api/paddle/portal`, which validates and redirects to the permanent general
customer portal URL for the selected environment. Copy that URL from the
Customer portal area in the matching Paddle sandbox or production dashboard.

This site intentionally has no customer accounts or application-level access
system. Customers enter the email used for their purchase on Paddle's hosted
portal and authenticate through the one-time link Paddle emails them. The
endpoint never accepts an email, customer ID, or subscription ID and never
creates an authenticated portal session for an unidentified visitor.

Do not store or cache Paddle customer portal-session URLs or subscription
`management_urls`. They contain temporary authentication tokens. Only the
permanent general portal login URL belongs in environment configuration.

Paddle handles subscription state, recurring billing, invoices, receipts,
payment methods, and cancellation through its hosted customer portal. Ringlume
manually fulfills services and does not mirror Paddle records or consume Paddle
webhooks.

### Sandbox Verification

The Paddle Checkout integration, configured Sandbox price IDs, and hosted portal
redirect are code/build tested. No final real Sandbox purchase has been
completed using this simplified architecture yet. The
customer-to-transaction-to-subscription-to-portal journey remains a manual
post-deployment check.

1. Set the Paddle environment, client token, sandbox price IDs, setup-fee price
   ID, and permanent sandbox customer portal URL.
2. Set a sandbox default payment link under **Checkout > Checkout settings**.
3. Complete checkout with Paddle's sandbox test card and a controlled test
   email.
4. Open `/portal`, authenticate through Paddle's emailed magic link, and
   verify billing management.

Before production, use production prices and client token, copy the production
general portal URL, approve the real checkout domain, and set the production
default payment link. Never test production with a real payment until Paddle
verification and domain approval are complete.

See `AGENTS.md` for the design system and repository conventions.
