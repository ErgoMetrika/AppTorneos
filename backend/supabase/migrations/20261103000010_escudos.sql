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
