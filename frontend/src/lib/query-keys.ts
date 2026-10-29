import type { QueryClient, QueryKey } from '@tanstack/react-query'

// Consultas a refrescar después de cada operación. Las claves funcionan por prefijo:
// ['team'] invalida también ['team', id], ['player'] invalida ['player', id], etc.

// Cambios en un plantel (alta, baja o edición de jugador, crear equipo, unirse o salir)
export const consultasDelPlantel: readonly QueryKey[] = [
  ['team'],
  ['player'],
  ['players'],
  ['my-team'],
  ['available-users'],
  ['teams'],
  ['team-tournaments'],
]

// Cambios en un torneo (inscribir un equipo, generar la llave)
export function consultasDeInscripcion(tournamentId: number): readonly QueryKey[] {
  return [['tournament', tournamentId], ['tournaments'], ['bracket', tournamentId], ['team-tournaments'], ['my-team']]
}

// Invalida todas las claves pasadas sin esperar el refresco
export function invalidarConsultas(queryClient: QueryClient, keys: readonly QueryKey[]) {
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey })
}
