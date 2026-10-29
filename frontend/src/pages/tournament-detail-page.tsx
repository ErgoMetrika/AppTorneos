import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Copy, KeyRound, Shield, Sparkles } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { LabelledTrophy, ModalityChip, PrivateChip, StateChip } from '@/components/tournament/tournament-bits'
import { VenueMap } from '@/components/tournament/venue-map'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyCrest, PitchLines, TeamCrest, Trophy } from '@/components/visuals/art'
import { useAuth } from '@/context/auth-context'
import { enrollTeam, generateBracket, getBracket, getMyTeam, getTournament } from '@/lib/api'
import { consultasDeInscripcion, invalidarConsultas } from '@/lib/query-keys'
import { cn, formatDate, getErrorMessage } from '@/lib/utils'
import type { PartidoLlave } from '@/types/domain'

const CARD = 'rounded-2xl border border-[#f4f8f5]/10 bg-[#0b1b12] shadow-[0_10px_28px_rgba(0,0,0,0.35)]'
const LABEL = 'font-mono text-[11px] font-bold uppercase tracking-[0.12em]'

// Nombre de cada ronda contando desde la final (la última ronda es la final)
function roundName(round: number, lastRound: number) {
  const fromEnd = lastRound - round
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semifinal'
  if (fromEnd === 2) return 'Cuartos de final'
  if (fromEnd === 3) return 'Octavos de final'
  return `Ronda ${round}`
}

// ---------- Llave ----------
interface SlotTeam { id: number | null; name: string | null; goals: number | null; penalties: number | null }

// Una fila de la llave: escudo y nombre del equipo, o "Por definir" con borde punteado
function BracketRow({ team, winner, showScore, href }: { team: SlotTeam; winner: boolean; showScore: boolean; href: string | null }) {
  if (!team.name) {
    return <div className="flex h-12 items-center rounded-[10px] border border-dashed border-[#f4f8f5]/25 px-5 text-[15px] font-semibold text-[#8fa596]">Por definir</div>
  }
  const content = (
    <>
      <TeamCrest name={team.name} className="h-[34px] w-[29px] shrink-0 drop-shadow-none" />
      <span title={team.name} className={cn('min-w-0 flex-1 truncate text-[15px] font-semibold', winner && 'font-bold text-primary')}>{team.name}</span>
      {showScore && (
        <span className={cn('font-mono text-sm font-bold', winner && 'text-primary')}>
          {team.goals ?? '–'}{team.penalties !== null && <small className="ml-1 text-[#b7c8bd]">({team.penalties})</small>}
        </span>
      )}
    </>
  )
  const className = cn('flex h-12 items-center gap-3 rounded-[10px] border bg-[#10271a] pl-3.5 pr-4', winner ? 'border-primary/50 shadow-[inset_3px_0_0_#35f46e]' : 'border-[#f4f8f5]/12')
  return href
    ? <Link to={href} className={cn(className, 'transition hover:border-primary/40')}>{content}</Link>
    : <div className={className}>{content}</div>
}

// Partido: dos filas y la línea que lo une con la ronda siguiente
function BracketMatch({ match, last, teamHref }: { match: PartidoLlave | null; last: boolean; teamHref: (id: number | null) => string | null }) {
  const finished = match?.estado === 'finalizado'
  const teams: SlotTeam[] = match
    ? [
        { id: match.equipo_local_id, name: match.local, goals: match.goles_local, penalties: match.penales_local },
        { id: match.equipo_visitante_id, name: match.visitante, goals: match.goles_visitante, penalties: match.penales_visitante },
      ]
    : [{ id: null, name: null, goals: null, penalties: null }, { id: null, name: null, goals: null, penalties: null }]
  return (
    <div className="relative flex w-[260px] flex-col gap-2 sm:w-[300px]">
      {match?.estado === 'en_curso' && <span className={cn(LABEL, 'absolute -top-5 left-1 text-[10px] text-[#f2c94c]')}>En juego</span>}
      {teams.map((team, index) => (
        <BracketRow key={index} team={team} winner={team.id !== null && team.id === match?.ganador_id} showScore={finished || match?.estado === 'en_curso'} href={teamHref(team.id)} />
      ))}
      {/* Conector: corchete hacia la derecha (en la final, línea recta a la copa) */}
      {last
        ? <span aria-hidden="true" className="absolute left-full top-1/2 w-[4.5rem] border-t-2 border-primary/50" />
        : (
          <>
            <span aria-hidden="true" className="absolute left-full top-6 bottom-6 w-7 border-y-2 border-r-2 border-primary/50" />
            <span aria-hidden="true" className="absolute left-[calc(100%+1.75rem)] top-1/2 w-7 border-t-2 border-primary/50" />
          </>
        )}
    </div>
  )
}

function ChampionColumn({ name }: { name: string | null }) {
  return (
    <div className="flex w-52 shrink-0 flex-col items-center justify-center text-center">
      <div className="relative grid size-40 place-items-center rounded-full bg-[#f2c94c]/8">
        <div className="relative w-[100px]">
          <Trophy shine={Boolean(name)} label={name ? `Copa del campeón, ${name}` : 'Copa del campeón'} className="anim-pop block h-auto w-full drop-shadow-[0_10px_24px_rgba(242,201,76,0.25)]" />
          {/* El escudo del campeón va en la copa */}
          {name && <TeamCrest name={name} className="absolute left-1/2 top-[13%] h-auto w-[34%] -translate-x-1/2 drop-shadow-none" />}
        </div>
      </div>
      <p className="mt-1 font-display text-[28px] font-black uppercase leading-none">Campeón</p>
      <p className={cn('mt-1.5 max-w-full break-words text-[13px]', name ? 'font-display text-xl font-extrabold uppercase text-[#f2c94c]' : 'text-[#b7c8bd]')}>{name ?? 'A definir'}</p>
    </div>
  )
}

// Llave completa. Sin partidos todavía, dibuja los casilleros vacíos según el cupo (sin equipos asignados).
function Bracket({ matches, maxTeams, teamHref }: { matches: PartidoLlave[]; maxTeams: number; teamHref: (id: number | null) => string | null }) {
  const rounds = useMemo(() => {
    if (matches.length) {
      const grouped = new Map<number, PartidoLlave[]>()
      matches.forEach((match) => grouped.set(match.ronda, [...(grouped.get(match.ronda) ?? []), match]))
      return [...grouped.entries()].sort(([a], [b]) => a - b).map(([round, list]) => ({ round, list: list as (PartidoLlave | null)[] }))
    }
    const total = Math.max(1, Math.ceil(Math.log2(Math.max(2, maxTeams))))
    return Array.from({ length: total }, (_, index) => ({ round: index + 1, list: Array.from({ length: 2 ** (total - index - 1) }, () => null) }))
  }, [matches, maxTeams])

  const lastRound = rounds[rounds.length - 1]
  // Campeón: ganador del único partido de la última ronda (la final), si ya se definió
  const finalMatch = lastRound.list.length === 1 ? lastRound.list[0] : null
  const champion = finalMatch?.ganador_id ? finalMatch.ganador : null

  return (
    <div className="-mx-2 overflow-x-auto px-2 pb-2">
      <div className="flex min-w-max gap-14">
        {rounds.map(({ round, list }) => (
          <section key={round} className="flex flex-col gap-4">
            <h3 className={cn(LABEL, 'text-[#8fa596]')}>{roundName(round, lastRound.round)}</h3>
            <div className="flex flex-1 flex-col justify-around gap-6">
              {list.map((match, index) => <BracketMatch key={match?.id ?? `vacio-${index}`} match={match} last={round === lastRound.round} teamHref={teamHref} />)}
            </div>
          </section>
        ))}
        <ChampionColumn name={champion} />
      </div>
    </div>
  )
}

function Datum({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className={cn(LABEL, 'text-[#8fa596]')}>{label}</p>
      <p className="mt-1 break-words text-lg font-bold">{children}</p>
    </div>
  )
}

// Se monta con key={id}: al pasar de un torneo a otro se reinicia todo el estado local (por ejemplo, el código privado)
export function TournamentDetailPage() {
  const id = Number(useParams().id)
  return <TournamentDetailContent key={id} id={id} />
}

function TournamentDetailContent({ id }: { id: number }) {
  const { session, isAdmin } = useAuth()
  const location = useLocation()
  const inApp = location.pathname.startsWith('/app')
  const queryClient = useQueryClient()
  const routeCode = (location.state as { accessCode?: string } | null)?.accessCode
  const privateLookupCode = routeCode || sessionStorage.getItem(`private-tournament-code:${id}`) || ''
  const [accessCode, setAccessCode] = useState(privateLookupCode)
  const tournamentQuery = useQuery({ queryKey: ['tournament', id, isAdmin, privateLookupCode], queryFn: () => getTournament(id, isAdmin, privateLookupCode), enabled: Number.isFinite(id) })
  const myTeamQuery = useQuery({ queryKey: ['my-team'], queryFn: getMyTeam, enabled: Boolean(session) })
  const enrolledForBracket = Boolean(myTeamQuery.data && tournamentQuery.data?.equipos.some((team) => team.id === myTeamQuery.data?.id))
  const canReadBracket = !privateLookupCode || isAdmin || enrolledForBracket
  const bracketQuery = useQuery({ queryKey: ['bracket', id], queryFn: () => getBracket(id), enabled: Number.isFinite(id) && canReadBracket })
  const enrollMutation = useMutation({
    mutationFn: () => {
      if (!myTeamQuery.data) throw new Error('Primero creá un equipo o sumate a uno desde Mi equipo.')
      return enrollTeam({ tournamentId: id, teamId: myTeamQuery.data.id, accessCode })
    },
    onSuccess: () => {
      toast.success('Equipo inscripto al torneo')
      invalidarConsultas(queryClient, consultasDeInscripcion(id))
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const bracketMutation = useMutation({
    mutationFn: () => generateBracket(id),
    onSuccess: () => {
      toast.success('Llave generada correctamente')
      invalidarConsultas(queryClient, consultasDeInscripcion(id))
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (tournamentQuery.isLoading) return <div className="container-shell py-12"><LoadingState label="Cargando torneo" /></div>
  if (tournamentQuery.isError) return <div className="container-shell py-12"><ErrorState message={tournamentQuery.error.message} retry={() => void tournamentQuery.refetch()} /></div>
  if (!tournamentQuery.data) return <div className="container-shell py-12"><EmptyState title="Torneo inexistente" description="No encontramos el torneo solicitado." /></div>

  const tournament = tournamentQuery.data
  const prefix = inApp ? '/app' : ''
  const enrolledIds = new Set(tournament.equipos.map((team) => team.id))
  const teamHref = (teamId: number | null) => (teamId !== null && enrolledIds.has(teamId) ? `${prefix}/equipos/${teamId}` : null)
  const alreadyEnrolled = myTeamQuery.data ? enrolledIds.has(myTeamQuery.data.id) : false
  const hasBracket = Boolean(bracketQuery.data?.length)
  const canGenerateBracket = [2, 4, 8, 16].includes(tournament.equipos.length) && tournament.estado === 'inscripcion' && !hasBracket
  const freeSlots = Math.max(0, tournament.max_equipos - tournament.equipos.length)
  const finished = tournament.estado === 'finalizado'

  return (
    <div className="container-shell flex flex-col gap-6 py-10 sm:py-12">
      <Link to={`${prefix}/torneos`} className="inline-flex items-center gap-2 self-start text-[13px] font-bold uppercase tracking-[0.06em] text-[#b7c8bd] transition hover:text-primary">
        <ChevronLeft className="size-4" aria-hidden="true" /> Volver a torneos
      </Link>

      {/* Portada: líneas de cancha de fondo, chips, nombre, inscripción y la copa */}
      <section
        className="relative flex flex-col gap-8 overflow-hidden rounded-[20px] border border-primary/22 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:px-9 sm:py-8 md:min-h-[270px] md:flex-row md:items-center"
        style={{ background: 'radial-gradient(circle at 85% 50%, rgba(242,201,76,0.16), transparent 40%), linear-gradient(120deg, rgba(53,244,110,0.1), #0b1b12 60%)' }}
      >
        <PitchLines className="absolute -left-[60px] -top-6 h-[320px] w-[780px] opacity-[0.13]" />
        <div className="relative flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="flex flex-wrap gap-2">
            <StateChip state={tournament.estado} large />
            <ModalityChip tipo={tournament.tipo_futbol} large />
            {tournament.visibilidad === 'privado' && <PrivateChip large />}
          </div>
          <h1 className="break-words font-display text-5xl font-black uppercase leading-[0.9] sm:text-7xl lg:text-[84px]">{tournament.nombre}</h1>
          {tournament.descripcion && <p className="max-w-2xl text-sm leading-relaxed text-[#b7c8bd]">{tournament.descripcion}</p>}

          {tournament.estado === 'inscripcion' && session && !alreadyEnrolled && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                {tournament.visibilidad === 'privado' && (
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-4 size-4 text-[#8fa596]" aria-hidden="true" />
                    <Input aria-label="Código del torneo privado" value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} maxLength={6} placeholder="Código privado" className="h-12 rounded-xl pl-10 font-mono uppercase tracking-widest sm:w-48" />
                  </div>
                )}
                <Button onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending || !myTeamQuery.data} className="h-12 self-start rounded-xl px-6 text-base font-extrabold normal-case tracking-[0.02em] shadow-[0_8px_20px_rgba(53,244,110,0.22)]">
                  {enrollMutation.isPending ? 'Inscribiendo...' : 'Inscribir mi equipo'}
                </Button>
              </div>
              <p className="text-xs text-[#b7c8bd]">
                {myTeamQuery.data || myTeamQuery.isLoading ? 'La base validará cupo, plantel mínimo y pertenencia al equipo.' : 'Primero creá un equipo o sumate a uno desde Mi equipo.'}
              </p>
            </div>
          )}
          {alreadyEnrolled && (
            <p className="mt-2 inline-flex items-center gap-2 self-start rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold"><Shield className="size-5 text-primary" aria-hidden="true" /> Tu equipo ya está inscripto en este torneo.</p>
          )}
          {!session && tournament.estado === 'inscripcion' && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button asChild className="h-12 rounded-xl px-6 text-base font-extrabold normal-case tracking-[0.02em] shadow-[0_8px_20px_rgba(53,244,110,0.22)]"><Link to="/login">Inscribir mi equipo</Link></Button>
              <span className="text-sm text-[#b7c8bd]">Iniciá sesión para inscribir tu equipo.</span>
            </div>
          )}
        </div>
        <div className="relative order-first flex shrink-0 justify-center md:order-none md:basis-[260px]">
          <LabelledTrophy
            text="90'"
            dim={finished}
            shine={!finished}
            label={finished ? 'Trofeo del torneo finalizado' : 'Trofeo del torneo'}
            className="anim-pop w-28 drop-shadow-[0_14px_28px_rgba(242,201,76,0.25)] sm:w-36 md:w-[176px]"
          />
        </div>
      </section>

      {isAdmin && tournament.visibilidad === 'privado' && tournament.codigo_acceso && (
        <div className={cn(CARD, 'flex flex-col gap-4 border-warning/25 p-5 sm:flex-row sm:items-center sm:justify-between')}>
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-warning/10 text-warning"><KeyRound className="size-5" aria-hidden="true" /></span><div><h2 className="font-display text-xl font-bold uppercase">Clave del torneo privado</h2><p className="text-xs text-[#b7c8bd]">Solo los administradores pueden verla desde este panel.</p></div></div>
          <button type="button" aria-label="Copiar la clave del torneo" onClick={() => { void navigator.clipboard.writeText(tournament.codigo_acceso!.trim()); toast.success('Clave del torneo copiada') }} className="flex items-center justify-between gap-5 rounded-lg border border-warning/25 bg-[#06110b]/70 px-4 py-3 font-mono text-xl font-black tracking-[0.18em] text-warning transition hover:border-warning/50">{tournament.codigo_acceso.trim()}<Copy className="size-4" aria-hidden="true" /></button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {/* Datos del torneo y escudos de los inscriptos */}
        <div className={cn(CARD, 'grid grid-cols-2 content-start gap-x-5 gap-y-[18px] p-6')}>
          <Datum label="Fecha">{formatDate(tournament.fecha, 'd MMM yyyy')}</Datum>
          <Datum label="Modalidad">Fútbol {tournament.tipo_futbol}</Datum>
          <Datum label="Lugar">{tournament.lugar || 'A confirmar'}</Datum>
          <Datum label="Cupo">{tournament.max_equipos} equipos</Datum>
          <div className="col-span-full flex flex-col gap-3 border-t border-[#f4f8f5]/10 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className={cn(LABEL, 'text-primary')}>Equipos inscriptos</h2>
              <span className="font-mono text-xs text-[#b7c8bd]">{tournament.equipos.length} de {tournament.max_equipos}</span>
            </div>
            {tournament.equipos.length === 0 && <p className="text-sm text-[#b7c8bd]">Todavía no hay equipos inscriptos.</p>}
            <ul className="flex flex-wrap items-start gap-x-[22px] gap-y-4">
              {tournament.equipos.map((team) => (
                <li key={team.id}>
                  <Link to={`${prefix}/equipos/${team.id}`} className="group flex w-[72px] flex-col items-center gap-1.5 text-center">
                    <TeamCrest name={team.nombre} className="h-[61px] w-[52px] transition motion-safe:group-hover:-translate-y-0.5" />
                    <span className="line-clamp-2 break-words text-xs text-[#b7c8bd] group-hover:text-primary">{team.nombre}</span>
                  </Link>
                </li>
              ))}
              {Array.from({ length: freeSlots }, (_, index) => (
                <li key={`libre-${index}`} className="flex w-[72px] flex-col items-center gap-1.5 text-center">
                  <EmptyCrest className="h-[61px] w-[52px]" />
                  <span className="text-xs text-[#8fa596]">Libre</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Lugar: plano ilustrado con el pin; tocándolo se abre Google Maps */}
        <VenueMap lugar={tournament.lugar} />
      </div>

      {/* Llave con escudos y campeón */}
      <section className={cn(CARD, 'flex flex-col gap-4 p-6')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={cn(LABEL, 'text-primary')}>Llave del torneo</h2>
          <div className="flex flex-wrap items-center gap-3">
            {!hasBracket && canReadBracket && !bracketQuery.isLoading && <span className="text-[13px] text-[#8fa596]">Se arma al cerrar la inscripción</span>}
            {isAdmin && !hasBracket && (
              <Button size="sm" onClick={() => bracketMutation.mutate()} disabled={!canGenerateBracket || bracketMutation.isPending}>
                <Sparkles className="size-4" aria-hidden="true" /> {bracketMutation.isPending ? 'Generando...' : 'Generar llave'}
              </Button>
            )}
          </div>
        </div>
        {isAdmin && !hasBracket && !canGenerateBracket && <p className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs leading-5 text-warning">Para generar la llave se necesitan 2, 4, 8 o 16 equipos inscriptos y el torneo debe seguir en inscripción.</p>}
        {bracketQuery.isLoading && <LoadingState label="Cargando llave" />}
        {bracketQuery.isError && <ErrorState message={bracketQuery.error.message} retry={() => void bracketQuery.refetch()} />}
        {bracketQuery.data && !hasBracket && <p className="text-sm text-[#b7c8bd]"><strong className="font-semibold text-[#f4f8f5]">Llave pendiente.</strong> El administrador todavía no generó la llave de este torneo.</p>}
        {bracketQuery.data && <Bracket matches={bracketQuery.data} maxTeams={tournament.max_equipos} teamHref={teamHref} />}
        {!canReadBracket && <EmptyState title="Llave protegida" description="La llave estará disponible cuando tu equipo quede inscripto en el torneo privado." />}
      </section>
    </div>
  )
}
