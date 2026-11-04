import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const sourceUrl = new URL('../DemoSection.astro', import.meta.url)
const readSource = () => readFile(sourceUrl, 'utf8')

describe('inline Retell call controls', () => {
	it('removes the third-party popup and its shadow-DOM workarounds', async () => {
		const source = await readSource()
		expect(source).not.toContain('retell-widget')
		expect(source).not.toContain('shadowRoot')
		expect(source).not.toContain('applyOverrides')
		expect(source).not.toContain('showAiPopup')
	})

	it('keeps the existing glass visual and uses semantic colors for hangup', async () => {
		const source = await readSource()
		expect(source).toContain('glass glass-fill glass-regular glass-card')
		expect(source).toContain('class="signal-core"')
		expect(source).toContain('border: 1px solid var(--danger)')
		expect(source).toContain('No sound? Enable audio')
	})

	it('keeps inactive controls hidden and the timer outside the live region', async () => {
		const source = await readSource()
		expect(source).toMatch(/\[hidden\]\s*\{\s*display: none !important/)
		expect(source).toMatch(/data-demo-live[^>]*hidden/)
		expect(source).toMatch(/data-demo-open[\s\S]*?disabled[\s\S]*?>/)
		expect(source).toContain('Enable JavaScript to use the live demo.')
		const timer = source.match(/<span data-demo-connection[^>]*>/)?.[0]
		expect(timer).toBeTruthy()
		expect(timer).not.toContain('aria-live')
		expect(source).toContain('status.textContent !== state.message')
		expect(source).toContain('preventScroll: true')
	})
})
