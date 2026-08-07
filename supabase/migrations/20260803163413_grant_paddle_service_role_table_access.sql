-- SECURITY INVOKER RPCs still require SQL privileges for the calling role.
grant select, insert, update on table
	public.customers,
	public.subscriptions,
	public.transactions,
	public.event_processing
to service_role;
