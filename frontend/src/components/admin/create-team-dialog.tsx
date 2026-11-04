import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { EscudoPicker } from '@/components/team/escudo-picker'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/context/auth-context'
import { createAdminTeam, createTeam, getMyTeam } from '@/lib/api'
import { eleccionDesde, guardarEscudo, type EleccionEscudo } from '@/lib/escudos'
import { consultasDelPlantel, invalidarConsultas } from '@/lib/query-keys'
import { getErrorMessage, positionLabel } from '@/lib/utils'
import type { PosicionJugador } from '@/types/domain'

const schema = z.object({
  nombre: z.string().trim().min(3, 'Ingresá al menos 3 caracteres.').max(80, 'El nombre es demasiado largo.'),
  posicion: z.enum(['arquero', 'defensor', 'mediocampista', 'delantero']),
})
type Values = z.infer<typeof schema>
const positions: PosicionJugador[] = ['arquero', 'defensor', 'mediocampista', 'delantero']

export function CreateTeamDialog() {
  const [open, setOpen] = useState(false)
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const myTeamQuery = useQuery({ queryKey: ['my-team'], queryFn: getMyTeam, enabled: !isAdmin })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { nombre: '', posicion: 'defensor' } })
  const [escudo, setEscudo] = useState<EleccionEscudo>(() => eleccionDesde(undefined))
  const nombre = useWatch({ control: form.control, name: 'nombre' })
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      if (escudo.modo === 'imagen' && !escudo.archivo) throw new Error('Elegí una imagen para el escudo o un modelo.')
      const team = isAdmin ? await createAdminTeam(values.nombre) : await createTeam(values)
      // El equipo ya existe: si falla el escudo, se avisa y se puede cambiar después
      try {
        await guardarEscudo(team.id, escudo)
      } catch (error) {
        toast.error(`El equipo se creó, pero no se pudo guardar el escudo: ${getErrorMessage(error)}`)
      }
      return team
    },
    onSuccess: (team) => {
      toast.success('Equipo creado correctamente')
      invalidarConsultas(queryClient, [...consultasDelPlantel, ['escudos']])
      setOpen(false)
      form.reset()
      setEscudo(eleccionDesde(undefined))
      navigate(isAdmin ? `/app/equipos/${team.id}` : '/app/mi-equipo')
    },
    onError: (error) => {
      const message = getErrorMessage(error)
      // Nombre repetido: se marca en el campo para que se vea qué hay que cambiar
      if (/equipo con ese nombre/i.test(message)) {
        form.setError('nombre', { message: 'Ya hay un equipo con ese nombre. Probá con otro.' }, { shouldFocus: true })
        return
      }
      toast.error(message)
    },
  })

  if (!isAdmin && myTeamQuery.data) {
    return <Button asChild variant="outline"><Link to="/app/mi-equipo"><Shield className="size-4" /> Ver mi equipo</Link></Button>
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" /> Crear equipo</Button></DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <span className="mb-4 grid size-11 place-items-center rounded-lg bg-primary/10 text-primary"><Shield className="size-5" /></span>
          <DialogTitle>Nuevo equipo</DialogTitle>
          <DialogDescription>{isAdmin ? 'Creá la estructura del equipo. Después vas a poder asignarle jugadores registrados.' : 'Elegí un nombre y tu posición. Vas a quedar incorporado como primer jugador.'}</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="space-y-2">
            <Label htmlFor="admin-team-name">Nombre del equipo</Label>
            <Input id="admin-team-name" autoFocus placeholder="Ej. Atlético del Sur" {...form.register('nombre')} />
            {form.formState.errors.nombre && <p className="text-xs text-error">{form.formState.errors.nombre.message}</p>}
          </div>
          {!isAdmin && <div className="space-y-2"><Label htmlFor="team-owner-position">Tu posición</Label><Select id="team-owner-position" {...form.register('posicion')}>{positions.map((position) => <option key={position} value={position}>{positionLabel[position]}</option>)}</Select></div>}
          <div className="space-y-2">
            <p className="text-sm font-medium">Escudo</p>
            <EscudoPicker nombre={nombre ?? ''} value={escudo} onChange={setEscudo} />
          </div>
          <div className="rounded-lg border border-base-content/10 bg-base-100/60 p-4 text-xs leading-5 text-base-content/50">
            El código de acceso se genera automáticamente. Podrás compartirlo para que otros usuarios se sumen al plantel.
          </div>
          <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creando...' : 'Crear equipo'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
