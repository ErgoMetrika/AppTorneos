// "Necesitan tu acción": lo que el admin tiene que resolver hoy, armado con datos reales.
// - Torneos en curso con partidos listos para cargar (los dos equipos definidos y sin resultado)
// - Torneos en inscripción con el cupo completo, listos para generar la llave
// - Torneos en inscripción a los que les faltan equipos para llegar a su cupo (2, 4, 8 o 16)
import { ArrowRight, ClipboardPen, Network, TriangleAlert, UserPlus } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'
import type { TorneoListado } from '@/types/domain'

import { CARD, FOCUS, SECTION_TITLE, missingTeams, plural, type BracketProgress } from './home-data'

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
    const missing = missingTeams(tournament)
    if (missing === 0) {
      items.push({ key: `generar-${tournament.id}`, to: `/app/torneos/${tournament.id}`, tone: 'green', icon: <Network className="size-6" aria-hidden="true" />, title: `${tournament.nombre}: cupo completo, ya podés generar la llave`, detail: `${tournament.inscriptos}/${tournament.max_equipos} equipos inscriptos` })
    }
  }
  for (const tournament of open) {
    const missing = missingTeams(tournament)
    if (missing > 0) {
      items.push({
        key: `faltan-${tournament.id}`,
        to: `/app/torneos/${tournament.id}`,
        tone: 'green',
        icon: <UserPlus className="size-6" aria-hidden="true" />,
        title: `${tournament.nombre}: ${missing === 1 ? 'falta 1 equipo' : `faltan ${missing} equipos`} para generar la llave`,
        progress: { value: tournament.inscriptos, max: tournament.max_equipos },
      })
    }
  }
  return items
}

const TONE: Record<Tone, { row: string; icon: string; arrow: string }> = {
  amber: { row: 'border-[#f2c94c]/25 bg-[#f2c94c]/6 hover:border-[#f2c94c]/60', icon: 'bg-[#f2c94c]/14 text-[#f2c94c]', arrow: 'text-[#f2c94c]' },
  green: { row: 'border-[#35f46e]/22 bg-[#35f46e]/5 hover:border-[#35f46e]/45', icon: 'bg-[#35f46e]/12 text-[#35f46e]', arrow: 'text-[#35f46e]' },
}

export function ActionList({ live, open }: { live: LiveBracket[]; open: TorneoListado[] }) {
  const items = buildActions(live, open)
  const checking = live.some((item) => item.loading)
  const failed = live.filter((item) => item.failed)

  return (
    <section aria-labelledby="inicio-accion" className={cn(CARD, 'anim-stagger flex flex-col gap-4 p-6 sm:px-7')} style={{ '--i': 1 } as CSSProperties}>
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
        <ul className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={item.key} className="anim-stagger" style={{ '--i': index + 2 } as CSSProperties}>
              <ActionRow item={item} index={index} />
            </li>
          ))}
        </ul>
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
    <Link to={item.to} className={cn('card-lift flex items-center gap-3.5 rounded-2xl border p-4 text-inherit no-underline', tone.row, FOCUS)}>
      <span className={cn('grid size-12 flex-none place-items-center rounded-[14px]', tone.icon)}>{item.icon}</span>
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
