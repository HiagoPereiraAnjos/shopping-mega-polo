import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingEnvVars: string[] = [];

if (!supabaseUrl) {
  missingEnvVars.push('VITE_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  missingEnvVars.push('VITE_SUPABASE_ANON_KEY');
}

export const isSupabaseConfigured = missingEnvVars.length === 0;

export const supabaseConfigMessage = isSupabaseConfigured
  ? null
  : `Supabase não configurado. Defina ${missingEnvVars.join(', ')} no arquivo .env.`;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    `${supabaseConfigMessage} O projeto continuará funcionando com fallback local até a configuração ser concluída.`,
  );
}

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      supabaseConfigMessage ??
        'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
    );
  }

  return supabase;
}
