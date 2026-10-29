// Datos de las opciones de "Nuevo torneo": modalidades, cupos y textos de cada una.
// Los valores válidos los controla la base; se reusan las listas de la gestión de torneos.
import { CUPOS, MODALIDADES, nombreRonda } from '@/components/admin/tournaments/tournament-admin-utils'

export { CUPOS, MODALIDADES }

// Plantel mínimo para inscribirse: los titulares de la modalidad más 2 suplentes
export const plantelMinimo = (tipo: number) => tipo + 2

// Formación de ejemplo para dibujar en la cancha (líneas de campo, sin contar al arquero)
export const FORMACION: Record<number, number[]> = {
  5: [2, 2],
  7: [3, 2, 1],
  9: [3, 3, 2],
  11: [4, 4, 2],
}

// Primera ronda de la llave según el cupo: 2 → Final, 4 → Semifinales, 8 → Cuartos, 16 → Octavos
export function primeraRonda(cupo: number) {
  return nombreRonda(Math.max(0, Math.round(Math.log2(Math.max(2, cupo))) - 1))
}
