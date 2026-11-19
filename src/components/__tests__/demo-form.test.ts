import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
	getReferralOptions,
	REFERRAL_OPTIONS,
	WEBSITE_PATTERN,
} from '../../lib/demo-form';

const demoFormSourceUrl = new URL('../DemoRequestForm.astro', import.meta.url);

const readSource = () => readFile(demoFormSourceUrl, 'utf8');

const fieldTag = (source: string, name: string) =>
	source.match(new RegExp(`<(?:input|select)[^>]*name="${name}"[^>]*>`))?.[0] ??
	'';

describe('demo request form', () => {
	it('keeps native POST and stable form identity in static markup', async () => {
		const source = await readSource();

		expect(source).toContain('name="demo-request"');
		expect(source).toContain('method="POST"');
		expect(source).toContain('action="/api/book-demo"');
		expect(source).toContain(
			'<input type="hidden" name="form-name" value="demo-request" />',
		);
	});

	it('keeps the honeypot hidden and out of the tab order', async () => {
		const source = await readSource();
		const tag = fieldTag(source, 'bot-field');

		expect(source).toContain('<div class="hidden"');
		expect(tag).toContain('tabindex="-1"');
		expect(tag).toContain('autocomplete="off"');
	});

	it('keeps the final field names and required set', async () => {
		const source = await readSource();
		const requiredFields = [
			'first_name',
			'last_name',
			'email',
			'company_website',
		];
		const optionalFields = ['phone', 'referral_source'];

		for (const name of [...requiredFields, ...optionalFields]) {
			expect(source).toContain(`name="${name}"`);
		}

		for (const name of requiredFields) {
			expect(fieldTag(source, name)).toContain('required');
		}

		for (const name of optionalFields) {
			expect(fieldTag(source, name)).not.toContain('required');
		}

		expect(source.match(/\brequired\b/g)).toHaveLength(4);
	});

	it('labels the company website clearly and keeps URL validation', async () => {
		const source = await readSource();

		expect(source).toContain('pattern={WEBSITE_PATTERN}');
		expect(source).toContain('{copy.websiteLabel}');
		expect(source).not.toContain('Facebook page');
		expect(source).toContain('title={copy.websiteTitle}');

		const pattern = new RegExp(`^(?:${WEBSITE_PATTERN})$`, 'v');

		for (const value of [
			'ringlume.com',
			'www.ringlume.com',
			'https://ringlume.com/path',
			'facebook.com/mybusiness',
		]) {
			expect(pattern.test(value)).toBe(true);
		}

		for (const value of ['ringlume', 'foo bar', 'http://']) {
			expect(pattern.test(value)).toBe(false);
		}
	});

	it('keeps the referral choices in the agreed order', () => {
		expect(REFERRAL_OPTIONS).toEqual([
			'Google search',
			'Facebook',
			'X/Twitter',
			'YouTube',
			'Referral from someone',
			'Virtual assistant (ChatGPT, Claude, etc.)',
			'Other',
		]);
	});

	it('separates editable referral labels from stable submitted values', () => {
		const options = getReferralOptions();
		expect(options.map((option) => option.value)).toEqual(REFERRAL_OPTIONS);
		const copy = Object.fromEntries(
			options.map((option) => [option.key, 'Edited']),
		);
		expect(
			getReferralOptions(
				copy as Parameters<typeof getReferralOptions>[0],
			).every((option) => option.label === 'Edited'),
		).toBe(true);
	});

	it('keeps the demo button and delivery line', async () => {
		const source = await readSource();

		expect(source).toContain('{copy.submitLabel}');
		expect(source).toContain('getOffer(Astro.locals.site.offer)');
		expect(source).toContain(
			'formatCopy(copy.delivery, { deliveryMax: demoDeliveryMax })',
		);
		expect(source).toContain('href="/terms"');
		expect(source).toContain('{copy.termsLabel}');
		expect(source).toContain('href="/privacy"');
		expect(source.indexOf('href="/terms"')).toBeGreaterThan(
			source.indexOf('</button>'),
		);
	});

	it('rounds supported mobile and desktop pickers without adding JavaScript', async () => {
		const source = await readSource();

		expect(source).toContain(
			'@supports (appearance: base-select) and selector(::picker(select))',
		);
		expect(source).not.toContain('(hover: hover)');
		expect(source).not.toContain('(pointer: fine)');
		expect(source).toContain('@media (forced-colors: none)');
		expect(source).toContain('#referral_source::picker(select)');
		expect(source).toContain('border-radius: 0.75rem');
		expect(source).not.toContain('<script');
		expect(source).not.toContain('client:');
	});
});
