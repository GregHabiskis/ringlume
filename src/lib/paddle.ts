import { Environment, Paddle } from '@paddle/paddle-node-sdk';
import { getPaddleApiKey, getPaddleEnvironment } from './paddle-config';

let _paddle: Paddle | null = null;

export function getPaddleClient(): Paddle {
	if (_paddle) return _paddle;

	const environment = getPaddleEnvironment();
	const apiKey = getPaddleApiKey(environment);

	_paddle = new Paddle(apiKey, {
		environment:
			environment === 'production'
				? Environment.production
				: Environment.sandbox,
	});

	return _paddle;
}
