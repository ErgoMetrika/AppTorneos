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
