import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Play, Pause, Square, SkipForward, Download, Eye, EyeOff } from 'lucide-react';
import { useTeacherAuth } from '../hooks/useTeacherAuth';
import { useLiveGame, useServerClock } from '../hooks/useLiveGame';
import { updateGame } from '../services/gameService';
import { QUESTIONS, questionsByLevel } from '../data/questions';
import { Clock } from '../components/Hud';
import { Leaderboard } from '../components/Leaderboard';
import { RoomQr } from '../components/RoomQr';
import { PolarPlot } from '../components/PolarPlot';
import { matchRemaining, secondsRemainingInPhase, phaseForElapsed, levelForElapsed, formatClock } from '../lib/gameLogic';
import { downloadCsv } from '../lib/utils';
import type { GameStatus } from '../types';

/** Control de partida: iniciar/pausar/reanudar/finalizar/avanzar pregunta.
 *  Pausa: congela elapsedSec (documentado). El límite total de 15:00 de
 *  competencia NO incluye el tiempo pausado; al reanudar continúa desde el
 *  estado guardado usando marcas del servidor.
 */
export function TeacherControlPage() {
  const { gameId = '' } = useParams();
  const { user, loading: authLoading } = useTeacherAuth();
  const navigate = useNavigate();
  const live = useLiveGame(gameId);
  const { serverNow, elapsed } = useServerClock(live.game);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin');
  }, [authLoading, user, navigate]);

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
    if (!live.game?.currentQuestionId) return { ok: 0, total: live.teams.length };
    const mine = live.answers.filter((a) => a.questionId === live.game?.currentQuestionId);
    return { ok: mine.filter((a) => a.isCorrect).length, total: live.teams.length, sent: mine.length };
  }, [live.answers, live.game?.currentQuestionId, live.teams.length]);

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
    act('siguiente', () => {
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
    });

  const toggleExp = () => act('explicaciones', () => updateGame(g.id, { showExplanations: !g.showExplanations }));

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
        <div className="mt"><RoomQr code={g.code} size={140} /></div>
      </section>

      <section className="card">
        <h3>Pregunta actual {g.currentQuestionId ? `(${g.currentQuestionId})` : ''}</h3>
        {live.question ? (
          <>
            <p className="question-text">{live.question.statement}</p>
            {live.question.polarPlot && <PolarPlot kind={live.question.polarPlot.kind} label={live.question.polarPlot.label} />}
            <ul>
              {live.question.options.map((o) => (
                <li key={o.id} style={{ color: o.id === (QUESTIONS.find((x) => x.id === live.question?.id)?.correctOptionId ?? '') ? 'var(--green)' : 'var(--muted)' }}>
                  {o.id}. {o.text} {o.id === (QUESTIONS.find((x) => x.id === live.question?.id)?.correctOptionId ?? '') ? '✓' : ''}
                </li>
              ))}
            </ul>
            <p className="hint">Correctas/incorrectas en vivo: {answeredCount.ok} ✓ / {(answeredCount.sent ?? 0) - answeredCount.ok} ✗ de {answeredCount.sent} enviadas.</p>
          </>
        ) : <p className="hint">Sin pregunta publicada.</p>}
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
