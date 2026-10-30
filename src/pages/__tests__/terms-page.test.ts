import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
	CAL_BOOKING_URL,
	formatList,
	PRODUCTION_MAX,
	SUPPORTED_STACK,
} from '../../lib/offer'

const termsSourceUrl = new URL('../terms.astro', import.meta.url)

const readTerms = () => readFile(termsSourceUrl, 'utf8')

describe('terms', () => {
	it('states the no-refund policy and has no refund-page link', async () => {
		const source = await readTerms()

		expect(source).toContain('No refunds.')
		expect(source).not.toContain('Refund Policy')
		expect(source).not.toContain('/refund')
	})

	it('keeps the setup clause inside the existing service section', async () => {
		const source = await readTerms()

		expect(source).toContain('id="setup-time"')
		expect(source).toContain('7.1 Setup Time and Compatible Tools')
		expect(source).toContain('7. Service Availability & Uptime')
		// The clause is a sub-clause, so the existing numbering is untouched.
		expect(source).toContain('8. Limitation of Liability')
		expect(source).toContain('Last Updated: October 30, 2026')
		expect(source).toContain('{PRODUCTION_MAX}')
		expect(source).toContain('href={CAL_BOOKING_URL}')
		expect(source).toContain('href="/contact"')
		expect(source).toContain('PBX')
		expect(source).toContain('custom')
		expect(source).toContain('targets, not guarantees')
		expect(source).not.toContain('24–48')
	})

	it('renders every supported tool from the shared stack', async () => {
		const source = await readTerms()

		let rendered = source.slice(source.indexOf('id="setup-time"'))
		// Resolve the four static template expressions, not a second tool list.
		for (const group of ['phone', 'calendar', 'booking', 'crm'] as const) {
			const expression = `{formatList(SUPPORTED_STACK.${group})}`
			expect(rendered).toContain(expression)
			rendered = rendered.replace(expression, formatList(SUPPORTED_STACK[group]))
		}

		for (const tools of Object.values(SUPPORTED_STACK)) {
			for (const tool of tools) {
				expect(rendered).toContain(tool)
				// No hardcoded duplicate in the page: the stack is the source.
				expect(source).not.toContain(tool)
			}
		}

		expect(CAL_BOOKING_URL).toBe('https://cal.com/ringlume/meeting')
		expect(PRODUCTION_MAX).toBe('12 hours')
	})
})
