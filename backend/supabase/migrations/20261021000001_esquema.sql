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
