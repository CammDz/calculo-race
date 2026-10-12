import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Play, Pause, Square, SkipForward, Download, Eye, EyeOff, Zap } from 'lucide-react';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useLiveGame, useServerClock } from '../hooks/useLiveGame';
import { updateGame, adminGetQuestion } from '../services/gameService';
import { QUESTIONS, questionsByLevel } from '../data/questions';
import { Clock } from '../components/Hud';
import { Leaderboard } from '../components/Leaderboard';
import { RoomQr } from '../components/RoomQr';
import { PolarPlot } from '../components/PolarPlot';
import { matchRemaining, secondsRemainingInPhase, phaseForElapsed, levelForElapsed, formatClock, autoAdvanceStatus } from '../lib/gameLogic';
import { downloadCsv } from '../lib/utils';
import type { GameStatus, Question } from '../types';

/** Control de partida: iniciar/pausar/reanudar/finalizar/avanzar pregunta.
 *  Pausa: congela elapsedSec (documentado). El límite total de 15:00 de
 *  competencia NO incluye el tiempo pausado; al reanudar continúa desde el
 *  estado guardado usando marcas del servidor.
 *
 *  FUENTE DE VERDAD: la respuesta correcta mostrada viene de la BASE DE DATOS
 *  (adminGetQuestion), igual que la que valida el servidor. El banco local solo
 *  es respaldo si la BD no responde.
 */
export function TeacherControlPage() {
  const { gameId = '' } = useParams();
  const { user, loading: authLoading } = useTeacherAuth();
  const navigate = useNavigate();
  const live = useLiveGame(gameId);
  const { serverNow, elapsed } = useServerClock(live.game);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbQuestion, setDbQuestion] = useState<Question | null>(null);
  const autoTimer = useRef(0);

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin');
  }, [authLoading, user, navigate]);

  // Pregunta completa desde la BD (respuesta correcta real del sistema).
  useEffect(() => {
    const qid = live.game?.currentQuestionId ?? null;
    if (!qid) { setDbQuestion(null); return; }
    let cancelled = false;
    adminGetQuestion(qid).then((q) => { if (!cancelled) setDbQuestion(q); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [live.game?.currentQuestionId]);

  // Avance automático de fases por cronómetro oficial (profesor como árbitro).
  useEffect(() => {
    if (!live.game || busy) return;
    const expected = live.game.status === 'paused' || live.game.status === 'finished' ? null : phaseForElapsed(Math.min(elapsed, 900));
    if (expected && expected !== live.game.status && live.game.status !== 'paused') {
      const patch: Partial<typeof live.game> = { status: expected, elapsedSec: elapsed, currentLevel: levelForElapsed(Math.min(elapsed, 899)) };
      if (expected.startsWith('level_')) {
        const lvl = Number(expected.split('_')[1]);
        const pool = questionsByLevel(lvl as 1 | 2 | 3 | 4);
        const pick = pool[Math.floor(elapsed / 45) % pool.length];
        if (pick && live.game.currentQuestionId == null) {
          patch.currentQuestionId = pick.id;
          patch.questionOpenedAt = new Date(serverNow).toISOString();
          patch.questionClosesAt = new Date(serverNow + 60_000).toISOString();
        }
      }
      updateGame(live.game.id, patch).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  const answeredCount = useMemo(() => {
    if (!live.game?.currentQuestionId) return { ok: 0, total: live.teams.length, sent: 0 };
    const mine = live.answers.filter((a) => a.questionId === live.game?.currentQuestionId);
    return { ok: mine.filter((a) => a.isCorrect).length, total: live.teams.length, sent: mine.length };
  }, [live.answers, live.game?.currentQuestionId, live.teams.length]);

  // Progreso de avance automático: participantes = equipos presentes (el servidor
  // excluye además a los que se unieron después de abrir la pregunta).
  const advance = useMemo(() => {
    const qid = live.game?.currentQuestionId;
    if (!qid) return { answeredCount: 0, participantCount: live.teams.length, allAnswered: false };
    const answeredTeamIds = live.answers.filter((a) => a.questionId === qid).map((a) => a.teamId);
    return autoAdvanceStatus({
      autoAdvance: !!live.game?.autoAdvance,
      participantTeamIds: live.teams.map((t) => t.id),
      answeredTeamIds,
    });
  }, [live.game?.currentQuestionId, live.game?.autoAdvance, live.answers, live.teams]);

  // La correcta REAL es la de la BD; el banco local solo respalda sin conexión.
  const localCorrect = QUESTIONS.find((x) => x.id === live.question?.id)?.correctOptionId ?? '';
  const correctId = dbQuestion?.correctOptionId ?? localCorrect;
  const bankMismatch = !!dbQuestion && !!localCorrect && dbQuestion.correctOptionId !== localCorrect;

  /** Respuesta de cada equipo a la pregunta actual, ordenada por nombre. */
  const teamAnswers = useMemo(() => {
    const qid = live.game?.currentQuestionId;
    return [...live.teams]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .map((t) => ({
        team: t,
        answer: qid ? live.answers.find((x) => x.questionId === qid && x.teamId === t.id) ?? null : null,
      }));
  }, [live.teams, live.answers, live.game?.currentQuestionId]);

  /** Conteo de votos por opción + sin responder. */
  const votes = useMemo(() => {
    const v: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, none: 0 };
    for (const r of teamAnswers) {
      if (!r.answer) v.none += 1;
      else if (r.answer.selectedOptionId in v) v[r.answer.selectedOptionId] += 1;
    }
    return v;
  }, [teamAnswers]);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      live.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Acción no completada.');
    } finally {
      setBusy(null);
    }
  }

  const doNextQuestion = (g: NonNullable<typeof live.game>) => {
    const lvl = levelForElapsed(Math.min(elapsed, 899));
    const pool = questionsByLevel(lvl);
    const idx = pool.findIndex((q) => q.id === g.currentQuestionId);
    const next = pool[(idx + 1) % pool.length] ?? QUESTIONS[0];
    return updateGame(g.id, {
      currentLevel: lvl,
      currentQuestionId: next.id,
      questionOpenedAt: new Date().toISOString(),
      questionClosesAt: new Date(Date.now() + 60_000).toISOString(),
    });
  };

  // Respaldo en cliente del avance automático: el SERVIDOR (Edge Function) es la
  // autoridad y normalmente ya avanzó; este temporizador solo cubre el modo
  // local sin función desplegada. Es idempotente por pregunta (ref por qid).
  const advancedFor = useRef<string | null>(null);
  useEffect(() => {
    const g = live.game;
    if (!g?.autoAdvance || !advance.allAnswered || !g.currentQuestionId) return;
    if (advancedFor.current === g.currentQuestionId) return;
    const delayMs = Math.max(1, Math.min(10, g.autoAdvanceDelaySec ?? 2)) * 1000;
    window.clearTimeout(autoTimer.current);
    autoTimer.current = window.setTimeout(() => {
      if (advancedFor.current === g.currentQuestionId) return;
      advancedFor.current = g.currentQuestionId;
      doNextQuestion(g).then(() => live.reload()).catch(() => { advancedFor.current = null; });
    }, delayMs);
    return () => window.clearTimeout(autoTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance.allAnswered, live.game?.currentQuestionId, live.game?.autoAdvance]);

  useEffect(() => {
    advancedFor.current = null;
  }, [live.game?.currentQuestionId]);

  if (authLoading || live.loading) return <section className="card"><p>Cargando control…</p></section>;
  if (!live.game) return <section className="card"><div className="error">{live.error ?? 'Partida no encontrada.'}</div></section>;
  const g = live.game;

  const startRace = () =>
    act('iniciar', () =>
      updateGame(g.id, {
        status: 'level_1', elapsedSec: 60, serverStartedAt: new Date().toISOString(),
        currentLevel: 1,
        currentQuestionId: questionsByLevel(1)[0]?.id ?? null,
        questionOpenedAt: new Date().toISOString(),
        questionClosesAt: new Date(Date.now() + 60_000).toISOString(),
      }),
    );

  const pause = () =>
    act('pausar', () => updateGame(g.id, { status: 'paused' as GameStatus, elapsedSec: elapsed, serverStartedAt: null }));

  const resume = () =>
    act('reanudar', () => {
      const ph = phaseForElapsed(Math.min(elapsed, 899));
      return updateGame(g.id, { status: ph, serverStartedAt: new Date().toISOString() });
    });

  const finish = () =>
    act('finalizar', () => updateGame(g.id, { status: 'finished', elapsedSec: 900, serverStartedAt: null, questionClosesAt: new Date().toISOString() }));

  const nextQuestion = () =>
    act('siguiente', () => doNextQuestion(g));

  const toggleExp = () => act('explicaciones', () => updateGame(g.id, { showExplanations: !g.showExplanations }));
  const toggleAuto = () => act('autoavance', () => updateGame(g.id, { autoAdvance: !g.autoAdvance }));
  const changeDelay = (v: number) =>
    act('retardo', () => updateGame(g.id, { autoAdvanceDelaySec: Math.max(1, Math.min(10, Math.round(v) || 2)) }));

  return (
    <div className="grid">
      <section className="card">
        <div className="row space-between">
          <span className="badge blue">Sala {g.code} · {g.status}</span>
          <Link className="btn ghost small" to="/admin/panel">Volver</Link>
        </div>
        <div className="row mt space-between">
          <Clock label="Fase" seconds={secondsRemainingInPhase(elapsed)} big />
          <Clock label="Total" seconds={matchRemaining(elapsed)} />
        </div>
        <p className="hint">Transcurridos {formatClock(elapsed)} / 15:00 · Nivel {g.currentLevel} · Equipos {live.teams.length}/{g.maxTeams} · Respuestas {answeredCount.sent ?? 0}/{answeredCount.total} ({answeredCount.ok} ✓)</p>
        {error && <div className="error">{error}</div>}
        <div className="grid two mt">
          <button className="btn small" disabled={!!busy} onClick={startRace}><Play size={16} /> {busy === 'iniciar' ? '…' : 'Iniciar carrera'}</button>
          <button className="btn secondary small" disabled={!!busy} onClick={pause}><Pause size={16} /> {busy === 'pausar' ? '…' : 'Pausar'}</button>
          <button className="btn secondary small" disabled={!!busy} onClick={resume}><Play size={16} /> {busy === 'reanudar' ? '…' : 'Reanudar'}</button>
          <button className="btn secondary small" disabled={!!busy} onClick={nextQuestion}><SkipForward size={16} /> {busy === 'siguiente' ? '…' : 'Siguiente pregunta'}</button>
          <button className="btn ghost small" disabled={!!busy} onClick={toggleExp}>{g.showExplanations ? <EyeOff size={16} /> : <Eye size={16} />} Explicaciones: {g.showExplanations ? 'ON' : 'OFF'}</button>
          <button className="btn danger small" disabled={!!busy} onClick={finish}><Square size={16} /> {busy === 'finalizar' ? '…' : 'Finalizar'}</button>
        </div>
        <div className="auto-advance mt" role="group" aria-label="Avance automático">
          <label className="row" style={{ cursor: 'pointer' }}>
            <button
              type="button"
              role="switch"
              aria-checked={!!g.autoAdvance}
              aria-label="Avanzar automáticamente cuando todos respondan"
              className={`switch ${g.autoAdvance ? 'on' : ''}`}
              disabled={!!busy}
              onClick={toggleAuto}
            >
              <span className="knob" />
            </button>
            <span><Zap size={16} /> <strong>Avanzar automáticamente cuando todos respondan</strong></span>
          </label>
          <div className="row mt">
            <label htmlFor="auto-delay">Pausa tras cerrar (s):</label>
            <input
              id="auto-delay"
              className="input"
              type="number"
              min={1}
              max={10}
              value={g.autoAdvanceDelaySec ?? 2}
              disabled={!!busy || !g.autoAdvance}
              onChange={(e) => changeDelay(Number(e.target.value))}
              style={{ maxWidth: 90 }}
            />
            <span className="hint">Muestra el resultado {g.autoAdvanceDelaySec ?? 2} s y publica la siguiente.</span>
          </div>
          {g.currentQuestionId && (
            <p className="hint" aria-live="polite">
              Respuestas recibidas: {advance.answeredCount} de {advance.participantCount}
              {advance.allAnswered && g.autoAdvance ? ' · ¡Todos respondieron! Preparando la siguiente pregunta…' : ''}
              {!g.autoAdvance ? ' · (avance manual o por tiempo)' : ''}
            </p>
          )}
        </div>
        <div className="mt"><RoomQr code={g.code} size={140} /></div>
      </section>

      <section className="card">
        <h3>Pregunta actual {g.currentQuestionId ? `(${g.currentQuestionId})` : ''}</h3>
        {live.question ? (
          <>
            <p className="question-text">{live.question.statement}</p>
            {live.question.polarPlot && <PolarPlot kind={live.question.polarPlot.kind} label={live.question.polarPlot.label} />}
            <ul>
              {(dbQuestion?.options ?? live.question.options).map((o) => (
                <li key={o.id} style={{ color: o.id === correctId ? 'var(--green)' : 'var(--muted)' }}>
                  {o.id}. {o.text} {o.id === correctId ? '✓' : ''}
                </li>
              ))}
            </ul>
            <p className="hint">Correcta real (BD): {correctId || '—'} · Correctas/incorrectas en vivo: {answeredCount.ok} ✓ / {(answeredCount.sent ?? 0) - answeredCount.ok} ✗ de {answeredCount.sent} enviadas.</p>
            {bankMismatch && (
              <p className="error">El banco local dice {localCorrect} pero la BD dice {dbQuestion?.correctOptionId}. Se muestra la BD (autoridad). Resincroniza src/data/questions.ts.</p>
            )}
          </>
        ) : <p className="hint">Sin pregunta publicada.</p>}
      </section>

      <section className="card">
        <div className="row space-between">
          <h3>Respuestas por equipo {g.currentQuestionId ? `(${g.currentQuestionId} · correcta: ${correctId})` : ''}</h3>
          <button
            className="btn secondary small"
            disabled={teamAnswers.length === 0}
            onClick={() => downloadCsv(
              `calculo-race-${g.code}-respuestas-${g.currentQuestionId ?? 'na'}.csv`,
              teamAnswers.map((r) => ({
                equipo: r.team.name,
                pregunta: g.currentQuestionId ?? '',
                marcada: r.answer?.selectedOptionId ?? 'sin respuesta',
                correcta: r.answer ? (r.answer.isCorrect ? 'sí' : 'no') : '',
                puntos: r.answer?.pointsAwarded ?? 0,
                tiempo_ms: r.answer?.responseTimeMs ?? '',
              })),
            )}
          >
            <Download size={16} /> CSV respuestas
          </button>
        </div>
        <div className="row mt" aria-label="Votos por opción">
          {(['A', 'B', 'C', 'D'] as const).map((o) => (
            <span key={o} className="badge blue" style={o === correctId ? { borderColor: 'var(--green)', color: '#b8f4dc' } : undefined}>
              {o}: {votes[o]}{o === correctId ? ' ✓' : ''}
            </span>
          ))}
          <span className="badge">Sin responder: {votes.none}</span>
        </div>
        {teamAnswers.length === 0 ? <p className="hint mt">Aún no hay equipos.</p> : (
          <div className="table-wrap mt">
            <table className="table" aria-label="Respuestas por equipo">
              <thead><tr><th>Equipo</th><th>Marcó</th><th>Estado</th><th>Pts</th><th>Tiempo</th></tr></thead>
              <tbody>
                {teamAnswers.map((r) => (
                  <tr key={r.team.id}>
                    <td>
                      <span className="row" style={{ gap: 6 }}>
                        <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 6, background: r.team.shipColor, display: 'inline-block' }} />
                        {r.team.name}
                      </span>
                    </td>
                    <td><strong>{r.answer?.selectedOptionId ?? '—'}</strong></td>
                    <td>
                      {!r.answer ? <span className="hint">sin respuesta</span>
                        : r.answer.isCorrect ? <span style={{ color: 'var(--green)', fontWeight: 800 }}>✓ correcta</span>
                        : <span style={{ color: '#ffc9c9', fontWeight: 800 }}>✗ incorrecta</span>}
                    </td>
                    <td>{r.answer?.pointsAwarded ?? 0}</td>
                    <td>{r.answer ? `${(r.answer.responseTimeMs / 1000).toFixed(1)}s` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="row space-between">
          <h3>Tabla en vivo</h3>
          <button className="btn secondary small" onClick={() => downloadCsv(`calculo-race-${g.code}.csv`, live.leaderboard.map((e, i) => ({ puesto: i + 1, equipo: e.teamName, puntos: e.score, correctas: e.correctCount, tiempo_ms: e.totalResponseTimeMs })))}><Download size={16} /> CSV</button>
        </div>
        <Leaderboard entries={live.leaderboard} />
      </section>
    </div>
  );
}
