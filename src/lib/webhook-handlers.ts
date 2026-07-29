import { upsertCustomer, upsertSubscription, upsertTransaction } from './db';

function getPriceId(items: Array<{ price?: { id?: string } | null }>): string {
	return items[0]?.price?.id ?? '';
}

function getProductId(
	items: Array<{ product?: { id?: string } | null }>,
): string {
	return items[0]?.product?.id ?? '';
}

function extractScheduledChange(sub: {
	scheduledChange?: {
		action?: string | null;
		effectiveAt?: string | null;
	} | null;
}): { action: string | null; effectiveAt: string | null } {
	const sc = sub.scheduledChange;
	if (!sc) return { action: null, effectiveAt: null };
	return {
		action: sc.action ?? null,
		effectiveAt: sc.effectiveAt ?? null,
	};
}

export async function handleCustomerCreated(
	data: {
		id: string;
		email: string;
		name: string | null;
		status: string;
		locale: string;
	},
	occurredAt: string,
	signal?: AbortSignal,
): Promise<string> {
	await upsertCustomer(
		{
			paddle_customer_id: data.id,
			email: data.email,
			name: data.name,
			status: data.status,
			locale: data.locale,
			occurred_at: occurredAt,
		},
		signal,
	);

	return `customer.created ${data.id}`;
}

export async function handleCustomerUpdated(
	data: {
		id: string;
		email: string;
		name: string | null;
		status: string;
		locale: string;
	},
	occurredAt: string,
	signal?: AbortSignal,
): Promise<string> {
	await upsertCustomer(
		{
			paddle_customer_id: data.id,
			email: data.email,
			name: data.name,
			status: data.status,
			locale: data.locale,
			occurred_at: occurredAt,
		},
		signal,
	);

	return `customer.updated ${data.id}`;
}

export function buildSubscriptionPayload(
	data: {
		id: string;
		customerId: string;
		status: string;
		items: Array<{
			quantity?: number;
			price?: { id?: string } | null;
			product?: { id?: string } | null;
		}>;
		currencyCode: string;
		scheduledChange?: {
			action?: string | null;
			effectiveAt?: string | null;
		} | null;
		currentBillingPeriod?: {
			startsAt?: string | null;
			endsAt?: string | null;
		} | null;
		canceledAt: string | null;
		startedAt: string | null;
		firstBilledAt: string | null;
		nextBilledAt: string | null;
		pausedAt: string | null;
	},
	occurredAt: string,
) {
	const { action, effectiveAt } = extractScheduledChange(data);

	return {
		paddle_subscription_id: data.id,
		paddle_customer_id: data.customerId,
		status: data.status,
		price_id: getPriceId(data.items),
		product_id: getProductId(data.items),
		quantity: data.items[0]?.quantity ?? 1,
		currency_code: data.currencyCode,
		scheduled_change_action: action,
		scheduled_change_at: effectiveAt,
		current_billing_period_start: data.currentBillingPeriod?.startsAt ?? null,
		current_billing_period_end: data.currentBillingPeriod?.endsAt ?? null,
		canceled_at: data.canceledAt,
		started_at: data.startedAt,
		first_billed_at: data.firstBilledAt,
		next_billed_at: data.nextBilledAt,
		paused_at: data.pausedAt,
		occurred_at: occurredAt,
	};
}

export async function handleSubscriptionCreated(
	data: Parameters<typeof buildSubscriptionPayload>[0],
	occurredAt: string,
	signal?: AbortSignal,
): Promise<string> {
	const payload = buildSubscriptionPayload(data, occurredAt);
	await upsertSubscription(payload, signal);
	return `subscription.created ${data.id}`;
}

export async function handleSubscriptionUpdated(
	data: Parameters<typeof buildSubscriptionPayload>[0],
	occurredAt: string,
	signal?: AbortSignal,
): Promise<string> {
	const payload = buildSubscriptionPayload(data, occurredAt);
	await upsertSubscription(payload, signal);
	return `subscription.updated ${data.id}`;
}

export async function handleSubscriptionCanceled(
	data: Parameters<typeof buildSubscriptionPayload>[0],
	occurredAt: string,
	signal?: AbortSignal,
): Promise<string> {
	const payload = buildSubscriptionPayload(data, occurredAt);
	await upsertSubscription(payload, signal);
	return `subscription.canceled ${data.id}`;
}

export async function handleTransactionCompleted(
	data: {
		id: string;
		customerId: string | null;
		subscriptionId: string | null;
		status: string;
		currencyCode: string;
		items: Array<unknown>;
		details?: {
			totals?: { total?: string | null; tax?: string | null } | null;
		} | null;
	},
	occurredAt: string,
	signal?: AbortSignal,
): Promise<string> {
	const customerId = data.customerId;
	if (!customerId) {
		return `transaction.completed ${data.id} skipped: no customerId`;
	}

	const total = data.details?.totals?.total ?? null;
	const tax = data.details?.totals?.tax ?? null;

	await upsertTransaction(
		{
			paddle_transaction_id: data.id,
			paddle_customer_id: customerId,
			paddle_subscription_id: data.subscriptionId,
			status: data.status,
			currency_code: data.currencyCode,
			total_amount: total,
			tax_amount: tax,
			occurred_at: occurredAt,
		},
		signal,
	);

	return `transaction.completed ${data.id}`;
}
