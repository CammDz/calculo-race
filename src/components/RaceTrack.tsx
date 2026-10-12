import { useMemo } from 'react';
import { shipProgress } from '../lib/gameLogic';
import type { Team } from '../types';
import { Ship } from './Ship';

/** Pista de carrera hacia la meta: una calle por equipo con su nave avanzando
 *  según los puntos reales del servidor. El líder va más cerca de la 🏁. */
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
  if (teams.length === 0) return <p className="hint">Aún no hay naves en la pista.</p>;
  return (
    <div className="race-lanes" role="list" aria-label="Pista de carrera hacia la meta">
      {sorted.map((t, i) => (
        <div key={t.id} role="listitem" aria-label={`${i + 1}.º ${t.name} con ${t.score} puntos`} className={`lane ${t.id === highlightId ? 'me' : ''}`}>
          <div className="lane-head">
            <span className="lane-pos" aria-hidden="true">{i + 1}.</span>
            <span className="lane-name">{t.name}</span>
            <span className="badge lane-score">{t.score} pts</span>
          </div>
          <div className="lane-track track">
            <span className="track-flag" aria-hidden="true">🏁</span>
            <span className="ship-dot" style={{ left: `${8 + shipProgress(t.score, max) * 84}%` }}>
              <Ship color={t.shipColor} size={30} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
