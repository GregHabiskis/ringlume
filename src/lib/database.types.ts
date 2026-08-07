export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

type CustomerRow = {
	created_at: string;
	email: string | null;
	id: string;
	is_placeholder: boolean;
	last_event_occurred_at: string | null;
	locale: string | null;
	name: string | null;
	paddle_customer_id: string;
	status: string;
	updated_at: string;
};

type SubscriptionRow = {
	canceled_at: string | null;
	created_at: string;
	currency_code: string;
	current_billing_period_end: string | null;
	current_billing_period_start: string | null;
	first_billed_at: string | null;
	id: string;
	last_event_occurred_at: string | null;
	next_billed_at: string | null;
	paddle_customer_id: string;
	paddle_subscription_id: string;
	paused_at: string | null;
	price_id: string;
	product_id: string;
	quantity: number;
	scheduled_change_action: string | null;
	scheduled_change_at: string | null;
	started_at: string | null;
	status: string;
	updated_at: string;
};

type TransactionRow = {
	created_at: string;
	currency_code: string;
	id: string;
	occurred_at: string | null;
	paddle_customer_id: string;
	paddle_subscription_id: string | null;
	paddle_transaction_id: string;
	status: string;
	tax_amount: string | null;
	total_amount: string | null;
	updated_at: string;
};

type EventProcessingRow = {
	attempt_count: number;
	created_at: string;
	event_id: string;
	event_type: string;
	id: string;
	last_error: string | null;
	notification_id: string | null;
	occurred_at: string | null;
	payload: Json | null;
	processed_at: string | null;
	processing_started_at: string;
	processing_token: string | null;
	status: string;
};

type TableDefinition<Row, Insert, Update> = {
	Row: Row;
	Insert: Insert;
	Update: Update;
	Relationships: [];
};

export type Database = {
	__InternalSupabase: {
		PostgrestVersion: '14.5';
	};
	public: {
		Tables: {
			customers: TableDefinition<
				CustomerRow,
				Partial<CustomerRow> & Pick<CustomerRow, 'paddle_customer_id'>,
				Partial<CustomerRow>
			>;
			event_processing: TableDefinition<
				EventProcessingRow,
				Partial<EventProcessingRow> &
					Pick<EventProcessingRow, 'event_id' | 'event_type'>,
				Partial<EventProcessingRow>
			>;
			subscriptions: TableDefinition<
				SubscriptionRow,
				Partial<SubscriptionRow> &
					Pick<
						SubscriptionRow,
						| 'paddle_subscription_id'
						| 'paddle_customer_id'
						| 'status'
						| 'price_id'
						| 'product_id'
					>,
				Partial<SubscriptionRow>
			>;
			transactions: TableDefinition<
				TransactionRow,
				Partial<TransactionRow> &
					Pick<
						TransactionRow,
						| 'paddle_transaction_id'
						| 'paddle_customer_id'
						| 'status'
						| 'currency_code'
					>,
				Partial<TransactionRow>
			>;
		};
		Views: Record<never, never>;
		Functions: {
			enqueue_paddle_event: {
				Args: {
					p_event_id: string;
					p_event_type: string;
					p_notification_id: string | null;
					p_occurred_at: string;
					p_payload: Json;
				};
				Returns: Json;
			};
			claim_paddle_event: {
				Args: {
					p_event_id: string;
					p_event_type: string;
					p_notification_id: string | null;
					p_occurred_at: string | null;
					p_stale_after_seconds?: number;
				};
				Returns: Json;
			};
			upsert_paddle_customer: {
				Args: {
					p_email: string;
					p_locale: string;
					p_name: string | null;
					p_occurred_at: string;
					p_paddle_customer_id: string;
					p_status: string;
				};
				Returns: Json;
			};
			upsert_paddle_subscription: {
				Args: {
					p_canceled_at: string | null;
					p_currency_code: string;
					p_current_billing_period_end: string | null;
					p_current_billing_period_start: string | null;
					p_first_billed_at: string | null;
					p_next_billed_at: string | null;
					p_occurred_at: string;
					p_paddle_customer_id: string;
					p_paddle_subscription_id: string;
					p_paused_at: string | null;
					p_price_id: string;
					p_product_id: string;
					p_quantity: number;
					p_scheduled_change_action: string | null;
					p_scheduled_change_at: string | null;
					p_started_at: string | null;
					p_status: string;
				};
				Returns: Json;
			};
		};
		Enums: Record<never, never>;
		CompositeTypes: Record<never, never>;
	};
};

export type TablesInsert<TableName extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][TableName]['Insert'];
