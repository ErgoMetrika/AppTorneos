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
