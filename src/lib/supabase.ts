import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** true quando as credenciais do Supabase estão configuradas. */
export const isSupabaseConfigured = Boolean(url && anonKey && url.startsWith('http'));

let client: SupabaseClient<Database> | null = null;

/** Cliente tipado do Supabase para o Mascarenhas Hub (null no Modo Local). */
export function getSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient<Database>(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mascarenhas_hub_auth' },
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return client;
}
