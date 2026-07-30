create or replace function public.upsert_paddle_subscription(
	p_paddle_subscription_id text,
	p_paddle_customer_id text,
	p_status text,
	p_price_id text,
	p_product_id text,
	p_quantity integer,
	p_currency_code text,
	p_scheduled_change_action text,
	p_scheduled_change_at timestamptz,
	p_current_billing_period_start timestamptz,
	p_current_billing_period_end timestamptz,
	p_canceled_at timestamptz,
	p_started_at timestamptz,
	p_first_billed_at timestamptz,
	p_next_billed_at timestamptz,
	p_paused_at timestamptz,
	p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
	v_subscription public.subscriptions%rowtype;
begin
	insert into public.subscriptions (
		paddle_subscription_id,
		paddle_customer_id,
		status,
		price_id,
		product_id,
		quantity,
		currency_code,
		scheduled_change_action,
		scheduled_change_at,
		current_billing_period_start,
		current_billing_period_end,
		canceled_at,
		started_at,
		first_billed_at,
		next_billed_at,
		paused_at,
		last_event_occurred_at,
		updated_at
	) values (
		p_paddle_subscription_id,
		p_paddle_customer_id,
		p_status,
		p_price_id,
		p_product_id,
		p_quantity,
		p_currency_code,
		p_scheduled_change_action,
		p_scheduled_change_at,
		p_current_billing_period_start,
		p_current_billing_period_end,
		p_canceled_at,
		p_started_at,
		p_first_billed_at,
		p_next_billed_at,
		p_paused_at,
		p_occurred_at,
		now()
	)
	on conflict (paddle_subscription_id) do update
	set
		paddle_customer_id = excluded.paddle_customer_id,
		status = excluded.status,
		price_id = excluded.price_id,
		product_id = excluded.product_id,
		quantity = excluded.quantity,
		currency_code = excluded.currency_code,
		scheduled_change_action = excluded.scheduled_change_action,
		scheduled_change_at = excluded.scheduled_change_at,
		current_billing_period_start = excluded.current_billing_period_start,
		current_billing_period_end = excluded.current_billing_period_end,
		canceled_at = excluded.canceled_at,
		started_at = excluded.started_at,
		first_billed_at = excluded.first_billed_at,
		next_billed_at = excluded.next_billed_at,
		paused_at = excluded.paused_at,
		last_event_occurred_at = excluded.last_event_occurred_at,
		updated_at = now()
	where public.subscriptions.last_event_occurred_at is null
		or excluded.last_event_occurred_at > public.subscriptions.last_event_occurred_at
	returning * into v_subscription;

	if not found then
		return null;
	end if;

	return to_jsonb(v_subscription);
end;
$$;

revoke all on function public.upsert_paddle_subscription(
	text,
	text,
	text,
	text,
	text,
	integer,
	text,
	text,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz
) from public, anon, authenticated;

grant execute on function public.upsert_paddle_subscription(
	text,
	text,
	text,
	text,
	text,
	integer,
	text,
	text,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz,
	timestamptz
) to service_role;
