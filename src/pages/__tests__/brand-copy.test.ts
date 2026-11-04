import { readFile, readdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const root = new URL('../../', import.meta.url)
const retiredTerminology = /\b\u0041\u0049\b|\bartificial\s+intelligence\b/i

async function sourceFiles(directory: URL): Promise<URL[]> {
	const entries = await readdir(directory, { withFileTypes: true })
	const files = await Promise.all(
		entries.map((entry) => {
			const url = new URL(entry.name, directory)
			return entry.isDirectory()
				? sourceFiles(new URL(`${entry.name}/`, directory))
				: [url]
		}),
	)
	return files.flat()
}

describe('Ringlume brand copy', () => {
	it('introduces Ava using the approved demo copy', async () => {
		const demo = await readFile(
			new URL('components/DemoSection.astro', root),
			'utf8',
		)
		expect(demo).toMatch(/id="demo-heading"[^>]*>\s*Talk to Ava\s*<\/h2>/)
		expect(demo.replace(/\s+/g, ' ')).toContain(
			"Ringlume's virtual receptionist. A real conversation. Not a recording.",
		)
	})

	it('describes the hero as a virtual receptionist for arborists', async () => {
		const hero = await readFile(
			new URL('components/Hero.astro', root),
			'utf8',
		)
		expect(hero).toContain('Virtual receptionist for arborists.')
	})

	it('keeps retired terminology out of first-party source and project guidance', async () => {
		const files = [
			...(await sourceFiles(root)),
			new URL('../README.md', root),
			new URL('../AGENTS.md', root),
		]
		for (const file of files) {
			const source = await readFile(file, 'utf8')
			expect(source, file.pathname).not.toMatch(retiredTerminology)
		}
	})
})
