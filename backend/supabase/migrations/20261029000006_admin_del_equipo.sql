-- =====================================================
-- Migración 6: ADMINISTRADOR DEL EQUIPO
--
-- El primer jugador de cada equipo es su ADMINISTRADOR (el que lo creó, o el
-- primero que asignó el admin general). Los demás son INVITADOS.
--
--   * El administrador del equipo puede cambiar la posición de un invitado
--     o sacarlo del equipo.
--   * Cualquier jugador puede salir del equipo.
--   * Si el administrador del equipo se va, el siguiente que entró pasa a serlo.
--
-- Mientras el equipo compite (inscripto en un torneo que no terminó) no se
-- puede sacar jugadores ni salir, para no romper el plantel mínimo.
-- No agrega tablas ni columnas.
-- =====================================================

-- -----------------------------------------------------
-- es_admin_del_equipo(equipo_id): ¿el usuario logueado es el primer jugador?
-- -----------------------------------------------------
create or replace function public.es_admin_del_equipo(p_equipo_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select j.usuario_id = auth.uid()
    from public.jugadores j
    where j.equipo_id = p_equipo_id
    order by j.unido_en, j.id
    limit 1
  ), false);
$$;

-- -----------------------------------------------------
-- equipo_compitiendo(equipo_id): ¿está inscripto en un torneo sin terminar?
-- -----------------------------------------------------
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
      and t.estado <> 'finalizado'
  );
$$;

-- -----------------------------------------------------
-- cambiar_posicion(jugador_id, posicion): solo el administrador del equipo
-- -----------------------------------------------------
create or replace function public.cambiar_posicion(
  p_jugador_id bigint,
  p_posicion   public.posicion_jugador
)
returns public.jugadores
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
    raise exception 'Solo el administrador del equipo puede cambiar posiciones.';
  end if;

  update public.jugadores set posicion = p_posicion
  where id = p_jugador_id
  returning * into v_jugador;

  return v_jugador;
end;
$$;

-- -----------------------------------------------------
-- quitar_jugador(jugador_id): el administrador del equipo saca a un invitado
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

  if public.equipo_compitiendo(v_jugador.equipo_id) then
    raise exception 'El equipo está compitiendo en un torneo: no se pueden sacar jugadores hasta que termine.';
  end if;

  delete from public.jugadores where id = p_jugador_id;
end;
$$;

-- -----------------------------------------------------
-- salir_del_equipo(): el jugador logueado deja su equipo
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

  if public.equipo_compitiendo(v_equipo_id) then
    raise exception 'Tu equipo está compitiendo en un torneo: no podés salir hasta que termine.';
  end if;

  delete from public.jugadores where usuario_id = auth.uid();
end;
$$;

-- -----------------------------------------------------
-- mi_equipo(): ahora marca quién es el administrador del equipo.
-- Cada jugador trae "id" y "es_admin_del_equipo". El código sigue
-- llegando solo al administrador del equipo.
-- -----------------------------------------------------
create or replace function public.mi_equipo()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with yo as (
    select j.equipo_id, j.posicion
    from public.jugadores j
    where j.usuario_id = auth.uid()
  ),
  admin_equipo as (
    select j.usuario_id
    from public.jugadores j
    join yo on yo.equipo_id = j.equipo_id
    order by j.unido_en, j.id
    limit 1
  )
  select jsonb_build_object(
           'id',            e.id,
           'nombre',        e.nombre,
           'soy_creador',   (select usuario_id from admin_equipo) = auth.uid(),
           'codigo_equipo', case when (select usuario_id from admin_equipo) = auth.uid()
                                 then e.codigo_equipo end,
           'compitiendo',   public.equipo_compitiendo(e.id),
           'creado_en',     e.creado_en,
           'mi_posicion',   yo.posicion,
           'jugadores',     (
             select coalesce(jsonb_agg(jsonb_build_object(
                      'id',                  j.id,
                      'jugador_id',          j.id,
                      'usuario_id',          j.usuario_id,
                      'nombre',              u.nombre,
                      'posicion',            j.posicion,
                      'unido_en',            j.unido_en,
                      'es_admin_del_equipo', j.usuario_id = (select usuario_id from admin_equipo)
                    ) order by j.unido_en, j.id), '[]'::jsonb)
             from public.jugadores j
             join public.usuarios u on u.id = j.usuario_id
             where j.equipo_id = e.id
           )
         )
  from yo
  join public.equipos e on e.id = yo.equipo_id;
$$;

-- -----------------------------------------------------
-- PERMISOS
-- -----------------------------------------------------
revoke execute on function public.es_admin_del_equipo(bigint)                         from public, anon;
revoke execute on function public.equipo_compitiendo(bigint)                          from public, anon;
revoke execute on function public.cambiar_posicion(bigint, public.posicion_jugador)   from public, anon;
revoke execute on function public.quitar_jugador(bigint)                              from public, anon;
revoke execute on function public.salir_del_equipo()                                  from public, anon;

grant execute on function public.es_admin_del_equipo(bigint)                         to authenticated;
grant execute on function public.equipo_compitiendo(bigint)                          to authenticated;
grant execute on function public.cambiar_posicion(bigint, public.posicion_jugador)   to authenticated;
grant execute on function public.quitar_jugador(bigint)                              to authenticated;
grant execute on function public.salir_del_equipo()                                  to authenticated;
