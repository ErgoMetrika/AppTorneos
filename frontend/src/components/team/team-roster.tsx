import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LogOut, UserMinus } from 'lucide-react'
import { toast } from 'sonner'

import { PlayerCard } from '@/components/player/player-card'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { leaveTeam, removeTeamPlayer } from '@/lib/api'
import { consultasDelPlantel, invalidarConsultas } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/utils'
import type { MiEquipo } from '@/types/domain'

function useRefreshTeam() {
  const queryClient = useQueryClient()
  return (message: string) => {
    toast.success(message)
    invalidarConsultas(queryClient, consultasDelPlantel)
  }
}

// Ejecuta una acción y avisa el error; devuelve true si salió bien
async function run(action: () => Promise<unknown>) {
  try {
    await action()
    return true
  } catch (error) {
    toast.error(getErrorMessage(error))
    return false
  }
}

// Botón "Pedir el pase": el jugador deja su equipo (va en el encabezado de Mi equipo)
export function LeaveTeamButton({ team }: { team: MiEquipo }) {
  const refresh = useRefreshTeam()
  const mutation = useMutation({ mutationFn: leaveTeam, onSuccess: () => refresh('Pediste el pase: ya no estás en el equipo') })
  const nextAdmin = team.soy_creador ? team.jugadores.find((player) => !player.es_admin_del_equipo) : undefined

  return (
    <ConfirmDialog
      trigger={<Button variant="outline" disabled={team.compitiendo} title={team.compitiendo ? 'El equipo está jugando un torneo' : undefined}><LogOut className="size-4" /> Pedir el pase</Button>}
      icon={<LogOut className="size-5" />}
      title="Pedir el pase"
      description={<>Vas a dejar <strong className="text-base-content">{team.nombre}</strong>. Después podés crear otro equipo o sumarte a uno nuevo.</>}
      note={nextAdmin
        ? <>Sos el administrador del equipo: si te vas, <strong className="text-base-content">{nextAdmin.nombre}</strong> pasa a serlo.</>
        : 'Si el equipo está anotado en un torneo, no puede quedar con menos jugadores que el mínimo.'}
      confirmLabel="Pedir el pase"
      pendingLabel="Saliendo..."
      pending={mutation.isPending}
      onConfirm={() => run(() => mutation.mutateAsync())}
    />
  )
}

// Plantel de Mi equipo.
// El administrador del equipo (marcado en equipos.creado_por) puede quitar invitados.
// La posición la elige cada jugador al entrar y no se cambia desde acá.
export function TeamRoster({ team }: { team: MiEquipo }) {
  const { session } = useAuth()
  const refresh = useRefreshTeam()
  const removeMutation = useMutation({ mutationFn: removeTeamPlayer, onSuccess: () => refresh('Jugador quitado del plantel') })
  const myUserId = session?.user.id

  return (
    // Plantel de Mi equipo a todo el ancho, igual que en la ficha del equipo
    <section className="min-w-0">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Plantel</p>
          <h3 className="font-display text-3xl font-black uppercase">Jugadores</h3>
        </div>
        <span className="text-xs text-base-content/60">{team.jugadores.length} {team.jugadores.length === 1 ? 'jugador' : 'jugadores'}</span>
      </div>

      {team.jugadores.length === 0 ? (
        <div className="mt-4"><EmptyState title="Sin jugadores" description="Buscá jugadores por mail para invitarlos." /></div>
      ) : (
        // Mismas cartas grandes que en la ficha del equipo (team-detail-page)
        <ul className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {team.jugadores.map((player) => {
            const isMe = player.usuario_id === myUserId
            const canRemove = team.soy_creador && !isMe
            return (
              <li key={player.id} className="mx-auto flex w-full max-w-[340px] flex-col gap-2">
                <PlayerCard nombre={player.nombre} posicion={player.posicion} equipo={team.nombre} esAdminDelEquipo={player.es_admin_del_equipo} unidoEn={player.unido_en} to={`/app/jugadores/${player.id}`} />
                {isMe && <p className="text-center font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Vos</p>}
                {canRemove && (
                  <ConfirmDialog
                    trigger={<Button size="sm" variant="outline" className="w-full" disabled={team.compitiendo}><UserMinus className="size-4" /> Quitar del plantel</Button>}
                    icon={<UserMinus className="size-5" />}
                    title="Quitar del plantel"
                    description={<>Vas a sacar a <strong className="text-base-content">{player.nombre}</strong> de {team.nombre}. Va a poder sumarse a otro equipo.</>}
                    note="Si el equipo está anotado en un torneo, no puede quedar con menos jugadores que el mínimo."
                    confirmLabel="Quitar"
                    pendingLabel="Quitando..."
                    pending={removeMutation.isPending}
                    onConfirm={() => run(() => removeMutation.mutateAsync(player.id))}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
