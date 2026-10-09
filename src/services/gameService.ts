// Capa de servicio: Supabase cuando hay credenciales, demo local si no.
// El frontend NUNCA calcula puntos: en Supabase lo hace la Edge Function
// `submit-answer`; en demo lo calcula este módulo con la misma regla del servidor.

import { getSupabase, DEMO_MODE } from '../lib/supabase';
import { generateRoomCode, pointsForAnswer, basePointsForLevel, sortLeaderboard } from '../lib/gameLogic';
import { getQuestionById, QUESTIONS } from '../data/questions';
import type { Answer, Game, GameStatus, LeaderboardEntry, LevelNumber, Question, Team } from '../types';

export const QUESTION_WINDOW_MS = 60_000;
const LS_GAMES = 'cr-games';
const LS_TEAMS = 'cr-teams';
const LS_ANSWERS = 'cr-answers';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* noop */ }
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emitChange(channel: string): void {
  window.dispatchEvent(new CustomEvent(`cr-change:${channel}`));
}

function demoGames(): Game[] { return read<Game[]>(LS_GAMES, []); }
function demoTeams(): Team[] { return read<Team[]>(LS_TEAMS, []); }
function demoAnswers(): Answer[] { return read<Answer[]>(LS_ANSWERS, []); }

/** Asegura el juego demo de bienvenida para probar sin profesor. */
export function ensureDemoGame(): Game {
  const games = demoGames();
  let g = games.find((x) => x.code === 'DEMO01');
  if (!g) {
    g = {
      id: uid('game'), code: 'DEMO01', teacherId: 'demo-teacher',
      status: 'lobby', maxTeams: 10, elapsedSec: 0,
      serverStartedAt: null, createdAt: new Date().toISOString(),
      currentQuestionId: 'n1-03', currentLevel: 1,
      pointsL1: 100, pointsL2: 150, pointsL3: 200, pointsL4: 300,
      showExplanations: true,
      questionOpenedAt: new Date().toISOString(),
      questionClosesAt: new Date(Date.now() + QUESTION_WINDOW_MS).toISOString(),
    };
    games.push(g);
    write(LS_GAMES, games);
  }
  return g;
}

export interface CreateGameParams {
  maxTeams: number;
  points: Record<LevelNumber, number>;
  showExplanations: boolean;
  teacherId?: string | null;
}

export async function createGame(params: CreateGameParams): Promise<Game> {
  const sb = getSupabase();
  const code = generateRoomCode();
  if (!sb) {
    const game: Game = {
      id: uid('game'), code, teacherId: params.teacherId ?? 'demo-teacher',
      status: 'lobby', maxTeams: params.maxTeams, elapsedSec: 0,
      serverStartedAt: null, createdAt: new Date().toISOString(),
      currentQuestionId: null, currentLevel: 1,
      pointsL1: params.points[1], pointsL2: params.points[2],
      pointsL3: params.points[3], pointsL4: params.points[4],
      showExplanations: params.showExplanations,
      questionOpenedAt: null, questionClosesAt: null,
    };
    const games = demoGames();
    games.push(game);
    write(LS_GAMES, games);
    emitChange('games');
    return game;
  }
  const { data, error } = await sb.from('games').insert({
    code, teacher_id: params.teacherId ?? null,
    status: 'lobby', max_teams: params.maxTeams, elapsed_sec: 0,
    current_level: 1, points_l1: params.points[1], points_l2: params.points[2],
    points_l3: params.points[3], points_l4: params.points[4],
    show_explanations: params.showExplanations,
  }).select('*').single();
  if (error) throw new Error(mapSupabaseError(error.message));
  return rowToGame(data);
}

export async function getGameByCode(code: string): Promise<Game | null> {
  const sb = getSupabase();
  const upper = code.trim().toUpperCase();
  if (!sb) {
    if (upper === 'DEMO01') return ensureDemoGame();
    return demoGames().find((g) => g.code === upper) ?? null;
  }
  const { data, error } = await sb.from('games').select('*').eq('code', upper).maybeSingle();
  if (error) throw new Error(mapSupabaseError(error.message));
  return data ? rowToGame(data) : null;
}

export async function getGameById(id: string): Promise<Game | null> {
  const sb = getSupabase();
  if (!sb) return demoGames().find((g) => g.id === id) ?? null;
  const { data, error } = await sb.from('games').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(mapSupabaseError(error.message));
  return data ? rowToGame(data) : null;
}

export async function listTeacherGames(teacherId: string): Promise<Game[]> {
  const sb = getSupabase();
  if (!sb) return demoGames().slice().reverse();
  const { data, error } = await sb.from('games').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
  if (error) throw new Error(mapSupabaseError(error.message));
  return (data ?? []).map(rowToGame);
}

export async function updateGame(id: string, patch: Partial<Game>): Promise<Game> {
  const sb = getSupabase();
  if (!sb) {
    const games = demoGames();
    const i = games.findIndex((g) => g.id === id);
    if (i < 0) throw new Error('Partida no encontrada.');
    games[i] = { ...games[i], ...patch };
    write(LS_GAMES, games);
    emitChange(`game:${id}`);
    emitChange('games');
    return games[i];
  }
  const { data, error } = await sb.from('games').update(gameToRow(patch)).eq('id', id).select('*').single();
  if (error) throw new Error(mapSupabaseError(error.message));
  return rowToGame(data);
}

export async function joinTeam(gameId: string, name: string, shipColor: string): Promise<Team> {
  const clean = name.trim();
  const sb = getSupabase();
  if (!sb) {
    const game = demoGames().find((g) => g.id === gameId);
    if (!game) throw new Error('Sala no encontrada.');
    const teams = demoTeams().filter((t) => t.gameId === gameId);
    if (teams.length >= game.maxTeams) throw new Error('La sala está llena.');
    if (teams.some((t) => t.name.toLowerCase() === clean.toLowerCase())) throw new Error('Ese nombre de equipo ya está en uso.');
    const team: Team = {
      id: uid('team'), gameId, name: clean, shipColor,
      score: 0, correctCount: 0, totalResponseTimeMs: 0,
      connected: true, lastSeenAt: new Date().toISOString(),
    };
    const all = demoTeams();
    all.push(team);
    write(LS_TEAMS, all);
    emitChange(`teams:${gameId}`);
    return team;
  }
  // Vía Edge Function pública join-team (rate-limited) o inserción directa con RLS.
  const { data, error } = await sb.from('teams').insert({
    game_id: gameId, name: clean, ship_color: shipColor, score: 0,
  }).select('*').single();
  if (error) throw new Error(mapJoinError(error.message));
  return teamRowToTeam(data);
}

export async function listTeams(gameId: string): Promise<Team[]> {
  const sb = getSupabase();
  if (!sb) return demoTeams().filter((t) => t.gameId === gameId);
  const { data, error } = await sb.from('teams').select('*').eq('game_id', gameId).order('score', { ascending: false });
  if (error) throw new Error(mapSupabaseError(error.message));
  return (data ?? []).map(teamRowToTeam);
}

export interface SubmitResult {
  correct: boolean;
  points: number;
  alreadyAnswered: boolean;
}

/** Envía respuesta. En Supabase invoca la Edge Function (valida y puntúa en servidor). */
export async function submitAnswer(params: {
  gameId: string; teamId: string; questionId: string; selectedOptionId: string;
  responseTimeMs: number;
}): Promise<SubmitResult> {
  const sb = getSupabase();
  if (!sb) {
    // Regla de servidor replicada en local (demo): idempotente, una sola vez, ventana cerrada.
    const answers = demoAnswers();
    const existing = answers.find((a) => a.gameId === params.gameId && a.teamId === params.teamId && a.questionId === params.questionId);
    if (existing) return { correct: existing.isCorrect, points: existing.pointsAwarded, alreadyAnswered: true };
    const games = demoGames();
    const game = games.find((g) => g.id === params.gameId);
    if (!game) throw new Error('Partida no encontrada.');
    if (game.questionClosesAt && Date.now() > Date.parse(game.questionClosesAt)) {
      throw new Error('El tiempo de esta pregunta ya terminó.');
    }
    const q = getQuestionById(params.questionId);
    if (!q) throw new Error('Pregunta no encontrada.');
    const correct = params.selectedOptionId === q.correctOptionId;
    const base = basePointsForLevel(q.level, { 1: game.pointsL1, 2: game.pointsL2, 3: game.pointsL3, 4: game.pointsL4 });
    const inWindow = !game.questionClosesAt || Date.now() < Date.parse(game.questionClosesAt);
    const points = inWindow ? pointsForAnswer({ isCorrect: correct, basePoints: base, responseTimeMs: params.responseTimeMs, windowMs: QUESTION_WINDOW_MS }) : 0;
    const ans: Answer = {
      id: uid('ans'), gameId: params.gameId, teamId: params.teamId, questionId: params.questionId,
      selectedOptionId: params.selectedOptionId, isCorrect: correct, pointsAwarded: points,
      responseTimeMs: params.responseTimeMs, createdAt: new Date().toISOString(),
    };
    answers.push(ans);
    write(LS_ANSWERS, answers);
    const teams = demoTeams();
    const t = teams.find((x) => x.id === params.teamId);
    if (t) {
      t.score += points;
      if (correct) t.correctCount += 1;
      t.totalResponseTimeMs += params.responseTimeMs;
      t.lastSeenAt = new Date().toISOString();
      write(LS_TEAMS, teams);
    }
    emitChange(`teams:${params.gameId}`);
    emitChange(`answers:${params.gameId}`);
    return { correct, points, alreadyAnswered: false };
  }
  const { data, error } = await sb.functions.invoke('submit-answer', { body: params });
  if (error) throw new Error(mapSupabaseError(error.message));
  return data as SubmitResult;
}

export async function listAnswers(gameId: string): Promise<Answer[]> {
  const sb = getSupabase();
  if (!sb) return demoAnswers().filter((a) => a.gameId === gameId);
  const { data, error } = await sb.from('answers').select('*').eq('game_id', gameId).order('created_at', { ascending: true });
  if (error) throw new Error(mapSupabaseError(error.message));
  return (data ?? []).map(answerRowToAnswer);
}

export async function buildLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
  const teams = await listTeams(gameId);
  return sortLeaderboard(teams.map((t) => ({
    teamId: t.id, teamName: t.name, shipColor: t.shipColor,
    score: t.score, correctCount: t.correctCount, totalResponseTimeMs: t.totalResponseTimeMs,
  })));
}

/** Preguntas visibles para estudiantes: SIN respuesta correcta (el servidor la oculta). */
export async function publicQuestion(questionId: string | null): Promise<Question | null> {
  if (!questionId) return null;
  const sb = getSupabase();
  if (!sb) return getQuestionById(questionId) ?? null;
  // La vista pública `public_questions` no expone correct_option_id.
  const { data, error } = await sb.from('public_questions').select('*').eq('id', questionId).maybeSingle();
  if (error || !data) return getQuestionById(questionId) ?? null;
  const full = getQuestionById(questionId);
  return {
    id: data.id, level: data.level, topic: data.topic, difficulty: data.difficulty,
    statement: data.statement, options: data.options, correctOptionId: full?.correctOptionId ?? '',
    explanation: full?.explanation ?? data.explanation ?? '', active: true,
  };
}

export async function adminListQuestions(): Promise<Question[]> {
  const sb = getSupabase();
  if (!sb) return QUESTIONS;
  const { data, error } = await sb.from('questions').select('*').order('level').order('id');
  if (error) return QUESTIONS;
  if (!data || data.length === 0) return QUESTIONS;
  return data.map((r: Record<string, unknown>) => ({
    id: String(r['id']), level: Number(r['level']) as LevelNumber,
    topic: String(r['topic']), difficulty: r['difficulty'] as Question['difficulty'],
    statement: String(r['statement']),
    options: r['options'] as Question['options'],
    correctOptionId: String(r['correct_option_id']),
    explanation: String(r['explanation'] ?? ''), active: Boolean(r['active'] ?? true),
  }));
}

// ---------- mapeos ----------
function rowToGame(r: Record<string, unknown>): Game {
  return {
    id: String(r['id']), code: String(r['code']),
    teacherId: r['teacher_id'] ? String(r['teacher_id']) : null,
    status: r['status'] as GameStatus,
    maxTeams: Number(r['max_teams'] ?? 8),
    elapsedSec: Number(r['elapsed_sec'] ?? 0),
    serverStartedAt: (r['server_started_at'] as string) ?? null,
    createdAt: String(r['created_at']),
    currentQuestionId: (r['current_question_id'] as string) ?? null,
    currentLevel: Number(r['current_level'] ?? 1) as LevelNumber,
    pointsL1: Number(r['points_l1'] ?? 100), pointsL2: Number(r['points_l2'] ?? 150),
    pointsL3: Number(r['points_l3'] ?? 200), pointsL4: Number(r['points_l4'] ?? 300),
    showExplanations: Boolean(r['show_explanations'] ?? true),
    questionOpenedAt: (r['question_opened_at'] as string) ?? null,
    questionClosesAt: (r['question_closes_at'] as string) ?? null,
  };
}

function gameToRow(g: Partial<Game>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (g.status) row['status'] = g.status;
  if (g.maxTeams != null) row['max_teams'] = g.maxTeams;
  if (g.elapsedSec != null) row['elapsed_sec'] = g.elapsedSec;
  if (g.serverStartedAt !== undefined) row['server_started_at'] = g.serverStartedAt;
  if (g.currentQuestionId !== undefined) row['current_question_id'] = g.currentQuestionId;
  if (g.currentLevel != null) row['current_level'] = g.currentLevel;
  if (g.pointsL1 != null) row['points_l1'] = g.pointsL1;
  if (g.pointsL2 != null) row['points_l2'] = g.pointsL2;
  if (g.pointsL3 != null) row['points_l3'] = g.pointsL3;
  if (g.pointsL4 != null) row['points_l4'] = g.pointsL4;
  if (g.showExplanations != null) row['show_explanations'] = g.showExplanations;
  if (g.questionOpenedAt !== undefined) row['question_opened_at'] = g.questionOpenedAt;
  if (g.questionClosesAt !== undefined) row['question_closes_at'] = g.questionClosesAt;
  return row;
}

function teamRowToTeam(r: Record<string, unknown>): Team {
  return {
    id: String(r['id']), gameId: String(r['game_id']), name: String(r['name']),
    shipColor: String(r['ship_color'] ?? '#38bdf8'),
    score: Number(r['score'] ?? 0), correctCount: Number(r['correct_count'] ?? 0),
    totalResponseTimeMs: Number(r['total_response_time_ms'] ?? 0),
    connected: r['connected'] == null ? true : Boolean(r['connected']),
    lastSeenAt: String(r['last_seen_at'] ?? r['created_at'] ?? new Date().toISOString()),
  };
}

function answerRowToAnswer(r: Record<string, unknown>): Answer {
  return {
    id: String(r['id']), gameId: String(r['game_id']), teamId: String(r['team_id']),
    questionId: String(r['question_id']), selectedOptionId: String(r['selected_option_id']),
    isCorrect: Boolean(r['is_correct']), pointsAwarded: Number(r['points_awarded'] ?? 0),
    responseTimeMs: Number(r['response_time_ms'] ?? 0), createdAt: String(r['created_at']),
  };
}

function mapSupabaseError(msg: string): string {
  if (/row-level security/i.test(msg)) return 'No tienes permiso para esta acción.';
  return 'Ocurrió un error de conexión. Intenta de nuevo.';
}

function mapJoinError(msg: string): string {
  if (/duplicate|unique/i.test(msg)) return 'Ese nombre de equipo ya está en uso.';
  return mapSupabaseError(msg);
}

export { DEMO_MODE };
