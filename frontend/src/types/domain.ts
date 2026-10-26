export type RolUsuario = 'admin' | 'general'
export type VisibilidadTorneo = 'publico' | 'privado'
export type EstadoTorneo = 'inscripcion' | 'en_curso' | 'finalizado'
export type PosicionJugador = 'arquero' | 'defensor' | 'mediocampista' | 'delantero'
export type EstadoPartido = 'pendiente' | 'en_curso' | 'finalizado'

export interface PerfilUsuario {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
}

export interface Torneo {
  id: number
  nombre: string
  descripcion: string | null
  tipo_futbol: 5 | 7 | 9 | 11
  max_equipos: 2 | 4 | 8 | 16
  visibilidad: VisibilidadTorneo
  codigo_acceso?: string | null
  fecha: string
  lugar: string | null
  estado: EstadoTorneo
}

export interface TorneoListado extends Torneo {
  inscriptos: number
}

export interface EquipoResumen {
  equipo_id: number
  equipo: string
  cant_jugadores: number
}

export interface Jugador {
  nombre: string
  posicion: PosicionJugador
}

export interface EquipoDetalle {
  id: number
  nombre: string
  jugadores: Jugador[]
}

export interface EquipoInscripto {
  id: number
  nombre: string
  inscripto_en: string
}

export interface TorneoDetalle extends Torneo {
  equipos: EquipoInscripto[]
}

export interface PartidoLlave {
  id: number
  torneo_id: number
  ronda: number
  llave: number
  estado: EstadoPartido
  fecha: string | null
  equipo_local_id: number | null
  local: string | null
  goles_local: number
  penales_local: number | null
  equipo_visitante_id: number | null
  visitante: string | null
  goles_visitante: number
  penales_visitante: number | null
  ganador_id: number | null
  ganador: string | null
}

export interface MiEquipo {
  id: number
  nombre: string
  codigo_equipo: string
  mi_posicion: PosicionJugador
  jugadores: Jugador[]
}

export interface NuevoTorneoInput {
  nombre: string
  descripcion?: string
  tipo_futbol: 5 | 7 | 9 | 11
  max_equipos: 2 | 4 | 8 | 16
  visibilidad: VisibilidadTorneo
  fecha: string
  lugar?: string
}
