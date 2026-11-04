import { describe, expect, it } from 'vitest'
import { PLANS, USAGE_RATES, formatPrice } from '../pricing'

describe('Ringlume plan facts', () => {
	it('preserves the four existing monthly prices and annual totals', () => {
		expect(PLANS.map((plan) => plan.monthly)).toEqual([299, 599, 999, 1999])
		expect(PLANS.map((plan) => plan.annualTotal)).toEqual([
			2990, 5990, 9990, 19990,
		])
		expect(PLANS.map((plan) => plan.annualMonthly)).toEqual([
			249, 499, 832, 1666,
		])
	})

	it('preserves setup fees, allowances, concurrency and number counts', () => {
		expect(PLANS.map((plan) => plan.setupFee)).toEqual([800, 1000, 1200, 1200])
		expect(PLANS.map((plan) => plan.minutes)).toEqual([600, 1200, 2400, 5000])
		expect(PLANS.map((plan) => plan.concurrentCalls)).toEqual([
			50, 100, 200, 300,
		])
		expect(PLANS.map((plan) => plan.phoneNumbers)).toEqual([1, 3, 5, 5])
	})

	it('uses the approved additional-minute rate for each plan', () => {
		expect(PLANS.map((plan) => plan.overagePerMinute)).toEqual([
			0.2, 0.18, 0.18, 0.16,
		])
		expect(PLANS.map((plan) => plan.overagePerMinute.toFixed(2))).toEqual([
			'0.20',
			'0.18',
			'0.18',
			'0.16',
		])
	})

	it('uses the approved SMS, transfer, and additional phone-number rates', () => {
		expect(PLANS.map((plan) => plan.smsPerMessage)).toEqual([
			0.04, 0.04, 0.03, 0.03,
		])
		expect(PLANS.map((plan) => plan.liveTransferPerMinute)).toEqual([
			0.1, 0.1, 0.08, 0.08,
		])
		expect(USAGE_RATES.additionalPhoneNumberMonthly).toBe(5)
	})

	it('includes the approved cumulative agent bundles', () => {
		expect(PLANS.map((plan) => plan.agents)).toEqual([
			'Receptionist agent',
			'Receptionist agent & Lead follow-up agent',
			'Receptionist, lead follow-up & customer support agents',
			'Receptionist, lead follow-up & customer support agents',
		])
		expect(PLANS[1].benefits).toContain('Answers calls & follows up with leads')
		expect(PLANS.slice(2).map(({ benefits }) => benefits[1])).toEqual([
			'Answering, follow-up & qualify',
			'Answering, follow-up & qualify',
		])
	})

	it('uses the approved telephony starting rates with three-decimal displays', () => {
		expect(PLANS.map((plan) => plan.telephonyFromPerMinute)).toEqual([
			0.028, 0.028, 0.02, 0.02,
		])
		expect(PLANS.map((plan) => plan.telephonyFromPerMinute.toFixed(3))).toEqual([
			'0.028', '0.028', '0.020', '0.020',
		])
	})

	it('formats USD without losing thousands separators', () => {
		expect(formatPrice(299)).toBe('$299')
		expect(formatPrice(1200)).toBe('$1,200')
		expect(formatPrice(19990)).toBe('$19,990')
	})

	it('labels approximate annual equivalents without changing the annual charge', () => {
		for (const plan of PLANS) {
			expect(Math.abs(plan.annualTotal / 12 - plan.annualMonthly)).toBeLessThan(
				1,
			)
		}
	})
})
