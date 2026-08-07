import { getWebhookSecret } from '../../src/lib/env';
import { getQueuedEvent } from '../../src/lib/db';
import {
	getSafeWebhookError,
	logPaddleWebhook,
	type PaddleWebhookDiagnosticContext,
} from '../../src/lib/paddle-webhook-diagnostics';
import { processPaddleWebhookEvent } from '../../src/lib/paddle-webhook-processor';
import {
	QUEUE_SIGNATURE_HEADER,
	verifyPaddleWebhookQueuePayload,
	type PaddleWebhookQueueEnvelope,
} from '../../src/lib/paddle-webhook-queue';

interface NetlifyBackgroundContext {
	requestId: string;
}

export default async function paddleWebhookBackground(
	request: Request,
	netlifyContext: NetlifyBackgroundContext,
): Promise<void> {
	const startedAt = performance.now();
	let context: PaddleWebhookDiagnosticContext = {
		correlation_id: crypto.randomUUID(),
		request_id: netlifyContext.requestId,
		method: request.method,
		path: new URL(request.url).pathname,
		content_type: request.headers.get('content-type'),
		signature_present: Boolean(
			request.headers.get(QUEUE_SIGNATURE_HEADER),
		),
		runtime_environment: process.env.PADDLE_ENVIRONMENT ?? 'unconfigured',
		started_at: startedAt,
	};

	logPaddleWebhook('log', 'paddle.webhook.request_received', context, {
		handler_phase: 'background_request',
	});

	try {
		if (request.method !== 'POST') {
			throw new Error('Background webhook queue only accepts POST');
		}

		const body = await request.text();
		const secret = getWebhookSecret();
		if (
			!verifyPaddleWebhookQueuePayload(
				body,
				secret,
				request.headers.get(QUEUE_SIGNATURE_HEADER),
			)
		) {
			throw new Error('Invalid background webhook queue signature');
		}

		const envelope = JSON.parse(body) as PaddleWebhookQueueEnvelope;
		context.event_id = envelope.event_id;
		const event = await getQueuedEvent(envelope.event_id);
		if (!event) {
			logPaddleWebhook('log', 'paddle.webhook.event_duplicate', context, {
				handler_phase: 'background_load',
				outcome: 'completed_or_missing',
			});
			return;
		}

		context = {
			...context,
			correlation_id: envelope.correlation_id,
			source_request_id: envelope.source_request_id,
			event_id: event.eventId,
			event_type: event.eventType,
			occurred_at: event.occurredAt,
		};
		logPaddleWebhook(
			'log',
			'paddle.webhook.background_auth_valid',
			context,
			{
				handler_phase: 'background_auth',
				outcome: 'valid',
			},
		);

		await processPaddleWebhookEvent(event, context);
		logPaddleWebhook('log', 'paddle.webhook.response_sent', context, {
			handler_phase: 'background_complete',
			outcome: 'completed',
			http_response_code: 202,
		});
	} catch (error) {
		logPaddleWebhook('error', 'paddle.webhook.unhandled_error', context, {
			handler_phase: 'background_processing',
			outcome: 'failed',
			...getSafeWebhookError(error),
		});
		throw error;
	}
}

export const config = {
	background: true,
};
