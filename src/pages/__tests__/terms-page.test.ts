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
		expect(source).toContain('Last Updated: November 1, 2026')
		expect(source).toContain('{PRODUCTION_MAX}')
		expect(source).toContain('href={CAL_BOOKING_URL}')
		expect(source).toContain('href="/contact"')
		expect(source).toContain('PBX')
		expect(source).toContain('custom')
		expect(source).toContain('targets, not guarantees')
		expect(source).not.toContain('24–48')
	})

	it('credits prior setup payments and earlier top-ups separately from subscription proration', async () => {
		const source = (await readTerms()).replace(/\s+/g, ' ')
		expect(source).toContain('id="setup-fee-upgrades"')
		expect(source).toContain('3.3 Setup Fees When Upgrading')
		expect(source).toContain(
			'total Service Setup Fees already paid count toward',
		)
		expect(source).toContain('setup-fee top-ups paid on earlier upgrades')
		expect(source).toContain(
			'remaining difference, not the full setup fee again',
		)
		expect(source).toContain('no additional setup fee is due')
		expect(source).toContain('separate from subscription charges')
		expect(source).toContain('{ from: PLANS[0], to: PLANS[1] }')
		expect(source).toContain('{ from: PLANS[0], to: PLANS[2] }')
		expect(source).toContain(
			'formatPrice(Math.max(0, to.setupFee - from.setupFee))',
		)
	})

	it('holds the relocated billing, integration and estimate explanations without renumbering existing sections', async () => {
		const source = (await readTerms()).replace(/\s+/g, ' ')
		for (const id of [
			'service-details',
			'billing-details',
			'estimates',
			'setup-time',
		]) {
			expect(source).toContain(`id="${id}"`)
		}
		expect(source).toContain(
			'No compliance certification or regulated workflow is guaranteed',
		)
		expect(source).toContain('agreed scope')
		expect(source).toContain('Included minutes reset monthly')
		expect(source).toContain('plan.overagePerMinute.toFixed(2)')
		expect(source).toContain('{overageRates}')
		expect(source).toContain('monthly equivalents are approximate')
		expect(source).toContain('prorated difference')
		expect(source).toContain('Actual recovered revenue depends on call volume')
		expect(source).toContain('Wages exclude benefits and payroll taxes')
		expect(source).toContain('8. Limitation of Liability')
		expect(source).toContain('12. Contact Information')
	})

	it('renders every supported tool from the shared stack', async () => {
		const source = await readTerms()

		let rendered = source.slice(source.indexOf('id="setup-time"'))
		// Resolve the four static template expressions, not a second tool list.
		for (const group of ['phone', 'calendar', 'booking', 'crm'] as const) {
			const expression = `{formatList(SUPPORTED_STACK.${group})}`
			expect(rendered).toContain(expression)
			rendered = rendered.replace(
				expression,
				formatList(SUPPORTED_STACK[group]),
			)
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
