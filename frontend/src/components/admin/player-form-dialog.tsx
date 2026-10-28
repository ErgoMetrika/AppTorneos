import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { LoadingState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { createPlayer, getAvailableUsers, getTeams, updatePlayer } from '@/lib/api'
import { getErrorMessage, positionLabel } from '@/lib/utils'
import type { JugadorDetalle, PosicionJugador } from '@/types/domain'

const schema = z.object({
  usuario_id: z.string().min(1, 'Elegí un usuario.'),
  equipo_id: z.number().positive('Elegí un equipo.'),
  posicion: z.enum(['arquero', 'defensor', 'mediocampista', 'delantero']),
})
type Values = z.infer<typeof schema>
const positions: PosicionJugador[] = ['arquero', 'defensor', 'mediocampista', 'delantero']

interface PlayerFormDialogProps {
  defaultTeamId?: number
  player?: JugadorDetalle
  trigger?: ReactNode
}

export function PlayerFormDialog({ defaultTeamId, player, trigger }: PlayerFormDialogProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const usersQuery = useQuery({ queryKey: ['available-users'], queryFn: getAvailableUsers, enabled: open && !player })
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: getTeams, enabled: open })
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { usuario_id: player?.usuario_id ?? '', equipo_id: player?.equipo_id ?? defaultTeamId ?? 0, posicion: player?.posicion ?? 'defensor' },
  })

  useEffect(() => {
    if (open) form.reset({ usuario_id: player?.usuario_id ?? '', equipo_id: player?.equipo_id ?? defaultTeamId ?? 0, posicion: player?.posicion ?? 'defensor' })
  }, [defaultTeamId, form, open, player])

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      if (!player) return createPlayer(values)
      await updatePlayer(player.id, { equipo_id: values.equipo_id, posicion: values.posicion })
      return { id: player.id }
    },
    onSuccess: (created) => {
      toast.success(player ? 'Jugador actualizado' : 'Jugador agregado al plantel')
      void queryClient.invalidateQueries({ queryKey: ['players'] })
      void queryClient.invalidateQueries({ queryKey: ['player'] })
      void queryClient.invalidateQueries({ queryKey: ['teams'] })
      void queryClient.invalidateQueries({ queryKey: ['team'] })
      void queryClient.invalidateQueries({ queryKey: ['available-users'] })
      setOpen(false)
      if (!player) navigate(`/app/jugadores/${created.id}`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const noUsers = !player && !usersQuery.isLoading && (usersQuery.data?.length ?? 0) === 0
  // Si el equipo elegido está vacío, este jugador va a quedar como creador del equipo
  const selectedTeamId = useWatch({ control: form.control, name: 'equipo_id' })
  const selectedTeam = teamsQuery.data?.find((team) => team.equipo_id === Number(selectedTeamId))
  const willBeCreator = !!selectedTeam && selectedTeam.cant_jugadores === 0 && selectedTeam.equipo_id !== player?.equipo_id
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button><UserPlus className="size-4" /> Agregar jugador</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <span className="mb-4 grid size-11 place-items-center rounded-lg bg-primary/10 text-primary"><UserPlus className="size-5" /></span>
          <DialogTitle>{player ? 'Editar jugador' : 'Nuevo jugador'}</DialogTitle>
          <DialogDescription>{player ? 'Actualizá su equipo o posición.' : 'Asigná a un usuario general registrado a un equipo. Una cuenta solo puede pertenecer a un plantel.'}</DialogDescription>
        </DialogHeader>
        {(usersQuery.isLoading || teamsQuery.isLoading) ? <LoadingState label="Cargando opciones" /> : (
          <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            {!player && <div className="space-y-2"><Label htmlFor="player-user">Usuario registrado</Label><Select id="player-user" {...form.register('usuario_id')}><option value="">Seleccionar usuario</option>{usersQuery.data?.map((user) => <option key={user.id} value={user.id}>{user.nombre} · {user.email}</option>)}</Select>{form.formState.errors.usuario_id && <p className="text-xs text-error">{form.formState.errors.usuario_id.message}</p>}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="player-team">Equipo</Label><Select id="player-team" {...form.register('equipo_id', { valueAsNumber: true })}><option value={0}>Seleccionar equipo</option>{teamsQuery.data?.map((team) => <option key={team.equipo_id} value={team.equipo_id}>{team.equipo}</option>)}</Select>{form.formState.errors.equipo_id && <p className="text-xs text-error">{form.formState.errors.equipo_id.message}</p>}</div>
              <div className="space-y-2"><Label htmlFor="player-position">Posición</Label><Select id="player-position" {...form.register('posicion')}>{positions.map((position) => <option key={position} value={position}>{positionLabel[position]}</option>)}</Select></div>
            </div>
            {willBeCreator && <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-base-content">Es el primer jugador de <strong>{selectedTeam.equipo}</strong>: va a quedar como <strong className="text-primary">administrador del equipo</strong>. Será el único jugador que vea el código, invite a otros y pueda quitar a los invitados.</div>}
            {noUsers && <div className="rounded-lg border border-warning/25 bg-warning/10 p-4 text-sm text-warning">No hay usuarios generales libres. Primero deben registrarse desde la pantalla pública.</div>}
            <div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={mutation.isPending || noUsers}>{mutation.isPending ? 'Guardando...' : player ? 'Guardar cambios' : 'Agregar jugador'}</Button></div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
