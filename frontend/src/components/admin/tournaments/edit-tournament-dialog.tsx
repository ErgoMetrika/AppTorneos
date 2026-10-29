import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Info, LockKeyhole, Pencil } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { updateTournament } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import type { NuevoTorneoInput, TorneoListado } from '@/types/domain'

import { BTN_SECONDARY } from './admin-styles'
import { CUPOS, MODALIDADES, consultasDelTorneo } from './tournament-admin-utils'

function buildSchema(inscriptos: number) {
  return z.object({
    nombre: z.string().refine((value) => value.trim().length >= 3, 'Ingresá un nombre de al menos 3 letras.').refine((value) => value.trim().length <= 120, 'Máximo 120 caracteres.'),
    descripcion: z.string().max(600, 'Máximo 600 caracteres.'),
    fecha: z.string().min(1, 'Elegí una fecha.'),
    lugar: z.string().max(160, 'Máximo 160 caracteres.'),
    tipo_futbol: z.number().refine((value) => (MODALIDADES as readonly number[]).includes(value), 'Elegí una modalidad válida.'),
    max_equipos: z
      .number()
      .refine((value) => (CUPOS as readonly number[]).includes(value), 'Elegí un cupo válido.')
      .refine((value) => value >= inscriptos, `Ya hay ${inscriptos} equipos inscriptos: el cupo no puede ser menor.`),
    visibilidad: z.enum(['publico', 'privado']),
  })
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>

function valuesFrom(tournament: TorneoListado): FormValues {
  return {
    nombre: tournament.nombre,
    descripcion: tournament.descripcion ?? '',
    fecha: tournament.fecha.slice(0, 10),
    lugar: tournament.lugar ?? '',
    tipo_futbol: tournament.tipo_futbol,
    max_equipos: tournament.max_equipos,
    visibilidad: tournament.visibilidad,
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="text-xs text-error">{message}</p>
}

// Diálogo para editar un torneo. Modalidad y cupo solo cambian en inscripción (sin llave).
export function EditTournamentDialog({ tournament }: { tournament: TorneoListado }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const uid = useId()
  const editableFormat = tournament.estado === 'inscripcion'
  const schema = useMemo(() => buildSchema(tournament.inscriptos), [tournament.inscriptos])
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFrom(tournament) })
  const { errors } = form.formState
  const visibility = useWatch({ control: form.control, name: 'visibilidad' })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const input: Partial<NuevoTorneoInput> = {
        nombre: values.nombre.trim(),
        descripcion: values.descripcion.trim(),
        fecha: values.fecha,
        lugar: values.lugar.trim(),
        visibilidad: values.visibilidad,
        // Con la llave armada, la modalidad y el cupo quedan como están
        ...(editableFormat
          ? { tipo_futbol: values.tipo_futbol as NuevoTorneoInput['tipo_futbol'], max_equipos: values.max_equipos as NuevoTorneoInput['max_equipos'] }
          : {}),
      }
      return updateTournament(tournament.id, input)
    },
    onSuccess: () => {
      toast.success('Torneo actualizado')
      for (const queryKey of consultasDelTorneo(tournament.id)) void queryClient.invalidateQueries({ queryKey: [...queryKey] })
      setOpen(false)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const onOpenChange = (next: boolean) => {
    // Cada vez que se abre, arranca con los datos actuales del torneo
    if (next) form.reset(valuesFrom(tournament))
    setOpen(next)
  }

  const ids = {
    nombre: `${uid}-nombre`,
    descripcion: `${uid}-descripcion`,
    fecha: `${uid}-fecha`,
    lugar: `${uid}-lugar`,
    modalidad: `${uid}-modalidad`,
    cupo: `${uid}-cupo`,
    visibilidad: `${uid}-visibilidad`,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className={BTN_SECONDARY} aria-label={`Editar ${tournament.nombre}`}>
          <Pencil aria-hidden="true" />
          Editar
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <span className="mb-4 grid size-11 place-items-center rounded-lg bg-[#ffc94a]/12 text-[#ffc94a]"><Pencil className="size-5" aria-hidden="true" /></span>
          <DialogTitle>Editar torneo</DialogTitle>
          <DialogDescription>Cambiá los datos de {tournament.nombre}. Los equipos inscriptos lo ven actualizado al instante.</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor={ids.nombre}>Nombre</Label>
            <Input id={ids.nombre} maxLength={120} aria-invalid={!!errors.nombre} aria-describedby={errors.nombre ? `${ids.nombre}-e` : undefined} {...form.register('nombre')} />
            <FieldError id={`${ids.nombre}-e`} message={errors.nombre?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.descripcion}>Descripción</Label>
            <Textarea id={ids.descripcion} maxLength={600} placeholder="Descripción breve del torneo" aria-invalid={!!errors.descripcion} aria-describedby={errors.descripcion ? `${ids.descripcion}-e` : undefined} {...form.register('descripcion')} />
            <FieldError id={`${ids.descripcion}-e`} message={errors.descripcion?.message} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={ids.fecha}>Fecha</Label>
              <Input id={ids.fecha} type="date" aria-invalid={!!errors.fecha} aria-describedby={errors.fecha ? `${ids.fecha}-e` : undefined} {...form.register('fecha')} />
              <FieldError id={`${ids.fecha}-e`} message={errors.fecha?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={ids.lugar}>Lugar</Label>
              <Input id={ids.lugar} maxLength={160} placeholder="Complejo o club" aria-invalid={!!errors.lugar} aria-describedby={errors.lugar ? `${ids.lugar}-e` : undefined} {...form.register('lugar')} />
              <FieldError id={`${ids.lugar}-e`} message={errors.lugar?.message} />
            </div>
          </div>

          {editableFormat ? (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="sr-only">Formato del torneo</legend>
            <div className="space-y-2">
              <Label htmlFor={ids.modalidad}>Modalidad</Label>
              <Select id={ids.modalidad} {...form.register('tipo_futbol', { valueAsNumber: true })}>
                {MODALIDADES.map((value) => <option key={value} value={value}>Fútbol {value}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={ids.cupo}>Cupo</Label>
              <Select id={ids.cupo} aria-invalid={!!errors.max_equipos} aria-describedby={errors.max_equipos ? `${ids.cupo}-e` : undefined} {...form.register('max_equipos', { valueAsNumber: true })}>
                {CUPOS.map((value) => (
                  <option key={value} value={value} disabled={value < tournament.inscriptos}>
                    {value} equipos{value < tournament.inscriptos ? ` (ya hay ${tournament.inscriptos})` : ''}
                  </option>
                ))}
              </Select>
              <FieldError id={`${ids.cupo}-e`} message={errors.max_equipos?.message} />
            </div>
          </fieldset>
          ) : (
            // Con la llave armada se muestran fijos: sin campos, así no se envían
            <div className="flex flex-col gap-2">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <dt className="text-sm font-semibold">Modalidad</dt>
                  <dd className="flex h-11 items-center rounded-md border border-dashed border-base-content/15 px-3 text-sm text-[#b7c8bd]">Fútbol {tournament.tipo_futbol}</dd>
                </div>
                <div className="space-y-2">
                  <dt className="text-sm font-semibold">Cupo</dt>
                  <dd className="flex h-11 items-center rounded-md border border-dashed border-base-content/15 px-3 text-sm text-[#b7c8bd]">{tournament.max_equipos} equipos</dd>
                </div>
              </dl>
              <p className="flex items-start gap-2 text-xs leading-5 text-[#b7c8bd]">
                <Info className="mt-0.5 size-4 shrink-0 text-[#ffc94a]" aria-hidden="true" />
                La modalidad y el cupo solo se cambian mientras el torneo está en inscripción, antes de armar la llave.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={ids.visibilidad}>Visibilidad</Label>
            <Select id={ids.visibilidad} {...form.register('visibilidad')}>
              <option value="publico">Público</option>
              <option value="privado">Privado</option>
            </Select>
            {visibility !== tournament.visibilidad && (
              <p role="status" className="flex items-start gap-2 text-xs leading-5 text-[#ffc94a]">
                <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {visibility === 'privado' ? 'Al guardar se genera una clave nueva para inscribirse.' : 'Al pasarlo a público se borra la clave y cualquiera puede inscribirse.'}
              </p>
            )}
          </div>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
