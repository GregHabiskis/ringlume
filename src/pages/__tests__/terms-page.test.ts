import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const termsSourceUrl = new URL('../terms.astro', import.meta.url)

describe('terms', () => {
	it('states the no-refund policy and has no refund-page link', async () => {
		const source = await readFile(termsSourceUrl, 'utf8')

		expect(source).toContain('No refunds.')
		expect(source).not.toContain('Refund Policy')
		expect(source).not.toContain('/refund')
	})
})
