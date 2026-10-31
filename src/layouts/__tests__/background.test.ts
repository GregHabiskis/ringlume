import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('shared dotted background', () => {
	it('keeps one fixed, static dot grid without a fading mask', async () => {
		const css = await readFile(
			new URL('../../styles/global.css', import.meta.url),
			'utf8',
		)
		const scene = css.match(/\.scene \{([\s\S]*?)\n\}/)?.[1] ?? ''
		const dots = css.match(/\.scene::after \{([\s\S]*?)\n\}/)?.[1] ?? ''
		expect(scene).toContain('position: fixed')
		expect(scene).toContain('pointer-events: none')
		expect(dots).toContain('rgba(255, 255, 255, 0.09) 1px')
		expect(dots).toContain('background-size: 28px 28px')
		expect(dots).not.toMatch(/mask-image|animation|backdrop-filter/)
	})

	it('shares the background through BaseLayout and keeps sections transparent', async () => {
		const [layout, css] = await Promise.all([
			readFile(new URL('../BaseLayout.astro', import.meta.url), 'utf8'),
			readFile(new URL('../../styles/global.css', import.meta.url), 'utf8'),
		])
		expect(layout.match(/class="scene"/g)).toHaveLength(1)
		expect(layout).toContain("import '../styles/global.css'")
		expect(css).toMatch(
			/\.scrim,\s*\.scrim-soft\s*\{\s*background-color: transparent;/,
		)
	})
})
