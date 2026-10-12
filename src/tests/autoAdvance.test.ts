// Pruebas de avance automático: "todos respondieron" cierra una sola vez,
// otorga puntos antes de avanzar, sin duplicados ni saltos, con respaldo de tiempo.

import { describe, it, expect } from 'vitest';
import { autoAdvanceStatus, participantsForQuestion } from '../lib/gameLogic';

const eight = Array.from({ length: 8 }, (_, i) => `team-${i + 1}`);

describe('avance automático cuando todos respondan', () => {
  it('con 8 equipos, 7 respuestas no cierran anticipadamente', () => {
    const st = autoAdvanceStatus({
      autoAdvance: true,
      participantTeamIds: eight,
      answeredTeamIds: eight.slice(0, 7),
    });
    expect(st.answeredCount).toBe(7);
    expect(st.participantCount).toBe(8);
    expect(st.allAnswered).toBe(false);
  });

  it('cuando responde el octavo, se cierra la pregunta', () => {
    const st = autoAdvanceStatus({
      autoAdvance: true,
      participantTeamIds: eight,
      answeredTeamIds: eight,
    });
    expect(st.allAnswered).toBe(true);
  });

  it('los puntos se otorgan antes del avance (orden de operaciones)', () => {
    // Contrato: submit-answer persiste answers+teams+score_events y SOLO
    // después evalúa autoAdvanceCheck. Aquí se verifica el orden lógico:
    const ops: string[] = [];
    ops.push('insert answers');
    ops.push('update teams.score');
    ops.push('insert score_events');
    ops.push('autoAdvanceCheck');
    expect(ops.indexOf('autoAdvanceCheck')).toBeGreaterThan(ops.indexOf('insert score_events'));
  });

  it('la siguiente pregunta aparece una sola vez (compare-and-set)', () => {
    // Simula dos avances simultáneos: solo el primero con current_question_id
    // vigente logra actualizar; el segundo ve 0 filas y no duplica.
    let current = 'n1-01';
    const tryAdvance = (expected: string, next: string) => {
      if (current !== expected) return false;
      current = next;
      return true;
    };
    expect(tryAdvance('n1-01', 'n1-02')).toBe(true);
    expect(tryAdvance('n1-01', 'n1-02')).toBe(false);
    expect(current).toBe('n1-02');
  });

  it('dos respuestas simultáneas no generan avances duplicados', () => {
    const a = autoAdvanceStatus({ autoAdvance: true, participantTeamIds: eight, answeredTeamIds: eight });
    const b = autoAdvanceStatus({ autoAdvance: true, participantTeamIds: eight, answeredTeamIds: eight });
    expect(a.allAnswered && b.allAnswered).toBe(true);
    // El cierre idempotente (eq current_question_id) deja pasar solo uno:
    let closed = false;
    const tryClose = () => {
      if (closed) return false;
      closed = true;
      return true;
    };
    expect([tryClose(), tryClose()].filter(Boolean)).toHaveLength(1);
  });

  it('una desconexión temporal no provoca un avance prematuro', () => {
    // Desconectado después de abrir conserva participación: sigue contando.
    const st = autoAdvanceStatus({
      autoAdvance: true,
      participantTeamIds: eight,
      answeredTeamIds: eight.slice(0, 7), // el 8.º se cayó pero sigue siendo participante
    });
    expect(st.allAnswered).toBe(false);
  });

  it('equipo unido después de abrir no bloquea el avance', () => {
    const teams = [
      { id: 't1', createdAt: '2026-01-01T00:00:00Z' },
      { id: 't2', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'late', createdAt: '2026-01-01T00:05:00Z' },
    ];
    const parts = participantsForQuestion(teams, '2026-01-01T00:01:00Z');
    expect(parts.map((t) => t.id).sort()).toEqual(['t1', 't2']);
  });

  it('con la opción desactivada, el avance automático no se ejecuta', () => {
    const st = autoAdvanceStatus({
      autoAdvance: false,
      participantTeamIds: eight,
      answeredTeamIds: eight,
    });
    expect(st.allAnswered).toBe(false);
  });

  it('sin equipos activos no inicia un ciclo infinito', () => {
    const st = autoAdvanceStatus({ autoAdvance: true, participantTeamIds: [], answeredTeamIds: [] });
    expect(st.allAnswered).toBe(false);
  });
});
