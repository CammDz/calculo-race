-- Cálculo Race · Migración 005: avance automático cuando todos respondan.
-- Añade a games:
--   auto_advance boolean default false (el profesor lo activa por partida)
--   auto_advance_delay_sec integer default 2 (pausa para mostrar el resultado)
-- No toca preguntas, equipos, respuestas ni históricos. Reversible con DROP COLUMN.
-- Ejecutar en Supabase SQL Editor DESPUÉS de 004.

alter table public.games
  add column if not exists auto_advance boolean not null default false;

alter table public.games
  add column if not exists auto_advance_delay_sec integer not null default 2
  check (auto_advance_delay_sec between 1 and 10);

-- La Edge Function `submit-answer` (service_role) actualiza games sin RLS adicional;
-- los profesores actualizan su propia partida (policy "games update teachers" ya lo permite).
-- Verificación:
-- select id, code, auto_advance, auto_advance_delay_sec from public.games limit 5;
