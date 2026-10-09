import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { DEMO_MODE, envStatusMessage } from '../lib/supabase';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Cálculo Race inicio">
          <span aria-hidden="true" style={{ display: 'inline-flex', background: 'linear-gradient(135deg,#38bdf8,#a78bfa)', borderRadius: 12, padding: 8 }}>
            <Rocket size={20} color="#0a1030" />
          </span>
          <span>
            <span className="brand-name">Cálculo Race</span>
            <br />
            <span className="brand-motto">Resuelve, avanza y conquista la carrera</span>
          </span>
        </Link>
        <span className={`badge ${DEMO_MODE ? '' : 'green'}`} title={envStatusMessage()}>
          {DEMO_MODE ? 'MODO DEMO' : 'EN VIVO'}
        </span>
      </header>
      <main>{children}</main>
      <footer className="footer">
        Cálculo Race · Juego educativo de cálculo multivariable · 15:00 por partida
        {DEMO_MODE && <div className="stars-note">Demo local: los datos viven en tu navegador. Configura Supabase para multijugador real.</div>}
      </footer>
    </div>
  );
}
