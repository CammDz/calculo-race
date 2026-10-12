import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Send, Rocket, Timer as TimerIcon } from 'lucide-react';
import { useLiveGame, useMyAnswer, useServerClock } from '../hooks/useLiveGame';
import { ConnectionBadge } from '../components/Hud';
import { PolarPlot } from '../components/PolarPlot';
import { Ship, SpaceBackdrop } from '../components/Ship';
import { RaceTrack } from '../components/RaceTrack';
import { submitAnswer, QUESTION_WINDOW_MS } from '../services/gameService';
import { matchRemaining, secondsRemainingInPhase, LEVELS, formatClock } from '../lib/gameLogic';
import { loadTeam } from '../lib/utils';
import { QUESTIONS, questionsByLevel } from '../data/questions';

type OptState = 'normal' | 'selected' | 'sending' | 'registered' | 'correct' | 'incorrect' | 'closed';

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
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [celebrate, setCelebrate] = useState(false);
  const [showPoints, setShowPoints] = useState<number | null>(null);
  const openedAtRef = useRef<number>(Date.now());
  const prevRank = useRef<number | null>(null);
  const [rankUp, setRankUp] = useState(false);
  const q = live.question;

  const myAnswer = useMyAnswer(gameId, teamId, q?.id ?? null);
  const myTeam = live.teams.find((t) => t.id === teamId);
  const myRank = useMemo(() => {
    if (!teamId) return null;
    const i = live.leaderboard.findIndex((e) => e.teamId === teamId);
    return i >= 0 ? i + 1 : null;
  }, [live.leaderboard, teamId]);

  useEffect(() => {
    setSelected(null);
    setFeedback(null);
    setCelebrate(false);
    setShowPoints(null);
    openedAtRef.current = Date.now();
  }, [q?.id]);

  useEffect(() => {
    if (live.game?.status === 'podium' || live.game?.status === 'finished') {
      navigate(`/podio/${gameId}`, { replace: true });
    }
  }, [live.game?.status, gameId, navigate]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Celebración al acertar (resultado REAL del servidor) + puntos ganados.
  useEffect(() => {
    if (myAnswer?.isCorrect) {
      setCelebrate(true);
      setShowPoints(myAnswer.pointsAwarded);
      const t = window.setTimeout(() => setCelebrate(false), 2600);
      return () => window.clearTimeout(t);
    }
  }, [myAnswer?.isCorrect, myAnswer?.pointsAwarded, q?.id]);

  // Aviso al subir de posición (datos reales del servidor).
  useEffect(() => {
    if (myRank == null) return;
    if (prevRank.current != null && myRank < prevRank.current) {
      setRankUp(true);
      const t = window.setTimeout(() => setRankUp(false), 2600);
      prevRank.current = myRank;
      return () => window.clearTimeout(t);
    }
    prevRank.current = myRank;
  }, [myRank]);

  const closesInSec = useMemo(() => {
    if (!live.game?.questionClosesAt) return QUESTION_WINDOW_MS / 1000;
    return Math.max(0, (Date.parse(live.game.questionClosesAt) - serverNow) / 1000);
  }, [live.game?.questionClosesAt, serverNow]);

  const closed = closesInSec <= 0 || !!myAnswer;
  const levelName = useMemo(() => LEVELS.find((l) => `level_${l.level}` === phase)?.name ?? phase, [phase]);
  const qNumber = useMemo(() => {
    if (!q) return null;
    const pool = questionsByLevel(q.level);
    const idx = pool.findIndex((x) => x.id === q.id);
    const fallback = QUESTIONS.findIndex((x) => x.id === q.id);
    return (idx >= 0 ? idx : fallback) + 1;
  }, [q]);

  async function send() {
    if (!selected || !teamId || !q || !live.game || sending || myAnswer) return;
    setSending(true);
    try {
      const responseTimeMs = Date.now() - openedAtRef.current;
      // Se envía el IDENTIFICADOR estable (A/B/C/D); el servidor valida y puntúa.
      const res = await submitAnswer({ gameId: live.game.id, teamId, questionId: q.id, selectedOptionId: selected, responseTimeMs });
      // El frontend muestra el resultado DEVUELTO por el servidor, sin recalcular.
      setFeedback(res.correct ? `¡Correcto! +${res.points} pts` : 'Respuesta registrada. Revisa la explicación cuando el profesor la habilite.');
      live.reload();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'No se pudo enviar.');
    } finally {
      setSending(false);
    }
  }

  function optState(opId: string): OptState {
    if (myAnswer) {
      if (myAnswer.selectedOptionId === opId) return myAnswer.isCorrect ? 'correct' : 'incorrect';
      return 'closed';
    }
    if (sending && selected === opId) return 'sending';
    if (selected === opId) return 'selected';
    if (closed) return 'closed';
    return 'normal';
  }

  if (live.loading) return <section className="card"><p>Cargando carrera…</p></section>;
  if (live.error || !live.game) return <section className="card"><div className="error">{live.error ?? 'Partida no encontrada.'}</div></section>;
  if (!teamId) return <section className="card"><div className="error">No se encontró tu equipo. Vuelve a ingresar con el código.</div></section>;

  return (
    <div className="race">
      <SpaceBackdrop />
      {/* Barra superior: logo, nivel, cronómetro, equipo, puntos, conexión */}
      <header className="race-topbar" role="banner">
        <span className="race-brand"><Rocket size={18} aria-hidden="true" /> Cálculo Race</span>
        <span className="badge blue race-level">{levelName}</span>
        <span className="race-clock" aria-live="polite"><TimerIcon size={16} aria-hidden="true" /> {formatClock(closesInSec)}</span>
        <span className="race-team">{myTeam?.name ?? 'Mi nave'}</span>
        <span className="badge race-score" aria-label="Puntuación acumulada">{myTeam?.score ?? 0} pts</span>
        <ConnectionBadge online={online} />
      </header>

      <div className="grid race-grid">
        <section className={`card q-card ${celebrate ? 'q-celebrate' : ''}`} aria-live="polite">
          <div className="row space-between">
            <span className="badge blue">{levelName}</span>
            {qNumber != null && q && <span className="hint">Pregunta {qNumber} · {q.topic} · {q.difficulty}</span>}
          </div>
          <div className="row space-between mt">
            <span className="hint">Fase {formatClock(secondsRemainingInPhase(elapsed))}</span>
            <span className="hint">Total {formatClock(matchRemaining(elapsed))}</span>
          </div>
          {q ? (
            <>
              <p className="question-text race-question">{q.statement}</p>
              {q.polarPlot && <PolarPlot kind={q.polarPlot.kind} label={q.polarPlot.label} />}
              <div className="q-timer" role="timer" aria-label={`Cierra en ${Math.ceil(closesInSec)} segundos`}>
                <div className="progress" aria-hidden="true">
                  <div style={{ width: `${Math.max(0, Math.min(100, (closesInSec / (QUESTION_WINDOW_MS / 1000)) * 100))}%` }} />
                </div>
              </div>
              <div className="options race-options" role="radiogroup" aria-label="Opciones de respuesta">
                {q.options.map((op) => {
                  const st = optState(op.id);
                  const isMine = myAnswer?.selectedOptionId === op.id;
                  return (
                    <button
                      key={op.id}
                      className={`option opt-${st} ${isMine && myAnswer?.isCorrect ? 'flash-correct' : ''} ${isMine && myAnswer && !myAnswer.isCorrect ? 'flash-wrong' : ''}`}
                      disabled={closed || sending}
                      onClick={() => setSelected(op.id)}
                      aria-pressed={selected === op.id}
                      aria-label={`Opción ${op.id}: ${op.text}`}
                    >
                      <span className="letter" aria-hidden="true">{op.id}</span>
                      <span className="opt-text">{op.text}</span>
                      {isMine && myAnswer?.isCorrect && <CheckCircle2 size={20} aria-label="Correcta" />}
                      {isMine && myAnswer && !myAnswer.isCorrect && <XCircle size={20} aria-label="Incorrecta" />}
                      {st === 'sending' && <span className="hint">Enviando…</span>}
                    </button>
                  );
                })}
              </div>
              <div className="row mt space-between">
                <span className="hint">Cierra en {Math.ceil(closesInSec)}s · una sola respuesta por pregunta</span>
              </div>
              {feedback && <div className={feedback.startsWith('¡Correcto') ? 'success mt' : 'error mt'} role="status">{feedback}</div>}
              {showPoints != null && myAnswer?.isCorrect && (
                <div className="points-pop" role="status" aria-label={`Ganaste ${showPoints} puntos`}>+{showPoints} pts</div>
              )}
              {myAnswer ? (
                <div className="success mt" role="status">
                  Respuesta registrada: {myAnswer.selectedOptionId} · {myAnswer.isCorrect ? `+${myAnswer.pointsAwarded} pts` : '0 pts'}
                  {live.game.showExplanations && q.explanation && <div className="hint" style={{ color: 'inherit' }}>Explicación: {q.explanation}</div>}
                </div>
              ) : (
                <button className="btn mt race-send" disabled={!selected || closed || sending} onClick={send}>
                  <Send size={18} /> {sending ? 'Enviando…' : closed ? 'Pregunta cerrada' : 'Enviar respuesta'}
                </button>
              )}
              {celebrate && <div className="particles" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>}
            </>
          ) : (
            <p className="mt">Esperando la siguiente pregunta del profesor…</p>
          )}
        </section>

        <section className="card ship-card">
          <div className="row space-between">
            <span className="row">{myTeam && <Ship color={myTeam.shipColor} size={38} boost={!!myAnswer?.isCorrect} />}<strong>{myTeam?.name ?? 'Mi nave'}</strong></span>
            <span className="badge">{myTeam?.score ?? 0} pts</span>
          </div>
          {rankUp && <div className="success mt rank-up" role="status">¡Subiste de posición! 🚀</div>}
          <h3 className="mt">Carrera hacia la meta 🏁</h3>
          <RaceTrack teams={live.teams} highlightId={teamId} />
          <p className="hint mt">Cada nave lleva el color de su equipo. La tuya dice TÚ.</p>
        </section>
      </div>
    </div>
  );
}
