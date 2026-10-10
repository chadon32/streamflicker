import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './supabaseConfig';

export { isSupabaseConfigured } from './supabaseConfig';

if (!isSupabaseConfigured) {
  console.warn('Supabase URL and Anon Key are missing. Check your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
