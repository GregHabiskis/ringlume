import { afterEach, describe, expect, it, vi } from 'vitest';

async function importConfig() {
	vi.resetModules();
	return import('../paddle-config');
}

describe('Paddle configuration', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('accepts matching sandbox configuration', async () => {
		vi.stubEnv('PADDLE_ENVIRONMENT', 'sandbox');
		vi.stubEnv('PUBLIC_PADDLE_ENVIRONMENT', 'sandbox');
		vi.stubEnv('PUBLIC_PADDLE_CLIENT_TOKEN', 'test_example');

		const { validatePublicPaddleConfig } = await importConfig();

		expect(() => validatePublicPaddleConfig()).not.toThrow();
	});

	it('rejects an unset server environment', async () => {
		vi.stubEnv('PADDLE_ENVIRONMENT', '');
		const { getPaddleEnvironment } = await importConfig();

		expect(() => getPaddleEnvironment()).toThrow('PADDLE_ENVIRONMENT');
	});

	it('rejects mismatched public and server environments', async () => {
		vi.stubEnv('PADDLE_ENVIRONMENT', 'production');
		vi.stubEnv('PUBLIC_PADDLE_ENVIRONMENT', 'sandbox');
		vi.stubEnv('PUBLIC_PADDLE_CLIENT_TOKEN', 'test_example');
		const { validatePublicPaddleConfig } = await importConfig();

		expect(() => validatePublicPaddleConfig()).toThrow('must match');
	});

	it('rejects a token from the wrong environment', async () => {
		vi.stubEnv('PADDLE_ENVIRONMENT', 'sandbox');
		vi.stubEnv('PUBLIC_PADDLE_ENVIRONMENT', 'sandbox');
		vi.stubEnv('PUBLIC_PADDLE_CLIENT_TOKEN', 'live_example');
		const { validatePublicPaddleConfig } = await importConfig();

		expect(() => validatePublicPaddleConfig()).toThrow('does not match');
	});

	it('validates the server API key prefix without exposing its value', async () => {
		vi.stubEnv('PADDLE_API_KEY', 'pdl_sdbx_apikey_example');
		const { getPaddleApiKey } = await importConfig();

		expect(getPaddleApiKey('sandbox')).toBeTruthy();
		expect(() => getPaddleApiKey('production')).toThrow('does not match');
	});
});
