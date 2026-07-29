import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let _supabase: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
	if (_supabase) return _supabase;

	const url = import.meta.env.SUPABASE_URL;
	const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url) {
		throw new Error('SUPABASE_URL environment variable is not set');
	}
	if (!key) {
		throw new Error(
			'SUPABASE_SERVICE_ROLE_KEY environment variable is not set',
		);
	}

	_supabase = createClient<Database>(url, key, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});

	return _supabase;
}
