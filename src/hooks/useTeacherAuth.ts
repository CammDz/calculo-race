import { useEffect, useState } from 'react';
import { getSupabase, DEMO_MODE } from '../lib/supabase';

export interface TeacherUser {
  id: string;
  email: string;
}

/** Auth del profesor con Supabase Auth; en demo local usa sesión ficticia claramente marcada. */
export function useTeacherAuth() {
  const [user, setUser] = useState<TeacherUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      try {
        const raw = localStorage.getItem('cr-teacher');
        setUser(raw ? (JSON.parse(raw) as TeacherUser) : null);
      } catch {
        setUser(null);
      }
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
    if (!sb) {
      if (!email.includes('@') || password.length < 4) return 'Revisa tu correo y contraseña.';
      const demo = { id: 'demo-teacher', email };
      localStorage.setItem('cr-teacher', JSON.stringify(demo));
      setUser(demo);
      return null;
    }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? 'Credenciales inválidas o cuenta inexistente.' : null;
  }

  async function signOut(): Promise<void> {
    const sb = getSupabase();
    if (!sb) {
      localStorage.removeItem('cr-teacher');
      setUser(null);
      return;
    }
    await sb.auth.signOut();
    setUser(null);
  }

  return { user, loading, signIn, signOut, demoMode: DEMO_MODE };
}
