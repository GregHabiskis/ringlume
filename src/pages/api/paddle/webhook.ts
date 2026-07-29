import type { APIRoute } from 'astro';
import {
	handleCustomerCreated,
	handleCustomerUpdated,
	handleSubscriptionCreated,
	handleSubscriptionUpdated,
	handleSubscriptionCanceled,
	handleTransactionCompleted,
} from '../../../lib/webhook-handlers';
import {
	claimEvent,
	completeEvent,
	failEvent,
	SkippedError,
} from '../../../lib/db';
import { getPaddleClient } from '../../../lib/paddle';
import { getWebhookSecret } from '../../../lib/env';

export const prerender = false;

const PROCESSING_TIMEOUT_MS = 3500;
const FAILURE_WRITE_TIMEOUT_MS = 750;

type WebhookEvent = Awaited<
	ReturnType<ReturnType<typeof getPaddleClient>['webhooks']['unmarshal']>
>;

async function dispatchWebhookEvent(
	event: WebhookEvent,
	occurredAt: string,
	signal: AbortSignal,
): Promise<string> {
	switch (event.eventType) {
		case 'customer.created':
			return handleCustomerCreated(
				event.data as Parameters<typeof handleCustomerCreated>[0],
				occurredAt,
				signal,
			);
		case 'customer.updated':
			return handleCustomerUpdated(
				event.data as Parameters<typeof handleCustomerUpdated>[0],
				occurredAt,
				signal,
			);
		case 'subscription.created':
			return handleSubscriptionCreated(
				event.data as Parameters<typeof handleSubscriptionCreated>[0],
				occurredAt,
				signal,
			);
		case 'subscription.updated':
			return handleSubscriptionUpdated(
				event.data as Parameters<typeof handleSubscriptionUpdated>[0],
				occurredAt,
				signal,
			);
		case 'subscription.canceled':
			return handleSubscriptionCanceled(
				event.data as Parameters<typeof handleSubscriptionCanceled>[0],
				occurredAt,
				signal,
			);
		case 'transaction.completed':
			return handleTransactionCompleted(
				event.data as Parameters<typeof handleTransactionCompleted>[0],
				occurredAt,
				signal,
			);
		default:
			return `ignored unsupported event: ${event.eventType}`;
	}
}

export const POST: APIRoute = async ({ request }) => {
	const signature = request.headers.get('Paddle-Signature');
	if (!signature) {
		return new Response('Missing Paddle-Signature header', { status: 400 });
	}

	let rawBody: string;
	try {
		rawBody = await request.text();
	} catch {
		return new Response('Failed to read request body', { status: 400 });
	}

	const secret = getWebhookSecret();
	const paddle = getPaddleClient();

	let event: Awaited<ReturnType<typeof paddle.webhooks.unmarshal>>;
	try {
		event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
	} catch {
		return new Response('Invalid webhook signature', { status: 400 });
	}

	const eventId = event.eventId;
	const notificationId = event.notificationId ?? null;
	const occurredAt = event.occurredAt ?? null;
	const processingController = new AbortController();
	const processingTimeout = setTimeout(
		() => processingController.abort(),
		PROCESSING_TIMEOUT_MS,
	);

	let processingToken: string;
	try {
		const claim = await claimEvent(
			eventId,
			notificationId,
			event.eventType,
			occurredAt,
			processingController.signal,
		);
		processingToken = claim.token;
	} catch (err) {
		if (err instanceof SkippedError) {
			clearTimeout(processingTimeout);
			return new Response('OK (already claimed)', { status: 200 });
		}
		clearTimeout(processingTimeout);
		console.error(`[paddle-webhook] claim error: ${(err as Error).message}`);
		return new Response('Internal server error', { status: 500 });
	}

	try {
		const log = await dispatchWebhookEvent(
			event,
			occurredAt,
			processingController.signal,
		);

		await completeEvent(eventId, processingToken, processingController.signal);
		clearTimeout(processingTimeout);
		console.log(`[paddle-webhook] ${log}`);
		return new Response('OK', { status: 200 });
	} catch (err) {
		if (err instanceof SkippedError) {
			await completeEvent(
				eventId,
				processingToken,
				processingController.signal,
			);
			clearTimeout(processingTimeout);
			console.log(`[paddle-webhook] skipped: ${err.message}`);
			return new Response('OK (skipped)', { status: 200 });
		}

		const message =
			err instanceof Error ? err.message : 'Unknown handler error';
		clearTimeout(processingTimeout);
		try {
			await failEvent(
				eventId,
				processingToken,
				message,
				AbortSignal.timeout(FAILURE_WRITE_TIMEOUT_MS),
			);
		} catch (failErr) {
			console.error(
				`[paddle-webhook] failed to record error state: ${(failErr as Error).message}`,
			);
		}
		console.error(`[paddle-webhook] error: ${message}`);
		return new Response('Internal server error', { status: 500 });
	}
};
