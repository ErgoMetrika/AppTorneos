-- =====================================================
-- Migración 9: ARREGLOS DE SEGURIDAD (revisión de código)
--
-- No agrega tablas ni columnas. Ajusta permisos, políticas y controles:
--   1. Penales negativos: la base ya no los acepta.
--   2. Mails privados: nadie lee el mail de otro usuario por la API.
--      Solo se accede con funciones que controlan quién pregunta.
--   3. Perfil: cada usuario solo puede cambiar su nombre (no su mail).
--   4. Torneos privados: sus inscriptos y su llave solo los ven el admin
--      y los equipos inscriptos, igual que el torneo.
--   5. Bajas al mismo tiempo: se hacen de a una por equipo.
--   6. El admin general también respeta la regla del plantel mínimo al
--      quitar o mover jugadores, y al generar la llave se revisan los planteles.
-- =====================================================

-- -----------------------------------------------------
-- 1. Penales: nunca negativos
-- -----------------------------------------------------
alter table public.partidos
  add constraint chk_penales_no_negativos
  check ((penales_local is null or penales_local >= 0) and (penales_visitante is null or penales_visitante >= 0));

-- -----------------------------------------------------
-- 2 y 3. Usuarios: el mail no se lee directo y solo se edita el nombre
-- -----------------------------------------------------
revoke select, update on public.usuarios from anon, authenticated;
grant  select (id, nombre, rol, creado_en) on public.usuarios to authenticated;
grant  update (nombre) on public.usuarios to authenticated;

-- mi_perfil(): el perfil propio, con el mail
create or replace function public.mi_perfil()
returns table (id uuid, nombre varchar, email varchar, rol public.rol_usuario)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.nombre, u.email, u.rol
  from public.usuarios u
  where u.id = auth.uid();
$$;

-- buscar_jugador_por_mail(mail): para invitar.
-- Solo para el administrador de un equipo (o el admin general) y con el mail
-- COMPLETO: así no se pueden recorrer los mails de todos con pedacitos.
create or replace function public.buscar_jugador_por_mail(p_mail text)
returns table (id uuid, nombre varchar, email varchar, equipo_id bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_admin()
     and not exists (select 1 from public.equipos e where e.creado_por = auth.uid()) then
    raise exception 'Solo el administrador del equipo puede buscar jugadores para invitar.';
  end if;

  return query
    select u.id, u.nombre, u.email, j.equipo_id
    from public.usuarios u
    left join public.jugadores j on j.usuario_id = u.id
    where lower(u.email) = lower(trim(p_mail))
      and u.rol = 'general'
    limit 1;
end;
$$;

-- usuarios_disponibles(): usuarios generales sin equipo, para que el admin los asigne
create or replace function public.usuarios_disponibles()
returns table (id uuid, nombre varchar, email varchar, rol public.rol_usuario)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver los usuarios disponibles.';
  end if;

  return query
    select u.id, u.nombre, u.email, u.rol
    from public.usuarios u
    where u.rol = 'general'
      and not exists (select 1 from public.jugadores j where j.usuario_id = u.id)
    order by u.nombre;
end;
$$;

-- -----------------------------------------------------
-- 4. Torneos privados: inscriptos y llave con la misma regla que el torneo
-- -----------------------------------------------------
create or replace function public.puede_ver_torneo(p_torneo_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.torneos t
    where t.id = p_torneo_id
      and (
        t.visibilidad = 'publico'
        or public.es_admin()
        or exists (
          select 1
          from public.torneo_equipos te
          join public.jugadores j on j.equipo_id = te.equipo_id
          where te.torneo_id = t.id and j.usuario_id = auth.uid()
        )
      )
  );
$$;

drop policy if exists "torneo_equipos: ver" on public.torneo_equipos;
create policy "torneo_equipos: ver"
  on public.torneo_equipos for select to anon, authenticated
  using (public.puede_ver_torneo(torneo_id));

drop policy if exists "partidos: ver" on public.partidos;
create policy "partidos: ver"
  on public.partidos for select to anon, authenticated
  using (public.puede_ver_torneo(torneo_id));

-- -----------------------------------------------------
-- 5. Bajas de a una por equipo: se bloquea la fila del equipo antes de contar
-- -----------------------------------------------------
create or replace function public.validar_baja_de_jugador(p_equipo_id bigint)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_torneo  record;
  v_plantel int;
begin
  -- Si dos bajas del mismo equipo llegan juntas, la segunda espera a la primera
  perform 1 from public.equipos where id = p_equipo_id for update;

  if public.equipo_compitiendo(p_equipo_id) then
    raise exception 'El equipo está jugando un torneo: no puede perder jugadores hasta que termine.';
  end if;

  select count(*) into v_plantel from public.jugadores where equipo_id = p_equipo_id;

  -- El torneo en inscripción más exigente en el que está anotado
  select t.nombre, t.tipo_futbol into v_torneo
  from public.torneo_equipos te
  join public.torneos t on t.id = te.torneo_id
  where te.equipo_id = p_equipo_id
    and t.estado = 'inscripcion'
  order by t.tipo_futbol desc
  limit 1;

  if v_torneo.nombre is not null and v_plantel - 1 < v_torneo.tipo_futbol + 2 then
    raise exception 'El equipo quedaría con % jugadores y "%" pide al menos %.',
      v_plantel - 1, v_torneo.nombre, v_torneo.tipo_futbol + 2;
  end if;
end;
$$;

-- -----------------------------------------------------
-- 6a. Regla del plantel también para el admin general.
-- Se controla cuando alguien quita o mueve un jugador de forma directa.
-- Los borrados en cascada (por ejemplo, al borrar un equipo o un usuario)
-- no pasan por acá: pg_trigger_depth() es mayor a 1 en esos casos.
-- -----------------------------------------------------
create or replace function public.controlar_baja_de_jugador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return coalesce(old, new);
  end if;

  if tg_op = 'DELETE' or new.equipo_id is distinct from old.equipo_id then
    perform public.validar_baja_de_jugador(old.equipo_id);
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_controlar_baja_de_jugador
  before delete or update of equipo_id on public.jugadores
  for each row execute function public.controlar_baja_de_jugador();

-- -----------------------------------------------------
-- 6b. Al empezar un torneo (generar la llave) se revisan los planteles:
-- ningún equipo puede arrancar por debajo del mínimo.
-- -----------------------------------------------------
create or replace function public.controlar_inicio_de_torneo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipo record;
begin
  if old.estado = 'inscripcion' and new.estado = 'en_curso' then
    select e.nombre, count(j.id)::int as plantel into v_equipo
    from public.torneo_equipos te
    join public.equipos e on e.id = te.equipo_id
    left join public.jugadores j on j.equipo_id = e.id
    where te.torneo_id = new.id
    group by e.id, e.nombre
    having count(j.id) < new.tipo_futbol + 2
    limit 1;

    if v_equipo.nombre is not null then
      raise exception '"%" tiene % jugadores y fútbol % pide al menos %. No se puede generar la llave.',
        v_equipo.nombre, v_equipo.plantel, new.tipo_futbol, new.tipo_futbol + 2;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_controlar_inicio_de_torneo
  before update of estado on public.torneos
  for each row execute function public.controlar_inicio_de_torneo();

-- -----------------------------------------------------
-- PERMISOS
-- -----------------------------------------------------
revoke execute on function public.mi_perfil()                       from public, anon;
revoke execute on function public.buscar_jugador_por_mail(text)     from public, anon;
revoke execute on function public.usuarios_disponibles()            from public, anon;
revoke execute on function public.puede_ver_torneo(bigint)          from public;
revoke execute on function public.controlar_baja_de_jugador()       from public, anon;
revoke execute on function public.controlar_inicio_de_torneo()      from public, anon;

grant execute on function public.mi_perfil()                        to authenticated;
grant execute on function public.buscar_jugador_por_mail(text)      to authenticated;
grant execute on function public.usuarios_disponibles()             to authenticated;
grant execute on function public.puede_ver_torneo(bigint)           to anon, authenticated;
grant execute on function public.controlar_baja_de_jugador()        to authenticated;
grant execute on function public.controlar_inicio_de_torneo()       to authenticated;
