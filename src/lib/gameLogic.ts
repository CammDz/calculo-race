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

/** Mezcla determinista por sala+ronda para que todos los equipos vean el mismo orden. */
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

/** Presenta una pregunta con las opciones en orden aleatorio determinista por
 *  partida (misma semilla = mismo orden para todos los equipos).
 *  Los IDs A/B/C/D viajan con su texto: la validación del servidor no cambia.
 */
export function presentQuestion(q: Question, seed: string): Question {
  return { ...q, options: seededShuffle(q.options, seed) };
}
