import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

describe('editable legal pages', () => {
	for (const page of ['terms', 'privacy']) {
		it(`${page} shares contextual content between its shell and preview body`, async () => {
			const shell = await read(`../${page}.astro`)
			const body = await read(
				`../../components/cms-regions/legal/${page === 'terms' ? 'Terms' : 'Privacy'}Body.astro`,
			)
			const site = JSON.parse(await read('../../../content/site/site.json'))
			const copy = site.legal[page]
			if (page === 'terms') {
				expect(copy.planListConjunction).toBeTypeOf('string')
				expect(copy.billing.paragraph1Text1).toContain('{planNames}')
			}

			expect(shell).toContain(`Astro.locals.site.legal.${page}`)
			expect(shell).toContain('title={copy.metaTitle}')
			expect(shell).toContain('description={copy.metaDescription}')
			expect(shell).toContain(`region="${page}" page="${page}" primary`)
			expect(shell).toContain(`region="header" page="${page}"`)
			expect(shell).toContain(`region="footer" page="${page}"`)
			expect(body).toContain('Astro.locals.site')
			expect(body.match(/<section>/g)).toHaveLength(12)
			expect(body).not.toContain('set:html')

			const references = new Set(
				[...body.matchAll(/(?:\{copy\.|formatCopy\(copy\.)([\w.]+)/g)].map(
					(match) => match[1],
				),
			)
			for (const path of references) {
				const value = path.split('.').reduce((object, key) => object[key], copy)
				expect(value, path).toBeTypeOf('string')
				expect(value.length, path).toBeGreaterThan(0)
			}
			for (const match of body.matchAll(
				/tinaField\((copy(?:\.\w+)*), '(\w+)'\)/g,
			)) {
				const path = `${match[1].replace(/^copy\.?/, '')}.${match[2]}`.replace(
					/^\./,
					'',
				)
				expect(references.has(path), path).toBe(true)
			}
		})
	}

	it('preserves legal anchors, fixed destinations and shared numeric expressions', async () => {
		const body = await read(
			'../../components/cms-regions/legal/TermsBody.astro',
		)
		for (const id of [
			'service-details',
			'billing-details',
			'estimates',
			'setup-fee-upgrades',
			'setup-time',
		]) {
			expect(body).toContain(`id="${id}"`)
		}
		for (const destination of [
			'#billing-details',
			'#setup-time',
			'/pricing#plan-comparison',
			'/contact',
		]) {
			expect(body).toContain(`href="${destination}"`)
		}
		expect(body).toContain('href={site.links.setupMeeting}')
		expect(body).toContain('getPlans(site.pricing)')
		expect(body).toContain('getOffer(site.offer)')
		for (const rate of [
			'overagePerMinute',
			'liveTransferPerMinute',
			'smsPerMessage',
			'telephonyFromPerMinute',
		]) {
			expect(body).toContain(`plan.${rate}.toFixed(`)
		}
		expect(body).toContain(
			'formatPrice(Math.max(0, to.setupFee - from.setupFee))',
		)
		expect(body).toContain(
			'formatPrice(USAGE_RATES.additionalPhoneNumberMonthly)',
		)
		for (const group of ['phone', 'calendar', 'booking', 'crm']) {
			expect(body).toContain(
				`formatList(SUPPORTED_STACK.${group}, offer.listConjunction, offer.listSeparator)`,
			)
		}
	})
})
