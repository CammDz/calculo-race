-- Cálculo Race · Migración 001: esquema base, RLS y vista pública.
-- Tablas: profiles, questions, games, teams, answers, score_events.

create extension if not exists "pgcrypto";

-- Perfiles de profesores (1:1 con auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- Banco de preguntas (el profesor las administra; los estudiantes ven la vista pública)
create table if not exists public.questions (
  id text primary key,
  level smallint not null check (level between 1 and 4),
  topic text not null,
  difficulty text not null check (difficulty in ('facil','media','dificil')),
  statement text not null,
  options jsonb not null,
  correct_option_id text not null check (correct_option_id in ('A','B','C','D')),
  explanation text not null default '',
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_questions_level on public.questions(level);
create index if not exists idx_questions_active on public.questions(active) where active = true;

-- Partidas
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) = 6),
  teacher_id uuid references public.profiles(id) on delete set null,
  status text not null default 'lobby'
    check (status in ('lobby','level_1','level_2','level_3','level_4','podium','finished','paused')),
  max_teams smallint not null default 8 check (max_teams between 6 and 10),
  elapsed_sec integer not null default 0 check (elapsed_sec >= 0),
  server_started_at timestamptz,
  created_at timestamptz not null default now(),
  current_question_id text references public.questions(id) on delete set null,
  current_level smallint not null default 1 check (current_level between 1 and 4),
  points_l1 integer not null default 100,
  points_l2 integer not null default 150,
  points_l3 integer not null default 200,
  points_l4 integer not null default 300,
  show_explanations boolean not null default true,
  question_opened_at timestamptz,
  question_closes_at timestamptz
);
create index if not exists idx_games_code on public.games(code);
create index if not exists idx_games_teacher on public.games(teacher_id);

-- Equipos (un dispositivo por equipo en el MVP)
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 24),
  ship_color text not null default '#38bdf8',
  score integer not null default 0,
  correct_count integer not null default 0,
  total_response_time_ms bigint not null default 0,
  connected boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (game_id, name)
);
create index if not exists idx_teams_game on public.teams(game_id);
create index if not exists idx_teams_score on public.teams(game_id, score desc);

-- Respuestas (una por equipo y pregunta; idempotente)
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  question_id text not null references public.questions(id),
  selected_option_id text not null check (selected_option_id in ('A','B','C','D')),
  is_correct boolean not null default false,
  points_awarded integer not null default 0,
  response_time_ms integer not null default 0,
  created_at timestamptz not null default now(),
  unique (game_id, team_id, question_id)
);
create index if not exists idx_answers_game on public.answers(game_id);
create index if not exists idx_answers_team on public.answers(team_id);

-- Registro de puntuaciones (auditoría)
create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  question_id text not null,
  points integer not null,
  reason text not null default 'answer',
  created_at timestamptz not null default now()
);
create index if not exists idx_score_events_game on public.score_events(game_id);

-- Reloj oficial del servidor
create or replace function public.server_now()
returns timestamptz language sql stable as $$ select now(); $$;

-- Vista pública de preguntas SIN respuesta correcta (los estudiantes nunca la ven)
create or replace view public.public_questions as
  select id, level, topic, difficulty, statement, options
  from public.questions where active = true;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.games enable row level security;
alter table public.teams enable row level security;
alter table public.answers enable row level security;
alter table public.score_events enable row level security;

-- profiles: cada profesor ve/edita solo el suyo
drop policy if exists "profiles own" on public.profiles;
create policy "profiles own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- questions: lectura para todos los autenticados + anónimos en partida (vista pública
-- controlada por función); escritura solo para profesores autenticados.
drop policy if exists "questions read all" on public.questions;
create policy "questions read all" on public.questions for select using (true);
drop policy if exists "questions write teachers" on public.questions;
create policy "questions write teachers" on public.questions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- games: lectura pública por código (para unirse), escritura solo del dueño o service_role.
drop policy if exists "games read all" on public.games;
create policy "games read all" on public.games for select using (true);
drop policy if exists "games insert teachers" on public.games;
create policy "games insert teachers" on public.games
  for insert with check (auth.role() = 'authenticated' or auth.role() = 'service_role');
drop policy if exists "games update teachers" on public.games;
create policy "games update teachers" on public.games
  for update using (auth.uid() = teacher_id or auth.role() = 'service_role');

-- teams: cualquiera puede leer equipos de una partida e insertar el suyo (join),
-- pero NO puede actualizar puntos (solo service_role / Edge Function).
drop policy if exists "teams read all" on public.teams;
create policy "teams read all" on public.teams for select using (true);
drop policy if exists "teams join insert" on public.teams;
create policy "teams join insert" on public.teams for insert with check (true);
drop policy if exists "teams update server only" on public.teams;
create policy "teams update server only" on public.teams
  for update using (auth.role() = 'service_role' or auth.role() = 'authenticated');

-- answers: lectura de la propia partida; inserción vía Edge Function (service_role).
drop policy if exists "answers read game" on public.answers;
create policy "answers read game" on public.answers for select using (true);
drop policy if exists "answers insert server" on public.answers;
create policy "answers insert server" on public.answers
  for insert with check (auth.role() = 'service_role' or auth.role() = 'anon' or auth.role() = 'authenticated');

-- score_events: solo lectura para clientes; escritura del servidor.
drop policy if exists "score read" on public.score_events;
create policy "score read" on public.score_events for select using (true);
drop policy if exists "score write server" on public.score_events;
create policy "score write server" on public.score_events
  for insert with check (auth.role() = 'service_role');
