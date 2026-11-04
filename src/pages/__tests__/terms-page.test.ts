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
		expect(source).toContain('Last Updated: November 4, 2026')
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

	it('includes dashboard access and aligns service allowances with the plan comparison', async () => {
		const source = (await readTerms()).replace(/\s+/g, ' ')
		expect(source).toContain(
			'Every plan includes a User Dashboard and daily call recordings and reports.',
		)
		expect(source).toContain('href="/pricing#plan-comparison"')
		expect(source).toContain(
			'Agent bundles, included call minutes and phone numbers, simultaneous-call limits',
		)
		expect(source).toContain(
			'calendar and CRM connections, multilingual support, and support levels',
		)
		expect(source).toContain('dashboard access included with every plan')
		expect(source).not.toMatch(
			/does not provide an application account|automated access system/,
		)
	})

	it('discloses transfer, SMS, and additional-number prices from shared pricing data', async () => {
		const source = await readTerms()
		expect(source).toContain('plan.liveTransferPerMinute.toFixed(2)')
		expect(source).toContain('plan.smsPerMessage.toFixed(2)')
		expect(source).toContain('Live call transfers: {transferRates}')
		expect(source).toContain('SMS messages: {smsRates}')
		expect(source).toContain(
			'formatPrice(USAGE_RATES.additionalPhoneNumberMonthly)',
		)
		expect(source).toContain('per additional number per month')
		expect(source).toContain(
			'3.1 Usage Rates, Annual Billing, and Plan Changes',
		)
	})

	it('states Trillet-provided HIPAA/BAA availability without automatically guaranteeing regulated workflows', async () => {
		const source = (await readTerms()).replace(/\s+/g, ' ')
		expect(source).toContain(
			'HIPAA support and a Business Associate Agreement (BAA) are available on all plans through Trillet.',
		)
		expect(source).toContain(
			'requires confirmation of the applicable BAA, configuration, and agreed scope before processing begins',
		)
		expect(source).toContain(
			'No compliance certification or regulated workflow is guaranteed by choosing a plan.',
		)
	})

	it('explains web voice, text, mixed-session billing, and separate telephony charges', async () => {
		const source = (await readTerms()).replace(/\s+/g, ' ')
		expect(source).toContain('plan.telephonyFromPerMinute.toFixed(3)')
		expect(source).toContain('Ringlume telephony: {telephonyRates}')
		expect(source).toContain(
			'carrier charges apply to calls routed through a phone number in addition to standard call usage',
		)
		expect(source).toContain(
			'Web calls and web chat widgets are also included on all plans',
		)
		const billing = source.slice(
			source.indexOf('id="billing-details"'),
			source.indexOf('id="estimates"'),
		)
		expect(billing).toContain(
			'same monthly call-minute allowance and standard per-minute rates as phone calls',
		)
		expect(billing).toContain(
			"plan's additional-minute rate once the allowance is exhausted",
		)
		expect(billing).toContain(
			'Web calls do not use a phone line, so no telephony fee applies',
		)
		expect(billing).toContain('does not make web-call usage free')
		expect(billing).toContain(
			"counted as SMS messages for billing purposes and charged at your plan's SMS rate",
		)
		expect(billing).toContain('type-or-talk session')
		expect(billing).toContain(
			'voice portion is billed as call usage and the typed messages are billed at SMS rates',
		)
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
