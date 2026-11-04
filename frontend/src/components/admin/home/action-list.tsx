// "Necesitan tu acción": lo que el admin tiene que resolver hoy, armado con datos reales.
// - Torneos en curso con partidos listos para cargar (los dos equipos definidos y sin resultado)
// - Torneos en inscripción que ya pueden generar la llave (2, 4, 8 o 16 inscriptos)
// - Torneos en inscripción a los que les faltan equipos para poder generarla
// (mismo cálculo que la gestión de torneos: estadoLlave)
import { ArrowRight, ChevronDown, ClipboardPen, Network, TriangleAlert, UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'
import type { TorneoListado } from '@/types/domain'

import { estadoLlave } from '../tournaments/tournament-admin-utils'
import { CARD, FOCUS, SECTION_TITLE, plural, type BracketProgress } from './home-data'

export interface LiveBracket {
  tournament: TorneoListado
  progress: BracketProgress | null
  loading: boolean
  failed: boolean
}

type Tone = 'amber' | 'green'

interface ActionItem {
  key: string
  to: string
  tone: Tone
  icon: ReactNode
  title: string
  detail?: string
  progress?: { value: number; max: number }
}

function buildActions(live: LiveBracket[], open: TorneoListado[]): ActionItem[] {
  const items: ActionItem[] = []
  for (const { tournament, progress } of live) {
    if (!progress) continue
    if (progress.rounds.length === 0) {
      items.push({ key: `llave-${tournament.id}`, to: `/app/torneos/${tournament.id}`, tone: 'amber', icon: <Network className="size-6" aria-hidden="true" />, title: `${tournament.nombre}: la llave no tiene partidos`, detail: 'Revisá el detalle del torneo' })
    } else if (progress.toLoad > 0) {
      const round = progress.current ? ` de la ${progress.current.name.toLowerCase()}` : ''
      items.push({
        key: `cargar-${tournament.id}`,
        to: `/app/admin/resultados?torneo=${tournament.id}`,
        tone: 'amber',
        icon: <ClipboardPen className="size-6" aria-hidden="true" />,
        title: `${tournament.nombre}: cargar resultados${round}`,
        detail: `${plural(progress.toLoad, 'partido', 'partidos')} por cargar`,
      })
    }
  }
  for (const tournament of open) {
    if (estadoLlave(tournament).puede) {
      const full = tournament.inscriptos === tournament.max_equipos
      items.push({ key: `generar-${tournament.id}`, to: `/app/torneos/${tournament.id}`, tone: 'green', icon: <Network className="size-6" aria-hidden="true" />, title: `${tournament.nombre}: ${full ? 'cupo completo, ' : ''}ya podés generar la llave`, detail: `${tournament.inscriptos}/${tournament.max_equipos} equipos inscriptos` })
    }
  }
  for (const tournament of open) {
    const { puede, faltan: missing, objetivo } = estadoLlave(tournament)
    if (!puede && missing > 0) {
      items.push({
        key: `faltan-${tournament.id}`,
        to: `/app/torneos/${tournament.id}`,
        tone: 'green',
        icon: <UserPlus className="size-6" aria-hidden="true" />,
        title: `${tournament.nombre}: ${missing === 1 ? 'falta 1 equipo' : `faltan ${missing} equipos`} para generar la llave`,
        progress: { value: tournament.inscriptos, max: objetivo },
      })
    }
  }
  return items
}

const TONE: Record<Tone, { row: string; icon: string; arrow: string }> = {
  amber: { row: 'border-[#f2c94c]/25 bg-[#f2c94c]/6 hover:border-[#f2c94c]/60', icon: 'bg-[#f2c94c]/14 text-[#f2c94c]', arrow: 'text-[#f2c94c]' },
  green: { row: 'border-[#35f46e]/22 bg-[#35f46e]/5 hover:border-[#35f46e]/45', icon: 'bg-[#35f46e]/12 text-[#35f46e]', arrow: 'text-[#35f46e]' },
}

// Se ven los primeros pendientes (los más urgentes van arriba); el resto, con "Ver todos"
const VISIBLES = 4

export function ActionList({ live, open }: { live: LiveBracket[]; open: TorneoListado[] }) {
  const items = buildActions(live, open)
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, VISIBLES)
  const checking = live.some((item) => item.loading)
  const failed = live.filter((item) => item.failed)

  return (
    <section aria-labelledby="inicio-accion" className={cn(CARD, 'anim-stagger flex flex-col gap-4 p-4 sm:p-6 sm:px-7')} style={{ '--i': 1 } as CSSProperties}>
      <div className="flex items-center gap-3">
        <TriangleAlert className="size-[22px] shrink-0 text-[#ffc94a]" aria-hidden="true" />
        <h2 id="inicio-accion" className={SECTION_TITLE}>Necesitan tu acción</h2>
        {items.length > 0 && (
          <span className="inline-grid h-[26px] min-w-[26px] place-items-center rounded-full bg-[#ffc94a] px-2 font-mono text-xs font-bold text-[#06110b]">
            {items.length}<span className="sr-only"> pendientes</span>
          </span>
        )}
      </div>

      {items.length > 0 && (
        <ul id="inicio-accion-lista" className="flex flex-col gap-3">
          {shown.map((item, index) => (
            <li key={item.key} className="anim-stagger" style={{ '--i': index + 2 } as CSSProperties}>
              <ActionRow item={item} index={index} />
            </li>
          ))}
        </ul>
      )}
      {items.length > VISIBLES && (
        <button
          type="button"
          aria-expanded={all}
          aria-controls="inicio-accion-lista"
          onClick={() => setAll((value) => !value)}
          className={cn('inline-flex min-h-11 items-center justify-center gap-2 self-center rounded-xl px-4 text-sm font-bold text-[#35f46e] hover:text-[#7dffa3]', FOCUS)}
        >
          {all ? 'Ver menos' : `Ver todos (${items.length})`}
          <ChevronDown className={cn('size-4 transition-transform', all && 'rotate-180')} aria-hidden="true" />
        </button>
      )}

      {checking && <p role="status" className="text-sm text-[#b7c8bd]">Revisando las llaves de los torneos en curso…</p>}
      {failed.length > 0 && (
        <p role="alert" className="rounded-xl border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-4 py-3 text-sm text-[#ffc2c2]">
          No pudimos revisar la llave de {failed.map((item) => item.tournament.nombre).join(', ')}. Puede tener partidos por cargar.
        </p>
      )}

      {items.length === 0 && !checking && failed.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#f4f8f5]/18 p-6 text-center">
          <p className="font-bold">Todo al día</p>
          <p className="max-w-xs text-[13px] leading-relaxed text-[#b7c8bd]">No hay resultados por cargar ni torneos esperando equipos. Cuando algo necesite tu mano, aparece acá.</p>
        </div>
      )}
    </section>
  )
}

function ActionRow({ item, index }: { item: ActionItem; index: number }) {
  const tone = TONE[item.tone]
  return (
    <Link to={item.to} className={cn('card-lift flex items-center gap-3 rounded-2xl border p-3 text-inherit no-underline sm:gap-3.5 sm:p-4', tone.row, FOCUS)}>
      <span className={cn('grid size-10 flex-none place-items-center rounded-xl sm:size-12 sm:rounded-[14px]', tone.icon)}>{item.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block break-words font-bold leading-snug">{item.title}</span>
        {item.detail && <span className="mt-1 block text-[13px] text-[#b7c8bd]">{item.detail}</span>}
        {item.progress && (
          <span className="mt-2 flex items-center gap-2.5">
            <span className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-[#f4f8f5]/10" aria-hidden="true">
              <span
                className="anim-fill block h-full rounded-[3px] bg-[linear-gradient(90deg,#1a9c45,#35f46e)]"
                style={{ width: `${(item.progress.value / item.progress.max) * 100}%`, '--i': index } as CSSProperties}
              />
            </span>
            <span className="font-mono text-xs text-[#b7c8bd]">
              {item.progress.value}/{item.progress.max}<span className="sr-only"> equipos inscriptos</span>
            </span>
          </span>
        )}
      </span>
      <ArrowRight className={cn('size-5 flex-none', tone.arrow)} aria-hidden="true" />
    </Link>
  )
}
