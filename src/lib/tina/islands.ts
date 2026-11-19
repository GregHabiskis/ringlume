import type { IslandConfig, IslandRegistry } from '@tinacms/astro/experimental'
import { loadSite } from './site-data'

export function createSiteIslands(component: IslandConfig['component']): IslandRegistry {
	return {
		site: {
			component, wrapper: { tag: 'div' },
			fetch: () => loadSite(),
			propsFromData: (data, params) => ({
				site: (data as Awaited<ReturnType<typeof loadSite>>).data.site,
				region: params.get('region') || 'home',
				page: params.get('page') || 'home',
			}),
		},
	}
}
