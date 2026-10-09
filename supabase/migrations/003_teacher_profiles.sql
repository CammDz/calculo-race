-- Cálculo Race · Migración 003: perfiles automáticos de profesor.
-- Sin esto, crear partidas falla: games.teacher_id referencia a profiles(id)
-- pero el usuario creado en Authentication no tiene fila en profiles.
-- Ejecutar en Supabase SQL Editor DESPUÉS de 001 (y de 002 si aplica).

-- 1. Rellenar perfiles de usuarios ya existentes en Authentication.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- 2. Crear el perfil automáticamente para futuros profesores.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
