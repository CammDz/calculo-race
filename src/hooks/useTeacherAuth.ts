import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';

export interface TeacherUser {
  id: string;
  email: string;
}

/** Auth del profesor con Supabase Auth. */
export function useTeacherAuth() {
  const [user, setUser] = useState<TeacherUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? '' } : null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? '' } : null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  async function signIn(email: string, password: string): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return 'Servicio no disponible. Intenta de nuevo en unos minutos.';
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? 'Credenciales inválidas o cuenta inexistente.' : null;
  }

  async function signOut(): Promise<void> {
    const sb = getSupabase();
    if (!sb) {
      setUser(null);
      return;
    }
    await sb.auth.signOut();
    setUser(null);
  }

  return { user, loading, signIn, signOut };
}
