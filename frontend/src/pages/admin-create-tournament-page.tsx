// Pantalla del administrador general: Nuevo torneo (/app/admin/torneos/nuevo).
// A la izquierda el formulario por secciones; a la derecha una vista previa en vivo de la tarjeta.
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { CharCount, FieldError, FormSection } from '@/components/admin/create-tournament/form-section'
import { CupoPicker, ModalityPicker, VisibilityPicker } from '@/components/admin/create-tournament/option-pickers'
import { TournamentPreview } from '@/components/admin/create-tournament/tournament-preview'
import { BTN_PRIMARY, BTN_SECONDARY } from '@/components/admin/tournaments/admin-styles'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/auth-context'
import { createTournament } from '@/lib/api'
import { cn, getErrorMessage } from '@/lib/utils'
import type { NuevoTorneoInput } from '@/types/domain'

const schema = z.object({
  // trim(): no se aceptan textos hechos sólo de espacios y se manda el valor ya recortado
  nombre: z.string().trim().min(3, 'Ingresá un nombre de al menos 3 caracteres.').max(120, 'El nombre puede tener hasta 120 caracteres.'),
  descripcion: z.string().trim().max(600, 'La descripción puede tener hasta 600 caracteres.').optional(),
  tipo_futbol: z.number().refine((value) => [5, 7, 9, 11].includes(value)),
  max_equipos: z.number().refine((value) => [2, 4, 8, 16].includes(value)),
  visibilidad: z.enum(['publico', 'privado']),
  fecha: z.string().min(1, 'Elegí una fecha.'),
  lugar: z.string().trim().max(160, 'El lugar puede tener hasta 160 caracteres.').optional(),
})

type FormValues = z.infer<typeof schema>

export function AdminCreateTournamentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', descripcion: '', tipo_futbol: 5, max_equipos: 4, visibilidad: 'publico', fecha: '', lugar: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: FormValues) => createTournament({ ...values, user_id: session?.user.id } as NuevoTorneoInput),
    onSuccess: (tournament) => {
      toast.success('Torneo creado correctamente')
      void queryClient.invalidateQueries({ queryKey: ['tournaments'] })
      navigate(`/app/torneos/${tournament.id}`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  // Valores en vivo para la vista previa y los contadores (useWatch en vez de form.watch)
  const values = useWatch({ control: form.control })
  const { errors } = form.formState
  const describedBy = (field: keyof FormValues) => (errors[field] ? `${field}-error` : undefined)

  return (
    <div className="anim-page flex flex-col gap-8 text-[#f4f8f5]">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#ffc94a]">
            <span className="h-[3px] w-[18px] rounded-sm bg-[#ffc94a]" aria-hidden="true" />
            Gestión · Torneos
          </p>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.9] sm:text-7xl">Nuevo torneo</h1>
          <p className="mt-1 max-w-2xl text-base text-[#b7c8bd]">Completá los datos y mirá a la derecha cómo va a quedar. La llave es de eliminación directa y se genera cuando estén los equipos.</p>
        </div>
        <Link to="/app/admin/torneos" className={cn(BTN_SECONDARY, 'max-sm:w-full')}>
          <ArrowLeft aria-hidden="true" />
          Volver a torneos
        </Link>
      </header>

      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <FormSection step={1} index={0} title="Datos del torneo" description="Cómo se llama, cuándo y dónde se juega.">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="tournament-name">Nombre</Label>
                <CharCount value={values.nombre ?? ''} max={120} />
              </div>
              <Input id="tournament-name" placeholder="Copa Fútbol 5 - Abierta" aria-invalid={!!errors.nombre} aria-describedby={describedBy('nombre')} {...form.register('nombre')} />
              <FieldError id="nombre-error" message={errors.nombre?.message} />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor="description">Descripción <span className="normal-case tracking-normal text-[#8fa596]">(opcional)</span></Label>
                <CharCount value={values.descripcion ?? ''} max={600} />
              </div>
              <Textarea id="description" placeholder="Descripción breve del torneo" aria-invalid={!!errors.descripcion} aria-describedby={describedBy('descripcion')} {...form.register('descripcion')} />
              <FieldError id="descripcion-error" message={errors.descripcion?.message} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" type="date" aria-invalid={!!errors.fecha} aria-describedby={describedBy('fecha')} {...form.register('fecha')} />
                <FieldError id="fecha-error" message={errors.fecha?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="place">Lugar <span className="normal-case tracking-normal text-[#8fa596]">(opcional)</span></Label>
                <Input id="place" placeholder="Complejo o club" aria-invalid={!!errors.lugar} aria-describedby={describedBy('lugar')} {...form.register('lugar')} />
                <FieldError id="lugar-error" message={errors.lugar?.message} />
              </div>
            </div>
          </FormSection>

          <FormSection step={2} index={1} title="Modalidad y cupo" description="Cuántos juegan por lado y cuántos equipos entran en la llave.">
            <Controller
              control={form.control}
              name="tipo_futbol"
              render={({ field }) => <ModalityPicker name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
            />
            <Controller
              control={form.control}
              name="max_equipos"
              render={({ field }) => <CupoPicker name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
            />
          </FormSection>

          <FormSection step={3} index={2} title="Visibilidad" description="Quién puede inscribir a su equipo.">
            <Controller
              control={form.control}
              name="visibilidad"
              render={({ field }) => <VisibilityPicker name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
            />
          </FormSection>
        </div>

        <aside aria-label="Vista previa y confirmación" className="anim-stagger flex min-w-0 flex-col gap-4 lg:sticky lg:top-6" style={{ '--i': 3 } as CSSProperties}>
          <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#b7c8bd]">
            <span className="size-2 rounded-full bg-[#35f46e]" aria-hidden="true" />
            Vista previa en vivo
          </p>
          <TournamentPreview values={values} />
          <button type="submit" className={cn(BTN_PRIMARY, 'min-h-[54px] w-full text-base')} disabled={mutation.isPending}>
            <Plus className="size-5" strokeWidth={2.6} aria-hidden="true" />
            {mutation.isPending ? 'Creando torneo...' : 'Crear torneo'}
          </button>
          <p className="text-center text-xs text-[#8fa596]">Después lo podés editar desde Gestión de torneos.</p>
        </aside>
      </form>
    </div>
  )
}
