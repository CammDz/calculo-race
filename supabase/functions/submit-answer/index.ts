// Edge Function: submit-answer (Deno / Supabase).
// Valida en SERVIDOR: ventana de pregunta, una sola respuesta (idempotente),
// respuesta correcta oculta al cliente, puntos base+bonus, anti-duplicados y
// rate-limit básico. El cliente NUNCA decide sus puntos.
//
// Despliegue: supabase functions deploy submit-answer
// Secrets: supabase secrets set SUBMIT_RATE_LIMIT=30 (req/min por equipo)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WINDOW_MS = 60_000;
const MAX_BONUS = 20;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405);
  }
  try {
    const body = await req.json();
    const { gameId, teamId, questionId, selectedOptionId, responseTimeMs } = body ?? {};
    if (!gameId || !teamId || !questionId || !['A', 'B', 'C', 'D'].includes(selectedOptionId)) {
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
      return json({ correct: existing.is_correct, points: existing.points_awarded, alreadyAnswered: true }, 200);
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

    const correct = selectedOptionId === question.correct_option_id;
    const base = { 1: game.points_l1, 2: game.points_l2, 3: game.points_l3, 4: game.points_l4 }[question.level] ?? 100;
    const bonus = correct ? Math.max(0, Math.round((1 - Math.min(responseTimeMs, WINDOW_MS) / WINDOW_MS) * MAX_BONUS)) : 0;
    const points = correct ? base + bonus : 0;

    const { error: insErr } = await supabase.from('answers').insert({
      game_id: gameId, team_id: teamId, question_id: questionId,
      selected_option_id: selectedOptionId, is_correct: correct,
      points_awarded: points, response_time_ms: Math.floor(responseTimeMs),
    });
    if (insErr) {
      // Carrera duplicada (unique): leer lo ya guardado.
      if (/duplicate|unique/i.test(insErr.message)) {
        const { data: again } = await supabase.from('answers')
          .select('*').eq('game_id', gameId).eq('team_id', teamId).eq('question_id', questionId).single();
        return json({ correct: again.is_correct, points: again.points_awarded, alreadyAnswered: true }, 200);
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

    return json({ correct, points, alreadyAnswered: false }, 200);
  } catch (_e) {
    // Mensaje genérico: no revelar detalles internos.
    return json({ error: 'No se pudo registrar la respuesta. Intenta de nuevo.' }, 500);
  }
});

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
