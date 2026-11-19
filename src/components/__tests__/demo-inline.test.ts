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
		expect(source).toContain('{copy.text.audio}')
	})

	it('keeps inactive controls hidden and the timer outside the live region', async () => {
		const source = await readSource()
		expect(source).toMatch(/\[hidden\]\s*\{\s*display: none !important/)
		expect(source).toMatch(/data-demo-live[^>]*hidden/)
		expect(source).toMatch(/data-demo-open[\s\S]*?disabled[\s\S]*?>/)
		expect(source).toContain('{copy.text.noScript}')
		const timer = source.match(/<span data-demo-connection[^>]*>/)?.[0]
		expect(timer).toBeTruthy()
		expect(timer).not.toContain('aria-live')
		expect(source).toContain('status.textContent !== message')
		expect(source).toContain('preventScroll: true')
	})

	it('passes only the demo dictionary and updates copy in place without replacing the call card', async () => {
		const source = await readSource()
		expect(source).toContain('const copy = site.demo')
		expect(source).toContain('data-demo-copy={JSON.stringify(copy)}')
		expect(source).toContain(`window.addEventListener('ringlume:copy-change'`)
		expect(source).toContain('controller.setCopy(copy)')
		expect(source).toContain('state.messageKey ? copy.messages[state.messageKey]')
		expect(source).toContain('copy.text.unmuteLabel')
		expect(source).toContain(`tinaField(copy.text, 'heading')`)
		expect(source).not.toContain('innerHTML')
		expect(source).not.toContain('replaceChildren')
	})
})
