import { positionLabel } from '@/lib/utils'
import type { PosicionJugador } from '@/types/domain'

import { POSITION_COLOR } from './players-utils'

// Chip de posición con el punto de color (mismo formato que los chips de estado del torneo)
export function PositionChip({ posicion }: { posicion: PosicionJugador }) {
  const color = POSITION_COLOR[posicion]
  return (
    <span
      className="inline-flex h-[26px] w-fit items-center gap-[7px] whitespace-nowrap rounded-full border px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em]"
      style={{ color, backgroundColor: `${color}24`, borderColor: `${color}52` }}
    >
      <span className="size-[7px] rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {positionLabel[posicion]}
    </span>
  )
}
