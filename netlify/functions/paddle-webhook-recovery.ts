import { listRecoverableEvents } from '../../src/lib/db';
import {
	getSafeWebhookError,
	logPaddleWebhook,
	type PaddleWebhookDiagnosticContext,
} from '../../src/lib/paddle-webhook-diagnostics';
import { processPaddleWebhookEvent } from '../../src/lib/paddle-webhook-processor';

interface NetlifyScheduledContext {
	requestId: string;
}

export default async function paddleWebhookRecovery(
	request: Request,
	netlifyContext: NetlifyScheduledContext,
): Promise<void> {
	const recoveryContext: PaddleWebhookDiagnosticContext = {
		correlation_id: crypto.randomUUID(),
		request_id: netlifyContext.requestId,
		method: request.method,
		path: new URL(request.url).pathname,
		content_type: request.headers.get('content-type'),
		signature_present: false,
		runtime_environment: process.env.PADDLE_ENVIRONMENT ?? 'unconfigured',
		started_at: performance.now(),
	};
	let events: Awaited<ReturnType<typeof listRecoverableEvents>>;
	try {
		events = await listRecoverableEvents();
	} catch (error) {
		logPaddleWebhook('error', 'paddle.webhook.unhandled_error', recoveryContext, {
			handler_phase: 'scheduled_recovery_list',
			outcome: 'failed_recoverable',
			...getSafeWebhookError(error),
		});
		throw error;
	}

	for (const event of events) {
		const context: PaddleWebhookDiagnosticContext = {
			...recoveryContext,
			correlation_id: crypto.randomUUID(),
			started_at: performance.now(),
			event_id: event.eventId,
			event_type: event.eventType,
			occurred_at: event.occurredAt,
		};

		try {
			await processPaddleWebhookEvent(event, context);
		} catch (error) {
			logPaddleWebhook('error', 'paddle.webhook.unhandled_error', context, {
				handler_phase: 'scheduled_recovery',
				outcome: 'failed_recoverable',
				...getSafeWebhookError(error),
			});
		}
	}
}

export const config = {
	schedule: '*/5 * * * *',
};
