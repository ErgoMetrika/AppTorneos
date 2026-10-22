-- =====================================================
-- Migración 2: FUNCIONES (reglas de negocio)
--
-- En la versión MySQL estas validaciones las hacía PHP antes de cada INSERT.
-- Acá viven dentro de la base como funciones, y el front las llama con
-- supabase.rpc('nombre_funcion', { parametros }).
--
-- Todas son SECURITY DEFINER: corren con permisos del dueño de la base, por
-- eso pueden insertar en tablas donde el usuario común no tiene permiso
-- directo. A cambio, cada función valida por su cuenta quién la llama
-- (auth.uid()) y qué puede hacer.
--
-- Si una regla no se cumple, la función lanza un error con `raise exception`
-- y el front lo recibe en `error.message`.
-- =====================================================

-- -----------------------------------------------------
-- es_admin(): ¿el usuario logueado tiene rol admin?
-- Se usa en las políticas RLS y en las funciones de administración.
-- -----------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- -----------------------------------------------------
-- mi_equipo(): devuelve el equipo del usuario logueado con su código y plantel.
-- Es la única forma en que un usuario común ve un codigo_equipo
-- (la columna está oculta para consultas directas, ver migración 3).
-- Devuelve NULL si el usuario no está en ningún equipo.
-- -----------------------------------------------------
create or replace function public.mi_equipo()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'id',            e.id,
           'nombre',        e.nombre,
           'codigo_equipo', e.codigo_equipo,
           'creado_en',     e.creado_en,
           'mi_posicion',   yo.posicion,
           'jugadores',     (
             select coalesce(jsonb_agg(jsonb_build_object(
                      'jugador_id', j.id,
                      'usuario_id', j.usuario_id,
                      'nombre',     u.nombre,
                      'posicion',   j.posicion,
                      'unido_en',   j.unido_en
                    ) order by j.unido_en), '[]'::jsonb)
             from public.jugadores j
             join public.usuarios u on u.id = j.usuario_id
             where j.equipo_id = e.id
           )
         )
  from public.jugadores yo
  join public.equipos e on e.id = yo.equipo_id
  where yo.usuario_id = auth.uid();
$$;

-- -----------------------------------------------------
-- crear_equipo(nombre, posicion)
-- Regla: un usuario crea un equipo y queda como su primer jugador.
--   * Debe estar logueado.
--   * No puede estar ya en otro equipo (1 usuario = máx. 1 jugador).
--   * El nombre del equipo no puede repetirse (UNIQUE en la tabla).
-- Devuelve el equipo creado, incluido el codigo_equipo para compartir.
-- -----------------------------------------------------
create or replace function public.crear_equipo(
  p_nombre   text,
  p_posicion public.posicion_jugador
)
returns public.equipos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipo public.equipos;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión para crear un equipo.';
  end if;

  if exists (select 1 from public.jugadores where usuario_id = auth.uid()) then
    raise exception 'Ya formás parte de un equipo.';
  end if;

  if length(trim(p_nombre)) < 3 then
    raise exception 'El nombre del equipo debe tener al menos 3 caracteres.';
  end if;

  insert into public.equipos (nombre)
  values (trim(p_nombre))
  returning * into v_equipo;

  insert into public.jugadores (usuario_id, equipo_id, posicion)
  values (auth.uid(), v_equipo.id, p_posicion);

  return v_equipo;
exception
  when unique_violation then
    raise exception 'Ya existe un equipo con ese nombre.';
end;
$$;

-- -----------------------------------------------------
-- unirse_a_equipo(codigo, posicion)
-- Regla: un usuario entra a un equipo con el código de 6 letras.
--   * Debe estar logueado.
--   * No puede estar ya en otro equipo.
--   * El código tiene que existir.
-- Devuelve la fila de jugadores creada.
-- -----------------------------------------------------
create or replace function public.unirse_a_equipo(
  p_codigo   text,
  p_posicion public.posicion_jugador
)
returns public.jugadores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipo_id bigint;
  v_jugador   public.jugadores;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión para unirte a un equipo.';
  end if;

  if exists (select 1 from public.jugadores where usuario_id = auth.uid()) then
    raise exception 'Ya formás parte de un equipo.';
  end if;

  select id into v_equipo_id
  from public.equipos
  where codigo_equipo = upper(trim(p_codigo));

  if v_equipo_id is null then
    raise exception 'El código de equipo no existe.';
  end if;

  insert into public.jugadores (usuario_id, equipo_id, posicion)
  values (auth.uid(), v_equipo_id, p_posicion)
  returning * into v_jugador;

  return v_jugador;
end;
$$;

-- -----------------------------------------------------
-- buscar_torneo_privado(codigo)
-- Los torneos privados no aparecen en el listado (política RLS).
-- Con esta función, un usuario que tiene el código puede encontrarlo.
-- Devuelve el torneo, o nada si el código no coincide.
-- -----------------------------------------------------
create or replace function public.buscar_torneo_privado(p_codigo text)
returns setof public.torneos
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.torneos
  where visibilidad = 'privado'
    and codigo_acceso = upper(trim(p_codigo));
$$;

-- -----------------------------------------------------
-- inscribir_equipo(torneo_id, equipo_id, codigo_acceso)
-- Regla de inscripción (la más importante del sistema):
--   1. El que inscribe debe estar logueado y ser jugador de ESE equipo.
--   2. El torneo debe estar en estado 'inscripcion'.
--   3. Tiene que haber cupo: inscriptos < max_equipos.
--   4. El equipo debe tener plantel mínimo: jugadores >= tipo_futbol + 2
--      (titulares + 2 suplentes).
--   5. Si el torneo es privado, el codigo_acceso tiene que coincidir.
--   6. No se puede inscribir dos veces (PK compuesta de torneo_equipos).
-- Se bloquea la fila del torneo (FOR UPDATE) para que dos equipos no
-- ocupen el último cupo al mismo tiempo.
-- -----------------------------------------------------
create or replace function public.inscribir_equipo(
  p_torneo_id     bigint,
  p_equipo_id     bigint,
  p_codigo_acceso text default null
)
returns public.torneo_equipos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_torneo      public.torneos;
  v_inscriptos  int;
  v_plantel     int;
  v_inscripcion public.torneo_equipos;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión para inscribir un equipo.';
  end if;

  -- 1. Es jugador del equipo que quiere inscribir
  if not exists (
    select 1 from public.jugadores
    where usuario_id = auth.uid() and equipo_id = p_equipo_id
  ) then
    raise exception 'Solo un jugador del equipo puede inscribirlo.';
  end if;

  select * into v_torneo
  from public.torneos
  where id = p_torneo_id
  for update;

  if v_torneo.id is null then
    raise exception 'El torneo no existe.';
  end if;

  -- 2. Estado
  if v_torneo.estado <> 'inscripcion' then
    raise exception 'El torneo ya no acepta inscripciones.';
  end if;

  -- 3. Cupo
  select count(*) into v_inscriptos
  from public.torneo_equipos
  where torneo_id = p_torneo_id;

  if v_inscriptos >= v_torneo.max_equipos then
    raise exception 'El torneo ya tiene el cupo completo (% equipos).', v_torneo.max_equipos;
  end if;

  -- 4. Plantel mínimo
  select count(*) into v_plantel
  from public.jugadores
  where equipo_id = p_equipo_id;

  if v_plantel < v_torneo.tipo_futbol + 2 then
    raise exception 'El equipo necesita al menos % jugadores para fútbol % (tiene %).',
      v_torneo.tipo_futbol + 2, v_torneo.tipo_futbol, v_plantel;
  end if;

  -- 5. Código de acceso si es privado
  if v_torneo.visibilidad = 'privado'
     and v_torneo.codigo_acceso <> upper(trim(coalesce(p_codigo_acceso, ''))) then
    raise exception 'El código de acceso del torneo es incorrecto.';
  end if;

  -- 6. Insertar (la PK evita la doble inscripción)
  insert into public.torneo_equipos (torneo_id, equipo_id)
  values (p_torneo_id, p_equipo_id)
  returning * into v_inscripcion;

  return v_inscripcion;
exception
  when unique_violation then
    raise exception 'El equipo ya está inscripto en este torneo.';
end;
$$;

-- -----------------------------------------------------
-- generar_llave(torneo_id)   [solo admin]
-- Arma el cuadro de eliminación directa y pasa el torneo a 'en_curso'.
--   * El torneo debe estar en 'inscripcion' y sin partidos generados.
--   * La cantidad de inscriptos debe ser 2, 4, 8 o 16 (potencia de 2)
--     para que la llave cierre sin equipos "libres".
--   * Los equipos se sortean al azar en la ronda 1.
--   * Se crean vacíos los partidos de las rondas siguientes y se enlazan:
--       partido (ronda r, llave k) -> partido (ronda r+1, llave ceil(k/2))
--       llave impar -> ocupa el lado 'local'; llave par -> 'visitante'.
-- Devuelve los partidos creados.
-- -----------------------------------------------------
create or replace function public.generar_llave(p_torneo_id bigint)
returns setof public.partidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_torneo   public.torneos;
  v_equipos  bigint[];
  v_n        int;
  v_rondas   int;
  v_ronda    int;
  v_llave    int;
  v_partidos int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede generar la llave.';
  end if;

  select * into v_torneo from public.torneos where id = p_torneo_id for update;

  if v_torneo.id is null then
    raise exception 'El torneo no existe.';
  end if;

  if v_torneo.estado <> 'inscripcion' then
    raise exception 'La llave solo se genera con el torneo en inscripción.';
  end if;

  if exists (select 1 from public.partidos where torneo_id = p_torneo_id) then
    raise exception 'El torneo ya tiene partidos generados.';
  end if;

  -- Equipos inscriptos en orden aleatorio (sorteo)
  select array_agg(equipo_id order by random()) into v_equipos
  from public.torneo_equipos
  where torneo_id = p_torneo_id;

  v_n := coalesce(array_length(v_equipos, 1), 0);

  if v_n not in (2, 4, 8, 16) then
    raise exception 'Para armar la llave hacen falta 2, 4, 8 o 16 equipos inscriptos (hay %).', v_n;
  end if;

  v_rondas := (log(2, v_n))::int;   -- 2->1, 4->2, 8->3, 16->4

  -- Ronda 1: con los equipos sorteados
  for v_llave in 1 .. v_n / 2 loop
    insert into public.partidos (torneo_id, ronda, llave, equipo_local_id, equipo_visitante_id)
    values (p_torneo_id, 1, v_llave, v_equipos[2 * v_llave - 1], v_equipos[2 * v_llave]);
  end loop;

  -- Rondas siguientes: vacías
  for v_ronda in 2 .. v_rondas loop
    v_partidos := v_n / (2 ^ v_ronda)::int;
    for v_llave in 1 .. v_partidos loop
      insert into public.partidos (torneo_id, ronda, llave)
      values (p_torneo_id, v_ronda, v_llave);
    end loop;
  end loop;

  -- Enlazar cada partido con el siguiente
  update public.partidos p
  set partido_siguiente_id = sig.id,
      lado_siguiente       = case when p.llave % 2 = 1 then 'local' else 'visitante' end::public.lado_partido
  from public.partidos sig
  where p.torneo_id   = p_torneo_id
    and sig.torneo_id = p_torneo_id
    and sig.ronda     = p.ronda + 1
    and sig.llave     = ceil(p.llave / 2.0);

  update public.torneos set estado = 'en_curso' where id = p_torneo_id;

  return query
    select * from public.partidos
    where torneo_id = p_torneo_id
    order by ronda, llave;
end;
$$;

-- -----------------------------------------------------
-- cargar_resultado(partido_id, goles_local, goles_visitante, penales_local, penales_visitante)
-- [solo admin]
-- Regla del resultado:
--   * El partido debe tener los dos equipos definidos y no estar finalizado.
--   * Goles distintos -> gana el que hizo más.
--   * Empate -> los penales son obligatorios y no pueden empatar.
--   * El partido pasa a 'finalizado' y el ganador se copia al partido
--     siguiente en el lado que indica lado_siguiente.
--   * Si no hay partido siguiente, era la final: el torneo pasa a 'finalizado'.
-- Devuelve el partido actualizado.
-- -----------------------------------------------------
create or replace function public.cargar_resultado(
  p_partido_id        bigint,
  p_goles_local       int,
  p_goles_visitante   int,
  p_penales_local     int default null,
  p_penales_visitante int default null
)
returns public.partidos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partido public.partidos;
  v_ganador bigint;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cargar resultados.';
  end if;

  select * into v_partido from public.partidos where id = p_partido_id for update;

  if v_partido.id is null then
    raise exception 'El partido no existe.';
  end if;

  if v_partido.estado = 'finalizado' then
    raise exception 'El partido ya está finalizado.';
  end if;

  if v_partido.equipo_local_id is null or v_partido.equipo_visitante_id is null then
    raise exception 'El partido todavía no tiene los dos equipos definidos.';
  end if;

  if p_goles_local < 0 or p_goles_visitante < 0 then
    raise exception 'Los goles no pueden ser negativos.';
  end if;

  -- Determinar ganador
  if p_goles_local > p_goles_visitante then
    v_ganador := v_partido.equipo_local_id;
  elsif p_goles_visitante > p_goles_local then
    v_ganador := v_partido.equipo_visitante_id;
  else
    if p_penales_local is null or p_penales_visitante is null then
      raise exception 'Hubo empate: hay que cargar los penales.';
    end if;
    if p_penales_local = p_penales_visitante then
      raise exception 'Los penales no pueden terminar empatados.';
    end if;
    v_ganador := case when p_penales_local > p_penales_visitante
                      then v_partido.equipo_local_id
                      else v_partido.equipo_visitante_id end;
  end if;

  -- Si no hubo empate, los penales se guardan en NULL
  update public.partidos
  set goles_local       = p_goles_local,
      goles_visitante   = p_goles_visitante,
      penales_local     = case when p_goles_local = p_goles_visitante then p_penales_local end,
      penales_visitante = case when p_goles_local = p_goles_visitante then p_penales_visitante end,
      ganador_id        = v_ganador,
      estado            = 'finalizado'
  where id = p_partido_id
  returning * into v_partido;

  -- Avanzar al ganador o cerrar el torneo
  if v_partido.partido_siguiente_id is not null then
    if v_partido.lado_siguiente = 'local' then
      update public.partidos set equipo_local_id = v_ganador where id = v_partido.partido_siguiente_id;
    else
      update public.partidos set equipo_visitante_id = v_ganador where id = v_partido.partido_siguiente_id;
    end if;
  else
    update public.torneos set estado = 'finalizado' where id = v_partido.torneo_id;
  end if;

  return v_partido;
end;
$$;

-- -----------------------------------------------------
-- PERMISOS DE EJECUCIÓN
-- Por defecto cualquier rol puede ejecutar funciones nuevas; lo restringimos.
-- anon = visitante sin login; authenticated = usuario logueado.
-- -----------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- Funciones internas (las usan triggers y defaults al insertar como usuario logueado)
grant execute on function public.generar_codigo()        to authenticated;
grant execute on function public.torneo_codigo_acceso()  to authenticated;
grant execute on function public.crear_perfil_usuario()  to supabase_auth_admin;

-- Funciones que llama el front con supabase.rpc(...)
grant execute on function public.es_admin()                                   to anon, authenticated;
grant execute on function public.mi_equipo()                                  to authenticated;
grant execute on function public.crear_equipo(text, public.posicion_jugador)  to authenticated;
grant execute on function public.unirse_a_equipo(text, public.posicion_jugador) to authenticated;
grant execute on function public.buscar_torneo_privado(text)                  to authenticated;
grant execute on function public.inscribir_equipo(bigint, bigint, text)       to authenticated;
grant execute on function public.generar_llave(bigint)                        to authenticated;
grant execute on function public.cargar_resultado(bigint, int, int, int, int) to authenticated;
