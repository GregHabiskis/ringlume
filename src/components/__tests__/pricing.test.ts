import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const pricingSourceUrl = new URL('../Pricing.astro', import.meta.url);

describe('pricing CTAs', () => {
	it('offers a Contact Sales link on every plan', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8');

		expect(source.match(/name: '(Basic|Pro|Plus|Max)'/g)).toHaveLength(4);
		expect(source.match(/cta: 'Contact Sales'/g)).toHaveLength(4);
		expect(source).toContain('href="https://cal.com/ringlume/meeting"');
	});

	it('keeps the legal acceptance notice next to every CTA', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8');

		expect(source).toContain('aria-describedby={`cta-legal-notice-${plan.name.toLowerCase()}`}');
		expect(source).toContain('id={`cta-legal-notice-${plan.name.toLowerCase()}`}');
		expect(source).toContain('Terms of Service');
		expect(source).toContain('href="/terms"');
		expect(source).toContain('Privacy Policy');
		expect(source).toContain('href="/privacy"');
		expect(source).toContain('+ $1,200 one-time Service Setup Fee');
		expect(source).not.toContain('Voice AI Setup Fee');
		expect(source).not.toContain('/refund');
		expect(source).not.toMatch(/refund/i);
	});

	it('has no payment provider wiring left in the section', async () => {
		const source = await readFile(pricingSourceUrl, 'utf8');

		expect(source).not.toMatch(/paddle/i);
		expect(source).not.toContain('data-checkout-button');
		expect(source).not.toContain('priceId');
	});
});
