// Contadores del encabezado: total de jugadores, cuántos hay por posición y cuántos equipos tienen plantel
import type { CSSProperties } from 'react'

import { Jersey, TeamCrest } from '@/components/visuals/art'
import { cn, positionLabel } from '@/lib/utils'
import type { PosicionJugador } from '@/types/domain'

import { CARD, LABEL, POSITIONS, POSITION_COLOR, POSITION_TAG, plural } from './players-utils'

interface PlayersCountersProps {
  total: number
  byPosition: Record<PosicionJugador, number>
  teams: number
  loading: boolean
}

export function PlayersCounters({ total, byPosition, teams, loading }: PlayersCountersProps) {
  const value = (count: number) => (loading ? '–' : count)

  return (
    <section aria-label="Resumen de jugadores" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))_1.1fr]">
      {/* Total, con camiseta de fondo */}
      <div className={cn(CARD, 'anim-stagger col-span-2 flex items-center justify-between gap-3 overflow-hidden px-5 py-4 sm:col-span-1 lg:col-span-1')} style={{ '--i': 0 } as CSSProperties}>
        <div className="flex min-w-0 flex-col gap-1">
          <span className={LABEL}>Jugadores</span>
          <span className="font-display text-[52px] font-black leading-none text-[#f4f8f5]">
            {value(total)}<span className="sr-only"> en total</span>
          </span>
        </div>
        <Jersey name="Torneo" color="verde" pattern="bastones" className="anim-pop size-16 shrink-0" />
      </div>

      {/* Equipos con al menos un jugador */}
      <div className={cn(CARD, 'anim-stagger col-span-2 flex items-center justify-between gap-3 overflow-hidden px-5 py-4 sm:col-span-1 lg:order-last lg:col-span-1')} style={{ '--i': 5 } as CSSProperties}>
        <div className="flex min-w-0 flex-col gap-1">
          <span className={LABEL}>Equipos</span>
          <span className="font-display text-[52px] font-black leading-none text-[#f4f8f5]">
            {value(teams)}<span className="sr-only"> con jugadores</span>
          </span>
        </div>
        <TeamCrest name="Equipos" color="celeste" className="anim-pop h-16 w-14 shrink-0" />
      </div>

      {/* Uno por posición, con barra de proporción */}
      {POSITIONS.map((position, index) => {
        const count = byPosition[position]
        const percent = total > 0 ? Math.round((count / total) * 100) : 0
        const color = POSITION_COLOR[position]
        return (
          <div key={position} className={cn(CARD, 'anim-stagger flex min-w-0 flex-col gap-2 overflow-hidden px-4 py-4')} style={{ '--i': index + 1 } as CSSProperties}>
            <span className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color }}>{positionLabel[position]}</span>
              <span className="font-display text-sm font-extrabold text-[#8fa596]" aria-hidden="true">{POSITION_TAG[position]}</span>
            </span>
            <span className="font-display text-[40px] font-black leading-none text-[#f4f8f5]">
              {value(count)}<span className="sr-only"> {count === 1 ? 'jugador' : 'jugadores'}</span>
            </span>
            <span className="h-1.5 w-full overflow-hidden rounded-[3px] bg-[#f4f8f5]/8" aria-hidden="true">
              <span className="anim-fill block h-full rounded-[3px]" style={{ width: `${percent}%`, backgroundColor: color, '--i': index } as CSSProperties} />
            </span>
            <span className="sr-only">{loading ? '' : `${plural(count, 'jugador', 'jugadores')} de ${total}`}</span>
          </div>
        )
      })}
    </section>
  )
}
