begin;

do $$
declare
	v_table text;
begin
	foreach v_table in array array[
		'public.customers',
		'public.subscriptions',
		'public.transactions',
		'public.event_processing'
	]
	loop
		assert has_table_privilege('service_role', v_table, 'select'),
			format('service_role requires select on %s', v_table);
		assert has_table_privilege('service_role', v_table, 'insert'),
			format('service_role requires insert on %s', v_table);
		assert has_table_privilege('service_role', v_table, 'update'),
			format('service_role requires update on %s', v_table);
	end loop;
end;
$$;

do $$
declare
	v_result jsonb;
begin
	v_result := public.enqueue_paddle_event(
		'evt_integrity_queued',
		'ntf_integrity_queued',
		'customer.created',
		now(),
		jsonb_build_object(
			'eventId', 'evt_integrity_queued',
			'eventType', 'customer.created',
			'occurredAt', now()
		)
	);
	assert v_result->>'status' = 'queued', 'verified event must be durably queued';

	v_result := public.claim_paddle_event(
		'evt_integrity_queued',
		'ntf_integrity_queued',
		'customer.created',
		now(),
		30
	);
	assert v_result->>'status' = 'new', 'queued event must be claimable';

	v_result := public.claim_paddle_event(
		'evt_integrity_claim',
		'ntf_integrity_claim_1',
		'customer.created',
		now(),
		240
	);
	assert v_result->>'status' = 'new', 'first delivery must claim the event';

	v_result := public.claim_paddle_event(
		'evt_integrity_claim',
		'ntf_integrity_claim_2',
		'customer.created',
		now(),
		240
	);
	assert v_result->>'status' = 'busy', 'fresh processing lock must not be stolen';

	update public.event_processing
	set status = 'failed'
	where event_id = 'evt_integrity_claim';
	v_result := public.claim_paddle_event(
		'evt_integrity_claim', null, 'customer.created', now(), 240
	);
	assert v_result->>'status' = 'retry', 'failed event must be retryable';

	update public.event_processing
	set processing_started_at = now() - interval '5 minutes'
	where event_id = 'evt_integrity_claim';
	v_result := public.claim_paddle_event(
		'evt_integrity_claim', null, 'customer.created', now(), 240
	);
	assert v_result->>'status' = 'retry', 'stale processing lock must be retryable';

	update public.event_processing
	set status = 'completed'
	where event_id = 'evt_integrity_claim';
	v_result := public.claim_paddle_event(
		'evt_integrity_claim', null, 'customer.created', now(), 240
	);
	assert v_result->>'status' = 'completed', 'completed event must be skipped';
end;
$$;

insert into public.customers (
	paddle_customer_id,
	email,
	is_placeholder
) values (
	'ctm_integrity_parent',
	null,
	true
);

insert into public.subscriptions (
	paddle_subscription_id,
	paddle_customer_id,
	status,
	price_id,
	product_id
) values (
	'sub_integrity_parent',
	'ctm_integrity_parent',
	'active',
	'pri_integrity',
	'pro_integrity'
);

insert into public.transactions (
	paddle_transaction_id,
	paddle_customer_id,
	paddle_subscription_id,
	status,
	currency_code
) values (
	'txn_integrity_parent',
	'ctm_integrity_parent',
	'sub_integrity_parent',
	'completed',
	'USD'
);

do $$
begin
	begin
		delete from public.customers
		where paddle_customer_id = 'ctm_integrity_parent';
		raise exception 'customer deletion unexpectedly succeeded';
	exception
		when foreign_key_violation then null;
	end;

	begin
		delete from public.subscriptions
		where paddle_subscription_id = 'sub_integrity_parent';
		raise exception 'subscription deletion unexpectedly succeeded';
	exception
		when foreign_key_violation then null;
	end;
end;
$$;

do $$
declare
	v_result jsonb;
	v_email text;
	v_is_placeholder boolean;
begin
	v_result := public.upsert_paddle_customer(
		'ctm_integrity_parent',
		'real@example.com',
		'Real Customer',
		'active',
		'en',
		'2026-07-29T12:00:00Z'
	);
	assert v_result is not null, 'authoritative event must enrich placeholder';

	select email, is_placeholder
	into v_email, v_is_placeholder
	from public.customers
	where paddle_customer_id = 'ctm_integrity_parent';
	assert v_email = 'real@example.com', 'authoritative email must be stored';
	assert not v_is_placeholder, 'authoritative event must clear placeholder marker';

	v_result := public.upsert_paddle_customer(
		'ctm_integrity_parent',
		'stale@example.com',
		'Stale Customer',
		'active',
		'en',
		'2026-07-29T11:00:00Z'
	);
	assert v_result is null, 'stale event must not update customer';

	select email into v_email
	from public.customers
	where paddle_customer_id = 'ctm_integrity_parent';
	assert v_email = 'real@example.com', 'stale event overwrote newer customer';
end;
$$;

rollback;
