import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { TournamentStateBadge } from '@/components/shared/tournament-state-badge'
import { Trophy } from '@/components/visuals/art'
import { getTeamTournaments } from '@/lib/api'
import { cn, formatDate, positionLabel } from '@/lib/utils'
import type { Jugador, PosicionJugador } from '@/types/domain'

// "Torneos del equipo": en qué torneos está anotado y si el plantel llega al mínimo
// (titulares + 2 suplentes). Reemplaza a la cancha con formación: no depende de la
// modalidad del equipo ni de quién es titular.
export function TeamTournaments({ teamId, players }: { teamId: number; players: Jugador[] }) {
  const query = useQuery({ queryKey: ['team-tournaments', teamId], queryFn: () => getTeamTournaments(teamId) })
  const count = players.length

  return (
    <section className="rounded-2xl border border-base-content/10 bg-base-200/70 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Competencias</p>
          <h3 className="font-display text-3xl font-black uppercase">Torneos del equipo</h3>
        </div>
        <p className="text-xs text-base-content/55">¿Estamos en regla para cada torneo?</p>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {query.isLoading && <p className="text-sm text-base-content/55">Buscando torneos...</p>}
        {query.data?.length === 0 && (
          <div className="flex items-center gap-4 rounded-xl border border-dashed border-base-content/15 p-4">
            <Trophy dim className="h-14 w-11 shrink-0" />
            <p className="text-sm text-base-content/60">Todavía no está anotado en ningún torneo. Desde Torneos se inscribe con un clic.</p>
          </div>
        )}
        {query.data?.map((torneo) => {
          const minimum = torneo.tipo_futbol + 2
          const ratio = Math.min(1, count / minimum)
          const tone = count > minimum ? 'ok' : count === minimum ? 'limit' : 'short'
          const note = {
            ok: `Sobran ${count - minimum} para el mínimo.`,
            limit: 'Justo en el mínimo: si alguien sale, el equipo queda afuera.',
            short: `Faltan ${minimum - count} jugadores para el mínimo.`,
          }[tone]
          return (
            <Link key={torneo.id} to={`/app/torneos/${torneo.id}`} className="group flex items-center gap-4 rounded-xl border border-base-content/10 bg-base-300/60 p-4 transition hover:border-primary/40">
              <Trophy className="h-[3.25rem] w-10 shrink-0 transition group-hover:-translate-y-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-xl font-extrabold uppercase leading-none">{torneo.nombre}</p>
                  <span className="rounded bg-base-content/10 px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase text-base-content/70">Fútbol {torneo.tipo_futbol}</span>
                  <TournamentStateBadge state={torneo.estado} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-base-content/10">
                    <div className={cn('h-full rounded-full', tone === 'ok' && 'bg-primary', tone === 'limit' && 'bg-[#f2c94c]', tone === 'short' && 'bg-error')} style={{ width: `${ratio * 100}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-sm font-bold">{count} de {minimum} mínimos</span>
                </div>
                <p className="mt-1.5 text-xs text-base-content/55">{formatDate(torneo.fecha, "d MMM yyyy")} · {note}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

const ORDER: PosicionJugador[] = ['arquero', 'defensor', 'mediocampista', 'delantero']
const PLURAL: Record<PosicionJugador, string> = { arquero: 'Arqueros', defensor: 'Defensores', mediocampista: 'Mediocampistas', delantero: 'Delanteros' }

// Cuántos jugadores hay por posición. No indica titulares ni suplentes.
export function PositionSummary({ players }: { players: Jugador[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ORDER.map((posicion) => {
        const total = players.filter((player) => player.posicion === posicion).length
        return (
          <div key={posicion} className={cn('flex items-center gap-3 rounded-xl border border-base-content/10 bg-base-200/60 px-4 py-3', total === 0 && 'border-dashed')}>
            <span className={cn('font-display text-3xl font-black leading-none', total === 0 ? 'text-base-content/30' : 'text-primary')}>{total}</span>
            <span className="text-xs leading-tight text-base-content/65">{total === 1 ? positionLabel[posicion] : PLURAL[posicion]}{total === 0 && <><br /><span className="text-error/80">Falta</span></>}</span>
          </div>
        )
      })}
    </div>
  )
}
