// Pruebas de reglas del juego: puntos, bonus, fases, 15:00, desempates,
// idempotencia, códigos, validaciones y mezcla determinista.

import { describe, it, expect } from 'vitest';
import {
  pointsForAnswer, speedBonus, phaseForElapsed, computeElapsedSec,
  sortLeaderboard, generateRoomCode, validateTeamName, validateRoomCode,
  seededShuffle, isAnswerWindowOpen, secondsRemainingInPhase, shipProgress,
  MATCH_TOTAL_SEC, basePointsForLevel, presentQuestion,
} from '../lib/gameLogic';
import { QUESTIONS, questionsByLevel } from '../data/questions';

describe('puntuación por nivel', () => {
  it('usa 100/150/200/300 por defecto', () => {
    expect(basePointsForLevel(1)).toBe(100);
    expect(basePointsForLevel(2)).toBe(150);
    expect(basePointsForLevel(3)).toBe(200);
    expect(basePointsForLevel(4)).toBe(300);
  });
  it('permite overrides del profesor', () => {
    expect(basePointsForLevel(1, { 1: 50 })).toBe(50);
  });
  it('incorrecta o sin respuesta = 0', () => {
    expect(pointsForAnswer({ isCorrect: false, basePoints: 300, responseTimeMs: 100, windowMs: 60000 })).toBe(0);
  });
  it('correcta suma base + bonus', () => {
    const pts = pointsForAnswer({ isCorrect: true, basePoints: 100, responseTimeMs: 0, windowMs: 60000 });
    expect(pts).toBe(120);
  });
});

describe('bonificación por rapidez', () => {
  it('máximo 20 con respuesta inmediata', () => {
    expect(speedBonus(0, 60000)).toBe(20);
  });
  it('0 fuera de ventana y valores negativos protegidos', () => {
    expect(speedBonus(60000, 60000)).toBe(0);
    expect(speedBonus(99999, 60000)).toBe(0);
    expect(speedBonus(-5, 60000)).toBe(0);
  });
  it('es moderada: nunca supera 20', () => {
    for (const t of [0, 1000, 15000, 30000, 59999]) {
      expect(speedBonus(t, 60000)).toBeLessThanOrEqual(20);
    }
  });
});

describe('cronograma de 15:00', () => {
  it('dura exactamente 900 s', () => {
    expect(MATCH_TOTAL_SEC).toBe(900);
  });
  it('fases en los minutos exigidos', () => {
    expect(phaseForElapsed(0)).toBe('lobby');
    expect(phaseForElapsed(59)).toBe('lobby');
    expect(phaseForElapsed(60)).toBe('level_1');
    expect(phaseForElapsed(179)).toBe('level_1');
    expect(phaseForElapsed(180)).toBe('level_2');
    expect(phaseForElapsed(359)).toBe('level_2');
    expect(phaseForElapsed(360)).toBe('level_3');
    expect(phaseForElapsed(539)).toBe('level_3');
    expect(phaseForElapsed(540)).toBe('level_4');
    expect(phaseForElapsed(779)).toBe('level_4');
    expect(phaseForElapsed(780)).toBe('podium');
    expect(phaseForElapsed(900)).toBe('finished');
  });
  it('podio ocupa los 2 últimos minutos', () => {
    expect(secondsRemainingInPhase(780)).toBe(120);
    expect(secondsRemainingInPhase(840)).toBe(60);
  });
});

describe('cronómetro de servidor y pausa', () => {
  it('avanza con marcas del servidor', () => {
    const started = new Date('2026-01-01T00:00:00Z').toISOString();
    const now = Date.parse(started) + 30_000;
    expect(computeElapsedSec(60, started, now)).toBe(90);
  });
  it('pausa congela el tiempo (serverStartedAt null)', () => {
    expect(computeElapsedSec(200, null, Date.now())).toBe(200);
  });
  it('nunca reinicia por recarga: usa base persistida', () => {
    const started = new Date('2026-01-01T00:00:00Z').toISOString();
    const now = Date.parse(started) + 5_000;
    expect(computeElapsedSec(300, started, now)).toBe(305);
  });
  it('tope en 900 s', () => {
    expect(computeElapsedSec(890, new Date(Date.now() - 60_000).toISOString(), Date.now())).toBe(900);
  });
});

describe('cierre de preguntas', () => {
  it('bloquea respuestas tras el cierre', () => {
    const closesAt = new Date(Date.now() - 1000).toISOString();
    expect(isAnswerWindowOpen(Date.now(), closesAt)).toBe(false);
    expect(isAnswerWindowOpen(Date.now(), null)).toBe(false);
  });
  it('permite responder en ventana', () => {
    const closesAt = new Date(Date.now() + 10_000).toISOString();
    expect(isAnswerWindowOpen(Date.now(), closesAt)).toBe(true);
  });
});

describe('desempates', () => {
  it('puntos > correctas > tiempo > nombre', () => {
    const rows = sortLeaderboard([
      { teamId: 'b', teamName: 'B', shipColor: '#fff', score: 500, correctCount: 2, totalResponseTimeMs: 9000 },
      { teamId: 'a', teamName: 'A', shipColor: '#fff', score: 500, correctCount: 3, totalResponseTimeMs: 20000 },
      { teamId: 'c', teamName: 'C', shipColor: '#fff', score: 600, correctCount: 1, totalResponseTimeMs: 1000 },
      { teamId: 'd', teamName: 'D', shipColor: '#fff', score: 500, correctCount: 3, totalResponseTimeMs: 5000 },
    ]);
    expect(rows.map((r) => r.teamId)).toEqual(['c', 'd', 'a', 'b']);
  });
});

describe('salas y equipos', () => {
  it('códigos de 6 chars difíciles de adivinar', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateRoomCode()));
    expect(codes.size).toBeGreaterThan(190);
    for (const c of codes) {
      expect(c).toMatch(/^[A-Z0-9]{6}$/);
    }
  });
  it('valida nombres de equipo', () => {
    expect(validateTeamName('')).not.toBeNull();
    expect(validateTeamName('A')).not.toBeNull();
    expect(validateTeamName('Nave Nodriza 8')).toBeNull();
  });
  it('valida códigos', () => {
    expect(validateRoomCode('abc123')).toBeNull();
    expect(validateRoomCode('ab')).not.toBeNull();
  });
  it('misma semilla = mismo orden para todos los equipos', () => {
    const a = seededShuffle([1, 2, 3, 4], 'sala-X-ronda-1');
    const b = seededShuffle([1, 2, 3, 4], 'sala-X-ronda-1');
    expect(a).toEqual(b);
  });
});

describe('banco de preguntas', () => {
  it('al menos 40 activas con 4 opciones y respuesta única', () => {
    const active = QUESTIONS.filter((q) => q.active);
    expect(active.length).toBeGreaterThanOrEqual(40);
    for (const q of active) {
      expect(q.options).toHaveLength(4);
      expect(q.options.map((o) => o.id).sort()).toEqual(['A', 'B', 'C', 'D']);
      expect(q.options.some((o) => o.id === q.correctOptionId)).toBe(true);
      expect(q.explanation.length).toBeGreaterThan(10);
    }
  });
  it('cubre los 4 niveles', () => {
    for (const l of [1, 2, 3, 4] as const) {
      expect(questionsByLevel(l).length).toBeGreaterThanOrEqual(8);
    }
  });
  it('incluye el ejemplo verificado r=2+2cos θ, θ=π → r=0', () => {
    const q = QUESTIONS.find((x) => x.id === 'n2-01');
    const correct = q?.options.find((o) => o.id === q?.correctOptionId);
    expect(correct?.text).toBe('0');
  });
  it('letras correctas balanceadas y sin rachas por nivel', () => {
    for (const l of [1, 2, 3, 4] as const) {
      const seq = questionsByLevel(l).map((q) => q.correctOptionId);
      expect(new Set(seq).size).toBe(4); // A, B, C y D presentes
      for (let i = 2; i < seq.length; i++) {
        expect(`${seq[i - 2]}${seq[i - 1]}${seq[i]}`).not.toMatch(/^(.)\1\1$/);
      }
    }
  });
  it('n3-08 tiene una única opción correcta', () => {
    const q = QUESTIONS.find((x) => x.id === 'n3-08');
    expect(q?.options.find((o) => o.id === 'D')?.text).toBe('−1');
  });
});

describe('presentación aleatoria por partida', () => {
  const q = QUESTIONS.find((x) => x.id === 'n1-01')!;
  it('misma semilla = mismo orden para todos los equipos', () => {
    const a = presentQuestion(q, 'sala-X:n1-01').options.map((o) => o.id);
    const b = presentQuestion(q, 'sala-X:n1-01').options.map((o) => o.id);
    expect(a).toEqual(b);
  });
  it('conserva IDs y respuesta correcta (valida el servidor igual)', () => {
    const p = presentQuestion(q, 'sala-Y:n1-01');
    expect(p.options.map((o) => o.id).sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(p.correctOptionId).toBe(q.correctOptionId);
    expect(p.options.find((o) => o.id === p.correctOptionId)?.text)
      .toBe(q.options.find((o) => o.id === q.correctOptionId)?.text);
  });
  it('el orden varía entre partidas', () => {
    const orders = new Set(
      ['g1', 'g2', 'g3', 'g4', 'g5'].map((g) => presentQuestion(q, `${g}:n1-01`).options.map((o) => o.id).join('')),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('progreso de nave', () => {
  it('acotado entre 0 y 1', () => {
    expect(shipProgress(0)).toBe(0);
    expect(shipProgress(10000)).toBe(1);
    expect(shipProgress(1000, 2000)).toBe(0.5);
  });
});
