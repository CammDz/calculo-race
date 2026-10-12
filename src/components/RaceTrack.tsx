import { useMemo } from 'react';
import { shipProgress } from '../lib/gameLogic';
import type { Team } from '../types';
import { Ship } from './Ship';

/** Una sola línea de meta compartida: todas las naves avanzan según los puntos
 *  reales del servidor. Anónima para estudiantes: sin nombres ni puntos, solo
 *  las naves con sus colores (la propia marcada con "TÚ"). */
export function RaceTrack({ teams, highlightId }: { teams: Team[]; highlightId?: string | null }) {
  const sorted = useMemo(
    () =>
      [...teams].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        return a.name.localeCompare(b.name, 'es');
      }),
    [teams],
  );
  const max = Math.max(1, ...teams.map((t) => t.score));
  const myIndex = highlightId ? sorted.findIndex((t) => t.id === highlightId) : -1;
  if (teams.length === 0) return <p className="hint">Aún no hay naves en la pista.</p>;
  const label = myIndex >= 0
    ? `Pista hacia la meta con ${teams.length} naves. Vas en el puesto ${myIndex + 1} de ${teams.length}.`
    : `Pista hacia la meta con ${teams.length} naves.`;
  return (
    <div className="meta-track" role="img" aria-label={label}>
      <span className="meta-start" aria-hidden="true">SALIDA</span>
      <span className="meta-flag" aria-hidden="true">🏁</span>
      {sorted.map((t, i) => {
        const mine = t.id === highlightId;
        // Horizontal = puntos; vertical = reparto por orden para que ninguna
        // nave tape a otra (todas los colores siempre visibles).
        const top = sorted.length === 1 ? 50 : 10 + (i / (sorted.length - 1)) * 80;
        return (
          <span
            key={t.id}
            className={`meta-ship ${mine ? 'me' : ''}`}
            style={{ left: `${6 + shipProgress(t.score, max) * 86}%`, top: `${top}%` }}
          >
            <Ship color={t.shipColor} size={mine ? 38 : 30} boost={mine} />
            {mine && <span className="meta-you">TÚ</span>}
          </span>
        );
      })}
    </div>
  );
}
