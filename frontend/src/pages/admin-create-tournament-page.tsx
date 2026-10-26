import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, LockKeyhole, MapPin, Shield, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createTournament } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import type { NuevoTorneoInput } from '@/types/domain'

const schema = z.object({
  nombre: z.string().min(3, 'Ingresá un nombre.'),
  descripcion: z.string().max(600).optional(),
  tipo_futbol: z.number().refine((value) => [5, 7, 9, 11].includes(value)),
  max_equipos: z.number().refine((value) => [2, 4, 8, 16].includes(value)),
  visibilidad: z.enum(['publico', 'privado']),
  fecha: z.string().min(1, 'Elegí una fecha.'),
  lugar: z.string().max(160).optional(),
})

type FormValues = z.infer<typeof schema>

export function AdminCreateTournamentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', descripcion: '', tipo_futbol: 5, max_equipos: 4, visibilidad: 'publico', fecha: '', lugar: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: FormValues) => createTournament(values as NuevoTorneoInput),
    onSuccess: (tournament) => {
      toast.success('Torneo creado correctamente')
      void queryClient.invalidateQueries({ queryKey: ['tournaments'] })
      navigate(`/torneos/${tournament.id}`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <div>
      <PageHeader eyebrow="Administración" title="Nuevo torneo" description="Los valores disponibles respetan las restricciones del backend: fútbol 5, 7, 9 u 11 y cupos de 2, 4, 8 o 16 equipos." />
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Datos del torneo</CardTitle><CardDescription>La llave será de eliminación directa y se genera más adelante.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2"><Label htmlFor="tournament-name">Nombre</Label><Input id="tournament-name" placeholder="Copa Fútbol 5 - Abierta" {...form.register('nombre')} />{form.formState.errors.nombre && <p className="text-xs text-error">{form.formState.errors.nombre.message}</p>}</div>
            <div className="space-y-2"><Label htmlFor="description">Descripción</Label><Textarea id="description" placeholder="Descripción breve del torneo" {...form.register('descripcion')} /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="football-type">Modalidad</Label><Select id="football-type" {...form.register('tipo_futbol', { valueAsNumber: true })}>{[5, 7, 9, 11].map((value) => <option key={value} value={value}>Fútbol {value}</option>)}</Select></div><div className="space-y-2"><Label htmlFor="max-teams">Cupo</Label><Select id="max-teams" {...form.register('max_equipos', { valueAsNumber: true })}>{[2, 4, 8, 16].map((value) => <option key={value} value={value}>{value} equipos</option>)}</Select></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="date">Fecha</Label><Input id="date" type="date" {...form.register('fecha')} />{form.formState.errors.fecha && <p className="text-xs text-error">{form.formState.errors.fecha.message}</p>}</div><div className="space-y-2"><Label htmlFor="visibility">Visibilidad</Label><Select id="visibility" {...form.register('visibilidad')}><option value="publico">Público</option><option value="privado">Privado</option></Select></div></div>
            <div className="space-y-2"><Label htmlFor="place">Lugar</Label><Input id="place" placeholder="Complejo o club" {...form.register('lugar')} /></div>
            <div className="alert border border-info/20 bg-info/10 text-sm"><LockKeyhole className="size-5 text-info" /><span>Si elegís privado, Supabase genera el código de acceso automáticamente.</span></div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-primary/25 bg-[linear-gradient(145deg,rgba(53,244,110,.12),rgba(11,27,18,.9))]">
            <CardHeader><CardDescription>Vista previa</CardDescription><CardTitle>{form.watch('nombre') || 'Nuevo torneo'}</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3"><Shield className="size-4 text-primary" /> Fútbol {form.watch('tipo_futbol')}</div>
              <div className="flex items-center gap-3"><Users className="size-4 text-primary" /> {form.watch('max_equipos')} equipos</div>
              <div className="flex items-center gap-3"><CalendarDays className="size-4 text-primary" /> {form.watch('fecha') || 'Fecha pendiente'}</div>
              <div className="flex items-center gap-3"><MapPin className="size-4 text-primary" /> {form.watch('lugar') || 'Lugar pendiente'}</div>
            </CardContent>
          </Card>
          <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Creando torneo...' : 'Crear torneo'}</Button>
        </div>
      </form>
    </div>
  )
}
