// Cliente Supabase + detección de modo demo.
// Si faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, la app funciona en
// MODO DEMO LOCAL (sin red), claramente identificado en la UI.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const PLACEHOLDER_URL = !url || url.includes('tu-proyecto') || url.trim() === '';
const PLACEHOLDER_KEY = !anonKey || anonKey.includes('ficticia') || anonKey.trim() === '';

export const DEMO_MODE = PLACEHOLDER_URL || PLACEHOLDER_KEY;
export const ENV_MISSING = DEMO_MODE;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (DEMO_MODE) return null;
  if (client) return client;
  client = createClient(url as string, anonKey as string, {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
}

export function envStatusMessage(): string {
  if (DEMO_MODE) {
    return 'Modo demo local: configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para multijugador real.';
  }
  return 'Conectado a Supabase.';
}
