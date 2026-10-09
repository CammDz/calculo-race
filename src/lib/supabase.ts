// Cliente Supabase (backend único y obligatorio).
// Sin VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY la app muestra un error
// claro de configuración en lugar de arrancar en un modo degradado.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const MISSING =
  !url || url.includes('tu-proyecto') || url.trim() === '' ||
  !anonKey || anonKey.includes('ficticia') || anonKey.trim() === '';

export function isBackendConfigured(): boolean {
  return !MISSING;
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (MISSING) return null;
  if (client) return client;
  client = createClient(url as string, anonKey as string, {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
}

/** Obtiene el cliente o lanza un error legible para el usuario final. */
export function requireSupabase(): SupabaseClient {
  const sb = getSupabase();
  if (!sb) throw new Error('Servicio no disponible. Intenta de nuevo en unos minutos.');
  return sb;
}
