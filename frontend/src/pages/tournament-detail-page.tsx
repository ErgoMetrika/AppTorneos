import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, KeyRound, LockKeyhole, MapPin, Network, Shield, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { TeamMark } from '@/components/shared/team-mark'
import { TournamentStateBadge } from '@/components/shared/tournament-state-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-context'
import { enrollTeam, getBracket, getMyTeam, getTournament } from '@/lib/api'
import { formatDate, getErrorMessage, visibilityLabel } from '@/lib/utils'
import type { PartidoLlave } from '@/types/domain'

function MatchCard({ match }: { match: PartidoLlave }) {
  const finished = match.estado === 'finalizado'
  return (
    <div className="w-64 rounded-lg border border-base-content/10 bg-base-100 p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between font-mono text-[0.55rem] font-bold uppercase tracking-wider text-base-content/35">
        <span>Llave {match.llave}</span><span>{match.estado.replace('_', ' ')}</span>
      </div>
      {[
        { name: match.local, goals: match.goles_local, penalties: match.penales_local, id: match.equipo_local_id },
        { name: match.visitante, goals: match.goles_visitante, penalties: match.penales_visitante, id: match.equipo_visitante_id },
      ].map((team, index) => (
        <div key={`${team.id ?? 'empty'}-${index}`} className="flex items-center justify-between border-t border-base-content/10 py-2 first:border-0">
          <span className={team.id === match.ganador_id ? 'font-bold text-primary' : 'text-sm'}>{team.name ?? 'A definir'}</span>
          <span className="font-mono text-sm font-bold">{finished ? team.goals : '–'}{team.penalties !== null ? <small className="ml-1 text-base-content/40">({team.penalties})</small> : null}</span>
        </div>
      ))}
    </div>
  )
}

function Bracket({ matches }: { matches: PartidoLlave[] }) {
  const rounds = useMemo(() => {
    const grouped = new Map<number, PartidoLlave[]>()
    matches.forEach((match) => grouped.set(match.ronda, [...(grouped.get(match.ronda) ?? []), match]))
    return [...grouped.entries()]
  }, [matches])

  if (!matches.length) {
    return <EmptyState title="Llave pendiente" description="El administrador todavía no generó la llave de este torneo." />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-base-content/10 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:32px_32px] p-6">
      <div className="flex min-w-max gap-14">
        {rounds.map(([round, roundMatches]) => (
          <section key={round} className="flex flex-col justify-around gap-6">
            <h3 className="text-center font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">Ronda {round}</h3>
            <div className="flex flex-1 flex-col justify-around gap-6">{roundMatches.map((match) => <MatchCard key={match.id} match={match} />)}</div>
          </section>
        ))}
      </div>
    </div>
  )
}

export function TournamentDetailPage() {
  const id = Number(useParams().id)
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [accessCode, setAccessCode] = useState('')
  const tournamentQuery = useQuery({ queryKey: ['tournament', id], queryFn: () => getTournament(id), enabled: Number.isFinite(id) })
  const bracketQuery = useQuery({ queryKey: ['bracket', id], queryFn: () => getBracket(id), enabled: Number.isFinite(id) })
  const myTeamQuery = useQuery({ queryKey: ['my-team'], queryFn: getMyTeam, enabled: Boolean(session) })
  const enrollMutation = useMutation({
    mutationFn: () => {
      if (!myTeamQuery.data) throw new Error('Primero tenés que crear un equipo o unirte a uno.')
      return enrollTeam({ tournamentId: id, teamId: myTeamQuery.data.id, accessCode })
    },
    onSuccess: () => {
      toast.success('Equipo inscripto al torneo')
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

  return (
    <div className="container-shell py-12 sm:py-16">
      <Button asChild variant="ghost" size="sm"><Link to="/torneos"><ArrowLeft className="size-4" /> Volver a torneos</Link></Button>

      <section className="relative mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(120deg,rgba(53,244,110,0.14),rgba(11,27,18,0.95)_60%)] p-6 sm:p-8">
        <Network className="absolute -right-6 -top-8 size-64 text-primary/5" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2"><TournamentStateBadge state={tournament.estado} /><Badge variant="outline">{visibilityLabel[tournament.visibilidad]}</Badge></div>
            <h1 className="mt-5 font-display text-5xl font-black uppercase leading-[0.9] sm:text-7xl">{tournament.nombre}</h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-base-content/60">{tournament.descripcion || 'Torneo de eliminación directa.'}</p>
          </div>
          <div className="grid min-w-72 grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-base-100/55 p-4"><CalendarDays className="mb-3 size-5 text-primary" /><p className="text-xs text-base-content/40">Fecha</p><strong>{formatDate(tournament.fecha, 'dd MMM yyyy')}</strong></div>
            <div className="rounded-lg bg-base-100/55 p-4"><MapPin className="mb-3 size-5 text-primary" /><p className="text-xs text-base-content/40">Lugar</p><strong>{tournament.lugar || 'A confirmar'}</strong></div>
            <div className="rounded-lg bg-base-100/55 p-4"><Shield className="mb-3 size-5 text-primary" /><p className="text-xs text-base-content/40">Modalidad</p><strong>Fútbol {tournament.tipo_futbol}</strong></div>
            <div className="rounded-lg bg-base-100/55 p-4"><Users className="mb-3 size-5 text-primary" /><p className="text-xs text-base-content/40">Equipos</p><strong>{tournament.equipos.length} / {tournament.max_equipos}</strong></div>
          </div>
        </div>
      </section>

      {tournament.estado === 'inscripcion' && session && !alreadyEnrolled && (
        <Card className="mt-6 flex flex-col gap-4 border-primary/25 p-5 md:flex-row md:items-center md:justify-between">
          <div><h2 className="font-display text-2xl font-bold uppercase">Inscribir mi equipo</h2><p className="mt-1 text-xs text-base-content/45">La base validará cupo, plantel mínimo y pertenencia al equipo.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {tournament.visibilidad === 'privado' && <div className="relative"><KeyRound className="absolute left-3 top-3.5 size-4 text-base-content/35" /><Input value={accessCode} onChange={(event) => setAccessCode(event.target.value.toUpperCase())} maxLength={6} placeholder="Código privado" className="pl-10 uppercase" /></div>}
            <Button onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending || !myTeamQuery.data}>{enrollMutation.isPending ? 'Inscribiendo...' : 'Inscribir equipo'}</Button>
          </div>
        </Card>
      )}
      {alreadyEnrolled && <div className="alert alert-success mt-6 border border-success/20 bg-success/10"><Shield className="size-5" /><span>Tu equipo ya está inscripto en este torneo.</span></div>}
      {!session && tournament.estado === 'inscripcion' && <div className="alert mt-6 border border-base-content/10 bg-base-200"><LockKeyhole className="size-5 text-primary" /><span>Iniciá sesión para inscribir tu equipo.</span><Button asChild size="sm"><Link to="/login">Ingresar</Link></Button></div>}

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between"><div><p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Participantes</p><h2 className="font-display text-3xl font-black uppercase">Equipos inscriptos</h2></div><span className="text-xs text-base-content/40">{tournament.equipos.length} de {tournament.max_equipos}</span></div>
        {tournament.equipos.length === 0 ? <EmptyState title="Sin inscriptos" description="Todavía no hay equipos inscriptos." /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{tournament.equipos.map((team) => <Link key={team.id} to={`/equipos/${team.id}`} className="flex items-center gap-3 rounded-xl border border-base-content/10 bg-base-200/60 p-4 transition hover:border-primary/30"><TeamMark name={team.nombre} className="size-12" /><strong className="font-display text-lg uppercase">{team.nombre}</strong></Link>)}</div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-5"><p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Eliminación directa</p><h2 className="font-display text-3xl font-black uppercase">Llave del torneo</h2></div>
        {bracketQuery.isLoading && <LoadingState label="Cargando llave" />}
        {bracketQuery.isError && <ErrorState message={bracketQuery.error.message} retry={() => void bracketQuery.refetch()} />}
        {bracketQuery.data && <Bracket matches={bracketQuery.data} />}
      </section>
    </div>
  )
}
