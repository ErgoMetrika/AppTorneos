// "Torneos abiertos": hasta 3 torneos reales con la misma tarjeta que la lista del panel,
// y debajo los números de la plataforma contando desde 0 al aparecer.
import { CalendarDays, MapPin } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState, ErrorState } from '@/components/shared/states'
import { LabelledTrophy, ModalityChip, PrivateChip, StateBand, StateChip } from '@/components/tournament/tournament-bits'
import { Button } from '@/components/ui/button'
import { EmptyCrest, Jersey, Pitch, TeamCrest, Trophy } from '@/components/visuals/art'
import { TEAM_COLORS, teamColorKey } from '@/components/visuals/palette'
import { cn, formatDate } from '@/lib/utils'
import type { TorneoListado } from '@/types/domain'

import { Reveal, SectionHeading, SHELL } from './reveal'
import { useCountUp, useReveal } from './use-reveal'

// Hasta este cupo se dibuja cada lugar con su escudo; con más, una barra (igual que en el panel)
const CREST_SLOTS_MAX = 8

function Slots({ tournament }: { tournament: TorneoListado }) {
  if (tournament.max_equipos > CREST_SLOTS_MAX) {
    const percent = Math.min(100, Math.round((tournament.inscriptos / Math.max(1, tournament.max_equipos)) * 100))
    return (
      <div className="h-2.5 overflow-hidden rounded-[5px] bg-[#f4f8f5]/8" aria-hidden="true">
        <div className="h-full rounded-[5px] bg-[linear-gradient(90deg,#1a9c45,#35f46e)]" style={{ width: `${percent}%` }} />
      </div>
    )
  }
  const free = Math.max(0, tournament.max_equipos - tournament.equipos_inscriptos.length)
  return (
    <ul className="grid grid-cols-2 gap-2">
      {tournament.equipos_inscriptos.map((team) => {
        const color = TEAM_COLORS[teamColorKey(team.nombre)].base
        return (
          <li key={team.id} className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-[10px] border px-2" style={{ backgroundColor: `${color}1c`, borderColor: `${color}40` }}>
            <TeamCrest name={team.nombre} className="h-7 w-6 shrink-0 drop-shadow-none" />
            <span title={team.nombre} className="min-w-0 truncate text-[13px] font-semibold">{team.nombre}</span>
          </li>
        )
      })}
      {Array.from({ length: free }, (_, index) => (
        <li key={`libre-${index}`} className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#f4f8f5]/22 px-2">
          <EmptyCrest className="h-7 w-6 shrink-0" />
          <span className="truncate text-[13px] text-[#8fa596]">Lugar libre</span>
        </li>
      ))}
    </ul>
  )
}

function TournamentCard({ tournament }: { tournament: TorneoListado }) {
  const full = tournament.inscriptos >= tournament.max_equipos
  return (
    <article className="card-lift group flex h-full flex-col overflow-hidden rounded-[18px] border border-[#f4f8f5]/10 bg-[#0b1b12] shadow-[0_14px_34px_rgba(0,0,0,0.38)] hover:border-primary/30 hover:shadow-[0_22px_44px_rgba(0,0,0,0.5)]">
      <StateBand state={tournament.estado} />
      <div
        className="relative h-[200px] overflow-hidden"
        style={{ background: 'radial-gradient(circle at 76% 45%, rgba(242,201,76,0.14), transparent 45%), radial-gradient(circle at 30% 60%, rgba(53,244,110,0.12), #0b1b12 70%)' }}
      >
        <Pitch
          large={tournament.tipo_futbol >= 9}
          label={`Cancha de fútbol ${tournament.tipo_futbol}`}
          className="absolute left-[6%] top-1/2 h-auto max-h-[172px] w-[48.6%] -translate-y-1/2"
        />
        <LabelledTrophy
          text={`F${tournament.tipo_futbol}`}
          shine
          className="absolute left-[70%] top-1/2 w-[21.4%] max-w-[120px] -translate-y-[45%] transition duration-300 motion-safe:group-hover:-translate-y-[52%]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3.5 px-6 pb-6 pt-[22px]">
        <div className="flex flex-wrap gap-2">
          <StateChip state={tournament.estado} />
          <ModalityChip tipo={tournament.tipo_futbol} />
          {tournament.visibilidad === 'privado' && <PrivateChip />}
        </div>
        <h3 className="break-words font-display text-[32px] font-extrabold uppercase leading-none sm:text-[38px]">{tournament.nombre}</h3>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#b7c8bd]">
          <p className="flex min-w-0 items-center gap-2"><MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="sr-only">Lugar:</span>{tournament.lugar || 'A confirmar'}</p>
          <p className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="sr-only">Fecha:</span>{formatDate(tournament.fecha, 'd MMM yyyy')}</p>
        </div>
        <div className="flex flex-col gap-2.5 border-t border-[#f4f8f5]/10 pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Cupo</p>
            <span className="font-mono text-xs text-[#b7c8bd]">{tournament.inscriptos} de {tournament.max_equipos} equipos{full ? ' · Completo' : ''}</span>
          </div>
          <Slots tournament={tournament} />
        </div>
        <div className="mt-auto flex justify-end pt-1">
          <Button asChild size="sm"><Link to={`/app/torneos/${tournament.id}`}>Ver torneo</Link></Button>
        </div>
      </div>
    </article>
  )
}

function TournamentsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Cargando torneos</span>
      {[0, 1, 2].map((item) => (
        <div key={item} aria-hidden="true" className={cn('h-[460px] animate-pulse rounded-[18px] border border-[#f4f8f5]/8 bg-[#0b1b12] motion-reduce:animate-none', item === 2 && 'hidden lg:block', item === 1 && 'hidden md:block')} />
      ))}
    </div>
  )
}

// ---------- Números de la plataforma ----------
function StatItem({ art, value, label, run, loading }: { art: ReactNode; value: number | null; label: string; run: boolean; loading: boolean }) {
  const shown = useCountUp(value ?? 0, run && value !== null)
  return (
    <div className="flex items-center gap-[18px]">
      <span aria-hidden="true" className="grid w-14 shrink-0 place-items-center">{art}</span>
      <div>
        <p className="font-display text-[52px] font-black leading-none text-primary tabular-nums">
          {loading ? (
            <span aria-hidden="true" className="inline-block h-[44px] w-16 animate-pulse rounded-md bg-primary/12 align-middle motion-reduce:animate-none" />
          ) : value === null ? (
            <span aria-label="Sin dato">—</span>
          ) : (
            <>
              <span aria-hidden="true">{shown}</span>
              <span className="sr-only">{value}</span>
            </>
          )}
        </p>
        <p className="mt-0.5 text-[15px] text-[#b7c8bd]">{label}</p>
      </div>
    </div>
  )
}

export type PlatformNumbers = { openTournaments: number | null; teams: number | null; players: number | null }

function Stats({ numbers, loading, failed }: { numbers: PlatformNumbers; loading: boolean; failed: boolean }) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={cn('lr-reveal lr-self flex flex-col gap-3', visible && 'is-visible')}>
      <div className="grid gap-7 rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] px-8 py-7 shadow-[0_14px_34px_rgba(0,0,0,0.38)] sm:grid-cols-3">
        <StatItem run={visible} loading={loading} value={numbers.openTournaments} label={numbers.openTournaments === 1 ? "torneo abierto" : "torneos abiertos"} art={<Trophy className="h-[60px] w-12" />} />
        <StatItem run={visible} loading={loading} value={numbers.teams} label={numbers.teams === 1 ? "equipo" : "equipos"} art={<TeamCrest name="Equipos" color="verde" className="h-14 w-12" />} />
        <StatItem run={visible} loading={loading} value={numbers.players} label={numbers.players === 1 ? "jugador" : "jugadores"} art={<Jersey name="Jugadores" color="verde" pattern="bastones" className="size-14" />} />
      </div>
      {failed && <p className="text-sm text-[#b7c8bd]">No pudimos cargar algunos números. Donde ves “—” todavía no hay dato.</p>}
    </div>
  )
}

export function OpenTournaments({
  tournaments,
  loading,
  error,
  retry,
  numbers,
  numbersLoading,
  numbersFailed,
}: {
  tournaments: TorneoListado[]
  loading: boolean
  error: string | null
  retry: () => void
  numbers: PlatformNumbers
  numbersLoading: boolean
  numbersFailed: boolean
}) {
  const columns = tournaments.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : tournaments.length === 2 ? 'md:grid-cols-2' : 'max-w-[620px]'
  return (
    <section aria-labelledby="torneos-abiertos" className="bg-[linear-gradient(180deg,#081a0f,#06110b)] py-14 md:py-24">
      <div className={`${SHELL} flex flex-col gap-10`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading id="torneos-abiertos" kicker="Torneos abiertos" title="Elegí dónde jugar" />
          <Reveal index={1}>
            <Link to="/torneos" className="font-bold text-primary hover:text-[#7dffa3]">Ver todos los torneos <span aria-hidden="true">→</span></Link>
          </Reveal>
        </div>

        {loading && <TournamentsSkeleton />}
        {!loading && error && <ErrorState message={`No pudimos cargar los torneos: ${error}`} retry={retry} />}
        {!loading && !error && tournaments.length === 0 && (
          <EmptyState
            art="trofeo"
            title="Sin torneos abiertos por ahora"
            description="Cuando se abra la inscripción de un torneo público lo vas a ver acá. Mientras tanto, creá tu cuenta y armá tu equipo."
            action={<Button asChild size="sm"><Link to="/registro">Crear cuenta</Link></Button>}
          />
        )}
        {!loading && !error && tournaments.length > 0 && (
          <Reveal self={false} as="ul" className={cn('grid gap-5', columns)}>
            {tournaments.map((tournament, index) => (
              <li key={tournament.id} className="lr-item" style={{ '--i': index } as CSSProperties}>
                <TournamentCard tournament={tournament} />
              </li>
            ))}
          </Reveal>
        )}

        <Stats numbers={numbers} loading={numbersLoading} failed={numbersFailed} />
      </div>
    </section>
  )
}
