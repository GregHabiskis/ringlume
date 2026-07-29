import { Environment, Paddle } from '@paddle/paddle-node-sdk';

let _paddle: Paddle | null = null;

export function getPaddleClient(): Paddle {
	if (_paddle) return _paddle;

	const apiKey = import.meta.env.PADDLE_API_KEY;
	if (!apiKey) {
		throw new Error('PADDLE_API_KEY environment variable is not set');
	}

	const environment = import.meta.env.PADDLE_ENVIRONMENT || 'sandbox';

	_paddle = new Paddle(apiKey, {
		environment:
			environment === 'live' ? Environment.production : Environment.sandbox,
	});

	return _paddle;
}
