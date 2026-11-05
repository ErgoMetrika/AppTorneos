-- =====================================================
-- Torneo 90' - Exportación completa de la base de datos
-- Proyecto Integrador - Programación 4 (UTN Haedo)
-- Motor: PostgreSQL (Supabase)
--
-- Contiene, en este orden: estructura (7 tablas), funciones,
-- seguridad (RLS), las migraciones posteriores y los datos de prueba.
-- Se importa en un proyecto de Supabase (usa el esquema auth de Supabase):
-- Panel de Supabase -> SQL Editor -> pegar este archivo -> Run.
-- Generado el 04/11/2026 a partir de backend/supabase (migraciones + seed).
-- =====================================================


-- #####################################################
-- Archivo: 20261021000001_esquema.sql
-- #####################################################

-- =====================================================
-- Proyecto Integrador - Programación 4 (UTN Haedo)
-- Web de torneos de fútbol (5/7/9/11) por eliminación directa
-- Migración 1: ESQUEMA (7 tablas + vistas)
-- Supabase / PostgreSQL 17
--
-- Diferencias con la versión MySQL original:
--  * Las contraseñas NO se guardan en nuestra tabla: las maneja Supabase Auth
--    (tabla auth.users, hash bcrypt). Nuestra tabla `usuarios` es el "perfil"
--    público del usuario (nombre, rol) y se crea sola con un trigger al registrarse.
--  * Los códigos (codigo_equipo, codigo_acceso) los genera la base, no PHP.
--  * ENUM de MySQL -> tipos ENUM de Postgres.
--  * INT UNSIGNED AUTO_INCREMENT -> bigint generated always as identity.
-- =====================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------
-- TIPOS ENUMERADOS
-- -----------------------------------------------------
create type public.rol_usuario        as enum ('admin', 'general');
create type public.visibilidad_torneo as enum ('publico', 'privado');
create type public.estado_torneo      as enum ('inscripcion', 'en_curso', 'finalizado');
create type public.posicion_jugador   as enum ('arquero', 'defensor', 'mediocampista', 'delantero');
create type public.estado_partido     as enum ('pendiente', 'en_curso', 'finalizado');
create type public.lado_partido       as enum ('local', 'visitante');

-- -----------------------------------------------------
-- FUNCIÓN AUXILIAR: código aleatorio de 6 caracteres
-- (sin 0/O/1/I para que no se confundan al dictarlo)
-- -----------------------------------------------------
create or replace function public.generar_codigo()
returns char(6)
language sql
volatile
as $$
  select string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1),
           ''
         )::char(6)
  from generate_series(1, 6);
$$;

-- -----------------------------------------------------
-- USUARIOS (req. 3: 2 niveles, password encriptada)
-- id = mismo uuid que auth.users. Un usuario puede ser admin y no ser jugador.
-- -----------------------------------------------------
create table public.usuarios (
  id        uuid primary key references auth.users (id) on delete cascade,
  nombre    varchar(80)  not null,
  email     varchar(120) not null unique,
  rol       public.rol_usuario not null default 'general',
  creado_en timestamptz  not null default now()
);

comment on table public.usuarios is 'Perfil público del usuario. La contraseña vive en auth.users (Supabase Auth).';

-- Trigger: cuando alguien se registra en Supabase Auth, se crea su perfil.
-- El nombre se toma de los metadatos del signUp (options.data.nombre); si no viene, usa el email.
create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nombre, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger trg_crear_perfil_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_usuario();

-- -----------------------------------------------------
-- CONTACTOS (req. 5: formulario de contacto)
-- -----------------------------------------------------
create table public.contactos (
  id        bigint generated always as identity primary key,
  nombre    varchar(80)  not null,
  email     varchar(120) not null,
  mensaje   text         not null,
  creado_en timestamptz  not null default now()
);

-- -----------------------------------------------------
-- TORNEOS (contenido principal, req. 2)
-- tipo_futbol = jugadores en cancha; mínimo por equipo = tipo + 2 suplentes
-- max_equipos potencia de 2 para que la llave cierre sin "libres"
-- -----------------------------------------------------
create table public.torneos (
  id            bigint generated always as identity primary key,
  nombre        varchar(120) not null,
  descripcion   text,
  tipo_futbol   smallint not null,
  max_equipos   smallint not null default 8,
  visibilidad   public.visibilidad_torneo not null default 'publico',
  codigo_acceso char(6),                       -- solo si privado; lo genera el trigger
  fecha         date not null,
  lugar         varchar(160),
  estado        public.estado_torneo not null default 'inscripcion',
  constraint chk_tipo_futbol check (tipo_futbol in (5, 7, 9, 11)),
  constraint chk_max_equipos check (max_equipos in (2, 4, 8, 16))
);

create index idx_torneo_estado on public.torneos (estado);

-- Trigger: si es privado y no tiene código, se genera; si es público, el código se borra.
create or replace function public.torneo_codigo_acceso()
returns trigger
language plpgsql
as $$
begin
  if new.visibilidad = 'privado' then
    if new.codigo_acceso is null then
      new.codigo_acceso := public.generar_codigo();
    end if;
  else
    new.codigo_acceso := null;
  end if;
  return new;
end;
$$;

create trigger trg_torneo_codigo_acceso
  before insert or update of visibilidad, codigo_acceso on public.torneos
  for each row execute function public.torneo_codigo_acceso();

-- -----------------------------------------------------
-- EQUIPOS (sin capitán; se entra con codigo_equipo)
-- -----------------------------------------------------
create table public.equipos (
  id            bigint generated always as identity primary key,
  nombre        varchar(80) not null unique,
  codigo_equipo char(6)     not null unique default public.generar_codigo(),
  creado_en     timestamptz not null default now()
);

-- -----------------------------------------------------
-- JUGADORES
-- 1 usuario = como máximo 1 jugador (UNIQUE usuario_id)
-- 1 jugador = exactamente 1 equipo (equipo_id NOT NULL)
-- El perfil de jugador se crea cuando el usuario se suma a un equipo con el código.
-- -----------------------------------------------------
create table public.jugadores (
  id         bigint generated always as identity primary key,
  usuario_id uuid   not null unique references public.usuarios (id) on delete cascade,
  equipo_id  bigint not null references public.equipos (id) on delete cascade,
  posicion   public.posicion_jugador not null,
  unido_en   timestamptz not null default now()
);

create index idx_jug_equipo on public.jugadores (equipo_id);

-- -----------------------------------------------------
-- TORNEO_EQUIPOS (inscripción)
-- Las validaciones (estado, cupo, plantel mínimo, código) están en la
-- función inscribir_equipo() de la migración 2.
-- -----------------------------------------------------
create table public.torneo_equipos (
  torneo_id    bigint not null references public.torneos (id) on delete cascade,
  equipo_id    bigint not null references public.equipos (id) on delete cascade,
  inscripto_en timestamptz not null default now(),
  primary key (torneo_id, equipo_id)             -- evita doble inscripción
);

-- -----------------------------------------------------
-- PARTIDOS (llaves de eliminación directa)
-- ronda 1 = primera ronda; la final es la ronda log2(cantidad de equipos)
-- llave = posición dentro de la ronda (1..N)
-- equipos NULL hasta que la llave anterior se resuelva
-- El ganador se calcula en cargar_resultado() (migración 2) y se copia al
-- partido_siguiente_id en el lado indicado por lado_siguiente.
-- -----------------------------------------------------
create table public.partidos (
  id                   bigint generated always as identity primary key,
  torneo_id            bigint   not null references public.torneos (id) on delete cascade,
  ronda                smallint not null,
  llave                smallint not null,
  equipo_local_id      bigint references public.equipos (id),
  equipo_visitante_id  bigint references public.equipos (id),
  goles_local          smallint not null default 0,
  goles_visitante      smallint not null default 0,
  penales_local        smallint,                 -- solo si hubo empate
  penales_visitante    smallint,
  estado               public.estado_partido not null default 'pendiente',
  ganador_id           bigint references public.equipos (id),
  partido_siguiente_id bigint references public.partidos (id) on delete set null,
  lado_siguiente       public.lado_partido,
  fecha                timestamptz,
  constraint uq_partido_ronda_llave unique (torneo_id, ronda, llave),
  constraint chk_equipos_distintos check (
    equipo_local_id is null or equipo_visitante_id is null or equipo_local_id <> equipo_visitante_id
  )
);

-- =====================================================
-- VISTAS ÚTILES
-- security_invoker = true -> respetan las políticas RLS del usuario que consulta
-- =====================================================

-- Cantidad de jugadores por equipo (para validar inscripción / mostrar plantel)
create view public.v_equipo_plantel
with (security_invoker = true) as
select e.id as equipo_id, e.nombre as equipo, count(j.id)::int as cant_jugadores
from public.equipos e
left join public.jugadores j on j.equipo_id = e.id
group by e.id, e.nombre;

-- Llave completa con nombres de equipos (para dibujar el cuadro)
create view public.v_llave
with (security_invoker = true) as
select
  p.id, p.torneo_id, p.ronda, p.llave, p.estado, p.fecha,
  p.equipo_local_id,     el.nombre as local,     p.goles_local,     p.penales_local,
  p.equipo_visitante_id, ev.nombre as visitante, p.goles_visitante, p.penales_visitante,
  p.ganador_id,          eg.nombre as ganador,
  p.partido_siguiente_id, p.lado_siguiente
from public.partidos p
left join public.equipos el on el.id = p.equipo_local_id
left join public.equipos ev on ev.id = p.equipo_visitante_id
left join public.equipos eg on eg.id = p.ganador_id
order by p.torneo_id, p.ronda, p.llave;


-- #####################################################
-- Archivo: 20261021000002_funciones.sql
-- #####################################################

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


-- #####################################################
-- Archivo: 20261021000003_seguridad.sql
-- #####################################################

-- =====================================================
-- Migración 3: SEGURIDAD (Row Level Security)
--
-- En Supabase el front habla DIRECTO con la base (API REST automática),
-- así que no hay un PHP en el medio que decida quién puede ver o tocar qué.
-- Eso lo hace la base con políticas RLS: cada tabla tiene reglas que dicen
-- qué filas puede leer/escribir cada tipo de usuario.
--
-- Roles de Supabase:
--   anon          = visitante sin iniciar sesión
--   authenticated = usuario con sesión iniciada (auth.uid() es su id)
--   es_admin()    = usuario logueado con rol 'admin' en la tabla usuarios
--
-- Regla general del sistema:
--   * Cualquiera puede VER torneos públicos, equipos, plantel, inscriptos y la llave.
--   * Los usuarios logueados crean equipos, se unen e inscriben a través de
--     las funciones de la migración 2 (no insertan directo en las tablas).
--   * Solo el admin crea/edita torneos, genera la llave y carga resultados.
-- =====================================================

alter table public.usuarios       enable row level security;
alter table public.contactos      enable row level security;
alter table public.torneos        enable row level security;
alter table public.equipos        enable row level security;
alter table public.jugadores      enable row level security;
alter table public.torneo_equipos enable row level security;
alter table public.partidos       enable row level security;

-- -----------------------------------------------------
-- USUARIOS
-- Leer: cualquier logueado (para mostrar nombres en el plantel).
-- Editar: cada uno su propio perfil, pero NO su rol (lo controla el trigger).
-- Admin: todo (incluido cambiar el rol de otro usuario).
-- Insertar: nadie directo; lo hace el trigger al registrarse.
-- -----------------------------------------------------
create policy "usuarios: leer logueados"
  on public.usuarios for select to authenticated
  using (true);

create policy "usuarios: editar propio perfil"
  on public.usuarios for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "usuarios: admin todo"
  on public.usuarios for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Un usuario común no puede autoasignarse rol admin.
-- Si auth.uid() es NULL no vino por la API con sesión (es el seed o el
-- SQL Editor del panel), y ahí sí se permite.
create or replace function public.proteger_rol_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.rol <> old.rol and auth.uid() is not null and not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar el rol de un usuario.';
  end if;
  return new;
end;
$$;

create trigger trg_proteger_rol_usuario
  before update of rol on public.usuarios
  for each row execute function public.proteger_rol_usuario();

grant execute on function public.proteger_rol_usuario() to authenticated;

-- -----------------------------------------------------
-- CONTACTOS
-- Cualquiera (incluso sin login) puede enviar el formulario.
-- Solo el admin lee/borra los mensajes.
-- -----------------------------------------------------
create policy "contactos: enviar formulario"
  on public.contactos for insert to anon, authenticated
  with check (true);

create policy "contactos: admin lee y borra"
  on public.contactos for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- -----------------------------------------------------
-- TORNEOS
-- Ver: públicos para todos. Los privados solo los ve el admin y los equipos
-- ya inscriptos; el resto los encuentra con buscar_torneo_privado(codigo).
-- Crear / editar / borrar: solo admin.
-- -----------------------------------------------------
create policy "torneos: ver"
  on public.torneos for select to anon, authenticated
  using (
    visibilidad = 'publico'
    or public.es_admin()
    or exists (
      select 1
      from public.torneo_equipos te
      join public.jugadores j on j.equipo_id = te.equipo_id
      where te.torneo_id = torneos.id
        and j.usuario_id = auth.uid()
    )
  );

create policy "torneos: admin administra"
  on public.torneos for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- -----------------------------------------------------
-- EQUIPOS
-- Ver: todos (hace falta para dibujar la llave), PERO sin la columna
-- codigo_equipo: ese código solo lo reciben los integrantes vía
-- crear_equipo() y mi_equipo().
-- Crear: solo vía crear_equipo(). Editar / borrar: admin.
-- -----------------------------------------------------
create policy "equipos: ver"
  on public.equipos for select to anon, authenticated
  using (true);

create policy "equipos: admin administra"
  on public.equipos for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Ocultar la columna codigo_equipo en consultas directas.
-- OJO para el front: pedir columnas explícitas (id, nombre, creado_en),
-- un select('*') sobre equipos da "permission denied".
revoke select on public.equipos from anon, authenticated;
grant  select (id, nombre, creado_en) on public.equipos to anon, authenticated;

-- -----------------------------------------------------
-- JUGADORES
-- Ver: todos (plantel de cada equipo).
-- Entrar a un equipo: solo vía crear_equipo() / unirse_a_equipo().
-- Salir del equipo: cada uno borra su propia fila, siempre que el equipo
-- no esté compitiendo (inscripto en un torneo que no terminó).
-- Admin: todo.
-- -----------------------------------------------------
create policy "jugadores: ver"
  on public.jugadores for select to anon, authenticated
  using (true);

create policy "jugadores: salir del equipo"
  on public.jugadores for delete to authenticated
  using (
    usuario_id = auth.uid()
    and not exists (
      select 1
      from public.torneo_equipos te
      join public.torneos t on t.id = te.torneo_id
      where te.equipo_id = jugadores.equipo_id
        and t.estado <> 'finalizado'
    )
  );

create policy "jugadores: admin administra"
  on public.jugadores for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- -----------------------------------------------------
-- TORNEO_EQUIPOS
-- Ver: todos (lista de inscriptos).
-- Inscribirse: solo vía inscribir_equipo().
-- Admin: puede dar de baja una inscripción.
-- -----------------------------------------------------
create policy "torneo_equipos: ver"
  on public.torneo_equipos for select to anon, authenticated
  using (true);

create policy "torneo_equipos: admin administra"
  on public.torneo_equipos for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- -----------------------------------------------------
-- PARTIDOS
-- Ver: todos (la llave es pública).
-- Crear / cargar resultados: solo admin, normalmente vía
-- generar_llave() y cargar_resultado(). Puede editar fecha directo.
-- -----------------------------------------------------
create policy "partidos: ver"
  on public.partidos for select to anon, authenticated
  using (true);

create policy "partidos: admin administra"
  on public.partidos for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- -----------------------------------------------------
-- VISTAS
-- Tienen security_invoker, así que aplican las políticas de arriba.
-- -----------------------------------------------------
grant select on public.v_equipo_plantel to anon, authenticated;
grant select on public.v_llave          to anon, authenticated;


-- #####################################################
-- Archivo: 20261029000004_codigos_admin.sql
-- #####################################################

-- =====================================================
-- Migración 4: CÓDIGOS DE EQUIPO PARA EL ADMINISTRADOR
--
-- La columna equipos.codigo_equipo está oculta para todos los usuarios
-- logueados (ver migración 3), y el admin también es un usuario logueado.
-- Esta función le permite al admin ver el código de cada equipo.
-- No agrega tablas ni columnas.
-- =====================================================

create or replace function public.codigos_de_equipos()
returns table (equipo_id bigint, codigo_equipo char(6))
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver los códigos de los equipos.';
  end if;

  return query
    select e.id, e.codigo_equipo
    from public.equipos e
    order by e.id;
end;
$$;

revoke execute on function public.codigos_de_equipos() from public, anon;
grant  execute on function public.codigos_de_equipos() to authenticated;


-- #####################################################
-- Archivo: 20261029000005_codigo_solo_creador.sql
-- #####################################################

-- =====================================================
-- Migración 5: EL CÓDIGO DEL EQUIPO LO VE SOLO QUIEN LO CREÓ
--
-- Antes, mi_equipo() le devolvía el código a cualquier integrante.
-- Ahora solo se lo devuelve al creador del equipo. El resto recibe NULL.
--
-- La tabla equipos no guarda quién la creó (no hay capitán), así que el
-- creador es el primer jugador que entró al equipo: crear_equipo() lo
-- anota como primer jugador. No agrega tablas ni columnas.
--
-- El administrador sigue viendo todos los códigos con codigos_de_equipos().
-- =====================================================

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
  creador as (
    -- primer jugador del equipo = quien lo creó
    select j.usuario_id
    from public.jugadores j
    join yo on yo.equipo_id = j.equipo_id
    order by j.unido_en, j.id
    limit 1
  )
  select jsonb_build_object(
           'id',            e.id,
           'nombre',        e.nombre,
           'soy_creador',   (select usuario_id from creador) = auth.uid(),
           'codigo_equipo', case when (select usuario_id from creador) = auth.uid()
                                 then e.codigo_equipo end,
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
  from yo
  join public.equipos e on e.id = yo.equipo_id;
$$;


-- #####################################################
-- Archivo: 20261029000006_admin_del_equipo.sql
-- #####################################################

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


-- #####################################################
-- Archivo: 20261029000007_creado_por.sql
-- #####################################################

-- =====================================================
-- Migración 7: EQUIPOS.CREADO_POR (ADMINISTRADOR DEL EQUIPO)
--
-- 1. La posición la elige cada jugador: el administrador del equipo no la
--    puede cambiar, así que se borra cambiar_posicion() (migración 6).
--
-- 2. Nueva columna equipos.creado_por: marca al ADMINISTRADOR DEL EQUIPO.
--    Antes se deducía como "el primer jugador que entró"; ahora queda guardado.
--    Se mantiene sola con un trigger sobre jugadores:
--      * si un equipo no tiene administrador, el primer jugador que entra lo es
--        (el que crea el equipo, o el primero que asigna el admin general);
--      * si el administrador sale o lo sacan, pasa al siguiente que entró;
--      * si el equipo queda vacío, vuelve a NULL.
-- =====================================================

drop function if exists public.cambiar_posicion(bigint, public.posicion_jugador);

-- -----------------------------------------------------
-- Columna nueva
-- -----------------------------------------------------
alter table public.equipos
  add column creado_por uuid references public.usuarios (id) on delete set null;

comment on column public.equipos.creado_por is 'Administrador del equipo. Lo mantiene el trigger trg_admin_del_equipo.';

-- Los equipos que ya existen: su administrador es el primer jugador que entró
update public.equipos e
set creado_por = (
  select j.usuario_id
  from public.jugadores j
  where j.equipo_id = e.id
  order by j.unido_en, j.id
  limit 1
);

-- La columna se puede leer (es un id, sin datos sensibles), igual que id y nombre
grant select (creado_por) on public.equipos to anon, authenticated;

-- -----------------------------------------------------
-- Trigger: mantiene creado_por al día cuando entran o salen jugadores
-- -----------------------------------------------------
create or replace function public.actualizar_admin_del_equipo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Alguien salió del equipo (o el admin general lo cambió de equipo)
  if tg_op in ('DELETE', 'UPDATE') then
    update public.equipos e
    set creado_por = (
      select j.usuario_id
      from public.jugadores j
      where j.equipo_id = e.id
      order by j.unido_en, j.id
      limit 1
    )
    where e.id = old.equipo_id
      and e.creado_por = old.usuario_id
      and not exists (
        select 1 from public.jugadores j
        where j.equipo_id = e.id and j.usuario_id = old.usuario_id
      );
  end if;

  -- Alguien entró a un equipo que no tiene administrador
  if tg_op in ('INSERT', 'UPDATE') then
    update public.equipos
    set creado_por = new.usuario_id
    where id = new.equipo_id
      and creado_por is null;
  end if;

  return null;
end;
$$;

create trigger trg_admin_del_equipo
  after insert or delete or update of equipo_id, usuario_id on public.jugadores
  for each row execute function public.actualizar_admin_del_equipo();

-- -----------------------------------------------------
-- es_admin_del_equipo(): ahora lee la columna
-- -----------------------------------------------------
create or replace function public.es_admin_del_equipo(p_equipo_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.equipos
    where id = p_equipo_id and creado_por = auth.uid()
  );
$$;

-- -----------------------------------------------------
-- mi_equipo(): usa creado_por para marcar al administrador del equipo
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
           'soy_creador',   e.creado_por = auth.uid(),
           'codigo_equipo', case when e.creado_por = auth.uid() then e.codigo_equipo end,
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
                      'es_admin_del_equipo', j.usuario_id = e.creado_por
                    ) order by j.unido_en, j.id), '[]'::jsonb)
             from public.jugadores j
             join public.usuarios u on u.id = j.usuario_id
             where j.equipo_id = e.id
           )
         )
  from public.jugadores yo
  join public.equipos e on e.id = yo.equipo_id
  where yo.usuario_id = auth.uid();
$$;


-- #####################################################
-- Archivo: 20261029000008_quitar_en_inscripcion.sql
-- #####################################################

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


-- #####################################################
-- Archivo: 20261030000009_seguridad_revision.sql
-- #####################################################

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


-- #####################################################
-- Archivo: 20261103000010_escudos.sql
-- #####################################################

-- =====================================================
-- Migración 10: ESCUDOS DE LOS EQUIPOS
--
-- Cada equipo puede elegir su escudo:
--   * un modelo dibujado (pelota, alas, rayo, ...) con color principal,
--     color secundario y borde (oro o plata), o
--   * una imagen propia, subida al bucket público "escudos" de Storage.
-- Si no eligió nada (columnas en NULL), la web dibuja el escudo de siempre.
--
-- Quién puede cambiarlo: el admin general o el administrador del equipo
-- (equipos.creado_por). Se cambia solo con la función cambiar_escudo().
-- =====================================================

-- -----------------------------------------------------
-- Columnas nuevas
-- -----------------------------------------------------
alter table public.equipos
  add column escudo_modelo text
    check (escudo_modelo in ('pelota', 'alas', 'rayo', 'sol', 'corona', 'estrellas', 'parche', 'llamas', 'diamante', 'montana')),
  add column escudo_color text
    check (escudo_color in ('verde', 'amarillo', 'celeste', 'naranja', 'blanco', 'violeta', 'rojo', 'azul', 'negro')),
  add column escudo_color2 text
    check (escudo_color2 in ('auto', 'verde', 'amarillo', 'celeste', 'naranja', 'blanco', 'violeta', 'rojo', 'azul', 'negro')),
  add column escudo_borde text
    check (escudo_borde in ('oro', 'plata')),
  add column escudo_url text
    check (char_length(escudo_url) <= 500);

comment on column public.equipos.escudo_modelo is 'Modelo de escudo dibujado. NULL = escudo automático.';
comment on column public.equipos.escudo_color  is 'Color principal del escudo.';
comment on column public.equipos.escudo_color2 is 'Color secundario (franjas y detalles). auto = tono oscuro del principal.';
comment on column public.equipos.escudo_borde  is 'Borde del escudo: oro o plata.';
comment on column public.equipos.escudo_url    is 'Imagen propia del escudo (Storage, bucket escudos). Si hay imagen, se muestra en lugar del modelo.';

-- Se pueden leer como el nombre (no hay datos sensibles)
grant select (escudo_modelo, escudo_color, escudo_color2, escudo_borde, escudo_url)
  on public.equipos to anon, authenticated;

-- -----------------------------------------------------
-- cambiar_escudo(): guarda el escudo elegido
-- Para volver a un modelo dibujado se manda p_url en NULL.
-- -----------------------------------------------------
create or replace function public.cambiar_escudo(
  p_equipo_id bigint,
  p_modelo    text,
  p_color     text,
  p_color2    text,
  p_borde     text,
  p_url       text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.es_admin() or public.es_admin_del_equipo(p_equipo_id)) then
    raise exception 'Solo el administrador del equipo puede cambiar el escudo.';
  end if;

  -- La imagen tiene que estar en la carpeta del propio equipo del bucket "escudos"
  if p_url is not null
     and p_url not like '%/storage/v1/object/public/escudos/' || p_equipo_id || '/%' then
    raise exception 'La imagen del escudo no es válida.';
  end if;

  update public.equipos
  set escudo_modelo = p_modelo,
      escudo_color  = p_color,
      escudo_color2 = p_color2,
      escudo_borde  = p_borde,
      escudo_url    = p_url
  where id = p_equipo_id;

  if not found then
    raise exception 'El equipo no existe.';
  end if;
end;
$$;

revoke execute on function public.cambiar_escudo(bigint, text, text, text, text, text) from public, anon;
grant  execute on function public.cambiar_escudo(bigint, text, text, text, text, text) to authenticated;

-- -----------------------------------------------------
-- Storage: bucket público "escudos"
-- Cada imagen va en la carpeta del equipo: escudos/<equipo_id>/<archivo>
-- Máximo 2 MB; PNG, JPG o WEBP (SVG no, porque puede traer código).
-- -----------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('escudos', 'escudos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ¿El usuario puede tocar la carpeta de este archivo? (admin general o admin del equipo)
create or replace function public.puede_editar_escudo(p_nombre_archivo text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((storage.foldername(p_nombre_archivo))[1] ~ '^[0-9]+$', false)
     and (public.es_admin()
          or public.es_admin_del_equipo(((storage.foldername(p_nombre_archivo))[1])::bigint));
$$;

revoke execute on function public.puede_editar_escudo(text) from public, anon;
grant  execute on function public.puede_editar_escudo(text) to authenticated;

-- Ver las imágenes no necesita permiso (el bucket es público).
-- Subir, reemplazar y borrar: solo quien administra el equipo.
create policy "escudos: subir"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'escudos' and public.puede_editar_escudo(name));

create policy "escudos: ver archivos propios"
  on storage.objects for select to authenticated
  using (bucket_id = 'escudos' and public.puede_editar_escudo(name));

create policy "escudos: reemplazar"
  on storage.objects for update to authenticated
  using (bucket_id = 'escudos' and public.puede_editar_escudo(name))
  with check (bucket_id = 'escudos' and public.puede_editar_escudo(name));

create policy "escudos: borrar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'escudos' and public.puede_editar_escudo(name));


-- #####################################################
-- Archivo: 20261103000011_alta_en_torneo_en_curso.sql
-- #####################################################

-- =====================================================
-- Migración 11: NO SUMAR JUGADORES A UN EQUIPO QUE ESTÁ JUGANDO
--
-- Si un equipo está anotado en un torneo EN CURSO, su plantel queda
-- congelado: ya no se podía quitar a nadie (migraciones 8 y 9) y ahora
-- tampoco se puede sumar. Vale para todos los caminos:
--   * el admin general que asigna o mueve un jugador,
--   * unirse con el código del equipo,
--   * las invitaciones del administrador del equipo.
-- Cuando el torneo termina (o el equipo queda en uno en inscripción),
-- vuelve a aceptar jugadores.
-- No agrega tablas ni columnas.
-- =====================================================

create or replace function public.controlar_alta_de_jugador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo cuando el jugador entra a un equipo nuevo (alta o cambio de equipo)
  if tg_op = 'INSERT' or new.equipo_id is distinct from old.equipo_id then
    if public.equipo_compitiendo(new.equipo_id) then
      raise exception 'El equipo está jugando un torneo: no puede sumar jugadores hasta que termine.';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_controlar_alta_de_jugador
  before insert or update of equipo_id on public.jugadores
  for each row execute function public.controlar_alta_de_jugador();


-- #####################################################
-- Archivo: 20261104000012_ubicacion_torneo.sql
-- #####################################################

-- =====================================================
-- Migración 12: UBICACIÓN EXACTA DEL TORNEO
--
-- Hasta ahora el torneo guardaba solo el texto del lugar ("lugar").
-- Al cargarlo, el front ahora busca el lugar en un mapa (OpenStreetMap)
-- y guarda también sus coordenadas, así el botón "Cómo llegar" lleva
-- al punto justo en Google Maps aunque el nombre sea ambiguo.
--
-- Agrega dos columnas a "torneos" (pedido de Julián, 03/11/2026):
--   * latitud  (de -90 a 90)
--   * longitud (de -180 a 180)
-- Son opcionales: si el lugar se escribe a mano, quedan vacías y el
-- mapa busca por el texto, como antes. Van las dos juntas o ninguna.
-- Los permisos y políticas de "torneos" no cambian (valen para toda la fila).
-- =====================================================

alter table public.torneos
  add column latitud  numeric(9, 6),
  add column longitud numeric(9, 6),
  add constraint chk_latitud  check (latitud  between -90  and 90),
  add constraint chk_longitud check (longitud between -180 and 180),
  add constraint chk_ubicacion_completa check ((latitud is null) = (longitud is null));

comment on column public.torneos.latitud  is 'Latitud del lugar (opcional, junto con longitud)';
comment on column public.torneos.longitud is 'Longitud del lugar (opcional, junto con latitud)';

-- Los torneos que ya estaban cargados quedan con una dirección real de la zona
-- (buscadas en OpenStreetMap). Se identifican por nombre para que también
-- valga en una base local armada con el seed.
update public.torneos as t
   set lugar = u.lugar, latitud = u.latitud, longitud = u.longitud
  from (values
    ('Copa Fútbol 5 - Abierta', 'La Casona Fútbol 5 y 6, Doctor Ricardo Gutiérrez 65, Ramos Mejía',     -34.640747, -58.571498),
    ('Copa Fútbol 7 - Clubes',  'Club Lawn Tennis de Ramos Mejía, Esteban Echeverría 361, Ramos Mejía',  -34.635850, -58.564152),
    ('libertadores',            'Club Deportivo Morón, Avenida Hipólito Yrigoyen 1770, Morón',           -34.661458, -58.631833),
    ('torneo prrivafdo',        'Club Atlético Sportivo Haedo, Héroes de Malvinas Argentinas 72, Haedo', -34.643915, -58.594037),
    ('Torneo Futbol 5 31/10',   'Centenario 1456, San Antonio de Padua',                                 -34.672976, -58.699371),
    ('Torneo Futbol 7 31/10',   'Centenario 1456, San Antonio de Padua',                                 -34.672976, -58.699371),
    ('Carabao as',              'El Clásico Fútbol 5, General Juan José Valle, Morón',                   -34.656235, -58.625045)
  ) as u (nombre, lugar, latitud, longitud)
 where t.nombre = u.nombre;


-- #####################################################
-- Archivo: seed.sql (datos de prueba)
-- #####################################################

-- =====================================================
-- DATOS DE PRUEBA
-- Mismos datos que el schema.sql original (MySQL), adaptados a Supabase.
-- Todas las contraseñas son "123456" (Supabase exige mínimo 6 caracteres).
--
-- Los usuarios se insertan en auth.users (Supabase Auth). Al insertarse,
-- el trigger trg_crear_perfil_usuario crea solo la fila en public.usuarios,
-- tomando el nombre de raw_user_meta_data ->> 'nombre'.
-- Usamos ids fijos para poder referenciarlos en jugadores.
-- =====================================================

-- -----------------------------------------------------
-- USUARIOS (auth.users + auth.identities)
-- -----------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token,
  is_sso_user
)
select
  '00000000-0000-0000-0000-000000000000',
  ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'authenticated', 'authenticated',
  email,
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('nombre', nombre),
  now(), now(),
  '', '', '', '', '', '', '', '',
  false
from (values
  ( 1, 'Admin',   'admin@torneos.com'),
  ( 2, 'Lucas',   'lucas@mail.com'),
  ( 3, 'Sofia',   'sofia@mail.com'),
  ( 4, 'Mateo',   'mateo@mail.com'),
  ( 5, 'Valen',   'valen@mail.com'),
  ( 6, 'Franco',  'franco@mail.com'),
  ( 7, 'Cami',    'cami@mail.com'),
  ( 8, 'Nico',    'nico@mail.com'),
  ( 9, 'Agus',    'agus@mail.com'),
  (10, 'Tomi',    'tomi@mail.com'),
  (11, 'Juanma',  'juanma@mail.com'),
  (12, 'Santi',   'santi@mail.com'),
  (13, 'Fede',    'fede@mail.com'),
  (14, 'Ramiro',  'ramiro@mail.com'),
  (15, 'Lautaro', 'lautaro@mail.com')
) as u(n, nombre, email);

-- Identidad "email" de cada usuario (la necesita Supabase Auth para el login)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(), now(), now()
from auth.users u
where u.email like '%@mail.com' or u.email = 'admin@torneos.com';

-- El trigger ya creó los perfiles; solo falta marcar al admin
update public.usuarios set rol = 'admin' where email = 'admin@torneos.com';

-- -----------------------------------------------------
-- TORNEOS
-- -----------------------------------------------------
insert into public.torneos (nombre, descripcion, tipo_futbol, max_equipos, visibilidad, codigo_acceso, fecha, lugar, estado) values
('Copa Fútbol 5 - Abierta', 'Torneo abierto de fútbol 5, eliminación directa.',   5, 4, 'publico', null,     '2026-11-15', 'Complejo El Potrero, Ramos Mejía', 'inscripcion'),
('Copa Fútbol 7 - Clubes',  'Torneo privado de fútbol 7 para clubes invitados.',  7, 8, 'privado', 'A7K2PQ', '2026-11-16', 'Club Social Ramos Mejía',           'inscripcion');

-- -----------------------------------------------------
-- EQUIPOS
-- -----------------------------------------------------
insert into public.equipos (nombre, codigo_equipo) values
('Los Pibes',      'PIBES1'),
('Atlético Ramos', 'RAMOS2');

-- -----------------------------------------------------
-- JUGADORES
-- Los Pibes: 7 jugadores (5 + 2 suplentes, cumple para fútbol 5)
-- Atlético Ramos: 7 jugadores
-- -----------------------------------------------------
insert into public.jugadores (usuario_id, equipo_id, posicion)
select
  ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  (select id from public.equipos where nombre = equipo),
  posicion::public.posicion_jugador
from (values
  ( 2, 'Los Pibes', 'arquero'),
  ( 3, 'Los Pibes', 'defensor'),
  ( 4, 'Los Pibes', 'defensor'),
  ( 5, 'Los Pibes', 'mediocampista'),
  ( 6, 'Los Pibes', 'delantero'),
  ( 7, 'Los Pibes', 'delantero'),
  ( 8, 'Los Pibes', 'mediocampista'),
  ( 9, 'Atlético Ramos', 'arquero'),
  (10, 'Atlético Ramos', 'defensor'),
  (11, 'Atlético Ramos', 'defensor'),
  (12, 'Atlético Ramos', 'mediocampista'),
  (13, 'Atlético Ramos', 'mediocampista'),
  (14, 'Atlético Ramos', 'delantero'),
  (15, 'Atlético Ramos', 'delantero')
) as j(n, equipo, posicion);

-- -----------------------------------------------------
-- INSCRIPCIONES: los dos equipos anotados en la Copa Fútbol 5
-- -----------------------------------------------------
insert into public.torneo_equipos (torneo_id, equipo_id)
select t.id, e.id
from public.torneos t, public.equipos e
where t.nombre = 'Copa Fútbol 5 - Abierta';

-- -----------------------------------------------------
-- CONTACTOS
-- -----------------------------------------------------
insert into public.contactos (nombre, email, mensaje) values
('Juan Pérez', 'juan@mail.com', '¿Puedo anotar a mi equipo sin tener los 7 jugadores cargados?');
