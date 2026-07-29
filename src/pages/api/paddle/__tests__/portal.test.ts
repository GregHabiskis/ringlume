import { afterEach, describe, expect, it, vi } from 'vitest';

async function callGet(
	url: string,
): Promise<{ status: string; location?: string }> {
	const { GET } = await import('../portal');
	const request = new Request(`http://localhost${url}`);
	const response = await GET({
		request,
		url: new URL(`http://localhost${url}`),
	} as any);

	return {
		status: response.status.toString(),
		location: response.headers.get('Location') ?? undefined,
	};
}

describe('portal GET', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('selects the sandbox dashboard portal URL from server environment', async () => {
		vi.stubEnv('PADDLE_ENVIRONMENT', 'sandbox');
		vi.stubEnv(
			'PADDLE_SANDBOX_CUSTOMER_PORTAL_URL',
			'https://sandbox-customer-portal.paddle.com/login/example',
		);

		const { status, location } = await callGet('/api/paddle/portal');

		expect(status).toBe('302');
		expect(location).toBe(
			'https://sandbox-customer-portal.paddle.com/login/example',
		);
	});

	it('selects the live dashboard portal URL for non-sandbox environments', async () => {
		vi.stubEnv('PADDLE_ENVIRONMENT', 'live');
		vi.stubEnv(
			'PADDLE_CUSTOMER_PORTAL_URL',
			'https://customer-portal.paddle.com/login/example',
		);

		const { status, location } = await callGet('/api/paddle/portal');

		expect(status).toBe('302');
		expect(location).toBe('https://customer-portal.paddle.com/login/example');
	});

	it('ignores arbitrary redirect-related query parameters', async () => {
		vi.stubEnv('PADDLE_ENVIRONMENT', 'live');
		vi.stubEnv(
			'PADDLE_CUSTOMER_PORTAL_URL',
			'https://customer-portal.paddle.com/login/example',
		);

		const { status, location } = await callGet(
			'/api/paddle/portal?url=https://evil.example&redirect=https://evil.example&return_url=https://evil.example&hostname=evil.example',
		);

		expect(status).toBe('302');
		expect(location).toBe('https://customer-portal.paddle.com/login/example');
	});

	it.each([
		'http://customer-portal.paddle.com/login/example',
		'https://evil.example/login',
		'https://customer-portal.paddle.com.evil.example/login',
		'https://customer-portal.paddle.com:8443/login',
		'not-a-url',
	])('returns a safe 500 for invalid configuration: %s', async (value) => {
		vi.stubEnv('PADDLE_ENVIRONMENT', 'live');
		vi.stubEnv('PADDLE_CUSTOMER_PORTAL_URL', value);

		const { status, location } = await callGet('/api/paddle/portal');

		expect(status).toBe('500');
		expect(location).toBeUndefined();
	});

	it('returns a safe 500 when the selected URL is missing', async () => {
		vi.stubEnv('PADDLE_ENVIRONMENT', 'sandbox');
		vi.stubEnv('PADDLE_SANDBOX_CUSTOMER_PORTAL_URL', '');

		const { status, location } = await callGet('/api/paddle/portal');

		expect(status).toBe('500');
		expect(location).toBeUndefined();
	});
});
