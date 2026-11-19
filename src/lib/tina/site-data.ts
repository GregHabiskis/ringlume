import { requestWithMetadata } from '@tinacms/astro'
import client from '../../../tina/__generated__/client'
import { validateSite, type SiteContent } from './site-model'

export async function loadSite() {
	const result = await requestWithMetadata(
		client.queries.site({ relativePath: 'site.json' }),
		{ priority: 'primary' },
	)
	validateSite(result.data.site)
	return result as typeof result & { data: { site: SiteContent } }
}
