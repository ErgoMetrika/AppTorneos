import type { PartidoLlave } from '@/types/domain'

// La vista v_llave también trae a qué partido pasa el ganador y en qué lado
export type MatchRow = PartidoLlave & { partido_siguiente_id?: number | null; lado_siguiente?: 'local' | 'visitante' | null }

export type MatchStatus = 'jugable' | 'finalizado' | 'bloqueado'

export interface ScoreDraft {
  golesLocal: number
  golesVisitante: number
  penalesLocal: number
  penalesVisitante: number
}

export const EMPTY_DRAFT: ScoreDraft = { golesLocal: 0, golesVisitante: 0, penalesLocal: 0, penalesVisitante: 0 }

// Nombre de cada ronda contando desde la final (igual que en el detalle del torneo)
export function roundName(round: number, lastRound: number) {
  const fromEnd = lastRound - round
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semifinales'
  if (fromEnd === 2) return 'Cuartos de final'
  if (fromEnd === 3) return 'Octavos de final'
  return `Ronda ${round}`
}

// Nombre de un partido puntual: "Final", "Semifinal 2", "Cuartos 3"...
export function matchName(match: Pick<MatchRow, 'ronda' | 'llave'>, lastRound: number) {
  const fromEnd = lastRound - match.ronda
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return `Semifinal ${match.llave}`
  if (fromEnd === 2) return `Cuartos ${match.llave}`
  if (fromEnd === 3) return `Octavos ${match.llave}`
  return `Ronda ${match.ronda} · Partido ${match.llave}`
}

// Se puede cargar si tiene los dos equipos y no terminó
export function matchStatus(match: MatchRow): MatchStatus {
  if (match.estado === 'finalizado') return 'finalizado'
  if (match.equipo_local_id !== null && match.equipo_visitante_id !== null) return 'jugable'
  return 'bloqueado'
}

export function groupRounds(matches: MatchRow[]) {
  const grouped = new Map<number, MatchRow[]>()
  matches.forEach((match) => grouped.set(match.ronda, [...(grouped.get(match.ronda) ?? []), match]))
  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, list]) => ({ round, list: [...list].sort((a, b) => a.llave - b.llave) }))
}

export const isTied = (draft: ScoreDraft) => draft.golesLocal === draft.golesVisitante

// Ganador según lo que se está cargando: null si empatan también en penales
export function draftWinner(draft: ScoreDraft): 'local' | 'visitante' | null {
  if (draft.golesLocal > draft.golesVisitante) return 'local'
  if (draft.golesVisitante > draft.golesLocal) return 'visitante'
  if (draft.penalesLocal > draft.penalesVisitante) return 'local'
  if (draft.penalesVisitante > draft.penalesLocal) return 'visitante'
  return null
}

// Convierte lo que escribe el usuario en un entero entre 0 y 99
export function clampGoals(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(99, Math.max(0, Math.trunc(value)))
}
