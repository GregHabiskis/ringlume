import { describe, expect, it, vi } from 'vitest';
import {
	enqueuePaddleWebhookEvent,
	signPaddleWebhookQueuePayload,
	verifyPaddleWebhookQueuePayload,
} from '../paddle-webhook-queue';

const secret = `pdl_ntfset_${'a'.repeat(26)}_${'b'.repeat(32)}`;

describe('Paddle webhook background queue', () => {
	it('authenticates the exact queue body and rejects a one-byte change', () => {
		const body = JSON.stringify({ event_id: 'evt_test' });
		const signature = signPaddleWebhookQueuePayload(body, secret);

		expect(verifyPaddleWebhookQueuePayload(body, secret, signature)).toBe(true);
		expect(verifyPaddleWebhookQueuePayload(`${body} `, secret, signature)).toBe(
			false,
		);
	});

	it('waits for Netlify to accept the background invocation', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(null, { status: 202 }));

		await enqueuePaddleWebhookEvent({
			eventId: 'evt_test',
			secret,
			requestUrl: new URL('https://ringlume.com/api/paddle/webhook'),
			correlationId: 'correlation-test',
			sourceRequestId: 'request-test',
		});

		expect(fetchMock).toHaveBeenCalledWith(
			new URL(
				'https://ringlume.com/.netlify/functions/paddle-webhook-background',
			),
			expect.objectContaining({ method: 'POST' }),
		);
		fetchMock.mockRestore();
	});

	it('rejects a background invocation that Netlify did not queue', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(null, { status: 503 }));

		await expect(
			enqueuePaddleWebhookEvent({
				eventId: 'evt_test',
				secret,
				requestUrl: new URL('https://ringlume.com/api/paddle/webhook'),
				correlationId: 'correlation-test',
				sourceRequestId: null,
			}),
		).rejects.toThrow('HTTP 503');
		fetchMock.mockRestore();
	});
});
