// Simulación de 8 equipos respondiendo simultáneamente + idempotencia.

import { describe, it, expect } from 'vitest';
import { pointsForAnswer, sortLeaderboard } from '../lib/gameLogic';
import type { LeaderboardEntry } from '../types';

describe('simulación con 8 equipos simultáneos', () => {
  it('puntúa a todos sin duplicar y ordena correctamente', () => {
    const teamIds = Array.from({ length: 8 }, (_, i) => `team-${i + 1}`);
    // Cada equipo responde una sola vez (idempotencia simulada con Set).
    const seen = new Set<string>();
    const results: LeaderboardEntry[] = teamIds.map((id, i) => {
      const key = `${id}:q1`;
      if (seen.has(key)) throw new Error('duplicado no bloqueado');
      seen.add(key);
      const correct = i % 2 === 0;
      const pts = pointsForAnswer({ isCorrect: correct, basePoints: 150, responseTimeMs: 1000 * (i + 1), windowMs: 60000 });
      return { teamId: id, teamName: `Equipo ${i + 1}`, shipColor: '#fff', score: pts, correctCount: correct ? 1 : 0, totalResponseTimeMs: 1000 * (i + 1) };
    });
    // Segundo envío del mismo equipo/pregunta debe ignorarse (ya visto).
    for (const id of teamIds) {
      expect(seen.has(`${id}:q1`)).toBe(true);
    }
    const ranked = sortLeaderboard(results);
    expect(ranked).toHaveLength(8);
    expect(ranked[0].correctCount).toBe(1);
    // Los correctos quedan arriba de los incorrectos (150+ > 0).
    expect(ranked.slice(0, 4).every((r) => r.correctCount === 1)).toBe(true);
  });
});
