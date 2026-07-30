import { createHmac } from 'node:crypto';
import { Paddle } from '@paddle/paddle-node-sdk';
import { describe, expect, it } from 'vitest';

function sign(body: string, secret: string): string {
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const signature = createHmac('sha256', secret)
		.update(`${timestamp}:${body}`)
		.digest('hex');
	return `ts=${timestamp};h1=${signature}`;
}

describe('Paddle webhook signature verification', () => {
	const paddle = new Paddle('pdl_sdbx_apikey_test');
	const secret = 'pdl_ntfset_test';
	const body = JSON.stringify({
		event_id: 'evt_01kymypvsba0tgpsy85080t2rs',
		event_type: 'customer.updated',
		occurred_at: new Date().toISOString(),
		notification_id: 'ntf_01kymypvsba0tgpsy85080t2rs',
		data: {
			id: 'ctm_01kymypvsba0tgpsy85080t2rs',
			name: 'Webhook Test',
			email: 'webhook-test@example.invalid',
			marketing_consent: false,
			status: 'active',
			custom_data: null,
			locale: 'en',
			created_at: '2026-07-30T00:00:00Z',
			updated_at: '2026-07-30T00:00:00Z',
			import_meta: null,
		},
	});

	it('accepts a correctly signed raw payload', async () => {
		const event = await paddle.webhooks.unmarshal(
			body,
			secret,
			sign(body, secret),
		);

		expect(event.eventType).toBe('customer.updated');
		expect(event.eventId).toBe('evt_01kymypvsba0tgpsy85080t2rs');
	});

	it('rejects a signature for a modified payload', async () => {
		const signature = sign(body, secret);

		await expect(
			paddle.webhooks.unmarshal(`${body} `, secret, signature),
		).rejects.toThrow();
	});
});
