import { readFile, readdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const srcDir = new URL('../../', import.meta.url)

// Astro frontmatter is the first `--- ... ---` block only. Any further
// `---` line in the template body is literal text and renders on the
// page (DemoSection shipped one for months as a stray before Pricing).
const frontmatterPattern = /^---(?:\r?\n[\s\S]*?)?\r?\n---(?:\r?\n|$)/
const fenceLine = /^[ \t]*---[ \t]*\r?$/

describe('Astro frontmatter fences', () => {
	it('has no stray `---` lines outside the frontmatter block', async () => {
		const entries = await readdir(srcDir, { recursive: true })
		const astroFiles = entries.filter((entry) => entry.endsWith('.astro'))
		expect(astroFiles.length).toBeGreaterThan(10)

		const strays: string[] = []
		for (const file of astroFiles) {
			const source = await readFile(new URL(file, srcDir), 'utf8')
			const template = source.replace(frontmatterPattern, '')
			template.split('\n').forEach((line, index) => {
				if (fenceLine.test(line)) strays.push(`${file}:${index + 1}`)
			})
		}

		expect(strays).toEqual([])
	})
})
