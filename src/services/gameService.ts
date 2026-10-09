// Capa de servicio: Supabase como backend único.
// El frontend NUNCA calcula puntos: la Edge Function `submit-answer`
// valida la respuesta y calcula la puntuación en el servidor.

import { requireSupabase } from '../lib/supabase';
import { generateRoomCode, sortLeaderboard } from '../lib/gameLogic';
import { getQuestionById, QUESTIONS } from '../data/questions';
import type { Answer, Game, GameStatus, LeaderboardEntry, LevelNumber, Question, Team } from '../types';

export const QUESTION_WINDOW_MS = 60_000;

export interface CreateGameParams {
  maxTeams: number;
  points: Record<LevelNumber, number>;
  showExplanations: boolean;
  teacherId?: string | null;
}

export async function createGame(params: CreateGameParams): Promise<Game> {
  const sb = requireSupabase();
  const code = generateRoomCode();
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
  const sb = requireSupabase();
  const upper = code.trim().toUpperCase();
  const { data, error } = await sb.from('games').select('*').eq('code', upper).maybeSingle();
  if (error) throw new Error(mapSupabaseError(error.message));
  return data ? rowToGame(data) : null;
}

export async function getGameById(id: string): Promise<Game | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('games').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(mapSupabaseError(error.message));
  return data ? rowToGame(data) : null;
}

export async function listTeacherGames(teacherId: string): Promise<Game[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('games').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
  if (error) throw new Error(mapSupabaseError(error.message));
  return (data ?? []).map(rowToGame);
}

export async function updateGame(id: string, patch: Partial<Game>): Promise<Game> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('games').update(gameToRow(patch)).eq('id', id).select('*').single();
  if (error) throw new Error(mapSupabaseError(error.message));
  return rowToGame(data);
}

export async function joinTeam(gameId: string, name: string, shipColor: string): Promise<Team> {
  const clean = name.trim();
  const sb = requireSupabase();
  // Inserción directa con RLS: el nombre es único por partida y los puntos
  // solo los modifica la Edge Function en el servidor.
  const { data, error } = await sb.from('teams').insert({
    game_id: gameId, name: clean, ship_color: shipColor, score: 0,
  }).select('*').single();
  if (error) throw new Error(mapJoinError(error.message));
  return teamRowToTeam(data);
}

export async function listTeams(gameId: string): Promise<Team[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('teams').select('*').eq('game_id', gameId).order('score', { ascending: false });
  if (error) throw new Error(mapSupabaseError(error.message));
  return (data ?? []).map(teamRowToTeam);
}

export interface SubmitResult {
  correct: boolean;
  points: number;
  alreadyAnswered: boolean;
}

/** Envía respuesta. Invoca la Edge Function (valida y puntúa en servidor). */
export async function submitAnswer(params: {
  gameId: string; teamId: string; questionId: string; selectedOptionId: string;
  responseTimeMs: number;
}): Promise<SubmitResult> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke('submit-answer', { body: params });
  if (error) throw new Error(mapSupabaseError(error.message));
  return data as SubmitResult;
}

export async function listAnswers(gameId: string): Promise<Answer[]> {
  const sb = requireSupabase();
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
  const sb = requireSupabase();
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
  const sb = requireSupabase();
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
