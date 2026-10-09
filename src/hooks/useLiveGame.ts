import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, DEMO_MODE } from '../lib/supabase';
import { computeElapsedSec, phaseForElapsed } from '../lib/gameLogic';
import { getGameById, listTeams, buildLeaderboard, listAnswers, publicQuestion } from '../services/gameService';
import type { Answer, Game, LeaderboardEntry, Question, Team } from '../types';

/** Reloj oficial: usa marcas del servidor (serverStartedAt + elapsedSec base).
 *  En Supabase se corrige con el reloj de la BD; en demo con Date.now().
 */
export function useServerClock(game: Game | null) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [offsetMs, setOffsetMs] = useState(0);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !game) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await sb.rpc('server_now');
        if (!cancelled && data) {
          const serverMs = Date.parse(String(data));
          if (!Number.isNaN(serverMs)) setOffsetMs(serverMs - Date.now());
        }
      } catch { /* sin corrección, se usa reloj local solo para mostrar */ }
    })();
    return () => { cancelled = true; };
  }, [game?.id]);

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);

  const serverNow = nowMs + offsetMs;
  const elapsed = game ? computeElapsedSec(game.elapsedSec, game.serverStartedAt, DEMO_MODE ? nowMs : serverNow) : 0;
  const phase = phaseForElapsed(Math.min(elapsed, 900));
  return { serverNow, elapsed, phase };
}

export interface LiveState {
  game: Game | null;
  teams: Team[];
  leaderboard: LeaderboardEntry[];
  answers: Answer[];
  question: Question | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Suscripción en tiempo real a partida + equipos + respuestas, con recuperación desde BD. */
export function useLiveGame(gameId: string | null): LiveState {
  const [game, setGame] = useState<Game | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!gameId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [g, t, lb, a] = await Promise.all([
          getGameById(gameId), listTeams(gameId),
          buildLeaderboard(gameId), listAnswers(gameId),
        ]);
        if (cancelled) return;
        setGame(g); setTeams(t); setLeaderboard(lb); setAnswers(a);
        setQuestion(await publicQuestion(g?.currentQuestionId ?? null));
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error de conexión.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [gameId, tick]);

  // Realtime Supabase + eventos demo locales.
  useEffect(() => {
    if (!gameId) return;
    const sb = getSupabase();
    const onLocal = () => reload();
    window.addEventListener(`cr-change:game:${gameId}`, onLocal);
    window.addEventListener(`cr-change:teams:${gameId}`, onLocal);
    window.addEventListener(`cr-change:answers:${gameId}`, onLocal);
    window.addEventListener('cr-change:games', onLocal);
    if (!sb) return () => {
      window.removeEventListener(`cr-change:game:${gameId}`, onLocal);
      window.removeEventListener(`cr-change:teams:${gameId}`, onLocal);
      window.removeEventListener(`cr-change:answers:${gameId}`, onLocal);
      window.removeEventListener('cr-change:games', onLocal);
    };
    const ch = sb.channel(`game-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, onLocal)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` }, onLocal)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers', filter: `game_id=eq.${gameId}` }, onLocal)
      .subscribe();
    return () => {
      window.removeEventListener(`cr-change:game:${gameId}`, onLocal);
      window.removeEventListener(`cr-change:teams:${gameId}`, onLocal);
      window.removeEventListener(`cr-change:answers:${gameId}`, onLocal);
      window.removeEventListener('cr-change:games', onLocal);
      sb.removeChannel(ch);
    };
  }, [gameId, reload]);

  return { game, teams, leaderboard, answers, question, loading, error, reload };
}

/** Respuesta enviada por este equipo para la pregunta actual. */
export function useMyAnswer(gameId: string | null, teamId: string | null, questionId: string | null) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  useEffect(() => {
    if (!gameId || !teamId || !questionId) { setAnswer(null); return; }
    let cancelled = false;
    listAnswers(gameId).then((all) => {
      if (cancelled) return;
      setAnswer(all.find((a) => a.teamId === teamId && a.questionId === questionId) ?? null);
    }).catch(() => undefined);
    const onLocal = () => {
      listAnswers(gameId).then((all) => {
        if (cancelled) return;
        setAnswer(all.find((a) => a.teamId === teamId && a.questionId === questionId) ?? null);
      }).catch(() => undefined);
    };
    window.addEventListener(`cr-change:answers:${gameId}`, onLocal);
    return () => { cancelled = true; window.removeEventListener(`cr-change:answers:${gameId}`, onLocal); };
  }, [gameId, teamId, questionId]);
  return answer;
}

export function useNowMs(intervalMs = 500): number {
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(0);
  useEffect(() => {
    ref.current = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(ref.current);
  }, [intervalMs]);
  return now;
}
