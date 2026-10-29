import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarDays, Flag, LockKeyhole, MapPin, Plus, Search, Users } from 'lucide-react'
import { useId, useMemo, useState, type CSSProperties } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ErrorState, LoadingState } from '@/components/shared/states'
import { ModalityChip, PrivateChip, StateBand, StateChip } from '@/components/tournament/tournament-bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-context'
import { getTournaments, searchPrivateTournament } from '@/lib/api'
import { EmptyCrest, Pitch, TeamCrest, Trophy } from '@/components/visuals/art'
import { TEAM_COLORS, teamColorKey } from '@/components/visuals/palette'
import { cn, formatDate, getErrorMessage } from '@/lib/utils'
import type { TorneoListado } from '@/types/domain'

// Hasta este cupo se dibuja cada lugar con su escudo; con más, una barra de llenado
const CREST_SLOTS_MAX = 8
const TOURNAMENT_COLUMNS = [
  { state: 'en_curso', title: 'En progreso' },
  { state: 'inscripcion', title: 'Próximos' },
  { state: 'finalizado', title: 'Completados' },
] as const

function SlotsByCrest({ tournament }: { tournament: TorneoListado }) {
  const free = Math.max(0, tournament.max_equipos - tournament.equipos_inscriptos.length)
  return (
    <ul aria-label="Equipos y lugares disponibles" className="grid grid-cols-1 gap-2 @min-[340px]:grid-cols-2">
      {tournament.equipos_inscriptos.map((team) => {
        const color = TEAM_COLORS[teamColorKey(team.nombre)].base
        return (
          <li key={team.id} className="flex min-h-12 min-w-0 items-center gap-3 rounded-lg border px-3 py-2" style={{ backgroundColor: `${color}1c`, borderColor: `${color}40` }}>
            <TeamCrest name={team.nombre} className="h-7 w-6 shrink-0 drop-shadow-none" />
            <span className="min-w-0 break-words text-sm font-medium leading-snug text-slate-100">{team.nombre}</span>
          </li>
        )
      })}
      {Array.from({ length: free }, (_, index) => (
        <li key={`libre-${index}`} className="flex min-h-12 min-w-0 items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/30 px-3 py-2">
          <EmptyCrest className="h-7 w-6 shrink-0" />
          <span className="text-sm text-slate-400">Lugar libre</span>
        </li>
      ))}
    </ul>
  )
}

function SlotsByBar({ tournament, index }: { tournament: TorneoListado; index: number }) {
  const percent = Math.min(100, Math.round((tournament.inscriptos / Math.max(1, tournament.max_equipos)) * 100))
  return (
    <div className="h-2.5 overflow-hidden rounded-[5px] bg-[#f4f8f5]/8" aria-hidden="true">
      <div className="anim-fill h-full rounded-[5px] bg-[linear-gradient(90deg,#1a9c45,#35f46e)]" style={{ width: `${percent}%`, '--i': index } as CSSProperties} />
    </div>
  )
}

function TournamentCard({ tournament, index, to }: { tournament: TorneoListado; index: number; to: string }) {
  const finished = tournament.estado === 'finalizado'
  const withCrests = tournament.max_equipos <= CREST_SLOTS_MAX
  return (
    <article
      className="anim-stagger card-lift group @container flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-lg hover:border-primary/50"
      style={{ '--i': index } as CSSProperties}
    >
      {/* Banda de color según el estado */}
      <StateBand state={tournament.estado} />

      {/* Cancha y copa del mismo tamaño, con la modalidad en el centro de la cancha. */}
      <div
        className="relative flex h-40 shrink-0 items-center justify-evenly overflow-hidden"
        style={{ background: 'radial-gradient(circle at 76% 45%, rgba(242,201,76,0.12), transparent 45%), radial-gradient(circle at 30% 60%, rgba(53,244,110,0.1), #0f172a 70%)' }}
      >
        <div className={cn('relative @container flex aspect-square w-[32%] max-w-[120px] items-center', finished && 'opacity-60')}>
          <Pitch
            large={tournament.tipo_futbol >= 9}
            label={`Cancha de fútbol ${tournament.tipo_futbol}`}
            className="h-auto w-full"
          />
          <span aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-[#0f2a1a]/90 px-1 font-display text-[17cqw] font-black leading-none text-[#f4f8f5]">
            F{tournament.tipo_futbol}
          </span>
        </div>
        <Trophy
          dim={finished}
          shine={!finished}
          className="anim-pop aspect-square w-[32%] max-w-[120px] transition motion-safe:group-hover:-translate-y-1"
        />
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex flex-wrap gap-2">
          <StateChip state={tournament.estado} />
          <ModalityChip tipo={tournament.tipo_futbol} />
          {tournament.visibilidad === 'privado' && <PrivateChip />}
        </div>
        <h3 className="break-words font-display text-2xl font-semibold uppercase leading-tight tracking-wide">{tournament.nombre}</h3>
        <dl className="grid gap-3 text-sm text-slate-300">
          <div className="flex min-w-0 items-start gap-2.5"><dt><MapPin className="mt-0.5 size-4 text-slate-400" aria-hidden="true" /><span className="sr-only">Lugar</span></dt><dd className="min-w-0 break-words">{tournament.lugar || 'A confirmar'}</dd></div>
          <div className="flex items-start gap-2.5"><dt><CalendarDays className="mt-0.5 size-4 text-slate-400" aria-hidden="true" /><span className="sr-only">Fecha</span></dt><dd>{formatDate(tournament.fecha, 'd MMM yyyy')}</dd></div>
          <div className="flex items-start gap-2.5"><dt><Users className="mt-0.5 size-4 text-slate-400" aria-hidden="true" /><span className="sr-only">Cupo</span></dt><dd>{tournament.inscriptos} de {tournament.max_equipos} equipos</dd></div>
        </dl>

        {/* Cupo: escudo por lugar en cupos chicos, barra en los grandes */}
        <div className="flex flex-col gap-3 border-t border-slate-700 pt-4">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-slate-300">Cupo</p>
          {withCrests ? <SlotsByCrest tournament={tournament} /> : <SlotsByBar tournament={tournament} index={index} />}
        </div>

        <div className="mt-auto border-t border-slate-700 pt-4">
          <Button asChild className="w-full justify-between" size="sm"><Link to={to} aria-label={`Ver torneo ${tournament.nombre}`}>Ver torneo<ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
        </div>
      </div>
    </article>
  )
}

export function TournamentsPage() {
  const [search, setSearch] = useState('')
  const [privateCode, setPrivateCode] = useState('')
  const [privateOpen, setPrivateOpen] = useState(false)
  const privatePanelId = useId()
  const navigate = useNavigate()
  const { session, isAdmin } = useAuth()
  const location = useLocation()
  const inApp = location.pathname.startsWith('/app')
  const query = useQuery({ queryKey: ['tournaments'], queryFn: getTournaments })
  const privateMutation = useMutation({
    mutationFn: searchPrivateTournament,
    onSuccess: (data) => {
      const tournament = data[0]
      if (!tournament) {
        toast.error('No encontramos un torneo con ese código.')
        return
      }
      sessionStorage.setItem(`private-tournament-code:${tournament.id}`, privateCode)
      navigate(`${inApp ? '/app' : ''}/torneos/${tournament.id}`, { state: { accessCode: privateCode } })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const tournaments = useMemo(
    () => (query.data ?? []).filter((item) => item.nombre.toLowerCase().includes(search.toLowerCase())),
    [query.data, search],
  )

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
    <div className="container-shell flex flex-col gap-8 py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">Torneo 90'</p>
          <h1 className="mt-1.5 font-display text-6xl font-black uppercase leading-[0.9] sm:text-[72px]">Torneos</h1>
        </div>
        <div className="flex w-full flex-wrap gap-3 md:w-auto md:flex-[0_1_640px]">
          <label className="flex h-12 min-w-0 flex-1 basis-60 items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 px-4 text-slate-400 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
            <Search className="size-[18px] shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar torneo por nombre"
              aria-label="Buscar torneo por nombre"
              className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#f4f8f5] outline-none placeholder:text-[#8fa596]"
            />
          </label>
          {session && (
            <button
              type="button"
              aria-expanded={privateOpen}
              aria-controls={privatePanelId}
              onClick={() => setPrivateOpen((open) => !open)}
              className={cn('flex h-12 items-center gap-2.5 rounded-xl border border-dashed border-primary/45 bg-primary/6 px-4 text-sm font-semibold text-[#b7c8bd] transition hover:border-primary hover:text-[#f4f8f5]', privateOpen && 'border-solid border-primary/70 text-[#f4f8f5]')}
            >
              <LockKeyhole className="size-[18px] text-primary" aria-hidden="true" /> Buscar privado por código
            </button>
          )}
          {isAdmin && <Button asChild className="h-12 rounded-xl"><Link to="/app/admin/torneos/nuevo"><Plus className="size-4" /> Crear torneo</Link></Button>}
        </div>
      </div>

      {session && privateOpen && (
        <form
          id={privatePanelId}
          className="anim-pop flex flex-col gap-3 rounded-[14px] border border-dashed border-primary/35 bg-[#0b1b12] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.3)] sm:flex-row sm:items-center sm:justify-between sm:px-5"
          onSubmit={(event) => { event.preventDefault(); privateMutation.mutate(privateCode) }}
        >
          <p className="text-sm text-[#b7c8bd]">Ingresá el código de 6 caracteres que te compartieron.</p>
          <div className="flex gap-2">
            <Input autoFocus aria-label="Código del torneo privado" value={privateCode} onChange={(event) => setPrivateCode(event.target.value.toUpperCase())} maxLength={6} placeholder="A7K2PQ" className="w-36 font-mono uppercase tracking-widest" />
            <Button type="submit" disabled={privateCode.length !== 6 || privateMutation.isPending}>{privateMutation.isPending ? 'Buscando...' : 'Buscar'}</Button>
          </div>
        </form>
      )}

      {query.isLoading && <LoadingState label="Cargando torneos" />}
      {query.isError && <ErrorState message={query.error.message} retry={() => void query.refetch()} />}
      {!query.isLoading && !query.isError && (
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
          {TOURNAMENT_COLUMNS.map(({ state, title }) => (
            <section key={state} aria-labelledby={`tournaments-${state}`} className="grid min-w-0 gap-5">
              <h2 id={`tournaments-${state}`} className="border-b border-slate-700 pb-4 font-display text-3xl font-bold tracking-wide">{title}</h2>
              {tournaments.filter((tournament) => tournament.estado === state).map((tournament, index) => (
                <TournamentCard key={tournament.id} tournament={tournament} index={index} to={`${inApp ? '/app' : ''}/torneos/${tournament.id}`} />
              ))}
              {!tournaments.some((tournament) => tournament.estado === state) && (
                <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 px-5 py-8 text-center">
                  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-slate-800 text-slate-400"><Flag className="size-5" aria-hidden="true" /></div>
                  <h3 className="text-sm font-semibold text-slate-200">No hay torneos {title.toLowerCase()}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{search ? 'Probá con otro nombre en el buscador.' : state === 'finalizado' ? 'Los torneos que finalicen aparecerán acá.' : state === 'en_curso' ? 'Cuando comience un torneo, lo encontrarás acá.' : 'Los nuevos torneos aparecerán acá cuando se abran las inscripciones.'}</p>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
    </div>
  )
}
