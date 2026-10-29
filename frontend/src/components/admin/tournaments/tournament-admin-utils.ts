// Reglas y textos de la gestión de torneos del administrador general.
// Los valores válidos los controla la base: acá solo se anticipan para mostrar el motivo.
import type { EstadoTorneo, PartidoLlave, TorneoListado } from '@/types/domain'

export const MODALIDADES = [5, 7, 9, 11] as const
export const CUPOS = [2, 4, 8, 16] as const

// Tamaños con los que la base arma la llave (eliminación directa sin equipos libres)
const TAMANOS_LLAVE = [2, 4, 8, 16]

export type FiltroEstado = 'todos' | EstadoTorneo

export const FILTROS: Array<{ value: FiltroEstado; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'inscripcion', label: 'Inscripción' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'finalizado', label: 'Finalizados' },
]

// Orden de la lista: primero los que necesitan atención
export const ORDEN_ESTADO: Record<EstadoTorneo, number> = { inscripcion: 0, en_curso: 1, finalizado: 2 }

export interface EstadoLlave {
  puede: boolean
  // Equipos con los que se armaría la llave (o los que hacen falta para la próxima llave posible)
  objetivo: number
  faltan: number
  motivo: string
}

const equipos = (n: number) => `${n} ${n === 1 ? 'equipo' : 'equipos'}`

// ¿Se puede generar la llave? Solo en inscripción y con 2, 4, 8 o 16 inscriptos.
export function estadoLlave(torneo: TorneoListado): EstadoLlave {
  const inscriptos = torneo.inscriptos
  if (torneo.estado !== 'inscripcion') {
    return { puede: false, objetivo: inscriptos, faltan: 0, motivo: 'La llave ya está generada' }
  }
  if (TAMANOS_LLAVE.includes(inscriptos)) {
    const libres = torneo.max_equipos - inscriptos
    const extra = libres > 0 ? ` · si la generás ahora se cierra${libres === 1 ? ' el lugar libre' : `n los ${libres} lugares libres`}` : ''
    return { puede: true, objetivo: inscriptos, faltan: 0, motivo: `Lista para armar la llave con ${equipos(inscriptos)}${extra}` }
  }
  const objetivo = TAMANOS_LLAVE.find((tamano) => tamano >= Math.max(2, inscriptos) && tamano <= torneo.max_equipos) ?? torneo.max_equipos
  const faltan = Math.max(0, objetivo - inscriptos)
  return {
    puede: false,
    objetivo,
    faltan,
    motivo: `${faltan === 1 ? 'Falta 1 equipo' : `Faltan ${faltan} equipos`} para generar la llave`,
  }
}

// Nombre de la ronda según cuántas quedan hasta la final
export function nombreRonda(rondasHastaFinal: number) {
  return ['Final', 'Semifinales', 'Cuartos de final', 'Octavos de final'][rondasHastaFinal] ?? `Ronda ${rondasHastaFinal + 1}`
}

export interface ResumenLlave {
  hayPartidos: boolean
  rondaActual: string | null
  porCargar: number
  campeon: string | null
}

// Resumen de la llave para la fila: qué ronda se juega, cuántos partidos faltan cargar y el campeón
export function resumenLlave(partidos: PartidoLlave[]): ResumenLlave {
  if (partidos.length === 0) return { hayPartidos: false, rondaActual: null, porCargar: 0, campeon: null }
  const ultimaRonda = Math.max(...partidos.map((partido) => partido.ronda))
  const pendientes = partidos.filter((partido) => partido.estado !== 'finalizado')
  const final = partidos.find((partido) => partido.ronda === ultimaRonda)
  if (pendientes.length === 0) {
    return { hayPartidos: true, rondaActual: null, porCargar: 0, campeon: final?.ganador ?? null }
  }
  const ronda = Math.min(...pendientes.map((partido) => partido.ronda))
  // Solo cuentan los partidos que ya tienen a los dos equipos definidos
  const porCargar = pendientes.filter((partido) => partido.ronda === ronda && partido.equipo_local_id && partido.equipo_visitante_id).length
  return { hayPartidos: true, rondaActual: nombreRonda(ultimaRonda - ronda), porCargar, campeon: null }
}

// "A", "A y B", "A, B y C"
export function listaNombres(nombres: string[]) {
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

// Claves de las consultas que dependen de un torneo (listas, detalle, llave y equipos)
export function consultasDelTorneo(id: number) {
  return [['tournaments'], ['tournament', id], ['bracket', id], ['team-tournaments'], ['my-team']] as const
}
