import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Ball, Pitch, Trophy } from '@/components/visuals/art'

import { BTN_PRIMARY, BTN_SECONDARY } from './admin-styles'
import type { FiltroEstado } from './tournament-admin-utils'

const TEXTS: Record<FiltroEstado, { title: string; description: string }> = {
  todos: { title: 'Todavía no hay torneos', description: 'Creá el primero: elegí modalidad, cupo y fecha, y abrí la inscripción.' },
  inscripcion: { title: 'Ninguno en inscripción', description: 'No hay torneos con la inscripción abierta. Creá uno nuevo para que se anoten los equipos.' },
  en_curso: { title: 'Ninguno en juego', description: 'Cuando generes la llave de un torneo en inscripción, va a aparecer acá para cargar los resultados.' },
  finalizado: { title: 'Ninguno terminado', description: 'Cuando se cargue el resultado de una final, el torneo queda acá con su campeón.' },
}

// Estado vacío ilustrado (cancha con la copa encima), con textos según el filtro o la búsqueda
export function TournamentsEmpty({ filter, search, onShowAll, onClearSearch }: { filter: FiltroEstado; search: string; onShowAll: () => void; onClearSearch: () => void }) {
  const searching = search.trim().length > 0
  const { title, description } = searching
    ? { title: 'Ningún torneo por acá', description: `No encontramos torneos que coincidan con «${search.trim()}». Probá con otro nombre o lugar.` }
    : TEXTS[filter]

  return (
    <section aria-labelledby="torneos-vacio" className="flex flex-col items-center justify-center gap-3.5 rounded-[20px] border border-dashed border-[#f4f8f5]/16 bg-[#0b1b12] px-6 py-10 text-center">
      <div className="anim-pop relative grid h-[130px] w-[180px] place-items-center" aria-hidden="true">
        <Pitch className="absolute inset-0 h-full w-full opacity-60" />
        {filter === 'en_curso' && !searching ? <Ball className="relative size-16" /> : <Trophy dim={filter !== 'finalizado'} className="relative h-24" />}
      </div>
      <h2 id="torneos-vacio" className="font-display text-[30px] font-extrabold uppercase leading-none">{title}</h2>
      <p className="max-w-[360px] text-sm leading-relaxed text-[#b7c8bd]">{description}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-2.5">
        {searching && <button type="button" className={BTN_SECONDARY} onClick={onClearSearch}>Limpiar búsqueda</button>}
        {!searching && filter !== 'todos' && <button type="button" className={BTN_SECONDARY} onClick={onShowAll}>Ver todos</button>}
        <Link to="/app/admin/torneos/nuevo" className={BTN_PRIMARY}><Plus aria-hidden="true" />Nuevo torneo</Link>
      </div>
    </section>
  )
}
