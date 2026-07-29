import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUnmarshal = vi.fn();
const mockClaimEvent = vi.fn();
const mockCompleteEvent = vi.fn();
const mockFailEvent = vi.fn();
const mockHandleCustomerCreated = vi.fn();
const mockHandleSubscriptionCreated = vi.fn();

vi.mock('../../../../lib/paddle', () => ({
	getPaddleClient: () => ({
		webhooks: { unmarshal: mockUnmarshal },
	}),
}));

vi.mock('../../../../lib/env', () => ({
	getWebhookSecret: () => 'whsec_test',
}));

vi.mock('../../../../lib/db', () => ({
	claimEvent: mockClaimEvent,
	completeEvent: mockCompleteEvent,
	failEvent: mockFailEvent,
	SkippedError: class extends Error {
		constructor(msg: string) {
			super(msg);
			this.name = 'SkippedError';
		}
	},
}));

vi.mock('../../../../lib/webhook-handlers', () => ({
	handleCustomerCreated: mockHandleCustomerCreated,
	handleCustomerUpdated: vi.fn(),
	handleSubscriptionCreated: mockHandleSubscriptionCreated,
	handleSubscriptionUpdated: vi.fn(),
	handleSubscriptionCanceled: vi.fn(),
	handleTransactionCompleted: vi.fn(),
}));

async function callPost(
	body: string,
	signature: string | null,
): Promise<{ status: number; body: string }> {
	const { POST } = await import('../webhook');
	const request = new Request('http://localhost/api/paddle/webhook', {
		method: 'POST',
		headers: signature ? { 'Paddle-Signature': signature } : {},
		body,
	});
	const response = await POST({ request } as any);
	return {
		status: response.status,
		body: await response.text(),
	};
}

describe('webhook POST', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUnmarshal.mockReset();
		mockClaimEvent.mockReset();
		mockCompleteEvent.mockReset();
		mockFailEvent.mockReset();
		mockHandleCustomerCreated.mockReset();
		mockHandleSubscriptionCreated.mockReset();
	});

	it('returns 400 for missing signature', async () => {
		const { status } = await callPost('{}', null);
		expect(status).toBe(400);
	});

	it('returns 400 for invalid signature', async () => {
		mockUnmarshal.mockRejectedValue(new Error('invalid signature'));
		const { status } = await callPost('{}', 'bad-sig');
		expect(status).toBe(400);
	});

	it('passes raw body to unmarshal', async () => {
		const rawBody = JSON.stringify({ event_type: 'customer.created' });
		mockUnmarshal.mockResolvedValue({
			eventId: 'evt_001',
			notificationId: 'ntf_001',
			eventType: 'customer.created',
			occurredAt: '2026-01-01T00:00:00Z',
			data: {
				id: 'ctm_001',
				email: 'test@example.com',
				name: null,
				status: 'active',
				locale: 'en',
			},
		});
		mockClaimEvent.mockResolvedValue({ status: 'new', token: 'lock-001' });
		mockHandleCustomerCreated.mockResolvedValue('customer.created ctm_001');
		mockCompleteEvent.mockResolvedValue(undefined);

		await callPost(rawBody, 'valid-sig');

		expect(mockUnmarshal).toHaveBeenCalledWith(
			rawBody,
			'whsec_test',
			'valid-sig',
		);
	});

	it('dispatches supported event types', async () => {
		mockUnmarshal.mockResolvedValue({
			eventId: 'evt_002',
			notificationId: 'ntf_002',
			eventType: 'customer.created',
			occurredAt: '2026-01-01T00:00:00Z',
			data: {
				id: 'ctm_001',
				email: 'a@b.com',
				name: null,
				status: 'active',
				locale: 'en',
			},
		});
		mockClaimEvent.mockResolvedValue({ status: 'new', token: 'lock-002' });
		mockHandleCustomerCreated.mockResolvedValue('customer.created ctm_001');
		mockCompleteEvent.mockResolvedValue(undefined);

		const { status } = await callPost('{}', 'valid-sig');

		expect(mockHandleCustomerCreated).toHaveBeenCalledOnce();
		expect(mockCompleteEvent).toHaveBeenCalledWith(
			'evt_002',
			'lock-002',
			expect.any(AbortSignal),
		);
		expect(status).toBe(200);
	});

	it('returns 200 for unsupported verified event without calling handlers', async () => {
		mockUnmarshal.mockResolvedValue({
			eventId: 'evt_003',
			notificationId: 'ntf_003',
			eventType: 'product.created',
			occurredAt: '2026-01-01T00:00:00Z',
			data: { id: 'pro_001' },
		});
		mockClaimEvent.mockResolvedValue({ status: 'new', token: 'lock-003' });
		mockCompleteEvent.mockResolvedValue(undefined);

		const { status } = await callPost('{}', 'valid-sig');

		expect(mockHandleCustomerCreated).not.toHaveBeenCalled();
		expect(mockCompleteEvent).toHaveBeenCalledWith(
			'evt_003',
			'lock-003',
			expect.any(AbortSignal),
		);
		expect(status).toBe(200);
	});

	it('returns 500 when handler fails and marks event as failed', async () => {
		mockUnmarshal.mockResolvedValue({
			eventId: 'evt_004',
			notificationId: 'ntf_004',
			eventType: 'customer.created',
			occurredAt: '2026-01-01T00:00:00Z',
			data: {
				id: 'ctm_001',
				email: 'a@b.com',
				name: null,
				status: 'active',
				locale: 'en',
			},
		});
		mockClaimEvent.mockResolvedValue({ status: 'new', token: 'lock-004' });
		mockHandleCustomerCreated.mockRejectedValue(
			new Error('DB connection failed'),
		);
		mockFailEvent.mockResolvedValue(undefined);

		const { status } = await callPost('{}', 'valid-sig');

		expect(mockFailEvent).toHaveBeenCalledWith(
			'evt_004',
			'lock-004',
			'DB connection failed',
			expect.any(AbortSignal),
		);
		expect(status).toBe(500);
	});

	it('skips duplicate completed events', async () => {
		mockUnmarshal.mockResolvedValue({
			eventId: 'evt_005',
			notificationId: 'ntf_005',
			eventType: 'customer.created',
			occurredAt: '2026-01-01T00:00:00Z',
			data: {
				id: 'ctm_001',
				email: 'a@b.com',
				name: null,
				status: 'active',
				locale: 'en',
			},
		});
		const { SkippedError } = await import('../../../../lib/db');
		mockClaimEvent.mockRejectedValue(
			new SkippedError('event already completed'),
		);

		const { status } = await callPost('{}', 'valid-sig');

		expect(mockHandleCustomerCreated).not.toHaveBeenCalled();
		expect(status).toBe(200);
	});

	it('allows retry of failed events', async () => {
		mockUnmarshal.mockResolvedValue({
			eventId: 'evt_006',
			notificationId: 'ntf_006',
			eventType: 'customer.created',
			occurredAt: '2026-01-01T00:00:00Z',
			data: {
				id: 'ctm_001',
				email: 'a@b.com',
				name: null,
				status: 'active',
				locale: 'en',
			},
		});
		mockClaimEvent.mockResolvedValue({ status: 'retry', token: 'lock-006' });
		mockHandleCustomerCreated.mockResolvedValue('customer.created ctm_001');
		mockCompleteEvent.mockResolvedValue(undefined);

		const { status } = await callPost('{}', 'valid-sig');

		expect(mockHandleCustomerCreated).toHaveBeenCalledOnce();
		expect(status).toBe(200);
	});

	it('does not complete event if handler throws', async () => {
		mockUnmarshal.mockResolvedValue({
			eventId: 'evt_007',
			notificationId: 'ntf_007',
			eventType: 'customer.created',
			occurredAt: '2026-01-01T00:00:00Z',
			data: {
				id: 'ctm_001',
				email: 'a@b.com',
				name: null,
				status: 'active',
				locale: 'en',
			},
		});
		mockClaimEvent.mockResolvedValue({ status: 'new', token: 'lock-007' });
		mockHandleCustomerCreated.mockRejectedValue(new Error('fail'));
		mockFailEvent.mockResolvedValue(undefined);

		await callPost('{}', 'valid-sig');

		expect(mockCompleteEvent).not.toHaveBeenCalled();
		expect(mockFailEvent).toHaveBeenCalled();
	});

	it('completes within five seconds with conservative database latency', async () => {
		mockUnmarshal.mockResolvedValue({
			eventId: 'evt_timing',
			notificationId: 'ntf_timing',
			eventType: 'customer.created',
			occurredAt: '2026-01-01T00:00:00Z',
			data: {
				id: 'ctm_001',
				email: 'a@b.com',
				name: null,
				status: 'active',
				locale: 'en',
			},
		});
		mockClaimEvent.mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(
						() => resolve({ status: 'new', token: 'lock-timing' }),
						500,
					),
				),
		);
		mockHandleCustomerCreated.mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(() => resolve('customer.created ctm_001'), 1000),
				),
		);
		mockCompleteEvent.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 500)),
		);

		const startedAt = performance.now();
		const { status } = await callPost('{}', 'valid-sig');
		const elapsedMs = performance.now() - startedAt;

		expect(status).toBe(200);
		expect(elapsedMs).toBeLessThan(5000);
	}, 6000);

	it('aborts processing and responds before the five-second deadline', async () => {
		mockUnmarshal.mockResolvedValue({
			eventId: 'evt_timeout',
			notificationId: 'ntf_timeout',
			eventType: 'customer.created',
			occurredAt: '2026-01-01T00:00:00Z',
			data: {
				id: 'ctm_001',
				email: 'a@b.com',
				name: null,
				status: 'active',
				locale: 'en',
			},
		});
		mockClaimEvent.mockResolvedValue({
			status: 'new',
			token: 'lock-timeout',
		});
		mockHandleCustomerCreated.mockImplementation(
			(_data, _occurredAt, signal: AbortSignal) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener('abort', () => {
						reject(new Error('processing deadline exceeded'));
					});
				}),
		);
		mockFailEvent.mockResolvedValue(undefined);

		const startedAt = performance.now();
		const { status } = await callPost('{}', 'valid-sig');
		const elapsedMs = performance.now() - startedAt;

		expect(status).toBe(500);
		expect(elapsedMs).toBeLessThan(5000);
		expect(mockFailEvent).toHaveBeenCalledWith(
			'evt_timeout',
			'lock-timeout',
			'processing deadline exceeded',
			expect.any(AbortSignal),
		);
	}, 6000);
});
