import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Crown, LogOut, UserMinus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '@/components/shared/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/context/auth-context'
import { leaveTeam, removeTeamPlayer } from '@/lib/api'
import { getErrorMessage, positionLabel } from '@/lib/utils'
import type { MiEquipo } from '@/types/domain'

// Plantel de Mi equipo.
// El administrador del equipo (el primer jugador) puede quitar invitados.
// La posición la elige cada jugador al entrar y no se cambia desde acá.
// Cualquier jugador puede salir del equipo.
// Mientras el equipo compite en un torneo, no se puede sacar a nadie ni salir.
export function TeamRoster({ team }: { team: MiEquipo }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const myUserId = session?.user.id

  const refresh = (message: string) => {
    toast.success(message)
    for (const key of ['my-team', 'teams', 'team', 'players', 'player']) void queryClient.invalidateQueries({ queryKey: [key] })
  }
  const onError = (error: Error) => toast.error(getErrorMessage(error))

  const removeMutation = useMutation({
    mutationFn: removeTeamPlayer,
    onSuccess: () => { setConfirmRemove(null); refresh('Jugador quitado del equipo') },
    onError,
  })
  const leaveMutation = useMutation({
    mutationFn: leaveTeam,
    onSuccess: () => { setConfirmLeave(false); refresh('Saliste del equipo') },
    onError,
  })

  const nextAdmin = team.jugadores.find((player) => !player.es_admin_del_equipo)

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="font-display text-3xl font-black uppercase">Plantel</h3>
        {team.compitiendo && <p className="text-xs text-base-content/45">El equipo está compitiendo: no se puede sacar jugadores ni salir hasta que termine el torneo.</p>}
      </div>

      {team.jugadores.length === 0 ? (
        <div className="mt-4"><EmptyState title="Sin jugadores" description="Buscá jugadores por mail para invitarlos." /></div>
      ) : (
        <Card className="mt-4 overflow-hidden">
          {team.jugadores.map((player) => {
            const isMe = player.usuario_id === myUserId
            const canManage = team.soy_creador && !isMe
            return (
              <div key={player.id} className="flex flex-wrap items-center gap-3 border-b border-base-content/10 p-4 last:border-0 sm:flex-nowrap">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">{player.es_admin_del_equipo ? <Crown className="size-4" /> : <Users className="size-4" />}</span>
                <div className="min-w-0 flex-1">
                  <Link to={`/app/jugadores/${player.id}`} className="font-bold transition hover:text-primary">{player.nombre}{isMe && <span className="ml-2 text-xs font-normal text-base-content/45">(vos)</span>}</Link>
                  <p className="mt-0.5 text-xs text-base-content/45">{player.es_admin_del_equipo ? 'Administrador del equipo' : 'Invitado'}</p>
                </div>

                {/* La posición la elige cada jugador al entrar: acá solo se muestra */}
                <Badge variant="secondary">{positionLabel[player.posicion]}</Badge>

                {canManage && (confirmRemove === player.id ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(player.id)}>{removeMutation.isPending ? 'Quitando...' : 'Confirmar'}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(null)}>Cancelar</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" disabled={team.compitiendo} onClick={() => setConfirmRemove(player.id)}><UserMinus className="size-4" /> Quitar</Button>
                ))}
              </div>
            )
          })}
        </Card>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-base-content/10 bg-base-200/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-base-content/55">
          {team.soy_creador && nextAdmin
            ? <>Si salís, <strong className="text-base-content">{nextAdmin.nombre}</strong> pasa a ser el administrador del equipo.</>
            : 'Podés salir del equipo cuando quieras, salvo que esté compitiendo en un torneo.'}
        </p>
        {confirmLeave ? (
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={leaveMutation.isPending} onClick={() => leaveMutation.mutate()}>{leaveMutation.isPending ? 'Saliendo...' : 'Sí, salir'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmLeave(false)}>Cancelar</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" disabled={team.compitiendo} onClick={() => setConfirmLeave(true)}><LogOut className="size-4" /> Salir del equipo</Button>
        )}
      </div>
    </div>
  )
}
