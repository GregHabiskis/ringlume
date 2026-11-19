import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import { calculator as copy } from '../../../content/site/site.json'
import { initCalculator } from '../../scripts/calculator'

const sourceUrl = new URL('../FomoSection.astro', import.meta.url)
const readSource = () => readFile(sourceUrl, 'utf8')

describe('missed-call section', () => {
	it('updates live copy without resetting existing calculator inputs or totals', () => {
		vi.useFakeTimers()
		const windowMock = Object.assign(new EventTarget(), {
			matchMedia: () => ({ matches: true }),
			setTimeout,
			clearTimeout,
		})
		vi.stubGlobal('window', windowMock)
		vi.stubGlobal('document', { activeElement: null })
		const input = Object.assign(new EventTarget(), { value: '1500', parentElement: null })
		const annual = { textContent: '' }
		const monthly = { textContent: '' }
		const bookings = { textContent: '' }
		const helper = { textContent: '' }
		const status = { textContent: '' }
		const label = { dataset: { calcCopy: 'monthly' }, textContent: copy.monthly }
		const nodes: Record<string, unknown> = {
			'[data-calc-annual]': annual, '[data-calc-monthly]': monthly,
			'[data-calc-bookings]': bookings, '[data-calc-helper]': helper,
			'[data-calc-status]': status,
			'[data-calc-field="bookingValue"][data-calc-kind="text"]': input,
		}
		const root = {
			dataset: { calcCopyJson: JSON.stringify(copy) },
			isConnected: true,
			querySelector: (selector: string) => nodes[selector] ?? null,
			querySelectorAll: () => [label],
			setAttribute: vi.fn(),
		}
		try {
			initCalculator(root as unknown as HTMLElement)
			input.value = '1,500'
			const edited = { ...copy, monthly: 'Edited monthly', currency: 'USD ',
				assumption: 'Edited {rate}, {repeats}', result: 'Edited {annual}' }
			const event = new Event('ringlume:copy-change')
			Object.assign(event, { detail: { calculator: edited } })
			windowMock.dispatchEvent(event)
			expect(input.value).toBe('1,500')
			expect(annual.textContent).toBe('USD 280,800')
			expect(monthly.textContent).toBe('USD 23,400')
			expect(label.textContent).toBe('Edited monthly')
			expect(helper.textContent).toBe(`Edited 30${copy.percent}, 1.2`)
			expect(root.setAttribute).toHaveBeenCalledWith('aria-label', edited.label)
			vi.runAllTimers()
			expect(status.textContent).toBe('Edited USD 280,800')
		} finally {
			vi.useRealTimers()
			vi.unstubAllGlobals()
		}
	})

	it('keeps the working calculator under an addressable FOMO section', async () => {
		const source = await readSource()
		expect(source).toContain('id="fomo"')
		expect(source).toContain('aria-labelledby="fomo-heading"')
		expect(source).toContain('<MissedCallCalculator />')
	})

	it('does not present unsourced statistics or guaranteed revenue losses', async () => {
		const source = await readSource()
		expect(source).not.toContain('62%')
		expect(source).not.toContain('80%')
		expect(source).not.toMatch(/gone forever|right now|Instant Lead Decay/)
		expect(source).toContain('copy.description')
	})

	it('keeps the section static and defers its below-the-fold layout', async () => {
		const source = await readSource()
		expect(source).toContain('content-auto')
		expect(source).not.toContain('<script')
		expect(source).not.toContain('client:')
		expect(source).not.toContain('animate-pulse')
	})

	it('keeps the calculator blur-free, with its default result rendered on the server', async () => {
		const source = await readFile(
			new URL('../MissedCallCalculator.astro', import.meta.url),
			'utf8',
		)
		expect(source).toContain('glass glass-fill glass-regular')
		expect(source).toContain('formatCurrency(result.annual, copy)')
		expect(source).toContain('Astro.locals.site.calculator')
		expect(source).toContain('{copy.disclaimer}')
		expect(source).toContain('href="/terms#estimates"')
	})
})
