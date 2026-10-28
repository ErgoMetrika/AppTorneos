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
