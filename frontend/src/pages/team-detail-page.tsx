import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clipboard } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { PlayerFormDialog } from '@/components/admin/player-form-dialog'
import { TeamMark } from '@/components/shared/team-mark'
import { PositionSummary, TeamTournaments } from '@/components/team/team-tournaments'
import { PlayerCard } from '@/components/player/player-card'
import { Jersey, PitchLines } from '@/components/visuals/art'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { InvitePlayerDialog } from '@/components/team/invite-player-dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { getMyTeam, getTeam, getTeamCodes } from '@/lib/api'

export function TeamDetailPage() {
  const id = Number(useParams().id)
  const location = useLocation()
  const { isAdmin } = useAuth()
  const inApp = location.pathname.startsWith('/app')
  const query = useQuery({ queryKey: ['team', id], queryFn: () => getTeam(id), enabled: Number.isFinite(id) })
  const myTeamQuery = useQuery({ queryKey: ['my-team'], queryFn: getMyTeam, enabled: !isAdmin })
  const codesQuery = useQuery({ queryKey: ['team-codes'], queryFn: getTeamCodes, enabled: isAdmin })

  if (query.isLoading) return <div className="container-shell py-12"><LoadingState label="Cargando plantel" /></div>
  if (query.isError) return <div className="container-shell py-12"><ErrorState message={query.error.message} retry={() => void query.refetch()} /></div>
  if (!query.data) return <div className="container-shell py-12"><EmptyState title="Equipo inexistente" description="No encontramos el equipo solicitado." /></div>

  const team = query.data
  // Invita solo quien creó el equipo (es el único que recibe el código)
  const canInvite = !isAdmin && myTeamQuery.data?.id === team.id && !!myTeamQuery.data?.codigo_equipo
  const adminCode = codesQuery.data?.get(team.id)
  const adminPlayer = team.jugadores.find((player) => player.es_admin_del_equipo)
  return (
    <div className="container-shell py-12 sm:py-16">
      <Button asChild variant="ghost" size="sm"><Link to={`${inApp ? '/app' : ''}/equipos`}><ArrowLeft className="size-4" /> Volver a equipos</Link></Button>
      <section className="relative mt-6 flex flex-col gap-6 overflow-hidden rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_12%_50%,rgba(53,244,110,0.18),transparent_40%),linear-gradient(120deg,rgba(53,244,110,0.08),rgba(11,27,18,0.95)_55%)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <PitchLines className="absolute -right-16 -top-6 hidden h-[340px] w-[520px] opacity-[0.12] md:block" />
        <div className="relative flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-center"><TeamMark name={team.nombre} label={`Escudo de ${team.nombre}`} className="h-32 w-28" /><div className="min-w-0 max-w-full"><p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Equipo registrado</p><h1 className="break-words [overflow-wrap:anywhere] font-display text-5xl font-black uppercase leading-[0.9] sm:text-6xl">{team.nombre}</h1>{adminPlayer && <p className="mt-2 break-words [overflow-wrap:anywhere] text-sm text-base-content/65">Administrador del equipo: <strong className="text-base-content">{adminPlayer.nombre}</strong></p>}</div></div>
        <Jersey name={team.nombre} label={`Camiseta de ${team.nombre}`} className="relative hidden size-32 lg:block" />
        <div className="relative flex flex-wrap items-center gap-4">{isAdmin && <PlayerFormDialog defaultTeamId={team.id} />}{canInvite && myTeamQuery.data?.codigo_equipo && <InvitePlayerDialog teamName={team.nombre} teamCode={myTeamQuery.data.codigo_equipo} />}{isAdmin && adminCode && <button type="button" onClick={() => { void navigator.clipboard.writeText(adminCode); toast.success('Código copiado') }} className="rounded-xl border border-primary/25 bg-base-100/50 px-4 py-3 text-left"><span className="block font-mono text-[0.6rem] font-bold uppercase tracking-widest text-base-content/40">Código del equipo</span><span className="mt-1 flex items-center gap-2 font-mono text-lg font-black tracking-[0.18em] text-primary">{adminCode}<Clipboard className="size-4" /></span></button>}<div className="stats bg-transparent shadow-none"><div className="stat px-4"><div className="stat-title text-xs text-base-content/40">Plantel</div><div className="stat-value font-display text-4xl text-primary">{team.jugadores.length}</div><div className="stat-desc text-base-content/45">jugadores</div></div></div></div>
      </section>

      <div className="mt-8"><PositionSummary players={team.jugadores} /></div>
      <div className="mt-6"><TeamTournaments teamId={team.id} players={team.jugadores} /></div>

      <div className="mt-8">
        <div className="mb-4"><p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Plantel</p><h2 className="font-display text-3xl font-black uppercase">Jugadores</h2></div>
        {team.jugadores.length === 0 ? <EmptyState title="Plantel vacío" description="Este equipo todavía no tiene jugadores." /> : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {team.jugadores.map((player) => (
              <li key={player.id} className="mx-auto w-full max-w-[340px]">
                <PlayerCard nombre={player.nombre} posicion={player.posicion} equipo={team.nombre} esAdminDelEquipo={player.es_admin_del_equipo} unidoEn={player.unido_en} to={`/app/jugadores/${player.id}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
