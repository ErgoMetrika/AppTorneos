// "Últimos campeones": el ganador de la final de los torneos finalizados más recientes.
// Sin campeones, una copa apagada explica qué va a aparecer acá.
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { TeamCrest, Trophy } from '@/components/visuals/art'
import { cn, formatDate } from '@/lib/utils'
import type { TorneoListado } from '@/types/domain'

import { CARD, FOCUS, SECTION_TITLE } from './home-data'

export interface ChampionEntry {
  tournament: TorneoListado
  champion: string
}

export function ChampionsCard({ champions, loading, failed, retry, liveName }: { champions: ChampionEntry[]; loading: boolean; failed: boolean; retry: () => void; liveName?: string }) {
  return (
    <section aria-labelledby="inicio-campeones" className={cn(CARD, 'anim-stagger flex flex-col gap-3.5 p-6 sm:px-7')} style={{ '--i': 7 } as CSSProperties}>
      <h2 id="inicio-campeones" className={SECTION_TITLE}>Últimos campeones</h2>

      {champions.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {champions.map(({ tournament, champion }, index) => (
            <li key={tournament.id} className="anim-stagger" style={{ '--i': index + 8 } as CSSProperties}>
              <Link
                to={`/app/torneos/${tournament.id}`}
                className={cn('card-lift flex items-center gap-3.5 rounded-2xl border border-[#ffc94a]/25 bg-[#ffc94a]/5 p-3.5 text-inherit no-underline hover:border-[#ffc94a]/60', FOCUS)}
              >
                <TeamCrest name={champion} className="anim-pop h-12 w-[41px] flex-none" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xl font-extrabold uppercase leading-tight">{champion}</span>
                  <span className="block truncate text-[13px] text-[#b7c8bd]">{tournament.nombre} · {formatDate(tournament.fecha)}</span>
                </span>
                <Trophy className="h-9 w-auto flex-none" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {loading && <p role="status" className="text-sm text-[#b7c8bd]">Buscando a los campeones…</p>}
      {failed && (
        <p role="alert" className="text-sm text-[#ff9b9b]">
          No pudimos leer alguna de las finales.{' '}
          <button type="button" onClick={retry} className={cn('font-bold text-[#f4f8f5] underline underline-offset-2', FOCUS)}>Reintentar</button>
        </p>
      )}

      {champions.length === 0 && !loading && !failed && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#f4f8f5]/18 p-5 text-center">
          <Trophy dim className="h-20 w-auto" />
          <p className="font-bold">Todavía no hay campeón</p>
          <p className="text-[13px] leading-relaxed text-[#b7c8bd]">
            {liveName ? `Cuando termine ${liveName}, su campeón aparece acá con su escudo.` : 'Cuando termine un torneo, su campeón aparece acá con su escudo.'}
          </p>
        </div>
      )}
    </section>
  )
}
