-- =====================================================
-- Migración 8: QUITAR O SALIR CON TORNEOS EN INSCRIPCIÓN
--
-- Antes (migración 6) no se podía quitar jugadores ni salir del equipo si
-- estaba anotado en cualquier torneo sin terminar, aunque no hubiera empezado.
-- Regla nueva:
--   * Torneo EN CURSO: no se puede quitar ni salir.
--   * Torneo EN INSCRIPCIÓN: se puede, siempre que el equipo no quede con
--     menos jugadores que el mínimo de ese torneo (titulares + 2 suplentes).
-- No agrega tablas ni columnas.
-- =====================================================

-- "Compitiendo" pasa a significar: anotado en un torneo que ya empezó
create or replace function public.equipo_compitiendo(p_equipo_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.torneo_equipos te
    join public.torneos t on t.id = te.torneo_id
    where te.equipo_id = p_equipo_id
      and t.estado = 'en_curso'
  );
$$;

-- -----------------------------------------------------
-- validar_baja_de_jugador(equipo_id): controla si el equipo puede perder
-- un jugador. Lanza el error con el motivo si no se puede.
-- -----------------------------------------------------
create or replace function public.validar_baja_de_jugador(p_equipo_id bigint)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_torneo  record;
  v_plantel int;
begin
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
-- quitar_jugador(): igual que antes, con la regla nueva
-- -----------------------------------------------------
create or replace function public.quitar_jugador(p_jugador_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jugador public.jugadores;
begin
  select * into v_jugador from public.jugadores where id = p_jugador_id;
  if v_jugador.id is null then
    raise exception 'El jugador no existe.';
  end if;

  if not public.es_admin_del_equipo(v_jugador.equipo_id) then
    raise exception 'Solo el administrador del equipo puede sacar jugadores.';
  end if;

  if v_jugador.usuario_id = auth.uid() then
    raise exception 'Para irte del equipo usá "Salir del equipo".';
  end if;

  perform public.validar_baja_de_jugador(v_jugador.equipo_id);

  delete from public.jugadores where id = p_jugador_id;
end;
$$;

-- -----------------------------------------------------
-- salir_del_equipo(): igual que antes, con la regla nueva
-- -----------------------------------------------------
create or replace function public.salir_del_equipo()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipo_id bigint;
begin
  select equipo_id into v_equipo_id from public.jugadores where usuario_id = auth.uid();
  if v_equipo_id is null then
    raise exception 'No estás en ningún equipo.';
  end if;

  perform public.validar_baja_de_jugador(v_equipo_id);

  delete from public.jugadores where usuario_id = auth.uid();
end;
$$;

-- La política vieja dejaba borrar la propia fila con la regla anterior.
-- Ahora salir se hace solo con salir_del_equipo().
drop policy if exists "jugadores: salir del equipo" on public.jugadores;

revoke execute on function public.validar_baja_de_jugador(bigint) from public, anon;
grant  execute on function public.validar_baja_de_jugador(bigint) to authenticated;
