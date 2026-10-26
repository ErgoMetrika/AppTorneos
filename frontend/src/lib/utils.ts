import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { EstadoTorneo, PosicionJugador, VisibilidadTorneo } from '@/types/domain'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value: string, pattern = "d 'de' MMMM, yyyy") {
  return format(parseISO(value), pattern, { locale: es })
}

export const tournamentStateLabel: Record<EstadoTorneo, string> = {
  inscripcion: 'Inscripción abierta',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
}

export const positionLabel: Record<PosicionJugador, string> = {
  arquero: 'Arquero',
  defensor: 'Defensor',
  mediocampista: 'Mediocampista',
  delantero: 'Delantero',
}

export const visibilityLabel: Record<VisibilidadTorneo, string> = {
  publico: 'Público',
  privado: 'Privado',
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado.'
}
