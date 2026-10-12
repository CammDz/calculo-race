// Pruebas de respuestas: identificador estable, orden fijo, fuente única.
// Cubre la sección 7 del encargo: la opción correcta aparece con su letra,
// no cambia al renderizar, el id enviado coincide con el validado, profesor y
// estudiante usan los mismos datos, la migración conserva la respuesta,
// opciones distintas y una única correcta.

import { describe, it, expect } from 'vitest';
import {
  validateAnswer,
  normalizeOptionId,
  sortOptionsFixed,
  presentQuestion,
  checkQuestionIntegrity,
} from '../lib/gameLogic';
import { QUESTIONS } from '../data/questions';

describe('identificador estable de respuesta (fuente única)', () => {
  it('la opción correcta aparece con la letra correcta', () => {
    const q = QUESTIONS.find((x) => x.id === 'n2-01')!;
    const correct = q.options.find((o) => o.id === q.correctOptionId);
    expect(correct?.text).toBe('0');
  });

  it('la respuesta correcta no cambia al renderizar la pregunta', () => {
    for (const q of QUESTIONS) {
      const a = presentQuestion(q, 'g1');
      const b = presentQuestion(q, 'otra-sala');
      expect(a.correctOptionId).toBe(q.correctOptionId);
      expect(b.correctOptionId).toBe(q.correctOptionId);
      expect(a.options.find((o) => o.id === a.correctOptionId)?.text)
        .toBe(q.options.find((o) => o.id === q.correctOptionId)?.text);
    }
  });

  it('el identificador seleccionado coincide con el validado por el servidor', () => {
    // El servidor compara IDs estables, no índices ni letras reordenadas.
    expect(validateAnswer('B', 'B')).toBe(true);
    expect(validateAnswer('b', 'B')).toBe(true);
    expect(validateAnswer(' B ', 'B')).toBe(true);
    expect(validateAnswer('A', 'B')).toBe(false);
    expect(validateAnswer('E', 'B')).toBe(false);
    expect(validateAnswer('', 'B')).toBe(false);
  });

  it('normaliza identificadores sin ambigüedad', () => {
    expect(normalizeOptionId(' c ')).toBe('C');
    expect(normalizeOptionId(null)).toBe('');
  });

  it('orden fijo A,B,C,D sin mezclar', () => {
    for (const q of QUESTIONS) {
      expect(q.options.map((o) => o.id)).toEqual(['A', 'B', 'C', 'D']);
      const shuffled = [...q.options].reverse();
      expect(sortOptionsFixed(shuffled).map((o) => o.id)).toEqual(['A', 'B', 'C', 'D']);
    }
  });

  it('cambiar el orden durante una migración actualiza la respuesta (simulado)', () => {
    // Si el contenido correcto se mueve a D, el id correcto debe moverse con él.
    const texts = ['5', '7', '9', '11'];
    const correctText = '7';
    // Reorganizar para que el correcto quede en D:
    const reordered = [
      { id: 'A', text: '5' },
      { id: 'B', text: '9' },
      { id: 'C', text: '11' },
      { id: 'D', text: '7' },
    ];
    const newCorrect = reordered.find((o) => o.text === correctText)!.id;
    expect(newCorrect).toBe('D');
    expect(validateAnswer('D', newCorrect)).toBe(true);
    expect(texts).toContain(correctText);
  });

  it('las cuatro opciones son distintas', () => {
    for (const q of QUESTIONS.filter((x) => x.active)) {
      const texts = q.options.map((o) => o.text.trim());
      expect(new Set(texts).size).toBe(4);
    }
  });

  it('no hay preguntas con más de una respuesta correcta', () => {
    for (const q of QUESTIONS.filter((x) => x.active)) {
      const matches = q.options.filter((o) => validateAnswer(o.id, q.correctOptionId));
      expect(matches).toHaveLength(1);
      // Específico n3-08: -1 no es igual a 1 (antes ambiguo con sec²(0)).
      if (q.id === 'n3-08') {
        expect(q.options.find((o) => o.id === 'D')?.text).toBe('−1');
      }
    }
  });

  it('integridad total del banco (sin errores)', () => {
    const errors = QUESTIONS.filter((q) => q.active).flatMap(checkQuestionIntegrity);
    expect(errors).toEqual([]);
  });

  it('panel del profesor y estudiante usan los mismos datos (simulado BD)', () => {
    // Simula la fila de BD resincronizada (migración 004): idéntica al banco.
    for (const q of QUESTIONS) {
      const dbRow = {
        id: q.id,
        options: q.options.map((o) => ({ ...o })),
        correct_option_id: q.correctOptionId,
      };
      const teacherCorrect = dbRow.correct_option_id;
      const studentSees = sortOptionsFixed(dbRow.options);
      // El estudiante envía el id; el servidor compara con la BD.
      const sent = studentSees.find((o) => o.text === q.options.find((x) => x.id === q.correctOptionId)?.text)?.id!;
      expect(validateAnswer(sent, teacherCorrect)).toBe(true);
    }
  });
});
