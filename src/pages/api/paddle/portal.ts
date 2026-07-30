import type { APIRoute } from 'astro';
import { getGeneralPortalUrl } from '../../../lib/paddle-config';

export const prerender = false;

const NO_STORE_HEADERS = {
	'Cache-Control': 'no-store, max-age=0',
	Pragma: 'no-cache',
};

export const GET: APIRoute = async () => {
	try {
		return new Response(null, {
			status: 302,
			headers: {
				...NO_STORE_HEADERS,
				Location: getGeneralPortalUrl().toString(),
			},
		});
	} catch {
		return new Response(null, {
			status: 302,
			headers: {
				...NO_STORE_HEADERS,
				Location: '/portal?error=portal_unavailable',
			},
		});
	}
};
