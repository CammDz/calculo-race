import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Send } from 'lucide-react';
import { useLiveGame, useMyAnswer, useServerClock } from '../hooks/useLiveGame';
import { Clock, ConnectionBadge } from '../components/Hud';
import { Leaderboard } from '../components/Leaderboard';
import { PolarPlot } from '../components/PolarPlot';
import { Ship } from '../components/Ship';
import { submitAnswer, QUESTION_WINDOW_MS } from '../services/gameService';
import { matchRemaining, secondsRemainingInPhase, shipProgress, LEVELS } from '../lib/gameLogic';
import { loadTeam } from '../lib/utils';

export function RacePage() {
  const { gameId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const live = useLiveGame(gameId);
  const { serverNow, elapsed, phase } = useServerClock(live.game);
  const saved = loadTeam();
  const teamId = (location.state as { teamId?: string } | null)?.teamId ?? saved?.teamId ?? null;

  const [selected, setSelected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const openedAtRef = useRef<number>(Date.now());
  const q = live.question;

  const myAnswer = useMyAnswer(gameId, teamId, q?.id ?? null);
  const myTeam = live.teams.find((t) => t.id === teamId);

  useEffect(() => {
    setSelected(null);
    setFeedback(null);
    openedAtRef.current = Date.now();
  }, [q?.id]);

  useEffect(() => {
    if (live.game?.status === 'podium' || live.game?.status === 'finished') {
      navigate(`/podio/${gameId}`, { replace: true });
    }
  }, [live.game?.status, gameId, navigate]);

  const closesInSec = useMemo(() => {
    if (!live.game?.questionClosesAt) return QUESTION_WINDOW_MS / 1000;
    return Math.max(0, (Date.parse(live.game.questionClosesAt) - serverNow) / 1000);
  }, [live.game?.questionClosesAt, serverNow]);

  const closed = closesInSec <= 0 || !!myAnswer;
  const levelName = useMemo(() => LEVELS.find((l) => `level_${l.level}` === phase)?.name ?? phase, [phase]);

  async function send() {
    if (!selected || !teamId || !q || !live.game || sending || myAnswer) return;
    setSending(true);
    try {
      const responseTimeMs = Date.now() - openedAtRef.current;
      const res = await submitAnswer({ gameId: live.game.id, teamId, questionId: q.id, selectedOptionId: selected, responseTimeMs });
      setFeedback(res.correct ? `¡Correcto! +${res.points} pts` : 'Respuesta registrada. Revisa la explicación cuando el profesor la habilite.');
      live.reload();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'No se pudo enviar.');
    } finally {
      setSending(false);
    }
  }

  if (live.loading) return <section className="card"><p>Cargando carrera…</p></section>;
  if (live.error || !live.game) return <section className="card"><div className="error">{live.error ?? 'Partida no encontrada.'}</div></section>;
  if (!teamId) return <section className="card"><div className="error">No se encontró tu equipo. Vuelve a ingresar con el código.</div></section>;

  return (
    <div className="grid">
      <section className="card" aria-live="polite">
        <div className="row space-between">
          <span className="badge blue">{levelName}</span>
          <ConnectionBadge online />
        </div>
        <div className="row space-between mt">
          <Clock label="Fase" seconds={secondsRemainingInPhase(elapsed)} big />
          <Clock label="Total" seconds={matchRemaining(elapsed)} />
        </div>
        {q ? (
          <>
            <p className="hint">Ronda · {q.topic} · {q.difficulty}</p>
            <p className="question-text">{q.statement}</p>
            {q.polarPlot && <PolarPlot kind={q.polarPlot.kind} label={q.polarPlot.label} />}
            <div className="options" role="radiogroup" aria-label="Opciones de respuesta">
              {q.options.map((op) => {
                const isMine = myAnswer?.selectedOptionId === op.id;
                return (
                  <button
                    key={op.id}
                    className={`option ${selected === op.id ? 'selected' : ''} ${isMine ? (myAnswer?.isCorrect ? 'correct flash-correct' : 'wrong flash-wrong') : ''}`}
                    disabled={closed || sending}
                    onClick={() => setSelected(op.id)}
                    aria-pressed={selected === op.id}
                  >
                    <span className="letter">{op.id}</span>
                    <span>{op.text}</span>
                    {isMine && (myAnswer?.isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />)}
                  </button>
                );
              })}
            </div>
            <div className="row mt space-between">
              <span className="hint">Cierra en {Math.ceil(closesInSec)}s · una sola respuesta por pregunta</span>
            </div>
            {feedback && <div className={feedback.startsWith('¡Correcto') ? 'success mt' : 'error mt'}>{feedback}</div>}
            {myAnswer ? (
              <div className="success mt">
                Respuesta enviada: {myAnswer.selectedOptionId} · {myAnswer.isCorrect ? `+${myAnswer.pointsAwarded} pts` : '0 pts'}
                {live.game.showExplanations && q.explanation && <div className="hint" style={{ color: 'inherit' }}>Explicación: {q.explanation}</div>}
              </div>
            ) : (
              <button className="btn mt" disabled={!selected || closed || sending} onClick={send}>
                <Send size={18} /> {sending ? 'Enviando…' : closed ? 'Pregunta cerrada' : 'Enviar respuesta'}
              </button>
            )}
          </>
        ) : (
          <p className="mt">Esperando la siguiente pregunta del profesor…</p>
        )}
      </section>

      <section className="card">
        <div className="row space-between">
          <span className="row">{myTeam && <Ship color={myTeam.shipColor} size={34} />}<strong>{myTeam?.name ?? 'Mi nave'}</strong></span>
          <span className="badge">{myTeam?.score ?? 0} pts</span>
        </div>
        <div className="mt" aria-label="Progreso de mi nave">
          <div className="track">
            <span className="ship-dot" style={{ left: `${8 + shipProgress(myTeam?.score ?? 0) * 84}%` }}>
              {myTeam && <Ship color={myTeam.shipColor} size={36} />}
            </span>
          </div>
        </div>
        <h3 className="mt">Clasificación en vivo</h3>
        <Leaderboard entries={live.leaderboard} highlightId={teamId} compact />
      </section>
    </div>
  );
}
