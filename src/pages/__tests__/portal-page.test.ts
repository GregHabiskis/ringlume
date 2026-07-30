import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const portalSourceUrl = new URL('../portal.astro', import.meta.url);

describe('/portal page', () => {
	it('describes Paddle-hosted management and cancellation', async () => {
		const source = await readFile(portalSourceUrl, 'utf8');

		expect(source).toContain('Manage or Cancel Subscription');
		expect(source).toContain('view invoices, update payment methods');
		expect(source).toContain('manage or cancel your subscription');
		expect(source).toContain('email address used for your purchase');
		expect(source).toContain('one-time sign-in link');
	});

	it('has no custom email or account login form', async () => {
		const source = await readFile(portalSourceUrl, 'utf8');

		expect(source).not.toMatch(/<form[\s>]/);
		expect(source).not.toMatch(/<input[\s>]/);
	});

	it('includes accessible icon, CTA, and error treatment', async () => {
		const source = await readFile(portalSourceUrl, 'utf8');

		expect(source).toContain('aria-hidden="true"');
		expect(source).toContain('focus-visible:ring-2');
		expect(source).toContain('role="alert"');
		expect(source).toContain('portal_unavailable');
		expect(source).toContain('href="/contact"');
	});
});
