import { Link, useParams } from 'react-router-dom';
import { Trophy, Medal, Home } from 'lucide-react';
import { useLiveGame } from '../hooks/useLiveGame';
import { Ship } from '../components/Ship';

export function PodiumPage() {
  const { gameId = '' } = useParams();
  const live = useLiveGame(gameId);

  if (live.loading) return <section className="card"><p>Calculando resultados…</p></section>;
  if (live.error || !live.game) return <section className="card"><div className="error">{live.error ?? 'Partida no encontrada.'}</div></section>;

  const [first, second, third, ...rest] = live.leaderboard;
  const winner = first;

  return (
    <div className="grid">
      <section className="card center">
        <Trophy size={40} color="#e8b09f" />
        <h2>Podio final · Sala {live.game.code}</h2>
        {winner ? <p><strong style={{ color: 'var(--text)' }}>¡{winner.teamName} conquista la carrera con {winner.score} pts!</strong></p> : <p>Aún no hay resultados.</p>}
        <div className="grid two mt">
          {second && <div className="podium-2"><Medal size={22} /><div><strong>2.º {second.teamName}</strong></div><div>{second.score} pts · {second.correctCount} ✓</div><Ship color={second.shipColor} size={40} /></div>}
          {first && <div className="podium-1"><Trophy size={24} /><div><strong>1.º {first.teamName}</strong></div><div>{first.score} pts · {first.correctCount} ✓</div><Ship color={first.shipColor} size={48} /></div>}
          {third && <div className="podium-3"><Medal size={22} /><div><strong>3.º {third.teamName}</strong></div><div>{third.score} pts · {third.correctCount} ✓</div><Ship color={third.shipColor} size={40} /></div>}
        </div>
        {rest.length > 0 && (
          <div className="mt" style={{ textAlign: 'left' }}>
            <h3>Clasificación completa</h3>
            {rest.map((e, i) => (
              <div key={e.teamId} className="row space-between" style={{ padding: '6px 0', borderBottom: '1px solid rgba(148,163,255,.15)' }}>
                <span className="row"><Ship color={e.shipColor} size={24} />{i + 4}.º {e.teamName}</span>
                <span>{e.score} pts · {e.correctCount} ✓</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt center">
          <Link to="/" className="btn"><Home size={18} /> Volver al inicio</Link>
        </div>
      </section>
    </div>
  );
}
