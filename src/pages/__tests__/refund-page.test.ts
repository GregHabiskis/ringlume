import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const refundSourceUrl = new URL('../refund.astro', import.meta.url);

describe('refund policy', () => {
	it('states the definitive subscription and setup-fee refund split', async () => {
		const source = await readFile(refundSourceUrl, 'utf8');

		expect(source).toContain('100% refundable');
		expect(source).toContain('50% refundable');
		expect(source).toContain('$1,200');
		expect(source).toContain('$600');
		expect(source).toContain('After the 7-day guarantee period');
		expect(source).toContain('No partial refund guarantee applies');
	});
});
