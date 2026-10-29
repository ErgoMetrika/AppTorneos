// "Tus torneos": cuántos torneos hay en cada estado (inscripción, en curso, finalizados).
// Cada tarjeta lleva a la gestión de torneos.
import { ArrowRight } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Ball, Pitch, Trophy } from '@/components/visuals/art'
import { cn } from '@/lib/utils'
import type { EstadoTorneo, TorneoListado } from '@/types/domain'

import { CARD, FOCUS, SECTION_TITLE, byDateAsc, byDateDesc } from './home-data'

interface CounterConfig {
  state: EstadoTorneo
  label: string
  color: string
  chip: string
  art: ReactNode
}

const COUNTERS: CounterConfig[] = [
  { state: 'inscripcion', label: 'Inscripción', color: 'bg-[#35f46e]', chip: 'border-[#35f46e]/30 bg-[#35f46e]/14 text-[#35f46e]', art: <Pitch className="w-[120px] flex-none" /> },
  { state: 'en_curso', label: 'En curso', color: 'bg-[#f2c94c]', chip: 'border-[#f2c94c]/30 bg-[#f2c94c]/14 text-[#f2c94c]', art: <Ball className="size-[68px] flex-none" /> },
  { state: 'finalizado', label: 'Finalizados', color: 'bg-[#b7c8bd]', chip: 'border-[#b7c8bd]/30 bg-[#b7c8bd]/14 text-[#b7c8bd]', art: <Trophy className="h-[73px] w-auto flex-none" /> },
]

// Texto chico debajo del número: el torneo más cercano de ese estado, o un aviso si no hay
function caption(state: EstadoTorneo, list: TorneoListado[]) {
  if (list.length === 0) {
    return state === 'inscripcion' ? 'Ninguno con la inscripción abierta' : state === 'en_curso' ? 'Ninguno jugándose ahora' : 'Todavía no terminó ninguno'
  }
  if (state === 'finalizado') return `El último: ${[...list].sort(byDateDesc)[0].nombre}`
  const first = [...list].sort(byDateAsc)[0].nombre
  return list.length === 1 ? first : `${first} y ${list.length - 1} más`
}

export function StateCounters({ tournaments }: { tournaments: TorneoListado[] }) {
  return (
    <section aria-labelledby="inicio-estados" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="inicio-estados" className={SECTION_TITLE}>Tus torneos</h2>
        <Link to="/app/admin/torneos" className={cn('ml-auto inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[#35f46e] hover:text-[#7dffa3]', FOCUS)}>
          Ir a la gestión de torneos<ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="grid gap-6 md:grid-cols-3">
        {COUNTERS.map((counter, index) => {
          const list = tournaments.filter((item) => item.estado === counter.state)
          return (
            <li key={counter.state} className="anim-stagger" style={{ '--i': index + 2 } as CSSProperties}>
              <Link to="/app/admin/torneos" className={cn(CARD, 'card-lift flex h-full flex-col overflow-hidden text-inherit no-underline hover:border-[#35f46e]/45', FOCUS)}>
                <span aria-hidden="true" className={cn('h-[5px]', counter.color)} />
                <span className="flex items-center justify-between gap-4 px-6 py-[22px]">
                  <span className="flex min-w-0 flex-col gap-2">
                    <span className={cn('inline-flex h-[26px] w-fit items-center gap-[7px] whitespace-nowrap rounded-full border px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em]', counter.chip)}>
                      <span aria-hidden="true" className={cn('size-[7px] rounded-full', counter.color)} />{counter.label}
                    </span>
                    <span className="font-display text-[60px] font-black leading-none text-[#f4f8f5]">
                      {list.length}<span className="sr-only"> {list.length === 1 ? 'torneo' : 'torneos'}</span>
                    </span>
                    <span className="truncate text-[13px] text-[#b7c8bd]">{caption(counter.state, list)}</span>
                  </span>
                  <span aria-hidden="true" className="anim-pop">{counter.art}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
