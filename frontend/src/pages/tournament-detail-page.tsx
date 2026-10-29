import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Copy, KeyRound, LockKeyhole, MapPin, Shield, Sparkles, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { TournamentStateBadge } from '@/components/shared/tournament-state-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyCrest, PitchLines, TeamCrest, Trophy } from '@/components/visuals/art'
import { useAuth } from '@/context/auth-context'
import { enrollTeam, generateBracket, getBracket, getMyTeam, getTournament } from '@/lib/api'
import { formatDate, getErrorMessage, visibilityLabel } from '@/lib/utils'
import type { PartidoLlave } from '@/types/domain'

// Nombre de cada ronda contando desde la final (la última ronda es la final)
function roundName(round: number, lastRound: number) {
  const fromEnd = lastRound - round
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semifinal'
  if (fromEnd === 2) return 'Cuartos de final'
  if (fromEnd === 3) return 'Octavos de final'
  return `Ronda ${round}`
}

function MatchCard({ match }: { match: PartidoLlave }) {
  const finished = match.estado === 'finalizado'
  return (
    <div className="w-64 overflow-hidden rounded-xl border border-base-content/10 bg-base-100 shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-base-content/10 bg-base-200/70 px-3 py-2 font-mono text-[0.6rem] font-bold uppercase tracking-wider text-base-content/60">
        <span>Llave {match.llave}</span>
        <span className={match.estado === 'en_curso' ? 'text-info' : undefined}>{match.estado.replace('_', ' ')}</span>
      </div>
      {[
        { name: match.local, goals: match.goles_local, penalties: match.penales_local, id: match.equipo_local_id },
        { name: match.visitante, goals: match.goles_visitante, penalties: match.penales_visitante, id: match.equipo_visitante_id },
      ].map((team, index) => {
        const winner = team.id !== null && team.id === match.ganador_id
        return (
          <div key={`${team.id ?? 'empty'}-${index}`} className={`flex items-center gap-2.5 px-3 py-2 ${index > 0 ? 'border-t border-base-content/10' : ''} ${winner ? 'bg-primary/10 shadow-[inset_3px_0_0_#35f46e]' : ''}`}>
            {team.name ? <TeamCrest name={team.name} className="h-8 w-7 shrink-0" /> : <EmptyCrest className="h-8 w-7 shrink-0" />}
            <span title={team.name ?? undefined} className={`min-w-0 flex-1 truncate ${winner ? 'font-display text-base font-extrabold uppercase text-primary' : team.name ? 'font-display text-base font-semibold uppercase' : 'text-sm italic text-base-content/60'}`}>{team.name ?? 'A definir'}</span>
            <span className={`font-mono text-sm font-bold ${winner ? 'text-primary' : ''}`}>{finished ? team.goals : '–'}{team.penalties !== null ? <small className="ml-1 text-base-content/60">({team.penalties})</small> : null}</span>
          </div>
        )
      })}
    </div>
  )
}

function ChampionBlock({ name }: { name: string }) {
  return (
    <div className="relative mb-6 flex flex-col items-center gap-5 overflow-hidden rounded-2xl border border-[#f2c94c]/30 bg-[radial-gradient(circle_at_50%_0%,rgba(242,201,76,0.18),transparent_60%),linear-gradient(180deg,#10271a,#0b1b12)] p-6 text-center shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:flex-row sm:p-8 sm:text-left">
      <PitchLines className="absolute -right-24 -top-10 hidden h-[300px] w-[460px] opacity-[0.08] md:block" />
      <Trophy label="Trofeo de campeón" className="relative h-28 w-auto shrink-0 drop-shadow-[0_10px_24px_rgba(242,201,76,0.3)]" />
      <div className="relative flex min-w-0 flex-col items-center gap-4 sm:flex-row">
        <TeamCrest name={name} className="h-20 w-auto shrink-0" />
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#f2c94c]">Campeón del torneo</p>
          <p className="mt-1 break-words font-display text-4xl font-black uppercase leading-none sm:text-5xl">{name}</p>
        </div>
      </div>
    </div>
  )
}

function Bracket({ matches }: { matches: PartidoLlave[] }) {
  const rounds = useMemo(() => {
    const grouped = new Map<number, PartidoLlave[]>()
    matches.forEach((match) => grouped.set(match.ronda, [...(grouped.get(match.ronda) ?? []), match]))
    return [...grouped.entries()].sort(([a], [b]) => a - b)
  }, [matches])

  if (!matches.length) {
    return <EmptyState title="Llave pendiente" description="El administrador todavía no generó la llave de este torneo." />
  }

  const lastRound = rounds[rounds.length - 1]
  // Campeón: ganador del único partido de la última ronda (la final), si ya se definió
  const finalMatch = lastRound[1].length === 1 ? lastRound[1][0] : null
  const champion = finalMatch?.ganador_id ? finalMatch.ganador : null

  return (
    <>
      {champion && <ChampionBlock name={champion} />}
      <div className="overflow-x-auto rounded-2xl border border-base-content/10 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:32px_32px] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.3)] sm:p-6">
        <div className="flex min-w-max gap-10 sm:gap-14">
          {rounds.map(([round, roundMatches]) => (
            <section key={round} className="flex flex-col justify-around gap-6">
              <h3 className="mx-auto rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-center font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">{roundName(round, lastRound[0])}</h3>
              <div className="flex flex-1 flex-col justify-around gap-6">{roundMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-base-content/10 bg-base-100/60 p-3.5 sm:p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary"><Icon className="size-5" /></span>
      <div className="min-w-0">
        <p className="font-mono text-[0.6rem] font-bold uppercase tracking-wider text-base-content/60">{label}</p>
        <strong className="block break-words font-display text-lg font-bold uppercase leading-tight">{value}</strong>
      </div>
    </div>
  )
}

export function TournamentDetailPage() {
  const id = Number(useParams().id)
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
      void queryClient.invalidateQueries({ queryKey: ['tournament', id] })
      void queryClient.invalidateQueries({ queryKey: ['tournaments'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const bracketMutation = useMutation({
    mutationFn: () => generateBracket(id),
    onSuccess: () => {
      toast.success('Llave generada correctamente')
      void queryClient.invalidateQueries({ queryKey: ['bracket', id] })
      void queryClient.invalidateQueries({ queryKey: ['tournament', id] })
      void queryClient.invalidateQueries({ queryKey: ['tournaments'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (tournamentQuery.isLoading) return <div className="container-shell py-12"><LoadingState label="Cargando torneo" /></div>
  if (tournamentQuery.isError) return <div className="container-shell py-12"><ErrorState message={tournamentQuery.error.message} retry={() => void tournamentQuery.refetch()} /></div>
  if (!tournamentQuery.data) return <div className="container-shell py-12"><EmptyState title="Torneo inexistente" description="No encontramos el torneo solicitado." /></div>

  const tournament = tournamentQuery.data
  const alreadyEnrolled = myTeamQuery.data ? tournament.equipos.some((team) => team.id === myTeamQuery.data?.id) : false
  const canGenerateBracket = [2, 4, 8, 16].includes(tournament.equipos.length) && tournament.estado === 'inscripcion' && !bracketQuery.data?.length
  const freeSlots = Math.max(0, tournament.max_equipos - tournament.equipos.length)
  const fillPercent = Math.min(100, Math.round((tournament.equipos.length / tournament.max_equipos) * 100))

  return (
    <div className="container-shell py-12 sm:py-16">
      <Button asChild variant="ghost" size="sm"><Link to={`${inApp ? '/app' : ''}/torneos`}><ArrowLeft className="size-4" /> Volver a torneos</Link></Button>

      {/* Portada: trofeo, líneas de cancha de fondo, nombre y datos del torneo */}
      <section className="relative mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_85%_30%,rgba(53,244,110,0.18),transparent_42%),linear-gradient(120deg,rgba(53,244,110,0.08),rgba(11,27,18,0.95)_55%)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:p-8">
        <PitchLines className="absolute -right-16 -top-6 hidden h-[340px] w-[520px] opacity-[0.12] md:block" />
        <div className="relative flex flex-col gap-8">
          <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <TournamentStateBadge state={tournament.estado} />
                <Badge variant="outline">{visibilityLabel[tournament.visibilidad]}</Badge>
                <Badge variant="outline" className="font-mono">F{tournament.tipo_futbol}</Badge>
              </div>
              <h1 className="mt-5 break-words font-display text-5xl font-black uppercase leading-[0.9] sm:text-6xl xl:text-7xl">{tournament.nombre}</h1>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-base-content/70">{tournament.descripcion || 'Torneo de eliminación directa.'}</p>
            </div>
            <Trophy
              dim={tournament.estado === 'finalizado'}
              label={tournament.estado === 'finalizado' ? 'Trofeo del torneo finalizado' : 'Trofeo del torneo'}
              className="h-28 w-auto shrink-0 self-start drop-shadow-[0_14px_28px_rgba(242,201,76,0.25)] sm:h-44 sm:self-center lg:h-52"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
            <InfoTile icon={CalendarDays} label="Fecha" value={formatDate(tournament.fecha, 'dd MMM yyyy')} />
            <InfoTile icon={MapPin} label="Lugar" value={tournament.lugar || 'A confirmar'} />
            <InfoTile icon={Shield} label="Modalidad" value={`Fútbol ${tournament.tipo_futbol}`} />
            <InfoTile icon={Users} label="Cupo" value={`${tournament.equipos.length} / ${tournament.max_equipos} equipos`} />
          </div>
        </div>
      </section>

      {isAdmin && tournament.visibilidad === 'privado' && tournament.codigo_acceso && (
        <Card className="mt-6 flex flex-col gap-4 border-warning/25 bg-warning/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-warning/10 text-warning"><KeyRound className="size-5" /></span><div><h2 className="font-display text-xl font-bold uppercase">Clave del torneo privado</h2><p className="text-xs text-base-content/60">Solo los administradores pueden verla desde este panel.</p></div></div>
          <button type="button" onClick={() => { void navigator.clipboard.writeText(tournament.codigo_acceso!.trim()); toast.success('Clave del torneo copiada') }} className="flex items-center justify-between gap-5 rounded-lg border border-warning/25 bg-base-100/70 px-4 py-3 font-mono text-xl font-black tracking-[0.18em] text-warning transition hover:border-warning/50">{tournament.codigo_acceso.trim()}<Copy className="size-4" /></button>
        </Card>
      )}

      {tournament.estado === 'inscripcion' && session && !alreadyEnrolled && (
        <Card className="mt-6 flex flex-col gap-4 border-primary/25 p-5 md:flex-row md:items-center md:justify-between">
          <div><h2 className="font-display text-2xl font-bold uppercase">Inscribir mi equipo</h2><p className="mt-1 text-xs text-base-content/60">La base validará cupo, plantel mínimo y pertenencia al equipo.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {tournament.visibilidad === 'privado' && <div className="relative"><KeyRound className="absolute left-3 top-3.5 size-4 text-base-content/50" /><Input value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} maxLength={6} placeholder="Código privado" className="pl-10 uppercase" /></div>}
            <Button onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending || !myTeamQuery.data}>{enrollMutation.isPending ? 'Inscribiendo...' : 'Inscribir equipo'}</Button>
          </div>
        </Card>
      )}
      {alreadyEnrolled && <div className="alert mt-6 border border-success/30 bg-success/10 text-base-content"><Shield className="size-5 text-success" /><span>Tu equipo ya está inscripto en este torneo.</span></div>}
      {!session && tournament.estado === 'inscripcion' && <div className="alert mt-6 border border-base-content/10 bg-base-200"><LockKeyhole className="size-5 text-primary" /><span>Iniciá sesión para inscribir tu equipo.</span><Button asChild size="sm"><Link to="/login">Ingresar</Link></Button></div>}

      {/* Cupo: escudos de los inscriptos y lugares libres hasta el máximo */}
      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Participantes</p><h2 className="font-display text-3xl font-black uppercase">Equipos inscriptos</h2></div>
          <div className="w-32 shrink-0 text-right sm:w-44">
            <span className="font-mono text-xs font-bold text-base-content/70">{tournament.equipos.length} de {tournament.max_equipos}</span>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-base-content/10" aria-hidden="true"><div className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(53,244,110,0.6)]" style={{ width: `${fillPercent}%` }} /></div>
          </div>
        </div>
        {tournament.equipos.length === 0 && <div className="mb-4"><EmptyState title="Sin inscriptos" description="Todavía no hay equipos inscriptos." /></div>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-6">
          {tournament.equipos.map((team) => (
            <Link key={team.id} to={`${inApp ? '/app' : ''}/equipos/${team.id}`} className="group flex min-w-0 flex-col items-center gap-3 rounded-xl border border-base-content/10 bg-[radial-gradient(circle_at_50%_25%,rgba(53,244,110,0.1),transparent_65%)] bg-base-200/60 p-4 text-center transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
              <TeamCrest name={team.nombre} className="h-16 w-auto transition group-hover:scale-105 sm:h-20" />
              <strong className="min-w-0 max-w-full break-words font-display text-base uppercase leading-tight sm:text-lg">{team.nombre}</strong>
            </Link>
          ))}
          {Array.from({ length: freeSlots }, (_, index) => (
            <div key={`libre-${index}`} className="flex min-w-0 flex-col items-center gap-3 rounded-xl border border-dashed border-base-content/15 p-4 text-center">
              <EmptyCrest className="h-16 w-auto sm:h-20" />
              <span className="font-mono text-[0.65rem] font-bold uppercase tracking-wider text-base-content/60">Lugar libre</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Eliminación directa</p><h2 className="font-display text-3xl font-black uppercase">Llave del torneo</h2></div>{isAdmin && !bracketQuery.data?.length && <Button onClick={() => bracketMutation.mutate()} disabled={!canGenerateBracket || bracketMutation.isPending}><Sparkles className="size-4" /> {bracketMutation.isPending ? 'Generando...' : 'Generar llave'}</Button>}</div>
        {isAdmin && !bracketQuery.data?.length && !canGenerateBracket && <div className="mb-5 rounded-lg border border-warning/20 bg-warning/5 p-4 text-xs leading-5 text-warning">Para generar la llave se necesitan 2, 4, 8 o 16 equipos inscriptos y el torneo debe seguir en inscripción.</div>}
        {bracketQuery.isLoading && <LoadingState label="Cargando llave" />}
        {bracketQuery.isError && <ErrorState message={bracketQuery.error.message} retry={() => void bracketQuery.refetch()} />}
        {bracketQuery.data && <Bracket matches={bracketQuery.data} />}
        {!canReadBracket && <EmptyState title="Llave protegida" description="La llave estará disponible cuando tu equipo quede inscripto en el torneo privado." />}
      </section>
    </div>
  )
}
