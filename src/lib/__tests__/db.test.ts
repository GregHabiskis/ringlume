import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

function buildChain(returnValue: unknown) {
	const chain: Record<string, any> = {
		select: vi.fn(() => chain),
		eq: vi.fn(() => chain),
		maybeSingle: vi.fn(() => Promise.resolve(returnValue)),
		single: vi.fn(() => Promise.resolve(returnValue)),
		upsert: vi.fn(() => chain),
		insert: vi.fn(() => chain),
		update: vi.fn(() => chain),
		gt: vi.fn(() => chain),
		order: vi.fn(() => chain),
		from: vi.fn(() => chain),
	};
	chain.select.mockReturnValue(chain);
	chain.eq.mockReturnValue(chain);
	chain.gt.mockReturnValue(chain);
	chain.order.mockReturnValue(chain);
	chain.upsert.mockReturnValue(chain);
	chain.insert.mockReturnValue(chain);
	chain.update.mockReturnValue(chain);
	chain.maybeSingle.mockReturnValue(Promise.resolve(returnValue));
	chain.single.mockReturnValue(Promise.resolve(returnValue));
	return chain;
}

vi.mock('../supabase', () => ({
	getSupabaseAdmin: () => ({
		from: mockFrom,
		rpc: mockRpc,
	}),
}));

async function importDb() {
	return await import('../db');
}

describe('upsertCustomer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRpc.mockReset();
	});

	it('is idempotent for duplicate paddle_customer_id', async () => {
		mockRpc.mockResolvedValue({
			data: {
				id: 'uuid-1',
				paddle_customer_id: 'ctm_001',
				email: 'test@example.com',
				is_placeholder: false,
				last_event_occurred_at: '2026-01-01T00:00:00Z',
			},
			error: null,
		});

		const { upsertCustomer } = await importDb();
		const result = await upsertCustomer({
			paddle_customer_id: 'ctm_001',
			email: 'test@example.com',
			occurred_at: '2026-01-01T00:00:00Z',
		});

		expect(result.paddle_customer_id).toBe('ctm_001');
	});

	it('creates placeholder for subscription-before-customer', async () => {
		const chain = buildChain({ data: null, error: null });
		mockFrom.mockReturnValue(chain);
		const { ensureCustomerPlaceholder } = await import('../db');

		const result = await ensureCustomerPlaceholder('ctm_placeholder');

		expect(result).toBeUndefined();
		expect(chain.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				paddle_customer_id: 'ctm_placeholder',
				email: null,
				is_placeholder: true,
			}),
		);
		expect(chain.upsert).not.toHaveBeenCalled();
	});

	it('does not overwrite an existing customer while creating a placeholder', async () => {
		const chain = buildChain({ data: null, error: null });
		chain.insert.mockResolvedValue({
			data: null,
			error: { code: '23505', message: 'duplicate key' },
		});
		mockFrom.mockReturnValue(chain);

		const { ensureCustomerPlaceholder } = await importDb();

		await expect(
			ensureCustomerPlaceholder('ctm_existing'),
		).resolves.toBeUndefined();
		expect(chain.insert).toHaveBeenCalledOnce();
		expect(chain.update).not.toHaveBeenCalled();
		expect(chain.upsert).not.toHaveBeenCalled();
	});

	it('enriches a placeholder with authoritative customer data', async () => {
		mockRpc.mockResolvedValue({
			data: {
				paddle_customer_id: 'ctm_placeholder',
				email: 'real@example.com',
				is_placeholder: false,
				last_event_occurred_at: '2026-07-01T00:00:00Z',
			},
			error: null,
		});

		const { upsertCustomer } = await importDb();
		const result = await upsertCustomer({
			paddle_customer_id: 'ctm_placeholder',
			email: 'real@example.com',
			occurred_at: '2026-07-01T00:00:00Z',
		});

		expect(result.is_placeholder).toBe(false);
		expect(mockRpc).toHaveBeenCalledWith(
			'upsert_paddle_customer',
			expect.objectContaining({
				p_paddle_customer_id: 'ctm_placeholder',
				p_email: 'real@example.com',
			}),
		);
	});

	it('skips stale event', async () => {
		mockRpc.mockResolvedValue({ data: null, error: null });

		const { upsertCustomer, SkippedError } = await importDb();

		await expect(
			upsertCustomer({
				paddle_customer_id: 'ctm_001',
				email: 'test@example.com',
				occurred_at: '2026-01-01T00:00:00Z',
			}),
		).rejects.toThrow(SkippedError);
	});
});

describe('upsertSubscription', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRpc.mockReset();
	});

	it('is idempotent for duplicate paddle_subscription_id', async () => {
		const chain = buildChain({ data: null, error: null });
		mockFrom.mockReturnValue(chain);
		mockRpc.mockResolvedValue({
			data: {
				id: 'uuid-1',
				paddle_subscription_id: 'sub_001',
				paddle_customer_id: 'ctm_001',
				status: 'active',
				price_id: 'pri_001',
				product_id: 'pro_001',
				last_event_occurred_at: null,
			},
			error: null,
		});

		const { upsertSubscription } = await importDb();
		const result = await upsertSubscription({
			paddle_subscription_id: 'sub_001',
			paddle_customer_id: 'ctm_001',
			status: 'active',
			price_id: 'pri_001',
			product_id: 'pro_001',
			occurred_at: '2026-01-01T00:00:00Z',
		});

		expect(result.status).toBe('active');
		expect(mockRpc).toHaveBeenCalledWith(
			'upsert_paddle_subscription',
			expect.objectContaining({
				p_paddle_subscription_id: 'sub_001',
				p_occurred_at: '2026-01-01T00:00:00Z',
			}),
		);
	});

	it('rejects stale subscription event', async () => {
		const chain = buildChain({ data: null, error: null });
		mockFrom.mockReturnValue(chain);
		mockRpc.mockResolvedValue({ data: null, error: null });

		const { upsertSubscription, SkippedError } = await importDb();

		await expect(
			upsertSubscription({
				paddle_subscription_id: 'sub_001',
				paddle_customer_id: 'ctm_001',
				status: 'active',
				price_id: 'pri_001',
				product_id: 'pro_001',
				occurred_at: '2026-01-01T00:00:00Z',
			}),
		).rejects.toThrow(SkippedError);
	});

	it('clears scheduled_change when newer payload has none', async () => {
		const chain = buildChain({ data: null, error: null });
		mockFrom.mockReturnValue(chain);
		mockRpc.mockResolvedValue({
			data: {
				paddle_subscription_id: 'sub_001',
				paddle_customer_id: 'ctm_001',
				status: 'active',
				price_id: 'pri_001',
				product_id: 'pro_001',
				scheduled_change_action: null,
				scheduled_change_at: null,
			},
			error: null,
		});

		const { upsertSubscription } = await importDb();
		const result = await upsertSubscription({
			paddle_subscription_id: 'sub_001',
			paddle_customer_id: 'ctm_001',
			status: 'active',
			price_id: 'pri_001',
			product_id: 'pro_001',
			scheduled_change_action: null,
			scheduled_change_at: null,
			occurred_at: '2026-07-01T00:00:00Z',
		});

		expect(result.scheduled_change_action).toBeNull();
		expect(result.scheduled_change_at).toBeNull();
	});
});

describe('claimEvent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRpc.mockReset();
	});

	it('returns new for unseen event', async () => {
		mockRpc.mockResolvedValue({
			data: { status: 'new', token: 'token-1' },
			error: null,
		});

		const { claimEvent } = await importDb();
		const result = await claimEvent(
			'evt_001',
			'ntf_001',
			'customer.created',
			null,
		);
		expect(result).toEqual({ status: 'new', token: 'token-1' });
	});

	it('returns retry for previously failed event', async () => {
		mockRpc.mockResolvedValue({
			data: { status: 'retry', token: 'token-2' },
			error: null,
		});

		const { claimEvent } = await importDb();
		const result = await claimEvent(
			'evt_002',
			'ntf_002',
			'customer.created',
			null,
		);
		expect(result).toEqual({ status: 'retry', token: 'token-2' });
	});

	it('throws SkippedError for already completed event', async () => {
		mockRpc.mockResolvedValue({
			data: { status: 'completed', token: null },
			error: null,
		});

		const { claimEvent, SkippedError } = await importDb();
		await expect(
			claimEvent('evt_003', 'ntf_003', 'customer.created', null),
		).rejects.toThrow(SkippedError);
	});

	it('does not steal a fresh processing lock', async () => {
		mockRpc.mockResolvedValue({
			data: { status: 'busy', token: null },
			error: null,
		});

		const { claimEvent, SkippedError } = await importDb();
		await expect(
			claimEvent('evt_busy', 'ntf_busy', 'customer.created', null),
		).rejects.toThrow(SkippedError);
	});

	it('allows exactly one concurrent first delivery to proceed', async () => {
		mockRpc
			.mockResolvedValueOnce({
				data: { status: 'new', token: 'winner-token' },
				error: null,
			})
			.mockResolvedValueOnce({
				data: { status: 'busy', token: null },
				error: null,
			});

		const { claimEvent } = await importDb();
		const results = await Promise.allSettled([
			claimEvent('evt_concurrent', 'ntf_1', 'customer.created', null),
			claimEvent('evt_concurrent', 'ntf_2', 'customer.created', null),
		]);

		expect(
			results.filter((result) => result.status === 'fulfilled'),
		).toHaveLength(1);
		expect(
			results.filter((result) => result.status === 'rejected'),
		).toHaveLength(1);
	});
});

describe('upsertTransaction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRpc.mockReset();
	});

	it('is idempotent for duplicate paddle_transaction_id', async () => {
		const chain = buildChain({
			data: {
				id: 'uuid-1',
				paddle_transaction_id: 'txn_001',
				paddle_customer_id: 'ctm_001',
				status: 'completed',
				currency_code: 'USD',
			},
			error: null,
		});
		mockFrom.mockReturnValue(chain);

		const { upsertTransaction } = await importDb();
		const result = await upsertTransaction({
			paddle_transaction_id: 'txn_001',
			paddle_customer_id: 'ctm_001',
			status: 'completed',
			currency_code: 'USD',
		});

		expect(result.paddle_transaction_id).toBe('txn_001');
	});
});
