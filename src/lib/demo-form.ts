import seed from '../../content/site/site.json';
import type { SiteContent } from './tina/site-model';

// Submitted values stay stable when display labels change.
export const REFERRAL_OPTIONS = [
	'Google search',
	'Facebook',
	'X/Twitter',
	'YouTube',
	'Referral from someone',
	'Virtual assistant (ChatGPT, Claude, etc.)',
	'Other',
] as const;

const referralKeys = [
	'referralGoogle',
	'referralFacebook',
	'referralTwitter',
	'referralYoutube',
	'referralPerson',
	'referralAssistant',
	'referralOther',
] as const;

export function getReferralOptions(
	copy: SiteContent['forms']['demo'] = seed.forms.demo,
) {
	return REFERRAL_OPTIONS.map((value, index) => {
		const key = referralKeys[index];
		return { value, key, label: copy[key] };
	});
}

// Compiled by browsers with the `v` flag, where an unescaped `-` inside a
// character class is invalid and makes the whole pattern silently ignored.
export const WEBSITE_PATTERN =
	'(https?://)?([A-Za-z0-9\\-]+\\.)+[A-Za-z]{2,}(/\\S*)?';
