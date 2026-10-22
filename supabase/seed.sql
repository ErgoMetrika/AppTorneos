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
