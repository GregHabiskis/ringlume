export function getServerEnvironmentVariable(
	name: string,
): string | undefined {
	return process.env[name];
}

export function getWebhookSecret(): string {
	const secret = getServerEnvironmentVariable('PADDLE_WEBHOOK_SECRET');
	if (!secret) {
		throw new Error('PADDLE_WEBHOOK_SECRET environment variable is not set');
	}
	if (
		secret !== secret.trim() ||
		!/^pdl_ntfset_[A-Za-z0-9]{26}_[A-Za-z0-9]{32}$/.test(secret)
	) {
		throw new Error('PADDLE_WEBHOOK_SECRET is structurally invalid');
	}

	return secret;
}
