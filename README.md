# Ringlume — Voice AI Receptionist

Astro marketing site for a Voice AI receptionist product, with Netlify
Functions for Paddle Billing webhooks and hosted customer portal redirects.

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

Checkout uses Paddle Billing in the environment explicitly selected by both
`PUBLIC_PADDLE_ENVIRONMENT` and `PADDLE_ENVIRONMENT`. These values must be
either `sandbox` or `production` and must match. Tokens and API keys are also
validated against the selected environment; missing or mismatched values fail
instead of silently selecting another Paddle account.

`/portal` explains Paddle-hosted subscription management. Its CTA calls
`/api/paddle/portal`, which validates and redirects to the permanent general
customer portal URL for the selected environment. Copy that URL from the
Customer portal area in the matching Paddle sandbox or production dashboard.

This site intentionally has no customer accounts. Customers enter the email
used for their purchase on Paddle's hosted portal and authenticate through the
one-time link Paddle emails them. The endpoint never accepts an email,
customer ID, or subscription ID and never creates an authenticated portal
session for an unidentified visitor.

Do not store or cache Paddle customer portal-session URLs or subscription
`management_urls`. They contain temporary authentication tokens. Only the
permanent general portal login URL belongs in environment configuration.

### Cancellation State

Cancellation through Paddle's hosted portal is normally scheduled for the end
of the paid billing period. Paddle sends `subscription.updated` with an active
status and `scheduled_change.action` set to `cancel`. Ringlume preserves access
until `scheduled_change.effective_at`. When cancellation takes effect, Paddle
sends `subscription.canceled` and the mirrored status no longer grants access.

The website mirrors this billing state in Supabase but does not contain the
external Voice AI provisioning system. Any operational grant or revocation
must consume the mirrored subscription state rather than the redirect page.

`/api/paddle/webhook` verifies `Paddle-Signature` against the raw request body
using Paddle's Node SDK. It processes `customer.created`, `customer.updated`,
`subscription.created`, `subscription.updated`, `subscription.canceled`, and
`transaction.completed`. Deliveries are deduplicated by `event_id`, while
customer and subscription updates reject older `occurred_at` values atomically.

### Sandbox Verification

1. Set all Paddle variables to sandbox credentials and sandbox entity IDs.
2. Set a sandbox default payment link under **Checkout > Checkout settings**.
3. Set the permanent sandbox customer portal URL in
   `PADDLE_SANDBOX_CUSTOMER_PORTAL_URL`.
4. Configure a sandbox webhook notification destination for
   `https://<domain>/api/paddle/webhook` with the events listed above.
5. Complete checkout with Paddle's sandbox test card and a controlled test
   email.
6. Open `/portal`, authenticate through Paddle's emailed magic link, and
   schedule cancellation.
7. Confirm the real `subscription.updated` delivery leaves status active and
   records the cancellation effective date.
8. Test the terminal `subscription.canceled` state separately with Paddle's
   correctly signed webhook simulator when the real cancellation is scheduled
   for a future date.

Before production, use production credentials and prices, copy the production
general portal URL, approve the real checkout domain, set the production
default payment link, and configure a separate production webhook destination.
Never test production with a real payment until Paddle verification and domain
approval are complete.

See `AGENTS.md` for the design system and repository conventions.
