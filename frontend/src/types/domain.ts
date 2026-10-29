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
  user_id?: string | null
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
  // Equipos anotados (id y nombre), para mostrar el cupo con escudos
  equipos_inscriptos: Array<{ id: number; nombre: string }>
}

export interface EquipoResumen {
  equipo_id: number
  equipo: string
  cant_jugadores: number
}

export interface Jugador {
  id: number
  usuario_id: string
  nombre: string
  posicion: PosicionJugador
  unido_en: string
  // Viene en mi_equipo(): el primer jugador es el administrador del equipo
  es_admin_del_equipo?: boolean
}

export interface JugadorDetalle extends Jugador {
  equipo_id: number
  equipo: string
}

export interface UsuarioSeleccionable {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
}

// Consulta enviada desde el formulario de Contacto
export interface Contacto {
  id: number
  nombre: string
  email: string
  mensaje: string
  creado_en: string
}

export interface TorneoDelEquipo {
  id: number
  nombre: string
  tipo_futbol: number
  estado: EstadoTorneo
  fecha: string
  max_equipos: number
}

export interface UsuarioBuscado {
  id: string
  nombre: string
  email: string
  equipo_id: number | null
}

export interface EquipoDetalle {
  id: number
  nombre: string
  jugadores: Jugador[]
}

export interface EquipoAdmin {
  id: number
  nombre: string
  creado_en: string
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
  // Solo lo recibe el administrador del equipo (el primer jugador); el resto recibe null
  codigo_equipo: string | null
  // true si el usuario logueado es el administrador del equipo
  soy_creador: boolean
  // true si el equipo está inscripto en un torneo sin terminar
  compitiendo: boolean
  mi_posicion: PosicionJugador
  jugadores: Jugador[]
}

export interface NuevoTorneoInput {
  user_id?: string
  nombre: string
  descripcion?: string
  tipo_futbol: 5 | 7 | 9 | 11
  max_equipos: 2 | 4 | 8 | 16
  visibilidad: VisibilidadTorneo
  fecha: string
  lugar?: string
}

export interface NuevoJugadorInput {
  usuario_id: string
  equipo_id: number
  posicion: PosicionJugador
}
