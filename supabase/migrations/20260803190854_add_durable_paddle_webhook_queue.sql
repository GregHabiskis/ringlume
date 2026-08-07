alter table public.event_processing
	add column if not exists payload jsonb;

alter table public.event_processing
	drop constraint if exists event_processing_status_check,
	add constraint event_processing_status_check
		check (status in ('queued', 'processing', 'completed', 'failed'));

create or replace function public.enqueue_paddle_event(
	p_event_id text,
	p_notification_id text,
	p_event_type text,
	p_occurred_at timestamptz,
	p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
	v_status text;
begin
	insert into public.event_processing (
		event_id,
		notification_id,
		event_type,
		occurred_at,
		status,
		attempt_count,
		processed_at,
		last_error,
		processing_started_at,
		processing_token,
		payload
	) values (
		p_event_id,
		p_notification_id,
		p_event_type,
		p_occurred_at,
		'queued',
		0,
		null,
		null,
		now(),
		null,
		p_payload
	)
	on conflict (event_id) do update
	set
		notification_id = excluded.notification_id,
		event_type = excluded.event_type,
		occurred_at = excluded.occurred_at,
		payload = case
			when public.event_processing.status = 'completed'
				then public.event_processing.payload
			else excluded.payload
		end,
		status = case
			when public.event_processing.status in ('completed', 'processing')
				then public.event_processing.status
			else 'queued'
		end,
		last_error = case
			when public.event_processing.status in ('completed', 'processing')
				then public.event_processing.last_error
			else null
		end
	returning status into v_status;

	return jsonb_build_object('status', v_status);
end;
$$;

create or replace function public.claim_paddle_event(
	p_event_id text,
	p_notification_id text,
	p_event_type text,
	p_occurred_at timestamptz,
	p_stale_after_seconds integer default 30
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
	v_attempt_count integer;
	v_processing_token uuid;
	v_existing_status text;
begin
	if p_stale_after_seconds < 30 then
		raise exception 'stale event timeout must be at least 30 seconds';
	end if;

	insert into public.event_processing (
		event_id,
		notification_id,
		event_type,
		occurred_at,
		status,
		attempt_count,
		processed_at,
		last_error,
		processing_started_at,
		processing_token
	) values (
		p_event_id,
		p_notification_id,
		p_event_type,
		p_occurred_at,
		'processing',
		1,
		null,
		null,
		now(),
		gen_random_uuid()
	)
	on conflict (event_id) do update
	set
		notification_id = excluded.notification_id,
		event_type = excluded.event_type,
		occurred_at = excluded.occurred_at,
		status = 'processing',
		attempt_count = public.event_processing.attempt_count + 1,
		processed_at = null,
		last_error = null,
		processing_started_at = now(),
		processing_token = gen_random_uuid()
	where public.event_processing.status in ('queued', 'failed')
		or (
			public.event_processing.status = 'processing'
			and public.event_processing.processing_started_at
				<= now() - make_interval(secs => p_stale_after_seconds)
		)
	returning attempt_count, processing_token
		into v_attempt_count, v_processing_token;

	if found then
		return jsonb_build_object(
			'status', case when v_attempt_count = 1 then 'new' else 'retry' end,
			'token', v_processing_token
		);
	end if;

	select status
	into v_existing_status
	from public.event_processing
	where event_id = p_event_id;

	return jsonb_build_object(
		'status', case when v_existing_status = 'completed' then 'completed' else 'busy' end,
		'token', null
	);
end;
$$;

revoke all on function public.enqueue_paddle_event(text, text, text, timestamptz, jsonb)
	from public, anon, authenticated;
grant execute on function public.enqueue_paddle_event(text, text, text, timestamptz, jsonb)
	to service_role;

revoke all on function public.claim_paddle_event(text, text, text, timestamptz, integer)
	from public, anon, authenticated;
grant execute on function public.claim_paddle_event(text, text, text, timestamptz, integer)
	to service_role;
