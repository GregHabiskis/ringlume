# Demo-first overhaul verification

Verified October 30, 2026. No commit, deployment, dashboard changes, new
dependencies, or new client scripts.

## Outcome

- Added `/book-demo` and `/book-demo/thanks` for the personalized demo request.
- Repurposed the six-field form as `demo-request`, with the original field
  names, required set, referral values, autocomplete, and website pattern.
- Added the two-field `contact-message` form; rewrote `/contact/thanks`.
- Realigned primary CTAs to `/book-demo`, distinguished **Live Demo** navigation
  from **Free Demo** conversion, and added the personalized link inside Retell's
  conditional section. Retell behavior is unchanged.
- Hero uses `DEMO_FREE_MINUTES` for **10 Min / Free Demo** and retains
  **24/7 / Always Working**. Footer adds Free Demo, not direct channel links.
- Setup disclosure sits below pricing cards, not inside any plan. Removed only
  the old timed sentence from the existing trust text; retained its no-time copy.
  Existing user edits to plans, prices, and fees were preserved.
- Offer facts, preferred tool groups, and the meeting URL live in
  `src/lib/offer.ts`. FAQ content and its Markdown mirror are aligned.
- Updated `AGENTS.md`, README, and deliberate Vitest guardrails.

Pricing legal notice, unchanged:

> By continuing, you agree to our Terms of Service and Privacy Policy.

This does not refer to Contact Sales, booking, payment, or plan selection, so it
does not contradict a demo request.

## Verification

| Check | Result |
| --- | --- |
| `pnpm test` | 73 tests pass across 13 files |
| `pnpm check` | 0 errors, warnings, or hints |
| `pnpm build` | Pass, all eight pages generated |
| `git diff --check HEAD` | Pass |
| Fallow unused-export check | Zero findings; no fixes applied |
| Dependencies, lockfile, Astro config, Netlify config | Byte-for-byte unchanged from HEAD |
| Existing scripts | Bodies unchanged, except Header comments |
| Built forms | Exactly one per page, correct POST/name/action/honeypot/hidden form-name |
| Built schemas | Six demo fields, four required; two contact fields, both required |
| Website pattern | Built value exactly matches source, including escaped hyphen and `\S` |
| Demo request body | `10 minutes` twice; `within 1 hour` once; no afternoon or 12 hours |
| Demo thanks | `within 1 hour` once; meeting and generic live-demo links correct |
| All built HTML | `within 1 hour` occurs exactly twice across the site |
| Pricing | Four rendered demo CTAs; one qualified afternoon block below cards |
| Setup qualifier | `text-xs` (12px), `text-fg-3`, `/terms#setup-time`; no new heading |
| Contrast | Muted token against base is 12.03:1; existing dark scrim retained |
| Terms | Anchor, all ten preferred-tool strings, confirmed-requirements clock start, exclusions and disclaimers present |
| Meeting URL links | Only demo thanks and Terms, not pricing/contact thanks |
| Thanks pages | Both generated, noindex, no Header/Footer |
| Sitemap / robots | Neither exists; no thanks-page inclusion or Disallow introduced |
| Retired wording and channel | No rendered retired delivery claims or messaging channel |

Script-tag counts from the original built snapshot vs final build:

| Page | Before | After |
| --- | --- | --- |
| Homepage | 9 | 9 |
| Contact | 3 | 3 |
| Contact thanks | 2 | 2 |
| Terms | 3 | 3 |
| Book demo, new page | Contact-equivalent chrome: 3 | 3 |
| Book demo thanks, new page | Thanks-equivalent shell: 2 | 2 |

Homepage retains its one existing external JS bundle. Contact, book demo, and
both thanks pages have no external JS bundles. Their existing shell scripts
remain; this task adds none.

One concurrent `pnpm check` / `pnpm build` attempt failed because a generated
prerender chunk disappeared. A standalone rebuild passed. No dependency or
configuration workaround was introduced; run these two gates sequentially.

### Checks still requiring a browser/deploy

- Static form action targets exist directly as `dist/.../thanks/index.html`.
  No redirect rules/config changes were introduced. Actual Netlify POST handling
  and a redirect-free deployed response remain unverified until a deploy test.
- Netlify Forms are not end-to-end tested locally. No form was submitted.
- 360px visual inspection and a fresh mobile Lighthouse run remain pending.
  Source inspection confirms form-first DOM order, single-column mobile layout,
  `items-start`, stacked channel cards, wrapping footer links, and no fixed-width
  form fields. It cannot prove absence of browser overflow or score regression.
- Delivery automation and duration enforcement remain owner responsibilities.

## Legal audit

The clause is **7.1 Setup Time and Compatible Tools**, within existing section 7,
Service Availability & Uptime. No section was renumbered; all existing Terms and
Privacy h2 headings match HEAD. `id="setup-time"` has the existing responsive
scroll-margin utilities. Terms date changed from October 29 to October 30, 2026.

No section-number references (`Section N`, `Clause N`, `#section-`, or `§ N`)
were found in Terms, Privacy, or the rest of `src`.

Existing legal matches, reported without rewriting them (line numbers in HEAD):

- `src/pages/terms.astro:52`: setup using business information/preferences.
- `src/pages/terms.astro:77,90`: Service Setup Fee and its no-refund treatment.
- `src/pages/privacy.astro:47`: information provided for setup/support.
- `src/pages/privacy.astro:87`: Service Setup & Improvement processing purpose.
- `src/pages/privacy.astro:181`: rights-request response **within thirty (30)
  days**, not a demo/production timeline. Retained under the legal-page rule.
- Both pages' line 13 matched `24` in `pt-24`, a CSS false positive.

No conflicting pre-existing production/demo timeline, booking-call, free-trial,
or demo clause was found. Other legal text, including payment/refund wording,
was not changed. The earlier working-tree channel removals were preserved.

## Telegram audit

Comparison against HEAD identifies the removed original content. These removals
were already present in the working tree when implementation began:

| Original location | Hit and disposition |
| --- | --- |
| `AGENTS.md:268` | Telegram URL removed from channel instructions |
| `src/pages/contact.astro:10` | Channel mention removed from metadata |
| `src/pages/contact.astro:45,55,56` | URL, card heading, handle removed with the card and its inline SVG icon |
| `src/pages/privacy.astro:50` | Only the channel name removed from the communications list |
| `src/pages/privacy.astro:250` | Channel/handle list item removed |
| `src/pages/terms.astro:253` | Channel/handle list item removed |

Footer had no channel URL/icon to remove. No other component/channel constant,
JSON-LD/contactPoint/sameAs, or standalone asset was found. Public asset names
and bytes were checked. No Telegram-only file needed deletion. Built HTML has
zero Telegram contact mentions, links, cards, or icons.

Final raw case-insensitive `telegram|t\.me|fshahariar` results in source:

| File | Lines | Disposition |
| --- | --- | --- |
| `src/components/__tests__/astro-fences.test.ts` | 4 | `import.meta` substring false positive |
| `src/components/__tests__/contact-form.test.ts` | 4 | Same |
| `src/components/__tests__/cta.test.ts` | 4 | Same |
| `src/components/__tests__/demo-form.test.ts` | 5 | Same |
| `src/components/__tests__/faq.test.ts` | 6,7,8,9,10,11 | Same |
| `src/components/__tests__/footer.test.ts` | 4; 16 | Import substring; negative absence assertion |
| `src/components/__tests__/guardrails.test.ts` | 4,5; 21,27,33 | Import substrings; negative guardrail name/patterns |
| `src/components/__tests__/pricing.test.ts` | 4 | Import substring |
| `src/lib/retell-config.ts` | 46,47,48 | `import.meta.env` substring, not a URL |
| `src/pages/__tests__/demo-pages.test.ts` | 4; 94 | Import substring; negative absence assertion |
| `src/pages/__tests__/terms-page.test.ts` | 10 | Import substring |

All retained test references assert absence, not a supported contact channel.
Final public-assets grep: zero hits. No JSON-LD exists. Report text necessarily
names the removed channel; it is not published as site content.

## Retired delivery claims

Initial working-tree claims removed:

- `src/components/Hero.astro:59`: `48 Hrs` replaced by the shared-minute stat.
- `src/components/Pricing.astro:213`: `Setup in 24–48 hours` sentence removed.
- `src/data/faqs.ts`, setup-time answer: `approximately 24–48 hours` replaced.
- `src/data/faqs.md`, setup-time answer: same replacement.
- A later audit also found `within a few hours` in the subscription-upgrade
  FAQ. Removed just that unapproved timing phrase from TS and Markdown; upgrade
  and proration guidance remain. Its test was updated, not deleted.

No old claim was found in metadata, OG markup, JSON-LD, or positive test fixtures.
Final `48` / `24–48` grep hits:

| File | Lines | Disposition |
| --- | --- | --- |
| `src/components/__tests__/cta.test.ts` | 27 | Negative old-stat assertion |
| `src/components/__tests__/faq.test.ts` | 127,128 | Negative old-answer assertions |
| `src/components/__tests__/guardrails.test.ts` | 39,45 | Banned-pattern definitions |
| `src/components/__tests__/pricing.test.ts` | 49,51 | Negative old-copy assertions |
| `src/pages/__tests__/terms-page.test.ts` | 38 | Negative old-copy assertion |
| `src/pages/contact.astro` | 37 | WhatsApp SVG coordinate, not text/timing |

No built page contains retired timed delivery wording. Numeric asset paths,
hashes, CSS sizes, and SVG coordinates are not delivery claims.

## FAQ Markdown consumers

`src/data/faqs.md` is a **docs-only mirror**. No runtime importer, llms.txt,
knowledge-base integration, sitemap generator, or other consumer was found.
The updated FAQ Vitest test reads it as a guardrail. The site renders
`src/data/faqs.ts` through `src/components/FAQ.astro` on `/` and `/faq`.

## Complete final CTA/setup grep locations

Case-insensitive search across all `src` text files for the requested terms:
`Get Started`, `Try a Demo`, `Contact Sales`, `cal.com`,
`Contact Us on WhatsApp`, `Send an Email`, `book a call`, `afternoon`,
`go live`, `setup`, `hours`, `PBX`, `CRM`, `Twilio`, `Telnyx`, `Calendly`,
`HubSpot`, `#pricing`, `#demo`.

Every matching line is listed below. Tests intentionally retain banned strings
in negative assertions and exact constants in expected values.

| File | Lines | Disposition |
| --- | --- | --- |
| `src/components/Capabilities.astro` | 10 | Existing after-hours availability, not delivery |
| `src/components/DemoSection.astro` | 118 | Existing `#demo` performance comment |
| `src/components/Header.astro` | 5,6,334,335 | Live Demo/Pricing anchors and scroll-spy map retained |
| `src/components/Hero.astro` | 46 | Generic demo anchor/fallback retained |
| `src/components/Pricing.astro` | 2,10,18,29,49,70,174,212,221,224,225,228 | Offer imports, unchanged fees/features, qualified disclosure below cards |
| `src/data/faqs.md` | 4,38,62,67,74,78,79,81,83,85,88 | Existing availability/setup/pricing references and aligned setup answer |
| `src/data/faqs.ts` | 4,21,29,46,95,129,137,146,151,152,154,156,157,167,168 | Same, using shared facts/tool lists |
| `src/lib/offer.ts` | 2,3,5,10,13,15,16 | Approved constants and tool names; single meeting URL |
| `src/pages/book-demo/thanks.astro` | 35,44 | Generic live-demo link and post-demo meeting option |
| `src/pages/faq.astro` | 10 | Existing FAQ metadata reference to setup, no timing |
| `src/pages/index.astro` | 18 | Existing setup-time FAQ selection |
| `src/pages/privacy.astro` | 47,87 | Preserved legal processing text |
| `src/pages/terms.astro` | 58,83,96,199,202,205,206,213,235,236,244 | Preserved setup/fee references and the new fully explained clause |
| `src/components/__tests__/cta.test.ts` | 24,26,28,44,47,48,58,59,71,72,95,101,102,103,104,105,109 | Anchor/CTA/absence assertions |
| `src/components/__tests__/faq.test.ts` | 26,44,54,84,91,111,112,113,117,119,120 | FAQ setup/anchor/absence assertions |
| `src/components/__tests__/footer.test.ts` | 33 | Existing removed-disclaimer assertion |
| `src/components/__tests__/guardrails.test.ts` | 37,40,41,47,60,72,85 | Banned wording and permitted-location checks |
| `src/components/__tests__/pricing.test.ts` | 13,14,26,27,28,41,44,45,46,50 | Pricing preservation/disclosure/absence checks |
| `src/lib/__tests__/offer.test.ts` | 8,9,15,16,18,23,28,30,31,37,38,39 | Exact offer/tool/list-format expectations |
| `src/pages/__tests__/demo-pages.test.ts` | 35,38,39,41,53,56,70 | No-production-copy assertions and thanks-page links |
| `src/pages/__tests__/terms-page.test.ts` | 23,26,27,35,44,46,60,61 | Clause anchor/tool-rendering/timeline checks |

Legacy CTA labels no longer occur in rendered components. `Cal.com` as a preferred
booking-tool name is not a meeting CTA or a second copy of the booking URL.

## Files changed

- `AGENTS.md`, `README.md`, this report, `daily/2026-10-30.md`.
- Components: `src/components/Hero.astro`, `Header.astro`, `Pricing.astro`,
  `DemoSection.astro`, `CtaSection.astro`, `Footer.astro`, `ContactForm.astro`,
  and `DemoRequestForm.astro` (repurposed original ContactForm).
- Shared modules: `src/lib/offer.ts` and `src/lib/demo-form.ts` (renamed from
  `src/lib/contact-form.ts`, unchanged pattern/options).
- Pages: `src/pages/book-demo.astro`, `book-demo/thanks.astro`, `contact.astro`,
  `contact/thanks.astro`, `terms.astro`; existing minimal `privacy.astro` channel
  removals preserved.
- Data: `src/data/faqs.ts`, `src/data/faqs.md`.
- Component tests: `src/components/__tests__/contact-form.test.ts`,
  `demo-form.test.ts` (repurposed original contact guardrail), `cta.test.ts`,
  `guardrails.test.ts`, `faq.test.ts`, `footer.test.ts`, `pricing.test.ts`.
- Other tests: `src/lib/__tests__/offer.test.ts`,
  `src/pages/__tests__/demo-pages.test.ts`, `terms-page.test.ts`.

## Decisions and deviations

- Followed the amendments: Terms sub-clause instead of renumbering; no timing
  inside plan cards; Header anchor renamed Live Demo; Footer has no channels.
- No meeting constant existed, so added `CAL_BOOKING_URL` in `offer.ts`.
- Source-level tests resolve the Terms' actual stack expressions and check
  every name; the real built HTML was checked separately as well.
- Removed the unrelated upgrade FAQ's unapproved short delivery promise to
  satisfy the no-other-delivery-wording rule, without altering upgrade terms.
- Kept legal contact lists and the legal rights-response deadline, as required
  by the legal-page restriction. They are not new marketing channel blocks.
- No new adapter was installed. The adapter/runtime already present remains
  configured exactly as before; all marketing/form pages are prerendered.
- Browser/Lighthouse, deployed no-hop behavior, and actual form delivery are
  explicitly unverified, not represented as passing checks.
