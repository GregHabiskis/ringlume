import { getServerEnvironmentVariable } from './env';

export type PaddleEnvironment = 'sandbox' | 'production';

function requireEnvironment(
	value: string | undefined,
	variableName: string,
): PaddleEnvironment {
	if (value !== 'sandbox' && value !== 'production') {
		throw new Error(
			`${variableName} must be explicitly set to "sandbox" or "production"`,
		);
	}

	return value;
}

function requireValue(value: string | undefined, variableName: string): string {
	if (!value) {
		throw new Error(`${variableName} environment variable is not set`);
	}

	return value;
}

export function getPaddleEnvironment(): PaddleEnvironment {
	return requireEnvironment(
		getServerEnvironmentVariable('PADDLE_ENVIRONMENT'),
		'PADDLE_ENVIRONMENT',
	);
}

export function getPaddleApiKey(environment: PaddleEnvironment): string {
	const apiKey = requireValue(
		getServerEnvironmentVariable('PADDLE_API_KEY'),
		'PADDLE_API_KEY',
	);
	const expectedPrefix =
		environment === 'sandbox' ? 'pdl_sdbx_apikey_' : 'pdl_live_apikey_';

	if (!apiKey.startsWith(expectedPrefix)) {
		throw new Error(
			`PADDLE_API_KEY does not match the configured ${environment} environment`,
		);
	}

	return apiKey;
}

export function validatePublicPaddleConfig(): void {
	const publicEnvironment = requireEnvironment(
		getServerEnvironmentVariable('PUBLIC_PADDLE_ENVIRONMENT'),
		'PUBLIC_PADDLE_ENVIRONMENT',
	);
	const serverEnvironment = getPaddleEnvironment();
	if (publicEnvironment !== serverEnvironment) {
		throw new Error('PUBLIC_PADDLE_ENVIRONMENT must match PADDLE_ENVIRONMENT');
	}

	const token = requireValue(
		getServerEnvironmentVariable('PUBLIC_PADDLE_CLIENT_TOKEN'),
		'PUBLIC_PADDLE_CLIENT_TOKEN',
	);
	const expectedTokenPrefix =
		publicEnvironment === 'sandbox' ? 'test_' : 'live_';
	if (!token.startsWith(expectedTokenPrefix)) {
		throw new Error(
			`PUBLIC_PADDLE_CLIENT_TOKEN does not match the configured ${publicEnvironment} environment`,
		);
	}
}

export function getGeneralPortalUrl(): URL {
	const environment = getPaddleEnvironment();
	const variableName =
		environment === 'sandbox'
			? 'PADDLE_SANDBOX_CUSTOMER_PORTAL_URL'
			: 'PADDLE_CUSTOMER_PORTAL_URL';
	const configuredUrl = requireValue(
		getServerEnvironmentVariable(variableName),
		variableName,
	);
	const expectedHostname =
		environment === 'sandbox'
			? 'sandbox-customer-portal.paddle.com'
			: 'customer-portal.paddle.com';

	let portalUrl: URL;
	try {
		portalUrl = new URL(configuredUrl);
	} catch {
		throw new Error(`${variableName} must be a valid URL`);
	}

	if (
		portalUrl.protocol !== 'https:' ||
		portalUrl.hostname !== expectedHostname ||
		portalUrl.port !== '' ||
		portalUrl.username !== '' ||
		portalUrl.password !== '' ||
		portalUrl.searchParams.has('token')
	) {
		throw new Error(`${variableName} is not a permanent Paddle portal URL`);
	}

	return portalUrl;
}
