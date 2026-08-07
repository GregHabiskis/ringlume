export interface PaddleWebhookDiagnosticContext {
	correlation_id: string;
	request_id: string | null;
	source_request_id?: string | null;
	method: string;
	path: string;
	content_type: string | null;
	signature_present: boolean;
	runtime_environment: string;
	started_at: number;
	event_id?: string;
	event_type?: string;
	occurred_at?: string | null;
}

function sanitizeDiagnosticText(value: string): string {
	return value
		.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
		.replace(/pdl_[A-Za-z0-9_]+/g, '[redacted-secret]')
		.replace(/([?&](?:token|auth|signature)=)[^&\s]+/gi, '$1[redacted]')
		.slice(0, 2000);
}

export function getSafeWebhookError(
	error: unknown,
): Record<string, string | null> {
	if (!(error instanceof Error)) {
		return {
			error_class: 'UnknownError',
			error_code: null,
			error_message: 'Unknown error',
			error_stack: null,
		};
	}

	const errorWithCode = error as Error & { code?: string };
	return {
		error_class: error.name,
		error_code: errorWithCode.code ?? null,
		error_message: sanitizeDiagnosticText(error.message),
		error_stack: error.stack ? sanitizeDiagnosticText(error.stack) : null,
	};
}

export function logPaddleWebhook(
	level: 'log' | 'error',
	event: string,
	context: PaddleWebhookDiagnosticContext,
	fields: Record<string, unknown> = {},
): void {
	console[level](
		JSON.stringify({
			event,
			request_id: context.request_id,
			source_request_id: context.source_request_id ?? null,
			correlation_id: context.correlation_id,
			event_id: context.event_id ?? null,
			event_type: context.event_type ?? null,
			occurred_at: context.occurred_at ?? null,
			method: context.method,
			path: context.path,
			content_type: context.content_type,
			signature_present: context.signature_present,
			runtime_environment: context.runtime_environment,
			elapsed_ms: Math.round(performance.now() - context.started_at),
			...fields,
		}),
	);
}
