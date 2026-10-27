import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAdminTeam } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'

const schema = z.object({ nombre: z.string().trim().min(3, 'Ingresá al menos 3 caracteres.').max(80, 'El nombre es demasiado largo.') })
type Values = z.infer<typeof schema>

export function CreateTeamDialog() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { nombre: '' } })
  const mutation = useMutation({
    mutationFn: (values: Values) => createAdminTeam(values.nombre),
    onSuccess: (team) => {
      toast.success('Equipo creado correctamente')
      void queryClient.invalidateQueries({ queryKey: ['teams'] })
      setOpen(false)
      form.reset()
      navigate(`/app/equipos/${team.id}`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="size-4" /> Crear equipo</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <span className="mb-4 grid size-11 place-items-center rounded-lg bg-primary/10 text-primary"><Shield className="size-5" /></span>
          <DialogTitle>Nuevo equipo</DialogTitle>
          <DialogDescription>Creá la estructura del equipo. Después vas a poder asignarle jugadores registrados.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="space-y-2">
            <Label htmlFor="admin-team-name">Nombre del equipo</Label>
            <Input id="admin-team-name" autoFocus placeholder="Ej. Atlético del Sur" {...form.register('nombre')} />
            {form.formState.errors.nombre && <p className="text-xs text-error">{form.formState.errors.nombre.message}</p>}
          </div>
          <div className="rounded-lg border border-base-content/10 bg-base-100/60 p-4 text-xs leading-5 text-base-content/50">
            El código interno se genera automáticamente. Los jugadores se agregan desde el detalle del equipo.
          </div>
          <div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creando...' : 'Crear equipo'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
