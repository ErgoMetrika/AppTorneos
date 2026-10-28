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
