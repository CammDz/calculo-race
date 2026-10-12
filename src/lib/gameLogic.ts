// Lógica pura del juego: puntuación, fases, cronómetro, desempates.
// Todo lo sensible se re-valida en el servidor (Edge Function); aquí vive la
// misma regla para UX optimista y para pruebas unitarias.

import type { GameStatus, LeaderboardEntry, LevelConfig, LevelNumber, Question } from '../types';

/** Cronograma oficial de 900 s (15 min). */
export const MATCH_TOTAL_SEC = 900;

export const LEVELS: LevelConfig[] = [
  { level: 1, name: 'Nivel 1 · Despegue matemático', subtitle: 'Límites e indeterminaciones 0/0 y ∞/∞', startSec: 60, endSec: 180, basePoints: 100 },
  { level: 2, name: 'Nivel 2 · Trayectorias polares', subtitle: 'r y θ, conversiones y curvas', startSec: 180, endSec: 360, basePoints: 150 },
  { level: 3, name: "Nivel 3 · Regla de L'Hôpital", subtitle: 'Deriva numerador y denominador', startSec: 360, endSec: 540, basePoints: 200 },
  { level: 4, name: 'Nivel 4 · Problema final', subtitle: 'Razonamiento multivariable', startSec: 540, endSec: 780, basePoints: 300 },
];

export const LOBBY_END_SEC = 60;
export const PODIUM_START_SEC = 780;

export function phaseForElapsed(elapsedSec: number): GameStatus {
  if (elapsedSec < 0) return 'lobby';
  if (elapsedSec < LOBBY_END_SEC) return 'lobby';
  for (const l of LEVELS) {
    if (elapsedSec >= l.startSec && elapsedSec < l.endSec) {
      return (`level_${l.level}` as GameStatus);
    }
  }
  if (elapsedSec >= PODIUM_START_SEC && elapsedSec < MATCH_TOTAL_SEC) return 'podium';
  if (elapsedSec >= MATCH_TOTAL_SEC) return 'finished';
  return 'podium';
}

export function levelForElapsed(elapsedSec: number): LevelNumber {
  if (elapsedSec < 180) return 1;
  if (elapsedSec < 360) return 2;
  if (elapsedSec < 540) return 3;
  return 4;
}

export function secondsRemainingInPhase(elapsedSec: number): number {
  const phase = phaseForElapsed(elapsedSec);
  if (phase === 'lobby') return Math.max(0, LOBBY_END_SEC - elapsedSec);
  if (phase === 'podium') return Math.max(0, MATCH_TOTAL_SEC - elapsedSec);
  if (phase === 'finished') return 0;
  const lvl = LEVELS.find((l) => `level_${l.level}` === phase);
  if (!lvl) return 0;
  return Math.max(0, lvl.endSec - elapsedSec);
}

export function matchRemaining(elapsedSec: number): number {
  return Math.max(0, MATCH_TOTAL_SEC - elapsedSec);
}

/** Cronómetro oficial con marcas del servidor.
 *  elapsed = elapsedSecBase + (nowServer - serverStartedAt)/1000 cuando está corriendo.
 *  Si está pausado (serverStartedAt null), elapsed = elapsedSecBase.
 */
export function computeElapsedSec(
  elapsedSecBase: number,
  serverStartedAt: string | null,
  nowServerMs: number,
): number {
  if (!serverStartedAt) return Math.max(0, Math.min(MATCH_TOTAL_SEC, elapsedSecBase));
  const started = Date.parse(serverStartedAt);
  if (Number.isNaN(started)) return elapsedSecBase;
  const live = elapsedSecBase + (nowServerMs - started) / 1000;
  return Math.max(0, Math.min(MATCH_TOTAL_SEC, Math.floor(live)));
}

/** Bonificación por rapidez: hasta 20 pts, lineal según responseTimeMs vs windowMs.
 *  responseTime 0 => 20 pts; >= window => 0 pts. Solo si es correcta.
 */
export function speedBonus(responseTimeMs: number, windowMs: number, maxBonus = 20): number {
  if (responseTimeMs < 0) return 0;
  if (responseTimeMs >= windowMs) return 0;
  const frac = 1 - responseTimeMs / windowMs;
  return Math.round(frac * maxBonus);
}

export function pointsForAnswer(params: {
  isCorrect: boolean;
  basePoints: number;
  responseTimeMs: number;
  windowMs: number;
}): number {
  if (!params.isCorrect) return 0;
  const bonus = speedBonus(params.responseTimeMs, params.windowMs);
  return params.basePoints + bonus;
}

export function basePointsForLevel(level: LevelNumber, overrides?: Partial<Record<LevelNumber, number>>): number {
  if (overrides?.[level] != null) return overrides[level] as number;
  const found = LEVELS.find((l) => l.level === level);
  return found ? found.basePoints : 100;
}

/** Orden de clasificación: puntos desc, correctas desc, tiempo acumulado asc, nombre asc. */
export function sortLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (a.totalResponseTimeMs !== b.totalResponseTimeMs) return a.totalResponseTimeMs - b.totalResponseTimeMs;
    return a.teamName.localeCompare(b.teamName, 'es');
  });
}

/** Progreso 0..1 de la nave según puntuación frente a un máximo de referencia. */
export function shipProgress(score: number, referenceMax = 2000): number {
  if (referenceMax <= 0) return 0;
  return Math.max(0, Math.min(1, score / referenceMax));
}

/** Genera código de sala aleatorio, difícil de adivinar (6 chars, sin 0/O/1/I). */
export function generateRoomCode(randomFn: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(randomFn() * alphabet.length);
    code += alphabet[idx];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function validateTeamName(name: string): string | null {
  const t = name.trim();
  if (t.length < 2) return 'El nombre del equipo debe tener al menos 2 caracteres.';
  if (t.length > 24) return 'El nombre del equipo no puede superar 24 caracteres.';
  if (!/^[\p{L}\p{N} _-]+$/u.test(t)) return 'Usa solo letras, números, espacios, guion o guion bajo.';
  return null;
}

export function validateRoomCode(code: string): string | null {
  const c = normalizeRoomCode(code);
  if (c.length !== 6) return 'El código debe tener 6 caracteres.';
  if (!/^[A-Z0-9]{6}$/.test(c)) return 'El código solo puede tener letras y números.';
  return null;
}

/** Formatea segundos como mm:ss */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

/** Mezcla determinista por sala+ronda para que todos los equipos vean el mismo orden.
 *  @deprecated HISTÓRICO: se conserva solo por compatibilidad con pruebas viejas.
 *  El juego actual usa ORDEN FIJO A,B,C,D (ver presentQuestion/sortOptionsFixed).
 *  No usar para presentar preguntas a estudiantes.
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (i * 2654435761), 2246822519);
    h ^= h >>> 13;
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function isAnswerWindowOpen(nowServerMs: number, closesAt: string | null): boolean {
  if (!closesAt) return false;
  return nowServerMs < Date.parse(closesAt);
}

/** Presenta una pregunta SIEMPRE en orden fijo A,B,C,D.
 *  El orden visual nunca se mezcla: la letra es un identificador estable que viaja
 *  con su texto y coincide entre banco local, base de datos, servidor, profesor
 *  y estudiante. El parámetro `seed` se ignora y se conserva solo por
 *  compatibilidad con llamadas antiguas.
 */
export function presentQuestion(q: Question, _seed?: string): Question {
  return { ...q, options: sortOptionsFixed(q.options) };
}

/** Ordena opciones por su identificador estable A,B,C,D. */
export function sortOptionsFixed<T extends { id: string }>(options: T[]): T[] {
  const rank: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  return [...options].sort((a, b) => (rank[a.id] ?? 99) - (rank[b.id] ?? 99));
}

/** Normaliza un identificador de opción (letra A-D, insensible a caso/espacios). */
export function normalizeOptionId(id: unknown): string {
  return String(id ?? '').trim().toUpperCase();
}

/** ÚNICA función de validación de respuestas (fuente de verdad compartida).
 *  Compara el identificador estable de la opción seleccionada con el identificador
 *  de la opción correcta guardado para la pregunta. El servidor (Edge Function)
 *  es la autoridad definitiva; el frontend solo la usa para pruebas y nunca para
 *  otorgar puntos por su cuenta.
 */
export function validateAnswer(selectedOptionId: unknown, correctOptionId: unknown): boolean {
  const sel = normalizeOptionId(selectedOptionId);
  const corr = normalizeOptionId(correctOptionId);
  if (!['A', 'B', 'C', 'D'].includes(sel)) return false;
  if (!['A', 'B', 'C', 'D'].includes(corr)) return false;
  return sel === corr;
}

/** Verifica la integridad de una pregunta: 4 opciones distintas y una única correcta. */
export function checkQuestionIntegrity(q: Question): string[] {
  const errors: string[] = [];
  if (q.options.length !== 4) errors.push(`pregunta ${q.id}: debe tener 4 opciones`);
  const ids = q.options.map((o) => normalizeOptionId(o.id)).sort();
  if (JSON.stringify(ids) !== JSON.stringify(['A', 'B', 'C', 'D'])) {
    errors.push(`pregunta ${q.id}: ids deben ser A,B,C,D`);
  }
  const texts = q.options.map((o) => o.text.trim());
  if (new Set(texts).size !== texts.length) errors.push(`pregunta ${q.id}: opciones duplicadas`);
  if (!q.options.some((o) => normalizeOptionId(o.id) === normalizeOptionId(q.correctOptionId))) {
    errors.push(`pregunta ${q.id}: correctOptionId no coincide con ninguna opción`);
  }
  return errors;
}

// ---------- Avance automático ----------

/** Equipos participantes de una pregunta: los creados antes de su apertura.
 *  Un equipo que se unió después de abrir la pregunta no bloquea el avance.
 *  Un equipo desconectado después de abrir conserva su participación (no provoca
 *  un avance prematuro: el temporizador sigue siendo el respaldo).
 */
export function participantsForQuestion<T extends { id: string; createdAt?: string }>(
  teams: T[],
  questionOpenedAt: string | null,
): T[] {
  if (!questionOpenedAt) return [...teams];
  const opened = Date.parse(questionOpenedAt);
  if (Number.isNaN(opened)) return [...teams];
  return teams.filter((t) => {
    if (!t.createdAt) return true;
    const c = Date.parse(t.createdAt);
    if (Number.isNaN(c)) return true;
    return c <= opened + 1000; // 1 s de tolerancia por relojes
  });
}

export interface AutoAdvanceState {
  autoAdvance: boolean;
  answeredCount: number;
  participantCount: number;
  allAnswered: boolean;
}

/** Calcula si se cumple "todos respondieron" para cerrar y avanzar. */
export function autoAdvanceStatus(params: {
  autoAdvance: boolean;
  participantTeamIds: string[];
  answeredTeamIds: string[];
}): AutoAdvanceState {
  const participants = [...new Set(params.participantTeamIds)];
  const answered = new Set(params.answeredTeamIds);
  const answeredCount = participants.filter((id) => answered.has(id)).length;
  const allAnswered = participants.length > 0 && answeredCount >= participants.length;
  return {
    autoAdvance: params.autoAdvance,
    answeredCount,
    participantCount: participants.length,
    allAnswered: params.autoAdvance && allAnswered,
  };
}
