// Cálculos del Inicio del admin a partir de los datos reales (torneos y llaves).
// No inventa nada: si falta un dato, devuelve null y la pantalla muestra el estado vacío.
import { parseISO } from 'date-fns'

import type { PartidoLlave, TorneoListado } from '@/types/domain'

// Nombre de cada ronda contando desde la final (la última ronda es la final)
export function roundName(round: number, lastRound: number) {
  const fromEnd = lastRound - round
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semifinal'
  if (fromEnd === 2) return 'Cuartos de final'
  if (fromEnd === 3) return 'Octavos de final'
  return `Ronda ${round}`
}

export interface RoundProgress {
  round: number
  name: string
  total: number
  played: number
}

export interface BracketProgress {
  rounds: RoundProgress[]
  // Ronda en juego: la primera que tiene partidos sin finalizar (null si terminó todo)
  current: RoundProgress | null
  played: number
  total: number
  // Partidos con los dos equipos definidos y sin resultado: los que el admin puede cargar ya
  toLoad: number
}

export function bracketProgress(matches: PartidoLlave[]): BracketProgress {
  const byRound = new Map<number, PartidoLlave[]>()
  for (const match of matches) byRound.set(match.ronda, [...(byRound.get(match.ronda) ?? []), match])
  const roundNumbers = [...byRound.keys()].sort((a, b) => a - b)
  const lastRound = roundNumbers.at(-1) ?? 1
  const rounds = roundNumbers.map((round) => {
    const list = byRound.get(round) ?? []
    return { round, name: roundName(round, lastRound), total: list.length, played: list.filter((match) => match.estado === 'finalizado').length }
  })
  return {
    rounds,
    current: rounds.find((round) => round.played < round.total) ?? null,
    played: rounds.reduce((sum, round) => sum + round.played, 0),
    total: rounds.reduce((sum, round) => sum + round.total, 0),
    toLoad: matches.filter((match) => match.estado !== 'finalizado' && match.equipo_local_id !== null && match.equipo_visitante_id !== null).length,
  }
}

// Campeón: el ganador del partido de la última ronda (la final), si ya está definido
export function championOf(matches: PartidoLlave[]) {
  if (matches.length === 0) return null
  const lastRound = Math.max(...matches.map((match) => match.ronda))
  const final = matches.find((match) => match.ronda === lastRound && match.ganador)
  return final?.ganador ? { name: final.ganador, id: final.ganador_id } : null
}

const time = (item: TorneoListado) => parseISO(item.fecha).getTime()
export const byDateAsc = (a: TorneoListado, b: TorneoListado) => time(a) - time(b)
export const byDateDesc = (a: TorneoListado, b: TorneoListado) => time(b) - time(a)

// Cuántos equipos le faltan a un torneo en inscripción para completar su cupo (2, 4, 8 o 16)
export const missingTeams = (tournament: TorneoListado) => Math.max(0, tournament.max_equipos - tournament.inscriptos)

// "1 equipo" / "3 equipos", "1 partido" / "2 partidos"
export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

// ---------- Clases compartidas de las tarjetas del Inicio ----------
export const CARD = 'rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] shadow-[0_14px_34px_rgba(0,0,0,0.38)]'
export const LABEL = 'font-mono text-[11px] font-bold uppercase tracking-[0.14em]'
export const SECTION_TITLE = 'font-display text-[30px] font-extrabold uppercase leading-none'
// Botones con el foco bien visible (verde claro, como el resto del panel)
export const FOCUS = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3]'
export const BTN = `inline-flex min-h-[46px] items-center justify-center gap-2.5 rounded-xl px-[18px] text-[15px] font-bold transition-[background-color,border-color,color,box-shadow] duration-150 ${FOCUS}`
export const BTN_PRIMARY = `${BTN} bg-[#35f46e] font-extrabold text-[#06110b] shadow-[0_10px_24px_rgba(53,244,110,0.22)] hover:bg-[#7dffa3] hover:shadow-[0_12px_30px_rgba(53,244,110,0.35)]`
export const BTN_SECONDARY = `${BTN} border border-[#f4f8f5]/20 bg-[#10271a] text-[#f4f8f5] hover:border-[#35f46e] hover:bg-[#143220]`
export const BTN_AMBER = `${BTN} bg-[#f2c94c] font-extrabold text-[#06110b] hover:bg-[#ffe08a]`
