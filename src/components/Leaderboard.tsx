import { Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '../types';
import { Ship } from './Ship';

export function Leaderboard({ entries, highlightId, compact }: { entries: LeaderboardEntry[]; highlightId?: string; compact?: boolean }) {
  if (entries.length === 0) return <p className="hint">Aún no hay equipos.</p>;
  const list = compact ? entries.slice(0, 5) : entries;
  return (
    <div className="table-wrap">
      <table className="table" aria-label="Clasificación">
        <thead>
          <tr><th>#</th><th>Equipo</th><th>Pts</th><th>✓</th></tr>
        </thead>
        <tbody>
          {list.map((e, i) => (
            <tr key={e.teamId} style={e.teamId === highlightId ? { background: 'rgba(232,176,159,.12)' } : undefined}>
              <td>{i === 0 ? <Trophy size={16} color="#e8b09f" /> : i + 1}</td>
              <td>
                <span className="row" style={{ gap: 6 }}>
                  <Ship color={e.shipColor} size={22} />
                  {e.teamName}
                </span>
              </td>
              <td><strong>{e.score}</strong></td>
              <td>{e.correctCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
