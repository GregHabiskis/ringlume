# TinaCMS

Ringlume uses TinaCMS with TinaCloud Free and GitHub-backed JSON content.
There is no application database, Payload installation, or Puck editor.

## Owner setup

1. Create a Free project at https://app.tina.io/.
2. Authorize the GitHub integration for `GregHabiskis/ringlume` only.
3. Select the branch Cloudflare Workers Builds deploys to production.
4. Copy the project's Client ID and create a read-only content token.
5. In the production Worker's **Build > Build variables and secrets**, configure
   `PUBLIC_TINA_CLIENT_ID` as a variable and `TINA_TOKEN` as a secret.
   Treat `TINA_TOKEN` as secret. Never commit it, expose it as a `PUBLIC_`
   variable, or exempt it from secret scanning.
6. Also set `TINA_TOKEN` as a runtime secret under the Worker's **Settings >
   Variables and Secrets**. The live preview endpoint reads it at runtime;
   the build secret alone does not reach the deployed Worker.
7. The build uses the Workers Builds branch, or `main` for manual builds.
   Set `TINA_BRANCH` only if you need to override that selection.
8. Follow the [Workers deployment setup](../README.md#deploy). Open `/admin/`
   on the deployed site and sign in.

The Client ID identifies the project; it is not a secret. The read-only token
supports content reads, not editor authentication. TinaCloud authenticates
editors and authorizes their GitHub-backed saves.

Leave non-production branch builds disabled unless you configure and test
separate TinaCloud access and Workers secrets for them. Do not share
production credentials with untrusted pull-request previews.

## Editing

- `content/site/site.json` is the single authored source for site text,
  link destinations, and commercial settings. Open the site document and
  choose the relevant group.
- Shared navigation, footer, common button labels, accessibility labels, and
  search metadata are editable.
- Homepage, FAQ, pricing, contact, demo-request, confirmation, Terms, and Privacy
  copy are editable, including small notes, form labels, link labels, and custom
  validation text.
- The live demo's interface messages and the illustrated call's dialogue,
  labels, and controls are editable without changing their operation.
- Pricing and offer settings control names, prices, fees, rates, included
  minutes, phone numbers, simultaneous-call limits, and demo allowances.
  Shared values feed the cards, tables, comparison, and relevant legal examples.
- Layout, section order, page routes, anchor IDs, form actions and field names,
  and calculation rules stay fixed. There are no image-upload or
  block-arrangement controls.
  Existing logo files remain site assets, not CMS-managed images.
- Browser-generated validation and microphone prompts, third-party interface
  text, and Tina's own admin labels are outside the website-copy editor.

Some sentences contain named placeholders such as `{minutes}` or
`{deliveryMax}`. Edit the surrounding words, but retain the required placeholders
so shared values remain consistent. Do not replace them with independently
typed prices or allowances.

The actual annual charge is authoritative. Its approximate monthly display is
derived using the existing rounding policy; changing a rounded display must
never determine the billed annual total.

Changing settings updates the advertised offer only. It does not change
invoices, subscriptions, voice-platform configuration, or call-duration caps.
Review legal wording and business promises before publishing; numeric and
template validation cannot determine their legal or commercial accuracy.

TinaCloud saves content to GitHub. Cloudflare then builds and deploys that commit.
Saving does not mean the public website has deployed successfully: check the
Workers deployment before considering a change live.

Fill required fields before checking preview. Incomplete or invalid content
may leave the preview showing its last valid state.

This workflow does not introduce a separate draft/publish database.
Use Git history to review and revert content changes.

### Link URLs

Open **Website text and offer > Link URLs**. Each destination is shared across
its navigation links and CTAs. For example, **Free Demo** changes the header and
footer links, homepage calls to action, and all pricing plan buttons together.
Desktop and mobile navigation use the same destinations.

Use a site path such as `/contact`, a page anchor such as `#plan-comparison`,
or an `https://` URL. The email destination also accepts a bare `mailto:`
address. Edit button labels in their existing copy fields. Inline references
in legal and FAQ copy, form endpoints, and controls that perform an action
instead of navigating are not part of this group.

## Local development

`pnpm dev` starts Tina's local content service and Astro. Open `/admin/` to
edit local files. Local saves modify the working tree; they are not automatic
production publications.

`pnpm build:local` is a credential-free verification build. Its generated
admin/client configuration targets local editing and must never be deployed.
Use `pnpm build` with TinaCloud credentials for production.

Keep the generated `tina/tina-lock.json` schema artifact in Git. Generated
clients and admin bundles are build artifacts, not hand-edited source.

## Preview and verification

Public pages remain statically generated. Live editing uses Tina islands and
an on-demand `/tina-island/[name]` route through the Cloudflare adapter.
Same-origin framing is required for `/admin/` to preview the website; the
existing framing restriction becomes `SAMEORIGIN`, not unrestricted framing.

Tina replaces static preview regions while editing. Their controls are
reinitialized with preserved input and selection state. The active call and
storyboard nodes are not replaced; their copy is refreshed in place so a text
edit does not reconnect a call or restart the animation.

Run `pnpm test`, `pnpm check`, and a production build with configured
credentials, or `pnpm build:local` for explicitly local verification.
On the deployed site, verify login, preview, save, reload, GitHub persistence,
Workers publication, and denied unauthenticated saves. Confirm forms and the
click-loaded demo still work; a real demo call requires owner approval.

TinaCloud and Cloudflare Workers have free-tier limits. Tina's Astro refresh
route uses experimental APIs; recheck preview behavior before upgrading it.
