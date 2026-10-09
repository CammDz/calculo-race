-- Cálculo Race · Migración 002: mínimo de equipos de 6 → 2.
-- Ejecutar en Supabase SQL Editor DESPUÉS de 001_schema.sql.

do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.games'::regclass and contype = 'c'
           and pg_get_constraintdef(oid) like '%max_teams%' loop
    execute format('alter table public.games drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.games
  add constraint games_max_teams_check check (max_teams between 2 and 10);
