import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockClaimEvent = vi.fn();
const mockCompleteEvent = vi.fn();
const mockFailEvent = vi.fn();
const mockHandleCustomerCreated = vi.fn();

vi.mock('../../../../lib/db', () => ({
	claimEvent: mockClaimEvent,
	completeEvent: mockCompleteEvent,
	failEvent: mockFailEvent,
	SkippedError: class extends Error {
		constructor(message: string) {
			super(message);
			this.name = 'SkippedError';
		}
	},
}));

vi.mock('../../../../lib/webhook-handlers', () => ({
	handleCustomerCreated: mockHandleCustomerCreated,
	handleCustomerUpdated: vi.fn(),
	handleSubscriptionCreated: vi.fn(),
	handleSubscriptionUpdated: vi.fn(),
	handleSubscriptionCanceled: vi.fn(),
	handleTransactionCompleted: vi.fn(),
}));

const secret = `pdl_ntfset_${'a'.repeat(26)}_${'b'.repeat(32)}`;
const incorrectSecret = `pdl_ntfset_${'c'.repeat(26)}_${'d'.repeat(32)}`;
const body = JSON.stringify({
	event_id: 'evt_01kymypvsba0tgpsy85080t2rs',
	event_type: 'customer.created',
	occurred_at: '2026-08-03T16:00:00Z',
	notification_id: 'ntf_01kymypvsba0tgpsy85080t2rs',
	data: {
		id: 'ctm_01kymypvsba0tgpsy85080t2rs',
		name: null,
		email: 'webhook-test@example.invalid',
		marketing_consent: false,
		status: 'active',
		custom_data: null,
		locale: 'en',
		created_at: '2026-08-03T16:00:00Z',
		updated_at: '2026-08-03T16:00:00Z',
		import_meta: null,
	},
});

function sign(rawBody: string, signingSecret: string, timestamp: number): string {
	const signature = createHmac('sha256', signingSecret)
		.update(`${timestamp}:${rawBody}`)
		.digest('hex');
	return `ts=${timestamp};h1=${signature}`;
}

async function callPost(
	rawBody: string,
	signature: string | null,
): Promise<Response> {
	const { POST } = await import('../webhook');
	const request = new Request('http://localhost/api/paddle/webhook', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...(signature ? { 'Paddle-Signature': signature } : {}),
		},
		body: rawBody,
	});
	return POST({ request } as never);
}

describe('webhook POST signature integration', () => {
	beforeAll(async () => {
		vi.stubEnv('PADDLE_ENVIRONMENT', 'sandbox');
		vi.stubEnv('PADDLE_API_KEY', 'pdl_sdbx_apikey_test');
		vi.stubEnv('PADDLE_WEBHOOK_SECRET', secret);
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		await import('../webhook');
	});

	afterAll(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		mockClaimEvent.mockResolvedValue({ status: 'new', token: 'test-token' });
		mockCompleteEvent.mockResolvedValue(undefined);
		mockFailEvent.mockResolvedValue(undefined);
		mockHandleCustomerCreated.mockResolvedValue('customer.created test');
	});

	it('accepts an exact raw body with a valid Paddle-style signature', async () => {
		const timestamp = Math.floor(Date.now() / 1000);
		const response = await callPost(body, sign(body, secret, timestamp));

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('OK');
		expect(mockHandleCustomerCreated).toHaveBeenCalledOnce();
	});

	it('rejects a one-byte raw-body change', async () => {
		const timestamp = Math.floor(Date.now() / 1000);
		const response = await callPost(`${body} `, sign(body, secret, timestamp));

		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Invalid webhook signature');
	});

	it('rejects a signature created with another endpoint secret', async () => {
		const timestamp = Math.floor(Date.now() / 1000);
		const response = await callPost(
			body,
			sign(body, incorrectSecret, timestamp),
		);

		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Invalid webhook signature');
	});

	it('rejects a missing Paddle-Signature header', async () => {
		const response = await callPost(body, null);

		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Missing Paddle-Signature header');
	});

	it('rejects an expired signature timestamp', async () => {
		const expiredTimestamp = Math.floor(Date.now() / 1000) - 60;
		const response = await callPost(
			body,
			sign(body, secret, expiredTimestamp),
		);

		expect(response.status).toBe(400);
		expect(await response.text()).toBe('Invalid webhook signature');
	});
});
