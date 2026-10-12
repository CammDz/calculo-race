import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';

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
      </header>
      <main>{children}</main>
      <footer className="footer">
        Calculo Race | C. Multivariable A251 | UTS
      </footer>
    </div>
  );
}
