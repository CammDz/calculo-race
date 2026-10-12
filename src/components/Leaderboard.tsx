import { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import type { LeaderboardEntry } from '../types';
import { Ship } from './Ship';

/** Clasificación compacta: en móvil muestra top 3 + equipo actual (datos reales
 *  del servidor). Permite expandir a la tabla completa. */
export function Leaderboard({ entries, highlightId, compact }: { entries: LeaderboardEntry[]; highlightId?: string; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (entries.length === 0) return <p className="hint">Aún no hay equipos.</p>;
  const myIndex = highlightId ? entries.findIndex((e) => e.teamId === highlightId) : -1;
  let list = entries;
  if (compact && !expanded) {
    const top = entries.slice(0, 3);
    if (myIndex >= 3) {
      list = [...top, entries[myIndex]];
    } else {
      list = top;
    }
  }
  const showToggle = !!compact && entries.length > 3;
  return (
    <div className="table-wrap">
      <table className="table leaderboard" aria-label="Clasificación">
        <thead>
          <tr><th>#</th><th>Equipo</th><th>Pts</th><th>✓</th></tr>
        </thead>
        <tbody>
          {list.map((e) => {
            const pos = entries.findIndex((x) => x.teamId === e.teamId);
            return (
              <tr key={e.teamId} className={e.teamId === highlightId ? 'me' : pos === 0 ? 'first' : undefined}>
                <td>{pos === 0 ? <Trophy size={16} color="#e8b09f" aria-label="Primer puesto" /> : pos + 1}</td>
                <td>
                  <span className="row" style={{ gap: 6 }}>
                    <Ship color={e.shipColor} size={22} />
                    <span className="lb-name">{e.teamName}</span>
                    {e.teamId === highlightId && myIndex >= 3 && !expanded && <span className="badge">tú</span>}
                  </span>
                </td>
                <td><strong>{e.score}</strong></td>
                <td>{e.correctCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {showToggle && (
        <button className="btn ghost small mt" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded ? 'Ver menos' : `Ver clasificación completa (${entries.length})`}
        </button>
      )}
    </div>
  );
}
