import { defineConfig } from 'tinacms'
import { siteFields } from '../src/lib/tina/site-schema'
import { validateSite } from '../src/lib/tina/site-model'

const server = typeof window === 'undefined'
const local = process.env.TINA_PUBLIC_IS_LOCAL === 'true'
	|| (server && (process.argv?.includes('--local') || process.argv?.includes('dev')))
if (server && local && process.env.WORKERS_CI === '1') {
	throw new Error('Local Tina mode must not run in Workers Builds')
}
// Tina only forwards TINA_PUBLIC_* variables to its browser config.
if (server) {
	if (process.env.PUBLIC_TINA_CLIENT_ID) {
		process.env.TINA_PUBLIC_CLIENT_ID = process.env.PUBLIC_TINA_CLIENT_ID
	} else {
		delete process.env.TINA_PUBLIC_CLIENT_ID
	}
	process.env.TINA_PUBLIC_BRANCH = process.env.TINA_BRANCH || process.env.WORKERS_CI_BRANCH || 'main'
}
const clientId = process.env.TINA_PUBLIC_CLIENT_ID
const token = process.env.TINA_TOKEN
if (server && !local && (!clientId || !token)) {
	throw new Error('TinaCloud requires PUBLIC_TINA_CLIENT_ID and TINA_TOKEN. For credential-free verification use pnpm build:local; never deploy that output.')
}
export default defineConfig({
	clientId, token,
	branch: process.env.TINA_PUBLIC_BRANCH || 'main',
	build: { outputFolder: 'admin', publicFolder: 'public' },
	schema: { collections: [{
		name: 'site', label: 'Website text and offer', path: 'content/site', format: 'json',
		match: { include: 'site' },
		ui: {
			allowedActions: { create: false, delete: false },
			router: () => '/',
			beforeSubmit: async ({ values }) => {
				validateSite(values)
				return values
			},
		},
		fields: siteFields(),
	}] },
})
