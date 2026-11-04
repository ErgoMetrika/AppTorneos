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
