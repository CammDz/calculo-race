import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { computeElapsedSec, phaseForElapsed, presentQuestion } from '../lib/gameLogic';
import { getGameById, listTeams, buildLeaderboard, listAnswers, publicQuestion } from '../services/gameService';
import type { Answer, Game, LeaderboardEntry, Question, Team } from '../types';

/** Reloj oficial: usa marcas del servidor (serverStartedAt + elapsedSec base),
 *  corregidas con el reloj de la BD. */
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
  const elapsed = game ? computeElapsedSec(game.elapsedSec, game.serverStartedAt, serverNow) : 0;
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
  // Solo la primera carga muestra "Cargando…". Las recargas por realtime
  // actualizan en silencio para no hacer titilar la pantalla.
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!gameId) { setLoading(false); return; }
    let cancelled = false;
    if (firstLoad.current) setLoading(true);
    (async () => {
      try {
        const [g, t, lb, a] = await Promise.all([
          getGameById(gameId), listTeams(gameId),
          buildLeaderboard(gameId), listAnswers(gameId),
        ]);
        if (cancelled) return;
        setGame(g); setTeams(t); setLeaderboard(lb); setAnswers(a);
        const raw = await publicQuestion(g?.currentQuestionId ?? null);
        // Orden aleatorio por partida, idéntico para todos los equipos.
        setQuestion(raw && g ? presentQuestion(raw, `${gameId}:${raw.id}`) : raw);
        setError(null);
      } catch (e) {
        if (!cancelled && firstLoad.current) setError(e instanceof Error ? e.message : 'Error de conexión.');
      } finally {
        if (!cancelled && firstLoad.current) {
          setLoading(false);
          firstLoad.current = false;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [gameId, tick]);

  // Realtime de Supabase (partida + equipos + respuestas). Limpia la
  // suscripción al desmontar para evitar duplicados.
  useEffect(() => {
    if (!gameId) return;
    const sb = getSupabase();
    if (!sb) return;
    const refresh = () => reload();
    const ch = sb.channel(`game-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers', filter: `game_id=eq.${gameId}` }, refresh)
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [gameId, reload]);

  return { game, teams, leaderboard, answers, question, loading, error, reload };
}

/** Respuesta enviada por este equipo para la pregunta actual (realtime). */
export function useMyAnswer(gameId: string | null, teamId: string | null, questionId: string | null) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  useEffect(() => {
    if (!gameId || !teamId || !questionId) { setAnswer(null); return; }
    let cancelled = false;
    const fetchMine = () => {
      listAnswers(gameId).then((all) => {
        if (cancelled) return;
        setAnswer(all.find((a) => a.teamId === teamId && a.questionId === questionId) ?? null);
      }).catch(() => undefined);
    };
    fetchMine();
    const sb = getSupabase();
    if (!sb) return () => { cancelled = true; };
    const ch = sb.channel(`my-answer-${teamId}-${questionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers', filter: `team_id=eq.${teamId}` }, fetchMine)
      .subscribe();
    return () => { cancelled = true; sb.removeChannel(ch); };
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
