import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { PlayerFormDialog } from '@/components/admin/player-form-dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { Jersey, Pitch, PitchLines, PlayerAvatar, Silhouette, TeamCrest } from '@/components/visuals/art'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { deletePlayer, getPlayer, getTeam, getTeamTournaments } from '@/lib/api'
import { formatDate, getErrorMessage, positionLabel, tournamentStateLabel } from '@/lib/utils'

// Tarjeta oscura con rótulo verde en mono, como en el resto de las fichas
function FichaCard({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-4 rounded-2xl border border-base-content/10 bg-[#0b1b12] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.35)] sm:p-6 ${className}`}>
      <h2 className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-primary">{title}</h2>
      {children}
    </section>
  )
}

export function PlayerDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const query = useQuery({ queryKey: ['player', id], queryFn: () => getPlayer(id), enabled: Number.isFinite(id) })
  const teamId = query.data?.equipo_id
  // Plantel del equipo: compañeros y si este jugador es el administrador del equipo
  const teamQuery = useQuery({ queryKey: ['team', teamId], queryFn: () => getTeam(teamId as number), enabled: teamId !== undefined })
  // Torneos en los que está anotado su equipo, para el recorrido
  const tournamentsQuery = useQuery({ queryKey: ['team-tournaments', teamId], queryFn: () => getTeamTournaments(teamId as number), enabled: teamId !== undefined })
  const removeMutation = useMutation({
    mutationFn: () => deletePlayer(id),
    onSuccess: () => {
      toast.success('Jugador removido del plantel')
      void queryClient.invalidateQueries({ queryKey: ['players'] })
      void queryClient.invalidateQueries({ queryKey: ['teams'] })
      navigate('/app/jugadores')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (query.isLoading) return <LoadingState label="Cargando ficha del jugador" />
  if (query.isError) return <ErrorState message={query.error.message} retry={() => void query.refetch()} />
  if (!query.data) return <EmptyState title="Jugador inexistente" description="No encontramos la ficha solicitada." />
  const player = query.data
  const roster = teamQuery.data?.jugadores ?? []
  const isTeamAdmin = roster.find((member) => member.id === player.id)?.es_admin_del_equipo ?? false
  const teammates = roster.filter((member) => member.id !== player.id)
  const tournaments = tournamentsQuery.data ?? []

  return (
    <div className="flex flex-col gap-7">
      <Button asChild variant="ghost" size="sm" className="self-start"><Link to="/app/jugadores"><ArrowLeft className="size-4" /> Volver a jugadores</Link></Button>

      {/* Portada: silueta, nombre gigante, chips y escudo */}
      <section className="relative flex flex-col gap-6 overflow-hidden rounded-[20px] border border-primary/20 bg-[linear-gradient(120deg,rgba(53,244,110,0.1),#0b1b12_55%)] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:p-7 md:flex-row md:items-stretch md:gap-9">
        <PitchLines className="absolute -right-20 -top-2 hidden h-[360px] w-[560px] opacity-[0.14] md:block" />

        <div className="relative flex h-56 shrink-0 items-end justify-center overflow-hidden rounded-2xl border border-primary/30 bg-[radial-gradient(circle_at_50%_28%,rgba(53,244,110,0.22),#0b1b12_72%)] shadow-[0_10px_28px_rgba(0,0,0,0.4)] sm:h-72 md:h-[340px] md:w-[280px]">
          <Silhouette label={`Silueta de ${player.nombre}`} className="h-[92%] w-auto" />
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col justify-between gap-6 md:py-2">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">Ficha de jugador</p>
            <h1 className="break-words font-display text-5xl font-black uppercase leading-[0.9] sm:text-7xl lg:text-[6.5rem]">{player.nombre}</h1>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-primary/15 px-3 py-1.5 font-mono text-xs font-bold uppercase text-primary">{positionLabel[player.posicion]}</span>
              {teamQuery.data && <span className="rounded-md bg-base-content/10 px-3 py-1.5 font-mono text-xs font-bold uppercase text-base-content/80">{isTeamAdmin ? 'Administrador del equipo' : 'Invitado'}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <Link to={`/app/equipos/${player.equipo_id}`} className="group flex items-center gap-4">
              <TeamCrest name={player.equipo} label={`Escudo de ${player.equipo}`} className="h-[84px] w-[72px] shrink-0" />
              <span className="min-w-0">
                <span className="block font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-base-content/70">Equipo actual</span>
                <span className="mt-1 block break-words font-display text-3xl font-extrabold uppercase transition group-hover:text-primary sm:text-4xl">{player.equipo}</span>
              </span>
            </Link>
            {isAdmin && <div className="flex flex-wrap gap-2"><PlayerFormDialog player={player} trigger={<Button variant="outline"><Pencil className="size-4" /> Editar</Button>} /><Button variant="destructive" onClick={() => { if (window.confirm(`¿Remover a ${player.nombre} del plantel?`)) removeMutation.mutate() }} disabled={removeMutation.isPending}><Trash2 className="size-4" /> {removeMutation.isPending ? 'Removiendo...' : 'Remover'}</Button></div>}
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <FichaCard title="Posición en la cancha">
          <Pitch players={[{ name: player.nombre, posicion: player.posicion, focus: true }]} label={`Cancha con la zona de ${positionLabel[player.posicion].toLowerCase()} marcada`} className="h-auto w-full" />
          <p className="text-sm text-base-content/75">Juega de <strong className="text-base-content">{positionLabel[player.posicion].toLowerCase()}</strong>: marcamos su zona en la cancha.</p>
        </FichaCard>

        <FichaCard title="Camiseta del equipo">
          <div className="grid h-52 place-items-center rounded-xl bg-[radial-gradient(circle_at_50%_40%,rgba(53,244,110,0.14),transparent_70%)]">
            <Jersey name={player.equipo} label={`Camiseta de ${player.equipo}`} className="size-48" />
          </div>
          <p className="text-sm text-base-content/75">Con los colores de {player.equipo}.</p>
        </FichaCard>

        <FichaCard title="Su recorrido" className="md:col-span-2 lg:col-span-1">
          <ol className="relative flex flex-col gap-5">
            <span aria-hidden="true" className="absolute bottom-3 left-[5px] top-2.5 w-0.5 bg-primary/25" />
            <li className="relative flex items-start gap-3.5">
              <span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full bg-primary shadow-[0_0_0_4px_rgba(53,244,110,0.15)]" />
              <div><p className="font-bold">Se sumó a {player.equipo}</p><p className="mt-0.5 text-[0.8rem] text-base-content/70">{formatDate(player.unido_en, "dd 'de' MMMM, yyyy")}</p></div>
            </li>
            {tournaments.map((tournament) => (
              <li key={tournament.id} className="relative flex items-start gap-3.5">
                <span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full bg-primary shadow-[0_0_0_4px_rgba(53,244,110,0.15)]" />
                <div><p className="font-bold">Anotado en {tournament.nombre}</p><p className="mt-0.5 text-[0.8rem] text-base-content/70">{tournamentStateLabel[tournament.estado]} · {formatDate(tournament.fecha, "dd 'de' MMMM, yyyy")}</p></div>
              </li>
            ))}
            {tournamentsQuery.isSuccess && tournaments.length === 0 && (
              <li className="relative flex items-start gap-3.5">
                <span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full border-2 border-primary bg-[#0b1b12]" />
                <div><p className="font-bold text-base-content/80">Sin torneos todavía</p><p className="mt-0.5 text-[0.8rem] text-base-content/70">Su equipo no está anotado en ningún torneo.</p></div>
              </li>
            )}
          </ol>
        </FichaCard>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-base-content/10 bg-[#0b1b12] px-5 py-5 shadow-[0_10px_28px_rgba(0,0,0,0.35)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-5 sm:px-6">
        <h2 className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-primary">Compañeros</h2>
        {teamQuery.isLoading && <p className="text-sm text-base-content/70">Cargando plantel...</p>}
        {teamQuery.isError && <p className="text-sm text-base-content/70">No pudimos cargar a los compañeros.</p>}
        {teamQuery.isSuccess && (teammates.length === 0
          ? <p className="text-sm text-base-content/70">Por ahora es el único jugador de {player.equipo}.</p>
          : (
            <ul className="flex flex-wrap gap-2.5">
              {teammates.map((member) => {
                const title = member.es_admin_del_equipo ? `${member.nombre}, administrador del equipo` : member.nombre
                return (
                  <li key={member.id}>
                    <Link to={`/app/jugadores/${member.id}`} title={title} aria-label={`Ver ficha de ${title}`} className="block rounded-full transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                      <PlayerAvatar name={member.nombre} admin={member.es_admin_del_equipo} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          ))}
        {teamQuery.isSuccess && teammates.length > 0 && <p className="text-[0.8rem] text-base-content/70 sm:ml-auto">Borde verde: administrador del equipo.</p>}
      </section>

      {!isAdmin && <div className="rounded-xl border border-base-content/10 bg-base-200/60 p-4 text-sm text-base-content/75">Esta ficha es de solo lectura. La asignación de planteles está reservada a administradores.</div>}
    </div>
  )
}
