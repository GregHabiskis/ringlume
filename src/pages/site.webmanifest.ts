import type { APIRoute } from 'astro';
import { loadSite } from '../lib/tina/site-data';

export const prerender = true;

export const GET: APIRoute = async () => {
	const { data } = await loadSite();
	return new Response(
		JSON.stringify({
			name: data.site.shared.manifestName,
			short_name: data.site.shared.manifestShortName,
			icons: [
				{
					src: '/android-chrome-192x192.png',
					sizes: '192x192',
					type: 'image/png',
				},
				{
					src: '/android-chrome-512x512.png',
					sizes: '512x512',
					type: 'image/png',
				},
			],
			theme_color: '#ffffff',
			background_color: '#ffffff',
			display: 'standalone',
		}),
		{ headers: { 'Content-Type': 'application/manifest+json' } },
	);
};
