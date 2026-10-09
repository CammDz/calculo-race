import { Link } from 'react-router-dom';
import { Play, GraduationCap, Users, Clock3, ShieldCheck, Zap } from 'lucide-react';
import { Ship, Planet } from '../components/Ship';

export function HomePage() {
  return (
    <div className="grid">
      <section className="card hero">
        <div className="row center" style={{ justifyContent: 'center' }}>
          <Ship color="#e8b09f" size={72} />
          <Planet size={72} />
          <Ship color="#38bdf8" size={72} />
        </div>
        <h1>Cálculo <span>Race</span></h1>
        <p><strong style={{ color: 'var(--text)' }}>Resuelve, avanza y conquista la carrera.</strong></p>
        <p>Carrera matemática multijugador de 6 a 10 equipos: límites, polares, L&apos;Hôpital y un problema final. 15 minutos, una nave por equipo.</p>
        <div className="grid two mt">
          <Link to="/unirse" className="btn" aria-label="Ingresar a una partida"><Play size={20} /> Ingresar a una partida</Link>
          <Link to="/admin" className="btn secondary" aria-label="Acceso del profesor"><GraduationCap size={20} /> Soy profesor</Link>
        </div>
        <p className="hint">Prueba rápida sin cuenta: usa el código <strong>DEMO01</strong> para entrar como equipo.</p>
      </section>

      <section className="grid two">
        <div className="card">
          <h3><Users size={18} /> Para estudiantes</h3>
          <p>Ingresa con el código de sala, nombra tu equipo, elige tu nave y responde 4 opciones contra el cronómetro. Sin crear cuenta.</p>
        </div>
        <div className="card">
          <h3><Clock3 size={18} /> Partida de 15:00</h3>
          <p>Min 0–1 preparación · 1–3 despegue · 3–6 polares · 6–9 L&apos;Hôpital · 9–13 problema final · 13–15 podio.</p>
        </div>
        <div className="card">
          <h3><Zap size={18} /> Puntos justos</h3>
          <p>100/150/200/300 por nivel + hasta 20 de bonificación por rapidez. El servidor valida; el cliente nunca se auto-asigna puntos.</p>
        </div>
        <div className="card">
          <h3><ShieldCheck size={18} /> Juego limpio</h3>
          <p>Una respuesta por pregunta, cronómetro de servidor, anti-duplicados y políticas de seguridad por rol.</p>
        </div>
      </section>
    </div>
  );
}
