// Netlify keys submission columns by these option values, so keep them stable.
export const REFERRAL_OPTIONS = [
	'Google search',
	'Facebook',
	'X/Twitter',
	'YouTube',
	'Referral from someone',
	'AI assistant (ChatGPT, Claude, etc.)',
	'Other',
] as const

// Compiled by browsers with the `v` flag, where an unescaped `-` inside a
// character class is invalid and makes the whole pattern silently ignored.
export const WEBSITE_PATTERN =
	'(https?://)?([A-Za-z0-9\\-]+\\.)+[A-Za-z]{2,}(/\\S*)?'
