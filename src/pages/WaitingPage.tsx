import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Users, Flag } from 'lucide-react';
import { useLiveGame, useServerClock } from '../hooks/useLiveGame';
import { Clock, ConnectionBadge } from '../components/Hud';
import { Leaderboard } from '../components/Leaderboard';
import { RoomQr } from '../components/RoomQr';
import { Ship } from '../components/Ship';
import { secondsRemainingInPhase } from '../lib/gameLogic';
import { loadTeam } from '../lib/utils';
import { useNowMs } from '../hooks/useLiveGame';

export function WaitingPage() {
  const { gameId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const live = useLiveGame(gameId);
  const { elapsed, phase } = useServerClock(live.game);
  const online = useNowMs(2000) > 0; // indicador simple; realtime real en Supabase
  const saved = loadTeam();
  const myTeamId = (location.state as { teamId?: string } | null)?.teamId ?? saved?.teamId;

  useEffect(() => {
    if (!live.game) return;
    if (live.game.status !== 'lobby') {
      navigate(`/carrera/${live.game.id}`, { state: { teamId: myTeamId }, replace: true });
    }
    if (live.game.status === 'finished' || live.game.status === 'podium') {
      navigate(`/podio/${live.game.id}`, { replace: true });
    }
  }, [live.game, navigate, myTeamId]);

  if (live.loading) return <section className="card"><p>Cargando sala…</p></section>;
  if (live.error || !live.game) return <section className="card"><div className="error">{live.error ?? 'Sala no encontrada.'}</div></section>;

  const game = live.game;
  const myTeam = live.teams.find((t) => t.id === myTeamId);

  return (
    <div className="grid">
      <section className="card center">
        <div className="row space-between">
          <span className="badge blue">Sala {game.code}</span>
          <ConnectionBadge online={online} />
        </div>
        <h2 className="mt"><Flag size={20} /> Sala de espera</h2>
        <p>La carrera inicia solo cuando el profesor dé la largada. No recargues: tu lugar está guardado.</p>
        <div className="mt"><Clock label="Inicia en aprox." seconds={secondsRemainingInPhase(elapsed)} /></div>
        <div className="progress mt"><div style={{ width: `${Math.min(100, (elapsed / 60) * 100)}%` }} /></div>
        <div className="mt"><RoomQr code={game.code} /></div>
        {myTeam && <div className="row mt" style={{ justifyContent: 'center' }}><Ship color={myTeam.shipColor} size={40} /><strong>{myTeam.name}</strong></div>}
        <p className="hint">Fase actual: {phase} · Equipos {live.teams.length}/{game.maxTeams}</p>
      </section>
      <section className="card">
        <h3><Users size={18} /> Equipos conectados ({live.teams.length})</h3>
        <Leaderboard entries={live.leaderboard} highlightId={myTeamId ?? undefined} />
      </section>
    </div>
  );
}
