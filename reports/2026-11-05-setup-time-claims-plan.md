# Virtual receptionist setup-time claims plan

Date: November 5, 2026. Status: nonnumeric policy implemented after owner approval.

## Implementation

- Homepage hero: added "Setup, handled." below the demo CTA.
- Detailed pricing only: added "We handle setup and testing, with launch timing
  agreed after review." and a link to `/terms#setup-time`.
- Terms 7.1: replaced the afternoon/hourly claims with a scoped launch estimate,
  straightforward versus custom setup, business information and access
  prerequisites, queue/configuration/testing time, customer approval, launch
  definition, timing dependencies, and revised estimates. Business-day estimates
  use Monday-Friday excluding U.S. federal holidays in America/New_York.
- Removed the obsolete production timing constant; aligned the setup FAQ, its
  documentation mirror, tests, and project instructions. Demo offers, prices,
  plan allowances, and setup fees remain unchanged.
- The numeric candidate discussed below was not published. The research and
  original recommendation below are retained as the decision record.

## Recommendation

Position Ringlume around managed setup and testing, not instant activation:

> We handle setup and test your call flow before launch.

Agree an estimated launch date after reviewing each customer's requirements.
Retire the current general 12-hour production target and "often an afternoon"
wording, subject to approval. Neither the competitor research nor the repository
provides delivery records that substantiate those Ringlume timings.

If a published number is commercially important, evaluate **5-10 business days
for standard setups** as an initial operational planning target. This is a
proposed Ringlume target, not a measured result, a competitor-derived average,
or an industry standard. Do not publish it until delivery evidence and capacity
support it. Custom work should receive a project-specific estimate, not a
universal deadline.

## What the research supports

Read the supplied report at `~/Downloads/deep-research-report.md` and checked the
following official pages on November 5, 2026:

| Offering | Current published wording | Implication for Ringlume |
| --- | --- | --- |
| [Reception self-service](https://www.reception.ai/) | Setup "in minutes"; immediate test calls without booking a demo. | A basic self-service activation benchmark, not evidence of a managed implementation timeline. |
| [Reception specialist-assisted](https://www.reception.ai/contact-sales) | Production deployment "in days" with specialist support. | Supports days-based positioning, but supplies no numeric range. |
| [MyAIVoiceAgent](https://www.myaivoiceagent.ai/) and its [pricing page](https://www.myaivoiceagent.ai/pricing) | "3 min" to set up and go live; "live the same day." | Productized onboarding. CRM integration is currently marked "coming soon," so this is not a like-for-like custom integration benchmark. |
| [Legacy custom development](https://legacyai.agency/) | "Launch in 3-4 weeks," testing before go-live, and continuing improvement. | A managed-project reference, but its scope includes custom software and other systems, not just receptionists. |
| [Oceanside](https://www.oceansideai.io/) | Current homepage describes a 30-minute discovery call, customer testing, and weekly post-launch check-ins. | The report's 7-14-day range and "about a week" wording were not found in the current homepage text or fetched HTML. Treat that timing as unconfirmed historical research, not a verified current claim. |

The [Legacy receptionist page](https://legacyai.agency/receptionist) separately
advertises five-minute setup for MyAIVoiceAgent. These are related offerings,
not independent vendors corroborating the same deployment speed.

### Corrections and limits

- The useful distinction is self-service activation versus managed,
  customer-specific deployment. Ringlume's current service description fits the
  latter more closely, although it can still use standardized configurations.
- These are advertised timelines from a small sample, not measured outcomes or
  a formal market-wide service standard. Start conditions and calendar versus
  business days are not consistently specified. Do not average the numbers.
- Reception's 14-day trial is optional evaluation, not a required training
  period. MyAIVoiceAgent's 10 free minutes are call usage, not elapsed setup
  time; its 90-day cancellation window is not a technical pilot.
- The report's illustrative three-day assisted-deployment chart must not become
  a benchmark: Reception only says "in days."
- Packaged integrations do not establish that access, configuration, testing,
  or customer approval will be immediate. A vendor not publishing a phase or
  SLA does not prove it has no such process or contractual commitment.
- Do not impose a fixed pilot or training period merely to imitate competitors.
  Define readiness checks instead.

## Current Ringlume claims

- `src/lib/offer.ts` defines `PRODUCTION_MAX = '12 hours'`.
- Terms section 7.1, `/terms#setup-time`, says setup is "often an afternoon"
  with preferred tools and aims to go live within 12 hours after a conversation
  and confirmed requirements. Access readiness, testing, and launch approval
  are not explicitly defined as part of that timeline.
- The homepage and pricing already avoid production timing slogans. Preserve
  that restraint rather than adding a prominent speed badge.
- The setup FAQ currently gives a brief dependency statement and links to Terms.
  Make it more useful without adding technical lists or a numeric promise.
- Demo delivery is a separate one-hour email promise, shown only below the
  request form and on its confirmation page. The report does not substantiate
  Ringlume's ability to fulfill it around the clock. Keep its placement and
  allowance unchanged in this proposal; the owner should validate that workflow
  separately. Ten free demo minutes never mean ten-minute production setup.

## Proposed claim policy

| Stage | Recommended public claim now | Conditions |
| --- | --- | --- |
| Generic live demonstration | Keep "Try it now." | Demonstrates the existing receptionist, not a newly configured customer deployment. |
| Personalized demonstration | Keep the existing separate demo messaging pending operational validation. | A demo is not production-ready, and its usage allowance is not a delivery estimate. |
| Standard production setup | Managed setup, testing before launch, and an agreed estimate. No universal numeric promise yet. | Publish process claims only after confirming they are consistently performed. |
| Custom or complex setup | Timeline confirmed after reviewing the requirements and tools. | No blanket deadline for custom integrations, number porting, complex routing, or regulated workflows. |

For internal evaluation, a standard setup could mean a single location and
straightforward inbound call flow, approved business information, a compatible
new number or forwarding arrangement, and any agreed calendar connection using
an already-tested configuration. Custom code, number porting, complex phone
systems, and special compliance work fall outside this proposed fast path.
Confirm eligibility individually; a familiar tool name alone is insufficient.
This classification does not alter plan entitlements, prices, or setup fees.

### Define the clock and completion

1. Confirm scope, approved business details, required account access, phone
   routing, and an available customer approver before confirming the estimate.
2. Define the working week, time zone, holiday calendar, and start convention
   before publishing any business-day range. Include Ringlume's own queue and
   staffing delays; do not hide them by silently postponing the start.
3. Distinguish **ready for customer testing** from **live on the customer's
   phone line**. Do not relabel a configured test receptionist as a live launch.
4. Test the agreed functions before launch: answers and service area, lead
   capture, booking if included, transfers, urgent-call escalation, and fallback
   when a destination or integration is unavailable. Obtain customer approval
   before changing live call routing.
5. Disclose customer dependencies and third-party approvals before the estimate
   is accepted. Record blockers and communicate a revised estimate when needed.
   Track total elapsed time as well as any clearly agreed excluded waiting time.

## Suggested website wording

### Homepage and pricing

Keep existing primary copy and CTAs. If setup reassurance is needed, use one
short line in an existing suitable location, not a new section or repeated badge:

> We handle setup and test your call flow before launch.

Do not add an hourly or daily production claim to the hero, plan cards, CTA,
metadata, or demo-request page.

### Setup FAQ

> We agree your launch timeline after reviewing your requirements and tools.
> Your receptionist is tested before going live. See [setup details](/terms#setup-time).

This stays below the current 40-word FAQ limit. Keep the documentation mirror
identical to the rendered answer.

### Terms section 7.1

Proposed core wording for review, retaining the existing numbering, anchor,
contact links, and qualified preferred-tool information:

> We agree an estimated launch date after reviewing your requirements and
> receiving the business information and access needed for setup. Launch follows
> testing and your approval. Custom integrations, number porting, and pending
> third-party approvals can extend the timeline. We will let you know if the
> estimate changes. Setup dates are estimates, not guarantees.

Do not rewrite unrelated legal sections, billing rules, or refund provisions.

### Optional numeric wording, only after validation

Keep any approved production range in Terms, consistent with the existing
placement policy. Put its essential conditions in the same paragraph:

> We aim to launch standard setups in 5-10 business days after confirming your
> requirements and receiving the information and access needed. Custom
> integrations, number porting, and pending approvals can take longer. We confirm
> your estimated launch date before setup begins.

This range remains a candidate, not approved copy. Do not say "typically,"
"most customers," "guaranteed," or "as little as" without appropriate evidence.
If the records support a different range, use that range instead.

## Evidence and publication gate

- Record intake, requirements/access readiness, testing readiness, customer
  approval, and actual production launch for comparable jobs, with scope,
  blockers, rework, and workload. Include late and unsuccessful jobs, not just
  the fastest examples.
- Review an initial batch of 20 consecutive comparable setups as an operational
  checkpoint, not a legal minimum or automatic proof. Examine the distribution,
  slower cases, and current staffing capacity; choose a supported target with
  headroom and continue reviewing it as scope or volume changes.
- A quick configuration can remain an internal milestone if verified. It is
  not evidence of an equally quick end-to-end customer implementation.
- Competitor copy is not substantiation for Ringlume's own turnaround. Calling
  a claim an "aim" or adding "not guaranteed" does not remove the need for a
  reasonable basis. Essential qualifications belong next to any advertised
  number, not only behind a Terms link. See the [FTC small-business advertising
  guidance](https://www.ftc.gov/business-guidance/resources/advertising-faqs-guide-small-business),
  especially substantiation and disclosures. This plan is not legal clearance.

## Implementation plan, after approval

1. Approve the nonnumeric policy and confirm the actual setup/testing workflow.
   Decide separately whether to validate a numeric standard-setup target.
2. Remove `PRODUCTION_MAX` from `src/lib/offer.ts` and its consumers if adopting
   the nonnumeric policy. If a number is later approved, use a clearly scoped
   target identifier rather than a misleading universal `MAX`.
3. Revise only setup-related wording in `src/pages/terms.astro`, preserving
   section 7.1 and `#setup-time`. Align section 2.1's reference to setup targets
   with the new estimated-timeline policy.
4. Update `src/data/faqs.ts` and `src/data/faqs.md` together. Keep the existing
   Terms link. Leave homepage/pricing timing-free; no UI change is necessary.
5. Update the offer, Terms, FAQ, and content-guardrail tests to enforce the
   approved policy rather than the old 12-hour number. Preserve demo/production
   separation, concise FAQs, and bans on unapproved timing slogans.
6. Update the active `AGENTS.md` last, with approval, because its current
   instructions explicitly require the existing 12-hour policy. Do not silently
   implement a conflicting policy.
7. Run `pnpm test`, `pnpm check`, `pnpm build`, and `git diff --check`; inspect
   the rendered setup FAQ and Terms for consistent wording. No commit, push,
   deployment, or external service change without authorization.

At the original analysis stage, only this plan and the daily task log were
written. The later approved codebase changes are summarized under Implementation.
The supplied research report remains unchanged.
