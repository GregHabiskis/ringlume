import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const sourceUrl = new URL('../DemoSection.astro', import.meta.url)
const readSource = () => readFile(sourceUrl, 'utf8')

describe('Retell greeting popup', () => {
	it('uses the minimized widget theme instead of a white background', async () => {
		const source = await readSource()

		expect(source).toContain(
			'[class*=_popup_] [class*=_bubble_]{background:var(--color-theme)}',
		)
	})

	it('keeps greeting text, branding, and the Close button readable', async () => {
		const source = await readSource()

		expect(source).toContain(
			'[class*=_popup_] [class]{color:var(--fg-1)}',
		)
	})

	it('reuses the persistent shadow-root override for the delayed popup', async () => {
		const source = await readSource()
		const overrides = source.slice(
			source.indexOf('function applyOverrides('),
			source.indexOf('function queryWidget'),
		)

		expect(overrides).toContain('if (root.getElementById(STYLE_OVERRIDE_ID)) return')
		expect(overrides).toContain('[class*=_popup_]')
		expect(overrides).toContain('root.appendChild(style)')
		expect(source).toContain("tag.dataset.showAiPopup = 'true'")
		expect(source).toContain("tag.dataset.showAiPopupTime = '8'")
		expect(source).not.toContain('MutationObserver')
	})
})
