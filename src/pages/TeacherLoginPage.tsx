import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { DEMO_MODE } from '../lib/supabase';

export function TeacherLoginPage() {
  const { signIn } = useTeacherAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await signIn(email.trim(), password);
    setBusy(false);
    if (err) { setError(err); return; }
    navigate('/admin/panel');
  }

  return (
    <section className="card">
      <h2>Acceso del profesor</h2>
      <p>Sesión segura con Supabase Auth. Los estudiantes nunca usan esta pantalla.</p>
      {DEMO_MODE && <div className="badge">MODO DEMO: acepta cualquier correo y clave de 4+ caracteres</div>}
      <form onSubmit={onSubmit} className="mt">
        <div className="field">
          <label htmlFor="email">Correo institucional</label>
          <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="profe@colegio.edu" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="pass">Contraseña</label>
          <input id="pass" className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn mt" disabled={busy} type="submit"><LogIn size={18} /> {busy ? 'Verificando…' : 'Iniciar sesión'}</button>
      </form>
      <p className="hint">¿Primera vez? Crea el usuario en Supabase → Authentication → Users (ver README). <Link to="/">Volver</Link></p>
    </section>
  );
}
