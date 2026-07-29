alter table public.subscriptions
	drop constraint subscriptions_paddle_customer_id_fkey,
	add constraint subscriptions_paddle_customer_id_fkey
		foreign key (paddle_customer_id)
		references public.customers(paddle_customer_id)
		on delete restrict;

alter table public.transactions
	drop constraint transactions_paddle_customer_id_fkey,
	add constraint transactions_paddle_customer_id_fkey
		foreign key (paddle_customer_id)
		references public.customers(paddle_customer_id)
		on delete restrict,
	drop constraint transactions_paddle_subscription_id_fkey,
	add constraint transactions_paddle_subscription_id_fkey
		foreign key (paddle_subscription_id)
		references public.subscriptions(paddle_subscription_id)
		on delete restrict;

alter table public.customers
	alter column email drop not null,
	add column is_placeholder boolean not null default false,
	drop column portal_token,
	drop column portal_token_expires_at;

alter table public.event_processing
	add column processing_started_at timestamptz not null default now(),
	add column processing_token uuid;

create or replace function public.claim_paddle_event(
	p_event_id text,
	p_notification_id text,
	p_event_type text,
	p_occurred_at timestamptz,
	p_stale_after_seconds integer default 240
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
	where public.event_processing.status = 'failed'
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

create or replace function public.upsert_paddle_customer(
	p_paddle_customer_id text,
	p_email text,
	p_name text,
	p_status text,
	p_locale text,
	p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
	v_customer public.customers%rowtype;
begin
	insert into public.customers (
		paddle_customer_id,
		email,
		name,
		status,
		locale,
		is_placeholder,
		last_event_occurred_at,
		updated_at
	) values (
		p_paddle_customer_id,
		p_email,
		p_name,
		p_status,
		p_locale,
		false,
		p_occurred_at,
		now()
	)
	on conflict (paddle_customer_id) do update
	set
		email = excluded.email,
		name = excluded.name,
		status = excluded.status,
		locale = excluded.locale,
		is_placeholder = false,
		last_event_occurred_at = excluded.last_event_occurred_at,
		updated_at = now()
	where public.customers.last_event_occurred_at is null
		or excluded.last_event_occurred_at > public.customers.last_event_occurred_at
	returning * into v_customer;

	if not found then
		return null;
	end if;

	return to_jsonb(v_customer);
end;
$$;

revoke all on function public.claim_paddle_event(text, text, text, timestamptz, integer)
	from public, anon, authenticated;
grant execute on function public.claim_paddle_event(text, text, text, timestamptz, integer)
	to service_role;

revoke all on function public.upsert_paddle_customer(text, text, text, text, text, timestamptz)
	from public, anon, authenticated;
grant execute on function public.upsert_paddle_customer(text, text, text, text, text, timestamptz)
	to service_role;
