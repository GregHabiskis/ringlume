import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const pricingSourceUrl = new URL('../Pricing.astro', import.meta.url);

describe('pricing checkout launchers', () => {
	it('displays the legal acceptance notice for every checkout launcher', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8');

		expect(source.match(/name: '(Basic|Pro|Plus|Max)'/g)).toHaveLength(4);
		expect(source).toContain('data-checkout-button');
		expect(source).toContain('aria-describedby={`checkout-legal-notice-${plan.name.toLowerCase()}`}');
		expect(source).toContain('id={`checkout-legal-notice-${plan.name.toLowerCase()}`}');
		expect(source).toContain('Terms of Service');
		expect(source).toContain('href="/terms"');
		expect(source).toContain('Privacy Policy');
		expect(source).toContain('href="/privacy"');
		expect(source).toContain('Refund Policy');
		expect(source).toContain('href="/refund"');
		expect(source).toContain('subscription charges are 100% refundable');
		expect(source).toContain('the setup fee is 50% refundable');
	});

	it('keeps the one-time setup fee in the checkout items', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8');

		expect(source).toContain('{ priceId: setupFeePriceId, quantity: 1 }');
	});
});
