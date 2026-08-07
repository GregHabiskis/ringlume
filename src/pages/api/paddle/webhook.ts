import type { APIRoute } from 'astro';
import type { NetlifyLocals } from '@astrojs/netlify';
import { queueEvent } from '../../../lib/db';
import {
	getServerEnvironmentVariable,
	getWebhookSecret,
} from '../../../lib/env';
import { getPaddleClient } from '../../../lib/paddle';
import {
	getSafeWebhookError,
	logPaddleWebhook,
	type PaddleWebhookDiagnosticContext,
} from '../../../lib/paddle-webhook-diagnostics';
import {
	type VerifiedPaddleWebhookEvent,
} from '../../../lib/paddle-webhook-processor';
import { enqueuePaddleWebhookEvent } from '../../../lib/paddle-webhook-queue';

export const prerender = false;

function getQueueTimeoutMs(signature: string): number {
	const timestamp = signature
		.split(';')
		.find((part) => part.startsWith('ts='))
		?.slice(3);
	if (!timestamp || !/^\d+$/.test(timestamp)) return 2000;

	const remainingMs = Number(timestamp) * 1000 + 4500 - Date.now();
	return Math.max(0, Math.min(2000, remainingMs));
}

export const POST: APIRoute = async ({ request, locals }) => {
	const requestUrl = new URL(request.url);
	const signature = request.headers.get('Paddle-Signature');
	const netlifyContext = (locals as Partial<NetlifyLocals> | undefined)?.netlify
		?.context;
	const context: PaddleWebhookDiagnosticContext = {
		correlation_id: crypto.randomUUID(),
		request_id:
			netlifyContext?.requestId ?? request.headers.get('x-nf-request-id'),
		method: request.method,
		path: requestUrl.pathname,
		content_type: request.headers.get('content-type'),
		signature_present: Boolean(signature),
		runtime_environment:
			getServerEnvironmentVariable('PADDLE_ENVIRONMENT') ?? 'unconfigured',
		started_at: performance.now(),
	};
	const respond = (body: string, status: number, outcome: string): Response => {
		logPaddleWebhook('log', 'paddle.webhook.response_sent', context, {
			outcome,
			http_response_code: status,
		});
		return new Response(body, { status });
	};

	logPaddleWebhook('log', 'paddle.webhook.request_received', context, {
		handler_phase: 'request',
	});

	if (!signature) {
		logPaddleWebhook('error', 'paddle.webhook.signature_missing', context, {
			handler_phase: 'signature',
			outcome: 'rejected',
		});
		return respond('Missing Paddle-Signature header', 400, 'signature_missing');
	}

	let rawBody: string;
	try {
		rawBody = await request.text();
	} catch (error) {
		logPaddleWebhook('error', 'paddle.webhook.unhandled_error', context, {
			handler_phase: 'body_read',
			outcome: 'rejected',
			...getSafeWebhookError(error),
		});
		return respond('Failed to read request body', 400, 'body_read_failed');
	}

	const rawBodyBytes = new TextEncoder().encode(rawBody).byteLength;
	let secret: string;
	let paddle: ReturnType<typeof getPaddleClient>;
	try {
		secret = getWebhookSecret();
		paddle = getPaddleClient();
		logPaddleWebhook('log', 'paddle.webhook.configuration_valid', context, {
			handler_phase: 'configuration',
			raw_body_bytes: rawBodyBytes,
			outcome: 'valid',
		});
	} catch (error) {
		logPaddleWebhook('error', 'paddle.webhook.configuration_invalid', context, {
			handler_phase: 'configuration',
			raw_body_bytes: rawBodyBytes,
			outcome: 'invalid',
			...getSafeWebhookError(error),
		});
		return respond('Internal server error', 500, 'configuration_invalid');
	}

	let event: Awaited<ReturnType<typeof paddle.webhooks.unmarshal>>;
	try {
		event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
		logPaddleWebhook('log', 'paddle.webhook.signature_valid', context, {
			handler_phase: 'signature',
			raw_body_bytes: rawBodyBytes,
			outcome: 'valid',
		});
	} catch (error) {
		logPaddleWebhook('error', 'paddle.webhook.signature_invalid', context, {
			handler_phase: 'signature',
			raw_body_bytes: rawBodyBytes,
			outcome: 'rejected',
			...getSafeWebhookError(error),
		});
		return respond('Invalid webhook signature', 400, 'signature_invalid');
	}

	const verifiedEvent: VerifiedPaddleWebhookEvent = {
		eventId: event.eventId,
		notificationId: event.notificationId ?? null,
		eventType: event.eventType,
		occurredAt: event.occurredAt ?? null,
		data: event.data,
	};
	context.event_id = verifiedEvent.eventId;
	context.event_type = verifiedEvent.eventType;
	context.occurred_at = verifiedEvent.occurredAt;
	logPaddleWebhook('log', 'paddle.webhook.event_parsed', context, {
		handler_phase: 'event_parse',
		outcome: 'parsed',
	});

	if (netlifyContext?.deploy.published) {
		const queueStartedAt = performance.now();
		try {
			const queueTimeoutMs = getQueueTimeoutMs(signature);
			if (queueTimeoutMs === 0) {
				throw new Error('Paddle acknowledgement deadline exhausted');
			}
			const queueStatus = await queueEvent(
				verifiedEvent,
				AbortSignal.timeout(queueTimeoutMs),
			);
			logPaddleWebhook('log', 'paddle.webhook.event_queued', context, {
				handler_phase: 'queue',
				database_operation: 'enqueue_paddle_event',
				operation_elapsed_ms: Math.round(performance.now() - queueStartedAt),
				outcome: queueStatus,
			});

			if (queueStatus !== 'queued') {
				return respond('OK (already queued)', 200, queueStatus);
			}

			const dispatch = enqueuePaddleWebhookEvent({
				eventId: verifiedEvent.eventId,
				secret,
				requestUrl,
				correlationId: context.correlation_id,
				sourceRequestId: context.request_id,
			}).catch((error) => {
				logPaddleWebhook('error', 'paddle.webhook.unhandled_error', context, {
					handler_phase: 'background_dispatch',
					outcome: 'failed_recoverable',
					...getSafeWebhookError(error),
				});
			});
			netlifyContext.waitUntil(dispatch);
			return respond('OK (queued)', 200, 'queued');
		} catch (error) {
			logPaddleWebhook('error', 'paddle.webhook.unhandled_error', context, {
				handler_phase: 'queue',
				outcome: 'failed',
				database_operation: 'enqueue_paddle_event',
				operation_elapsed_ms: Math.round(performance.now() - queueStartedAt),
				...getSafeWebhookError(error),
			});
			return respond('Internal server error', 500, 'queue_failed');
		}
	}

	try {
		const { processPaddleWebhookEvent } = await import(
			'../../../lib/paddle-webhook-processor'
		);
		const outcome = await processPaddleWebhookEvent(verifiedEvent, context);
		const responseBody =
			outcome === 'processed'
				? 'OK'
				: outcome === 'duplicate'
					? 'OK (already claimed)'
					: 'OK (skipped)';
		return respond(responseBody, 200, outcome);
	} catch (error) {
		logPaddleWebhook('error', 'paddle.webhook.unhandled_error', context, {
			handler_phase: 'local_processing',
			outcome: 'failed',
			...getSafeWebhookError(error),
		});
		return respond('Internal server error', 500, 'persistence_failed');
	}
};
