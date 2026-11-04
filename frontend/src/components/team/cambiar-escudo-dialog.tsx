// Botón + modal para cambiar el escudo de un equipo.
// Lo ven el admin general y el administrador del equipo (la base lo vuelve a controlar).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { EscudoPicker } from '@/components/team/escudo-picker'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { eleccionDesde, guardarEscudo, useEscudo, type EleccionEscudo } from '@/lib/escudos'
import { getErrorMessage } from '@/lib/utils'

export function CambiarEscudoDialog({ equipoId, nombre }: { equipoId: number; nombre: string }) {
  const [open, setOpen] = useState(false)
  const actual = useEscudo(nombre)
  const [eleccion, setEleccion] = useState<EleccionEscudo>(() => eleccionDesde(actual))
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => guardarEscudo(equipoId, eleccion),
    onSuccess: () => {
      toast.success('Escudo actualizado')
      void queryClient.invalidateQueries({ queryKey: ['escudos'] })
      setOpen(false)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  // Al abrir, arranca desde el escudo que tiene guardado
  const abrir = (value: boolean) => {
    if (value) setEleccion(eleccionDesde(actual))
    setOpen(value)
  }

  return (
    <Dialog open={open} onOpenChange={abrir}>
      <DialogTrigger asChild><Button variant="outline"><Shield className="size-4" /> Cambiar escudo</Button></DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Escudo de {nombre}</DialogTitle>
          <DialogDescription>Elegí un modelo y sus colores, o subí la imagen del escudo de tu club.</DialogDescription>
        </DialogHeader>
        <EscudoPicker nombre={nombre} value={eleccion} onChange={setEleccion} />
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Guardando...' : 'Guardar escudo'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
