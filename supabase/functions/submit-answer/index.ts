// Edge Function: submit-answer (Deno / Supabase).
// Valida en SERVIDOR (autoridad definitiva): ventana de pregunta, una sola
// respuesta (idempotente), respuesta correcta oculta al cliente, puntos
// base+bonus, anti-duplicados y avance automático opcional.
// El cliente NUNCA decide sus puntos ni la respuesta correcta.
//
// Regla de validación ÚNICA (misma que validateAnswer() en src/lib/gameLogic.ts):
//   normalize(selectedOptionId) === normalize(correct_option_id), con A/B/C/D.
// Las opciones tienen identificadores estables y orden fijo A,B,C,D (sin mezclar).
//
// Avance automático (games.auto_advance):
//   Cuando todos los equipos participantes responden, la pregunta se cierra una
//   sola vez y, tras games.auto_advance_delay_sec (2 s por defecto), se publica
//   la siguiente sin saltarse niveles. Usa compare-and-set sobre
//   games.current_question_id para que respuestas simultáneas no generen avances
//   duplicados. Los puntos quedan guardados ANTES de avanzar. Si el tiempo termina
//   antes, manda la regla del cronómetro. Sin equipos activos no hace nada.
//
// Despliegue: supabase functions deploy submit-answer

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WINDOW_MS = 60_000;
const MAX_BONUS = 20;

function normalizeOptionId(id: unknown): string {
  return String(id ?? '').trim().toUpperCase();
}

/** Única validación: identificador estable seleccionado vs. correcto guardado. */
function validateAnswer(selectedOptionId: unknown, correctOptionId: unknown): boolean {
  const sel = normalizeOptionId(selectedOptionId);
  const corr = normalizeOptionId(correctOptionId);
  if (!['A', 'B', 'C', 'D'].includes(sel)) return false;
  if (!['A', 'B', 'C', 'D'].includes(corr)) return false;
  return sel === corr;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405);
  }
  try {
    const body = await req.json();
    const { gameId, teamId, questionId, selectedOptionId, responseTimeMs } = body ?? {};
    if (!gameId || !teamId || !questionId || !['A', 'B', 'C', 'D'].includes(normalizeOptionId(selectedOptionId))) {
      return json({ error: 'Datos incompletos.' }, 400);
    }
    if (typeof responseTimeMs !== 'number' || responseTimeMs < 0 || responseTimeMs > WINDOW_MS * 2) {
      return json({ error: 'Tiempo de respuesta inválido.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // solo servidor
    );

    // Idempotencia: si ya respondió, devolver lo registrado sin duplicar.
    const { data: existing } = await supabase.from('answers')
      .select('*').eq('game_id', gameId).eq('team_id', teamId).eq('question_id', questionId)
      .maybeSingle();
    if (existing) {
      const st = await autoAdvanceCheck(supabase, gameId, questionId);
      return json({ correct: existing.is_correct, points: existing.points_awarded, alreadyAnswered: true, ...st }, 200);
    }

    const [{ data: game }, { data: question }, { data: team }] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).single(),
      supabase.from('questions').select('*').eq('id', questionId).single(),
      supabase.from('teams').select('*').eq('id', teamId).single(),
    ]);
    if (!game || !question || !team || team.game_id !== gameId) {
      return json({ error: 'Partida o equipo inválido.' }, 404);
    }
    // Ventana cerrada: 0 puntos, se registra como respondida para bloquear reintentos.
    if (game.question_closes_at && Date.now() > Date.parse(game.question_closes_at)) {
      return json({ error: 'El tiempo de esta pregunta ya terminó.' }, 409);
    }
    if (game.current_question_id !== questionId) {
      return json({ error: 'Esta pregunta ya no está activa.' }, 409);
    }

    const correct = validateAnswer(selectedOptionId, question.correct_option_id);
    const base = { 1: game.points_l1, 2: game.points_l2, 3: game.points_l3, 4: game.points_l4 }[question.level] ?? 100;
    const bonus = correct ? Math.max(0, Math.round((1 - Math.min(responseTimeMs, WINDOW_MS) / WINDOW_MS) * MAX_BONUS)) : 0;
    const points = correct ? base + bonus : 0;

    const { error: insErr } = await supabase.from('answers').insert({
      game_id: gameId, team_id: teamId, question_id: questionId,
      selected_option_id: normalizeOptionId(selectedOptionId), is_correct: correct,
      points_awarded: points, response_time_ms: Math.floor(responseTimeMs),
    });
    if (insErr) {
      // Carrera duplicada (unique): leer lo ya guardado.
      if (/duplicate|unique/i.test(insErr.message)) {
        const { data: again } = await supabase.from('answers')
          .select('*').eq('game_id', gameId).eq('team_id', teamId).eq('question_id', questionId).single();
        const st = await autoAdvanceCheck(supabase, gameId, questionId);
        return json({ correct: again.is_correct, points: again.points_awarded, alreadyAnswered: true, ...st }, 200);
      }
      throw insErr;
    }

    await supabase.from('teams').update({
      score: team.score + points,
      correct_count: team.correct_count + (correct ? 1 : 0),
      total_response_time_ms: Number(team.total_response_time_ms ?? 0) + Math.floor(responseTimeMs),
      last_seen_at: new Date().toISOString(),
    }).eq('id', teamId);

    await supabase.from('score_events').insert({
      game_id: gameId, team_id: teamId, question_id: questionId, points, reason: 'answer',
    });

    // Puntos ya guardados: ahora evaluar el avance automático (servidor).
    const st = await autoAdvanceCheck(supabase, gameId, questionId);
    return json({ correct, points, alreadyAnswered: false, ...st }, 200);
  } catch (_e) {
    // Mensaje genérico: no revelar detalles internos.
    return json({ error: 'No se pudo registrar la respuesta. Intenta de nuevo.' }, 500);
  }
});

/** Si auto_advance está activo y todos los participantes respondieron, cierra la
 *  pregunta una sola vez y publica la siguiente tras el intervalo configurado.
 *  Retorna { allAnswered, autoAdvanced }. Nunca se salta niveles ni entra en
 *  bucle con 0 equipos. El cierre es idempotente vía compare-and-set. */
async function autoAdvanceCheck(supabase: ReturnType<typeof createClient>, gameId: string, questionId: string) {
  try {
    const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (!game || !game.auto_advance) return { allAnswered: false, autoAdvanced: false };
    if (game.current_question_id !== questionId) return { allAnswered: false, autoAdvanced: false };
    if (!['level_1', 'level_2', 'level_3', 'level_4'].includes(game.status)) {
      return { allAnswered: false, autoAdvanced: false };
    }
    const [{ data: teams }, { data: answers }] = await Promise.all([
      supabase.from('teams').select('id,created_at').eq('game_id', gameId),
      supabase.from('answers').select('team_id').eq('game_id', gameId).eq('question_id', questionId),
    ]);
    const list = teams ?? [];
    if (list.length === 0) return { allAnswered: false, autoAdvanced: false };
    // Participantes: creados antes de abrir la pregunta (tolerancia 1 s).
    const opened = game.question_opened_at ? Date.parse(game.question_opened_at) : NaN;
    const participants = Number.isNaN(opened)
      ? list
      : list.filter((t: { created_at: string }) => Date.parse(t.created_at) <= opened + 1000);
    if (participants.length === 0) return { allAnswered: false, autoAdvanced: false };
    const answered = new Set((answers ?? []).map((a: { team_id: string }) => a.team_id));
    const allAnswered = participants.every((t: { id: string }) => answered.has(t.id));
    if (!allAnswered) return { allAnswered: false, autoAdvanced: false };

    // Cerrar la pregunta UNA sola vez (compare-and-set: solo si sigue activa).
    const closesAt = new Date().toISOString();
    const { data: closed } = await supabase.from('games').update({
      question_closes_at: closesAt,
    }).eq('id', gameId).eq('current_question_id', questionId).select('id').maybeSingle();
    // Si otra respuesta simultánea ya avanzó/cerró, no duplicar.
    if (!closed) return { allAnswered: true, autoAdvanced: false };

    // Intervalo para mostrar el resultado (configurable, 2 s por defecto).
    const delaySec = Math.max(1, Math.min(10, Number(game.auto_advance_delay_sec ?? 2)));
    await new Promise((r) => setTimeout(r, delaySec * 1000));

    // Releer: si el profesor ya avanzó manualmente o la fase cambió, respetar.
    const { data: fresh } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (!fresh || fresh.current_question_id !== questionId) {
      return { allAnswered: true, autoAdvanced: false };
    }
    const level = Number(fresh.current_level ?? 1);
    const { data: pool } = await supabase.from('questions').select('id').eq('level', level).eq('active', true).order('id');
    const ids: string[] = (pool ?? []).map((q: { id: string }) => q.id);
    if (ids.length === 0) return { allAnswered: true, autoAdvanced: false };
    const idx = ids.indexOf(questionId);
    const nextId = ids[(idx + 1) % ids.length] ?? ids[0];
    const now = new Date();
    // Avance idempotente: solo si la pregunta sigue siendo la misma.
    const { data: advanced } = await supabase.from('games').update({
      current_question_id: nextId,
      question_opened_at: now.toISOString(),
      question_closes_at: new Date(now.getTime() + WINDOW_MS).toISOString(),
    }).eq('id', gameId).eq('current_question_id', questionId).select('id').maybeSingle();
    return { allAnswered: true, autoAdvanced: !!advanced };
  } catch {
    return { allAnswered: false, autoAdvanced: false };
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
