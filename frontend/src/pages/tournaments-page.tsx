import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarDays, LockKeyhole, MapPin, Plus, Search } from 'lucide-react'
import { useId, useMemo, useState, type CSSProperties } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ErrorState, LoadingState, EmptyState } from '@/components/shared/states'
import { LabelledTrophy, ModalityChip, PrivateChip, StateBand, StateChip } from '@/components/tournament/tournament-bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-context'
import { getTournaments, searchPrivateTournament } from '@/lib/api'
import { EmptyCrest, Pitch, TeamCrest } from '@/components/visuals/art'
import { TEAM_COLORS, teamColorKey } from '@/components/visuals/palette'
import { cn, formatDate, getErrorMessage } from '@/lib/utils'
import type { TorneoListado } from '@/types/domain'

// Hasta este cupo se dibuja cada lugar con su escudo; con más, una barra de llenado
const CREST_SLOTS_MAX = 8

function SlotsByCrest({ tournament }: { tournament: TorneoListado }) {
  const free = Math.max(0, tournament.max_equipos - tournament.equipos_inscriptos.length)
  return (
    <ul className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4">
      {tournament.equipos_inscriptos.map((team) => {
        const color = TEAM_COLORS[teamColorKey(team.nombre)].base
        return (
          <li key={team.id} className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-[10px] border px-2" style={{ backgroundColor: `${color}1c`, borderColor: `${color}40` }}>
            <TeamCrest name={team.nombre} className="h-7 w-6 shrink-0 drop-shadow-none" />
            <span title={team.nombre} className="min-w-0 truncate text-xs font-semibold">{team.nombre}</span>
          </li>
        )
      })}
      {Array.from({ length: free }, (_, index) => (
        <li key={`libre-${index}`} className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#f4f8f5]/22 px-2">
          <EmptyCrest className="h-7 w-6 shrink-0" />
          <span className="truncate text-xs text-[#8fa596]">Lugar libre</span>
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
      className="anim-stagger card-lift group flex flex-col overflow-hidden rounded-[18px] border border-[#f4f8f5]/10 bg-[#0b1b12] shadow-[0_14px_34px_rgba(0,0,0,0.38)] hover:border-primary/30"
      style={{ '--i': index } as CSSProperties}
    >
      {/* Banda de color según el estado */}
      <StateBand state={tournament.estado} />

      {/* Ilustración: cancha según la modalidad a la izquierda y la copa con la modalidad a la derecha */}
      <div
        className="relative h-[200px] overflow-hidden"
        style={{ background: 'radial-gradient(circle at 76% 45%, rgba(242,201,76,0.14), transparent 45%), radial-gradient(circle at 30% 60%, rgba(53,244,110,0.12), #0b1b12 70%)' }}
      >
        <Pitch
          large={tournament.tipo_futbol >= 9}
          label={`Cancha de fútbol ${tournament.tipo_futbol}`}
          className={cn('absolute left-[6%] top-1/2 h-auto max-h-[172px] w-[48.6%] -translate-y-1/2', finished && 'opacity-60')}
        />
        <LabelledTrophy
          text={`F${tournament.tipo_futbol}`}
          dim={finished}
          shine={!finished}
          className="anim-pop absolute left-[70%] top-1/2 w-[21.4%] max-w-[120px] -translate-y-[45%] transition motion-safe:group-hover:-translate-y-[50%]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3.5 px-[22px] pb-[22px] pt-5">
        <div className="flex flex-wrap gap-2">
          <StateChip state={tournament.estado} />
          <ModalityChip tipo={tournament.tipo_futbol} />
          {tournament.visibilidad === 'privado' && <PrivateChip />}
        </div>
        <h2 className="break-words font-display text-[32px] font-extrabold uppercase leading-none sm:text-[38px]">{tournament.nombre}</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#b7c8bd]">
          <p className="flex min-w-0 items-center gap-2"><MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="sr-only">Lugar:</span>{tournament.lugar || 'A confirmar'}</p>
          <p className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="sr-only">Fecha:</span>{formatDate(tournament.fecha, 'd MMM yyyy')}</p>
        </div>

        {/* Cupo: escudo por lugar en cupos chicos, barra en los grandes */}
        <div className="flex flex-col gap-2.5 border-t border-[#f4f8f5]/10 pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Cupo</p>
            <span className="font-mono text-xs text-[#b7c8bd]">{tournament.inscriptos} de {tournament.max_equipos} equipos</span>
          </div>
          {withCrests ? <SlotsByCrest tournament={tournament} /> : <SlotsByBar tournament={tournament} index={index} />}
        </div>

        <div className="mt-auto flex justify-end pt-1">
          <Button asChild size="sm"><Link to={to}>Ver torneo</Link></Button>
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
      navigate(`/torneos/${tournament.id}`, { state: { accessCode: privateCode } })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const tournaments = useMemo(
    () => (query.data ?? []).filter((item) => item.nombre.toLowerCase().includes(search.toLowerCase())),
    [query.data, search],
  )

  return (
    <div className="container-shell flex flex-col gap-6 py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">Torneo 90'</p>
          <h1 className="mt-1.5 font-display text-6xl font-black uppercase leading-[0.9] sm:text-[72px]">Torneos</h1>
        </div>
        <div className="flex w-full flex-wrap gap-3 md:w-auto md:flex-[0_1_640px]">
          <label className="flex h-12 min-w-0 flex-1 basis-60 items-center gap-2.5 rounded-xl border border-[#f4f8f5]/12 bg-[#0b1b12] px-4 text-[#8fa596] shadow-[0_6px_18px_rgba(0,0,0,0.3)] focus-within:border-primary/50">
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
      {!query.isLoading && !query.isError && tournaments.length === 0 && <EmptyState title="Sin torneos" description="No encontramos torneos públicos con ese nombre." />}
      {tournaments.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-2">
          {tournaments.map((tournament, index) => (
            <TournamentCard key={tournament.id} tournament={tournament} index={index} to={`${inApp ? '/app' : ''}/torneos/${tournament.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
