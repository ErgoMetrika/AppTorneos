import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, UserRound } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { PlayerFormDialog } from '@/components/admin/player-form-dialog'
import { TeamMark } from '@/components/shared/team-mark'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { InvitePlayerDialog } from '@/components/team/invite-player-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/context/auth-context'
import { getMyTeam, getTeam } from '@/lib/api'
import { positionLabel } from '@/lib/utils'

export function TeamDetailPage() {
  const id = Number(useParams().id)
  const location = useLocation()
  const { isAdmin } = useAuth()
  const inApp = location.pathname.startsWith('/app')
  const query = useQuery({ queryKey: ['team', id], queryFn: () => getTeam(id), enabled: Number.isFinite(id) })
  const myTeamQuery = useQuery({ queryKey: ['my-team'], queryFn: getMyTeam, enabled: !isAdmin })

  if (query.isLoading) return <div className="container-shell py-12"><LoadingState label="Cargando plantel" /></div>
  if (query.isError) return <div className="container-shell py-12"><ErrorState message={query.error.message} retry={() => void query.refetch()} /></div>
  if (!query.data) return <div className="container-shell py-12"><EmptyState title="Equipo inexistente" description="No encontramos el equipo solicitado." /></div>

  const team = query.data
  const canInvite = !isAdmin && myTeamQuery.data?.id === team.id
  return (
    <div className="container-shell py-12 sm:py-16">
      <Button asChild variant="ghost" size="sm"><Link to={`${inApp ? '/app' : ''}/equipos`}><ArrowLeft className="size-4" /> Volver a equipos</Link></Button>
      <section className="mt-6 flex flex-col gap-6 rounded-2xl border border-primary/20 bg-[linear-gradient(120deg,rgba(53,244,110,0.12),rgba(11,27,18,0.9)_55%)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-5"><TeamMark name={team.nombre} className="size-20" /><div><p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Equipo registrado</p><h1 className="font-display text-4xl font-black uppercase sm:text-5xl">{team.nombre}</h1></div></div>
        <div className="flex flex-wrap items-center gap-4">{isAdmin && <PlayerFormDialog defaultTeamId={team.id} />}{canInvite && myTeamQuery.data && <InvitePlayerDialog teamName={team.nombre} teamCode={myTeamQuery.data.codigo_equipo} />}<div className="stats bg-transparent shadow-none"><div className="stat px-4"><div className="stat-title text-xs text-base-content/40">Plantel</div><div className="stat-value font-display text-4xl text-primary">{team.jugadores.length}</div><div className="stat-desc text-base-content/45">jugadores</div></div></div></div>
      </section>

      <div className="mt-8">
        <div className="mb-4"><p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Plantel</p><h2 className="font-display text-3xl font-black uppercase">Jugadores</h2></div>
        {team.jugadores.length === 0 ? <EmptyState title="Plantel vacío" description="Este equipo todavía no tiene jugadores." /> : (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_36px] border-b border-base-content/10 bg-base-300/50 px-5 py-3 font-mono text-[0.6rem] font-bold uppercase tracking-widest text-base-content/40"><span>Jugador</span><span>Posición</span><span /></div>
            {team.jugadores.map((player, index) => (
              <div key={`${player.nombre}-${index}`} className="grid grid-cols-[1fr_160px_36px] items-center border-b border-base-content/10 px-5 py-4 last:border-0">
                <Link to={`/app/jugadores/${player.id}`} className="flex items-center gap-3 font-semibold transition hover:text-primary"><UserRound className="size-4 text-base-content/30" /> {player.nombre}</Link>
                <Badge variant="secondary">{positionLabel[player.posicion]}</Badge>
                <Button asChild size="icon" variant="ghost" className="size-8"><Link to={`/app/jugadores/${player.id}`} aria-label={`Ver ficha de ${player.nombre}`}><ChevronRight className="size-4" /></Link></Button>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
