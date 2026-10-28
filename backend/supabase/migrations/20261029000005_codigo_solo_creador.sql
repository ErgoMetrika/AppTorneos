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
