import {
	claimEvent,
	completeEvent,
	failEvent,
	SkippedError,
} from './db';
import {
	getSafeWebhookError,
	logPaddleWebhook,
	type PaddleWebhookDiagnosticContext,
} from './paddle-webhook-diagnostics';
import {
	handleCustomerCreated,
	handleCustomerUpdated,
	handleSubscriptionCanceled,
	handleSubscriptionCreated,
	handleSubscriptionUpdated,
	handleTransactionCompleted,
} from './webhook-handlers';

const DEFAULT_PROCESSING_TIMEOUT_MS = 3500;
const FAILURE_WRITE_TIMEOUT_MS = 750;

export interface VerifiedPaddleWebhookEvent {
	eventId: string;
	notificationId?: string | null;
	eventType: string;
	occurredAt?: string | null;
	data: unknown;
}

async function dispatchWebhookEvent(
	event: VerifiedPaddleWebhookEvent,
	occurredAt: string,
	signal: AbortSignal,
): Promise<void> {
	switch (event.eventType) {
		case 'customer.created':
			await handleCustomerCreated(
				event.data as Parameters<typeof handleCustomerCreated>[0],
				occurredAt,
				signal,
			);
			return;
		case 'customer.updated':
			await handleCustomerUpdated(
				event.data as Parameters<typeof handleCustomerUpdated>[0],
				occurredAt,
				signal,
			);
			return;
		case 'subscription.created':
			await handleSubscriptionCreated(
				event.data as Parameters<typeof handleSubscriptionCreated>[0],
				occurredAt,
				signal,
			);
			return;
		case 'subscription.updated':
			await handleSubscriptionUpdated(
				event.data as Parameters<typeof handleSubscriptionUpdated>[0],
				occurredAt,
				signal,
			);
			return;
		case 'subscription.canceled':
			await handleSubscriptionCanceled(
				event.data as Parameters<typeof handleSubscriptionCanceled>[0],
				occurredAt,
				signal,
			);
			return;
		case 'transaction.completed':
			await handleTransactionCompleted(
				event.data as Parameters<typeof handleTransactionCompleted>[0],
				occurredAt,
				signal,
			);
	}
}

function getPersistenceOperation(eventType: string): string {
	if (eventType.startsWith('customer.')) return 'upsert_paddle_customer';
	if (eventType.startsWith('subscription.')) {
		return 'ensure_customer_and_upsert_paddle_subscription';
	}
	if (eventType === 'transaction.completed') return 'upsert_transaction';
	return 'complete_unsupported_event';
}

async function claimPaddleEvent(
	event: VerifiedPaddleWebhookEvent,
	occurredAt: string,
	signal: AbortSignal,
	context: PaddleWebhookDiagnosticContext,
): Promise<string | null> {
	const claimStartedAt = performance.now();
	try {
		const claim = await claimEvent(
			event.eventId,
			event.notificationId ?? null,
			event.eventType,
			occurredAt,
			signal,
		);
		logPaddleWebhook('log', 'paddle.webhook.event_claimed', context, {
			handler_phase: 'event_claim',
			database_operation: 'claim_paddle_event',
			claim_status: claim.status,
			operation_elapsed_ms: Math.round(performance.now() - claimStartedAt),
			outcome: 'claimed',
		});
		return claim.token;
	} catch (error) {
		if (error instanceof SkippedError) {
			logPaddleWebhook('log', 'paddle.webhook.event_duplicate', context, {
				handler_phase: 'event_claim',
				database_operation: 'claim_paddle_event',
				operation_elapsed_ms: Math.round(performance.now() - claimStartedAt),
				outcome:
					error.message === 'event already completed'
						? 'completed'
						: 'processing',
			});
			return null;
		}

		logPaddleWebhook('error', 'paddle.webhook.persistence_failed', context, {
			handler_phase: 'event_claim',
			database_operation: 'claim_paddle_event',
			operation_elapsed_ms: Math.round(performance.now() - claimStartedAt),
			outcome: 'failed',
			...getSafeWebhookError(error),
		});
		throw error;
	}
}

async function recordPaddleEventFailure(
	eventId: string,
	processingToken: string,
	error: unknown,
	persistenceOperation: string,
	persistenceStartedAt: number,
	context: PaddleWebhookDiagnosticContext,
): Promise<void> {
	const message = error instanceof Error ? error.message : 'Unknown handler error';
	try {
		await failEvent(
			eventId,
			processingToken,
			message,
			AbortSignal.timeout(FAILURE_WRITE_TIMEOUT_MS),
		);
	} catch (failError) {
		logPaddleWebhook('error', 'paddle.webhook.persistence_failed', context, {
			handler_phase: 'failure_recording',
			database_operation: 'fail_event',
			outcome: 'failed',
			...getSafeWebhookError(failError),
		});
	}
	logPaddleWebhook('error', 'paddle.webhook.persistence_failed', context, {
		handler_phase: 'persistence',
		database_operation: persistenceOperation,
		operation_elapsed_ms: Math.round(performance.now() - persistenceStartedAt),
		outcome: 'failed',
		...getSafeWebhookError(error),
	});
}

export async function processPaddleWebhookEvent(
	event: VerifiedPaddleWebhookEvent,
	context: PaddleWebhookDiagnosticContext,
	options: { processingTimeoutMs?: number } = {},
): Promise<'processed' | 'duplicate' | 'stale'> {
	const eventId = event.eventId;
	const occurredAt = event.occurredAt ?? null;
	if (!occurredAt) throw new Error('Verified event is missing occurred_at');

	context.event_id = eventId;
	context.event_type = event.eventType;
	context.occurred_at = occurredAt;
	const processingController = new AbortController();
	const processingTimeout = setTimeout(
		() => processingController.abort(),
		options.processingTimeoutMs ?? DEFAULT_PROCESSING_TIMEOUT_MS,
	);

	let processingToken: string | null;
	try {
		processingToken = await claimPaddleEvent(
			event,
			occurredAt,
			processingController.signal,
			context,
		);
	} catch (error) {
		clearTimeout(processingTimeout);
		throw error;
	}
	if (!processingToken) {
		clearTimeout(processingTimeout);
		return 'duplicate';
	}

	const persistenceOperation = getPersistenceOperation(event.eventType);
	const persistenceStartedAt = performance.now();
	logPaddleWebhook('log', 'paddle.webhook.persistence_started', context, {
		handler_phase: 'persistence',
		database_operation: persistenceOperation,
		outcome: 'started',
	});

	try {
		await dispatchWebhookEvent(
			event,
			occurredAt,
			processingController.signal,
		);
		await completeEvent(eventId, processingToken, processingController.signal);
		clearTimeout(processingTimeout);
		logPaddleWebhook('log', 'paddle.webhook.persistence_succeeded', context, {
			handler_phase: 'persistence',
			database_operation: persistenceOperation,
			operation_elapsed_ms: Math.round(
				performance.now() - persistenceStartedAt,
			),
			outcome: 'succeeded',
		});
		return 'processed';
	} catch (error) {
		if (error instanceof SkippedError) {
			try {
				await completeEvent(
					eventId,
					processingToken,
					processingController.signal,
				);
				clearTimeout(processingTimeout);
				logPaddleWebhook('log', 'paddle.webhook.event_stale', context, {
					handler_phase: 'persistence',
					database_operation: persistenceOperation,
					operation_elapsed_ms: Math.round(
						performance.now() - persistenceStartedAt,
					),
					outcome: 'skipped',
				});
				return 'stale';
			} catch (completeError) {
				error = completeError;
			}
		}

		clearTimeout(processingTimeout);
		await recordPaddleEventFailure(
			eventId,
			processingToken,
			error,
			persistenceOperation,
			persistenceStartedAt,
			context,
		);
		throw error;
	}
}
