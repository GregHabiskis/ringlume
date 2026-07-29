import type { APIRoute } from 'astro';

export const prerender = false;

const PADDLE_PORTAL_HOSTNAMES = new Set([
	'customer-portal.paddle.com',
	'sandbox-customer-portal.paddle.com',
]);

export function getConfiguredPortalUrl(): URL | null {
	const environment = import.meta.env.PADDLE_ENVIRONMENT;
	const configuredUrl =
		environment === 'sandbox'
			? import.meta.env.PADDLE_SANDBOX_CUSTOMER_PORTAL_URL
			: import.meta.env.PADDLE_CUSTOMER_PORTAL_URL;

	if (!configuredUrl) return null;

	try {
		const portalUrl = new URL(configuredUrl);
		if (
			portalUrl.protocol !== 'https:' ||
			portalUrl.port !== '' ||
			portalUrl.username !== '' ||
			portalUrl.password !== '' ||
			!PADDLE_PORTAL_HOSTNAMES.has(portalUrl.hostname)
		) {
			return null;
		}

		return portalUrl;
	} catch {
		return null;
	}
}

export const GET: APIRoute = async () => {
	const portalUrl = getConfiguredPortalUrl();
	if (!portalUrl) {
		return new Response('Customer portal is unavailable', { status: 500 });
	}

	return new Response(null, {
		status: 302,
		headers: { Location: portalUrl.toString() },
	});
};
