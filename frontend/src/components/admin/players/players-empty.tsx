// Estado vacío ilustrado: cancha tenue con una camiseta encima.
// Distingue "no hay nadie cargado" de "los filtros no encuentran a nadie".
import type { ReactNode } from 'react'

import { BTN_SECONDARY } from '@/components/admin/tournaments/admin-styles'
import { Jersey, Pitch } from '@/components/visuals/art'

interface PlayersEmptyProps {
  filtering: boolean
  isAdmin: boolean
  onClear: () => void
  // Botón para agregar el primer jugador (solo admin)
  action?: ReactNode
}

export function PlayersEmpty({ filtering, isAdmin, onClear, action }: PlayersEmptyProps) {
  const title = filtering ? 'Nadie por acá' : 'Todavía no hay jugadores'
  const description = filtering
    ? 'No encontramos jugadores con esa búsqueda o esos filtros. Probá con otro nombre, posición o equipo.'
    : isAdmin
      ? 'Sumá al primero: elegí un usuario registrado, su equipo y la posición en la que juega.'
      : 'Cuando los equipos armen sus planteles, los jugadores van a aparecer acá.'

  return (
    <section aria-labelledby="jugadores-vacio" className="flex flex-col items-center justify-center gap-3.5 rounded-[20px] border border-dashed border-[#f4f8f5]/16 bg-[#0b1b12] px-5 py-10 text-center sm:px-6">
      <div className="anim-pop relative grid h-[130px] w-[180px] max-w-full place-items-center" aria-hidden="true">
        <Pitch className="absolute inset-0 h-full w-full opacity-60" />
        <Jersey name="Jugadores" color={filtering ? 'blanco' : 'verde'} pattern="bastones" number={filtering ? '?' : '10'} className="relative size-20" />
      </div>
      <h2 id="jugadores-vacio" className="font-display text-[30px] font-extrabold uppercase leading-none">{title}</h2>
      <p className="max-w-[360px] text-sm leading-relaxed text-[#b7c8bd]">{description}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-2.5">
        {filtering && <button type="button" className={BTN_SECONDARY} onClick={onClear}>Limpiar filtros</button>}
        {!filtering && isAdmin && action}
      </div>
    </section>
  )
}
