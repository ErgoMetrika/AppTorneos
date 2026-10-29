// Datos y estilos compartidos de la pantalla Jugadores (mismo lenguaje que la gestión de torneos)
import type { PosicionJugador } from '@/types/domain'

export const POSITIONS: PosicionJugador[] = ['arquero', 'defensor', 'mediocampista', 'delantero']

export const POSITION_TAG: Record<PosicionJugador, string> = { arquero: 'ARQ', defensor: 'DEF', mediocampista: 'MED', delantero: 'DEL' }

// Color de cada posición (sale de la paleta de equipos para no sumar tonos nuevos)
export const POSITION_COLOR: Record<PosicionJugador, string> = {
  arquero: '#f2c94c',
  defensor: '#56ccf2',
  mediocampista: '#35f46e',
  delantero: '#ff8a4c',
}

export type FiltroPosicion = 'todas' | PosicionJugador

export const CARD = 'rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] shadow-[0_14px_34px_rgba(0,0,0,0.38)]'
export const LABEL = 'font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#b7c8bd]'
export const FOCUS = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3]'

// Sin tildes ni mayúsculas, para que "Martín" aparezca buscando "martin"
export const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`
