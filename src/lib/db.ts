import { getSupabaseAdmin } from './supabase';
import type { Json } from './database.types';
import type { VerifiedPaddleWebhookEvent } from './paddle-webhook-processor';

export interface DbCustomer {
	id: string;
	paddle_customer_id: string;
	email: string | null;
	name: string | null;
	status: string;
	locale: string | null;
	is_placeholder: boolean;
	last_event_occurred_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface DbSubscription {
	id: string;
	paddle_subscription_id: string;
	paddle_customer_id: string;
	status: string;
	price_id: string;
	product_id: string;
	quantity: number;
	currency_code: string;
	scheduled_change_action: string | null;
	scheduled_change_at: string | null;
	current_billing_period_start: string | null;
	current_billing_period_end: string | null;
	canceled_at: string | null;
	started_at: string | null;
	first_billed_at: string | null;
	next_billed_at: string | null;
	paused_at: string | null;
	last_event_occurred_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface DbTransaction {
	id: string;
	paddle_transaction_id: string;
	paddle_customer_id: string;
	paddle_subscription_id: string | null;
	status: string;
	currency_code: string;
	total_amount: string | null;
	tax_amount: string | null;
	occurred_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface EventClaim {
	status: 'new' | 'retry';
	token: string;
}

const STALE_PROCESSING_SECONDS = 30;

export async function queueEvent(
	event: VerifiedPaddleWebhookEvent,
	signal?: AbortSignal,
): Promise<'queued' | 'processing' | 'completed'> {
	const supabase = getSupabaseAdmin();
	const query = supabase.rpc('enqueue_paddle_event', {
		p_event_id: event.eventId,
		p_notification_id: event.notificationId ?? null,
		p_event_type: event.eventType,
		p_occurred_at: event.occurredAt ?? '',
		p_payload: event as unknown as Json,
	});
	const { data, error } = await (signal ? query.abortSignal(signal) : query);

	if (error) throw new Error(`Failed to queue event: ${error.message}`);
	const status = (data as { status?: string } | null)?.status;
	if (status === 'queued' || status === 'processing' || status === 'completed') {
		return status;
	}

	throw new Error('Failed to queue event: unexpected database response');
}

export async function getQueuedEvent(
	eventId: string,
): Promise<VerifiedPaddleWebhookEvent | null> {
	const { data, error } = await getSupabaseAdmin()
		.from('event_processing')
		.select('payload')
		.eq('event_id', eventId)
		.maybeSingle();

	if (error) throw new Error(`Failed to load queued event: ${error.message}`);
	return (data?.payload as unknown as VerifiedPaddleWebhookEvent | null) ?? null;
}

export async function listRecoverableEvents(
	limit = 5,
): Promise<VerifiedPaddleWebhookEvent[]> {
	const staleBefore = new Date(
		Date.now() - STALE_PROCESSING_SECONDS * 1000,
	).toISOString();
	const { data, error } = await getSupabaseAdmin()
		.from('event_processing')
		.select('payload')
		.not('payload', 'is', null)
		.or(
			`status.in.(queued,failed),and(status.eq.processing,processing_started_at.lte.${staleBefore})`,
		)
		.order('processing_started_at', { ascending: true })
		.limit(limit);

	if (error) {
		throw new Error(`Failed to list recoverable events: ${error.message}`);
	}

	return (data ?? [])
		.map((row) => row.payload as unknown as VerifiedPaddleWebhookEvent | null)
		.filter((event): event is VerifiedPaddleWebhookEvent => Boolean(event));
}

export async function claimEvent(
	eventId: string,
	notificationId: string | null,
	eventType: string,
	occurredAt: string | null,
	signal?: AbortSignal,
): Promise<EventClaim> {
	const supabase = getSupabaseAdmin();

	const query = supabase.rpc('claim_paddle_event', {
		p_event_id: eventId,
		p_notification_id: notificationId,
		p_event_type: eventType,
		p_occurred_at: occurredAt,
		p_stale_after_seconds: STALE_PROCESSING_SECONDS,
	});
	const { data, error } = await (signal ? query.abortSignal(signal) : query);

	if (error) throw new Error(`Failed to claim event: ${error.message}`);

	const result = data as { status?: string; token?: string | null } | null;
	if (
		(result?.status === 'new' || result?.status === 'retry') &&
		result.token
	) {
		return { status: result.status, token: result.token };
	}

	if (result?.status === 'completed') {
		throw new SkippedError('event already completed');
	}

	throw new SkippedError('event is already processing');
}

export async function completeEvent(
	eventId: string,
	processingToken: string,
	signal?: AbortSignal,
): Promise<void> {
	const supabase = getSupabaseAdmin();
	let query = supabase
		.from('event_processing')
		.update({
			status: 'completed',
			processed_at: new Date().toISOString(),
			payload: null,
		})
		.eq('event_id', eventId)
		.eq('status', 'processing')
		.eq('processing_token', processingToken);
	if (signal) query = query.abortSignal(signal);
	const { error } = await query;

	if (error) throw new Error(`Failed to complete event: ${error.message}`);
}

export async function failEvent(
	eventId: string,
	processingToken: string,
	errorMessage: string,
	signal?: AbortSignal,
): Promise<void> {
	const supabase = getSupabaseAdmin();
	let query = supabase
		.from('event_processing')
		.update({
			status: 'failed',
			last_error: errorMessage.slice(0, 500),
		})
		.eq('event_id', eventId)
		.eq('status', 'processing')
		.eq('processing_token', processingToken);
	if (signal) query = query.abortSignal(signal);
	const { error } = await query;

	if (error) throw new Error(`Failed to fail event: ${error.message}`);
}

export class SkippedError extends Error {
	constructor(msg: string) {
		super(msg);
		this.name = 'SkippedError';
	}
}

export async function upsertCustomer(
	data: {
		paddle_customer_id: string;
		email: string;
		name?: string | null;
		status?: string;
		locale?: string;
		occurred_at: string;
	},
	signal?: AbortSignal,
): Promise<DbCustomer> {
	const supabase = getSupabaseAdmin();

	const query = supabase.rpc('upsert_paddle_customer', {
		p_paddle_customer_id: data.paddle_customer_id,
		p_email: data.email,
		p_name: data.name ?? null,
		p_status: data.status ?? 'active',
		p_locale: data.locale ?? 'en',
		p_occurred_at: data.occurred_at,
	});
	const { data: result, error } = await (signal
		? query.abortSignal(signal)
		: query);

	if (error) throw new Error(`Failed to upsert customer: ${error.message}`);
	if (!result) throw new SkippedError('stale event');
	return result as unknown as DbCustomer;
}

export async function upsertSubscription(
	data: {
		paddle_subscription_id: string;
		paddle_customer_id: string;
		status: string;
		price_id: string;
		product_id: string;
		quantity?: number;
		currency_code?: string;
		scheduled_change_action?: string | null;
		scheduled_change_at?: string | null;
		current_billing_period_start?: string | null;
		current_billing_period_end?: string | null;
		canceled_at?: string | null;
		started_at?: string | null;
		first_billed_at?: string | null;
		next_billed_at?: string | null;
		paused_at?: string | null;
		occurred_at: string;
	},
	signal?: AbortSignal,
): Promise<DbSubscription> {
	const supabase = getSupabaseAdmin();

	await ensureCustomerPlaceholder(data.paddle_customer_id, signal);

	const query = supabase.rpc('upsert_paddle_subscription', {
		p_paddle_subscription_id: data.paddle_subscription_id,
		p_paddle_customer_id: data.paddle_customer_id,
		p_status: data.status,
		p_price_id: data.price_id,
		p_product_id: data.product_id,
		p_quantity: data.quantity ?? 1,
		p_currency_code: data.currency_code ?? 'USD',
		p_scheduled_change_action: data.scheduled_change_action ?? null,
		p_scheduled_change_at: data.scheduled_change_at ?? null,
		p_current_billing_period_start: data.current_billing_period_start ?? null,
		p_current_billing_period_end: data.current_billing_period_end ?? null,
		p_canceled_at: data.canceled_at ?? null,
		p_started_at: data.started_at ?? null,
		p_first_billed_at: data.first_billed_at ?? null,
		p_next_billed_at: data.next_billed_at ?? null,
		p_paused_at: data.paused_at ?? null,
		p_occurred_at: data.occurred_at,
	});
	const { data: result, error } = await (signal
		? query.abortSignal(signal)
		: query);

	if (error) throw new Error(`Failed to upsert subscription: ${error.message}`);
	if (!result) throw new SkippedError('stale event');
	return result as unknown as DbSubscription;
}

export async function ensureCustomerPlaceholder(
	paddleCustomerId: string,
	signal?: AbortSignal,
): Promise<void> {
	const supabase = getSupabaseAdmin();
	let query = supabase.from('customers').insert({
		paddle_customer_id: paddleCustomerId,
		email: null,
		name: null,
		status: 'active',
		locale: 'en',
		is_placeholder: true,
		updated_at: new Date().toISOString(),
	});
	if (signal) query = query.abortSignal(signal);
	const { error } = await query;

	if (error && error.code !== '23505') {
		throw new Error(`Failed to create customer placeholder: ${error.message}`);
	}
}

export async function upsertTransaction(
	data: {
		paddle_transaction_id: string;
		paddle_customer_id: string;
		paddle_subscription_id?: string | null;
		status: string;
		currency_code: string;
		total_amount?: string | null;
		tax_amount?: string | null;
		occurred_at?: string | null;
	},
	signal?: AbortSignal,
): Promise<DbTransaction> {
	const supabase = getSupabaseAdmin();

	await ensureCustomerPlaceholder(data.paddle_customer_id, signal);

	const payload = {
		paddle_transaction_id: data.paddle_transaction_id,
		paddle_customer_id: data.paddle_customer_id,
		paddle_subscription_id: data.paddle_subscription_id ?? null,
		status: data.status,
		currency_code: data.currency_code,
		total_amount: data.total_amount ?? null,
		tax_amount: data.tax_amount ?? null,
		occurred_at: data.occurred_at ?? null,
		updated_at: new Date().toISOString(),
	};

	let query = supabase
		.from('transactions')
		.upsert(payload, { onConflict: 'paddle_transaction_id' })
		.select();
	if (signal) query = query.abortSignal(signal);
	const { data: result, error } = await query.single();

	if (error) throw new Error(`Failed to upsert transaction: ${error.message}`);
	return result;
}
