import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import seed from '../../../content/site/site.json'
import { getPlans, getUsageRates, formatPrice } from '../../lib/pricing'
import { formatCopy } from '../../lib/tina/model'

const require = createRequire(import.meta.url)
const viteRequire = createRequire(require.resolve('vitest/package.json'))
const { transformWithOxc } = await import(viteRequire.resolve('vite'))
const readBody = () =>
	readFile(
		new URL(
			'../../components/cms-regions/marketing/PricingBody.astro',
			import.meta.url,
		),
		'utf8',
	)

// Evaluate the actual authored table rows, not a second implementation of them.
async function table(site = structuredClone(seed)) {
	const source = await readBody()
	const front = source.split('---')[1].replace(/^import .+$/gm, '')
	const { code } = await transformWithOxc(front, 'PricingBody.ts', {
		lang: 'ts',
	})
	return new Function(
		'Astro',
		'getPlans',
		'getUsageRates',
		'formatPrice',
		'formatCopy',
		'tinaField',
		`${code}\nreturn groups`,
	)(
		{ locals: { site } },
		getPlans,
		getUsageRates,
		formatPrice,
		formatCopy,
		() => '',
	) as {
		labelField: keyof typeof seed.pricing.copy
		rows: {
			labelField: keyof typeof seed.pricing.copy
			values: (string | boolean)[]
			statusLabel?: string
		}[]
	}[]
}

describe('editable pricing comparison', () => {
	it('uses the same request-specific plans, labels and rates as the cards', async () => {
		const site = structuredClone(seed)
		const plans = getPlans(site.pricing)
		const groups = await table(site)
		expect(groups.map((group) => group.labelField)).toEqual([
			'usageRates',
			'agentNumbers',
			'toolsReporting',
			'supportCompliance',
		])
		const rows = groups.flatMap((group) => group.rows)
		const row = (field: string) =>
			rows.find((item) => item.labelField === field)!
		expect(rows[rows.indexOf(row('additionalMinutes')) + 1]).toBe(
			row('liveTransfers'),
		)
		expect(row('callMinutes').values).toEqual(
			plans.map((plan) => plan.minutes.toLocaleString('en-US')),
		)
		expect(row('additionalMinutes').values).toEqual(
			plans.map((plan) =>
				formatCopy(site.pricing.copy.minuteRate, {
					rate: plan.overagePerMinute.toFixed(2),
				}),
			),
		)
		expect(row('liveTransfers').values).toEqual(
			plans.map((plan) =>
				formatCopy(site.pricing.copy.transferRate, {
					rate: plan.liveTransferPerMinute.toFixed(2),
				}),
			),
		)
		for (const group of groups) {
			expect(site.pricing.copy[group.labelField]).toBeTypeOf('string')
			for (const item of group.rows) {
				expect(site.pricing.copy[item.labelField]).toBeTypeOf('string')
				expect(item.values).toHaveLength(plans.length)
			}
		}
	})

	it('reflects all four edited plans and unit templates without name-based overrides', async () => {
		const site = structuredClone(seed)
		for (const [index, plan] of Object.values(site.pricing.plans).entries()) {
			plan.name = `Renamed ${index}`
			plan.minutes += 111 + index
			plan.concurrentCalls += 7 + index
			plan.phoneNumbers += 2 + index
			plan.overagePerMinute += 0.31
			plan.liveTransferPerMinute += 0.21
			plan.smsPerMessage += 0.11
			plan.telephonyFromPerMinute += 0.011
			plan.integrations = `Connections ${index}`
			plan.support = `Support ${index}`
			plan.multilingual = !plan.multilingual
		}
		site.pricing.additionalPhoneNumberMonthly += 9
		const copy = site.pricing.copy
		copy.minuteRate = 'extra {rate}'
		copy.transferRate = 'transfer {rate}'
		copy.smsRate = 'text {rate}'
		copy.telephonyRate = 'carrier {rate}'
		copy.additionalNumberRate = 'number {price}'
		copy.agentPro = 'Edited pro'
		copy.agentPlus = 'Edited plus'
		copy.agentMax = 'Edited max'
		copy.languages = 'Edited languages'
		const rows = (await table(site)).flatMap((group) => group.rows)
		const row = (field: string) =>
			rows.find((item) => item.labelField === field)!
		for (const [index, plan] of getPlans(site.pricing).entries()) {
			for (const [field, expected] of Object.entries({
				callMinutes: plan.minutes.toLocaleString('en-US'),
				simultaneousCalls: String(plan.concurrentCalls),
				phoneNumbers: String(plan.phoneNumbers),
				additionalMinutes: formatCopy(copy.minuteRate, {
					rate: plan.overagePerMinute.toFixed(2),
				}),
				liveTransfers: formatCopy(copy.transferRate, {
					rate: plan.liveTransferPerMinute.toFixed(2),
				}),
				sms: formatCopy(copy.smsRate, { rate: plan.smsPerMessage.toFixed(2) }),
				telephony: formatCopy(copy.telephonyRate, {
					rate: plan.telephonyFromPerMinute.toFixed(3),
				}),
				additionalNumbers: formatCopy(copy.additionalNumberRate, {
					price: formatPrice(
						getUsageRates(site.pricing).additionalPhoneNumberMonthly,
					),
				}),
				connections: plan.integrations,
				support: plan.support,
				multilingual: plan.multilingual ? copy.languages : false,
			}))
				expect(row(field).values[index], `${plan.id}.${field}`).toBe(expected)
		}
		expect(row('agentIncluded').values).toEqual([
			site.pricing.plans.basic.agents,
			copy.agentPro,
			copy.agentPlus,
			copy.agentMax,
		])
	})

	it('keeps inclusion and availability semantics independent of editable labels', async () => {
		const site = structuredClone(seed)
		Object.assign(site.pricing.copy, {
			included: 'Edited included',
			available: 'Edited available',
			notIncluded: 'Edited excluded',
		})
		const rows = (await table(site)).flatMap((group) => group.rows)
		for (const field of ['webWidget', 'dashboard', 'recordings', 'hipaa']) {
			expect(rows.find((row) => row.labelField === field)?.values).toEqual(
				getPlans(site.pricing).map(() => true),
			)
		}
		expect(rows.find((row) => row.labelField === 'hipaa')?.statusLabel).toBe(
			'available',
		)
		const source = await readBody()
		expect(source).toContain("typeof value === 'boolean'")
		expect(source).not.toMatch(/value === ['"]Available['"]/)
		expect(source).toContain(
			"value ? row.statusLabel ?? 'included' : 'notIncluded'",
		)
		expect(source).toContain('aria-hidden="true"')
	})

	it('preserves the accessible table, legal links, shared CTA and mobile sticky layout', async () => {
		const source = await readBody()
		for (const attribute of [
			'id="plan-comparison"',
			'id="plan-comparison-heading"',
			'tabindex="0"',
			'role="region"',
			'scope="rowgroup"',
			'scope="row"',
			'scope="col"',
			'aria-describedby="comparison-help"',
			'href="/terms#billing-details"',
			'href="/terms#service-details"',
			'href={site.links.freeDemo}',
		])
			expect(source).toContain(attribute)
		expect(source).toContain('aria-label={copy.tableLabel}')
		expect(source).toContain('overflow-x-auto')
		expect(source).toContain('border-separate border-spacing-0')
		expect(source).toContain('<caption')
		const mobile = source.slice(source.indexOf('@media (width < 40rem)'))
		for (const style of [
			'.plan-table tr > :first-child:not([colspan])',
			'position: sticky',
			'left: 0',
			'background: var(--bg-alt)',
			'width: 10rem',
			'z-index: 2',
		])
			expect(mobile).toContain(style)
		expect(source).not.toContain('set:html')
	})

	it('uses a shared pricing preview shell without a second introduction', async () => {
		const source = await readFile(
			new URL('../pricing.astro', import.meta.url),
			'utf8',
		)
		expect(source).toContain('title={site.pages.pricing.title}')
		expect(source).toContain('description={site.pages.pricing.description}')
		expect(source).toContain('region="pricing" page="pricing" primary')
		expect(source).toContain('<PricingBody />')
		expect(await readBody()).toContain('<Pricing detailed />')
	})
})
