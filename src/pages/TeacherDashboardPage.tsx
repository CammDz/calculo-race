import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, LogOut, History, PlayCircle, Copy } from 'lucide-react';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { createGame, listTeacherGames } from '../services/gameService';
import { parseTeamCount } from '../lib/gameLogic';
import type { Game, LevelNumber } from '../types';

export function TeacherDashboardPage() {
  const { user, loading, signOut } = useTeacherAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxTeamsText, setMaxTeamsText] = useState('8');
  const [points, setPoints] = useState<Record<LevelNumber, number>>({ 1: 100, 2: 150, 3: 200, 4: 300 });
  const [showExp, setShowExp] = useState(true);
  const [autoAdv, setAutoAdv] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/admin');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    listTeacherGames(user.id).then(setGames).catch(() => undefined);
    const t = window.setInterval(() => listTeacherGames(user.id).then(setGames).catch(() => undefined), 5000);
    return () => window.clearInterval(t);
  }, [user]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const maxTeams = parseTeamCount(maxTeamsText);
      if (maxTeams == null) {
        setError('El número de equipos debe ser un entero entre 2 y 10.');
        setBusy(false);
        return;
      }
      const g = await createGame({ maxTeams, points, showExplanations: showExp, teacherId: user.id, autoAdvance: autoAdv });
      navigate(`/admin/partida/${g.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la partida.');
    } finally {
      setBusy(false);
    }
  }

  /** Duplicar: nueva partida reutilizando la configuración de una anterior. */
  async function onDuplicate(g: Game) {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fresh = await createGame({
        maxTeams: g.maxTeams,
        points: { 1: g.pointsL1, 2: g.pointsL2, 3: g.pointsL3, 4: g.pointsL4 },
        showExplanations: g.showExplanations,
        teacherId: user.id,
        autoAdvance: g.autoAdvance,
        autoAdvanceDelaySec: g.autoAdvanceDelaySec,
      });
      navigate(`/admin/partida/${fresh.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo duplicar la partida.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="card"><p>Verificando sesión…</p></section>;
  if (!user) return null;

  return (
    <div className="grid">
      <section className="card">
        <div className="row space-between">
          <div><h2>Panel del profesor</h2><p className="hint">{user.email}</p></div>
          <button className="btn ghost small" onClick={() => signOut().then(() => navigate('/'))}><LogOut size={16} /> Salir</button>
        </div>
        <form onSubmit={onCreate} className="mt">
          <h3><Plus size={18} /> Nueva partida (2–10 equipos)</h3>
          <div className="field">
            <label htmlFor="max">Máximo de equipos (2–10)</label>
            <div className="row">
              <button
                type="button"
                className="btn secondary small stepper"
                aria-label="Quitar un equipo"
                disabled={busy || (parseTeamCount(maxTeamsText) ?? 8) <= 2}
                onClick={() => setMaxTeamsText(String((parseTeamCount(maxTeamsText) ?? 8) - 1))}
              >
                −
              </button>
              <input
                id="max"
                className="input stepper-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={maxTeamsText}
                placeholder="8"
                aria-describedby="max-hint"
                onChange={(e) => setMaxTeamsText(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                onBlur={() => {
                  // Al salir, si quedó vacío o fuera de rango, vuelve a 8.
                  if (parseTeamCount(maxTeamsText) == null && maxTeamsText.trim() !== '') {
                    setMaxTeamsText('8');
                  } else if (maxTeamsText.trim() === '') {
                    setMaxTeamsText('8');
                  }
                }}
              />
              <button
                type="button"
                className="btn secondary small stepper"
                aria-label="Agregar un equipo"
                disabled={busy || (parseTeamCount(maxTeamsText) ?? 8) >= 10}
                onClick={() => setMaxTeamsText(String((parseTeamCount(maxTeamsText) ?? 8) + 1))}
              >
                +
              </button>
            </div>
            <span className="hint" id="max-hint">Escribe 2, 3, 4… hasta 10, o usa −/+.</span>
          </div>
          <div className="grid two">
            {([1, 2, 3, 4] as LevelNumber[]).map((l) => (
              <div className="field" key={l}>
                <label htmlFor={`p${l}`}>Puntos nivel {l}</label>
                <input id={`p${l}`} className="input" type="number" min={0} max={1000} value={points[l]} onChange={(e) => setPoints({ ...points, [l]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <label className="row"><input type="checkbox" checked={showExp} onChange={(e) => setShowExp(e.target.checked)} /> Mostrar explicaciones a estudiantes</label>
          <label className="row"><input type="checkbox" checked={autoAdv} onChange={(e) => setAutoAdv(e.target.checked)} /> Avanzar automáticamente cuando todos respondan</label>
          {error && <div className="error mt">{error}</div>}
          <button className="btn mt" disabled={busy} type="submit"><PlayCircle size={18} /> {busy ? 'Creando…' : 'Crear partida y obtener código'}</button>
        </form>
      </section>

      <section className="card">
        <h3><History size={18} /> Historial de partidas</h3>
        {games.length === 0 ? <p className="hint">Aún no hay partidas.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Código</th><th>Estado</th><th>Nivel</th><th>Acción</th></tr></thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id}>
                    <td><strong>{g.code}</strong></td>
                    <td>{g.status}</td>
                    <td>{g.currentLevel}</td>
                    <td>
                      <span className="row">
                        <Link className="btn secondary small" to={`/admin/partida/${g.id}`}>Controlar</Link>
                        <button className="btn ghost small" disabled={busy} onClick={() => onDuplicate(g)} title="Crear una partida nueva con esta misma configuración">
                          <Copy size={14} /> Duplicar
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt"><Link className="btn ghost small" to="/admin/preguntas">Administrar banco de preguntas</Link></div>
      </section>
    </div>
  );
}
