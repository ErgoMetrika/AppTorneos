import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clipboard, Eye, PlusCircle, Shield, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeader } from '@/components/shared/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { TeamMark } from '@/components/shared/team-mark'
import { InviteByEmail } from '@/components/team/invite-by-email'
import { InvitePlayerDialog } from '@/components/team/invite-player-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { createTeam, getMyTeam, joinTeam } from '@/lib/api'
import { getErrorMessage, positionLabel } from '@/lib/utils'
import type { PosicionJugador } from '@/types/domain'

const positionSchema = z.enum(['arquero', 'defensor', 'mediocampista', 'delantero'])
const createSchema = z.object({ nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.'), posicion: positionSchema })
const joinSchema = z.object({ codigo: z.string().trim().length(6, 'El código debe tener 6 caracteres.'), posicion: positionSchema })
type CreateValues = z.infer<typeof createSchema>
type JoinValues = z.infer<typeof joinSchema>
const positions: PosicionJugador[] = ['arquero', 'defensor', 'mediocampista', 'delantero']

export function MyTeamPage() {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['my-team'], queryFn: getMyTeam })
  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { nombre: '', posicion: 'defensor' } })
  const joinForm = useForm<JoinValues>({ resolver: zodResolver(joinSchema), defaultValues: { codigo: '', posicion: 'defensor' } })

  const refreshTeam = (message: string) => {
    toast.success(message)
    void queryClient.invalidateQueries({ queryKey: ['my-team'] })
    void queryClient.invalidateQueries({ queryKey: ['teams'] })
    void queryClient.invalidateQueries({ queryKey: ['players'] })
  }
  const createMutation = useMutation({ mutationFn: createTeam, onSuccess: () => refreshTeam('Equipo creado correctamente'), onError: (error) => toast.error(getErrorMessage(error)) })
  const joinMutation = useMutation({ mutationFn: joinTeam, onSuccess: () => refreshTeam('Te sumaste al equipo'), onError: (error) => toast.error(getErrorMessage(error)) })

  if (query.isLoading) return <LoadingState label="Consultando tu equipo" />
  if (query.isError) return <ErrorState message={query.error.message} retry={() => void query.refetch()} />

  if (query.data) {
    const team = query.data
    return (
      <div>
        <PageHeader eyebrow="Cuenta general" title="Mi equipo" description="Compartí el código para sumar integrantes o consultá la ficha completa del plantel." action={<InvitePlayerDialog teamName={team.nombre} teamCode={team.codigo_equipo} />} />
        <section className="mt-8 flex flex-col gap-6 rounded-2xl border border-primary/20 bg-[linear-gradient(120deg,rgba(53,244,110,.12),rgba(11,27,18,.9)_58%)] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-center gap-5"><TeamMark name={team.nombre} className="size-20" /><div><Badge>Mi posición: {positionLabel[team.mi_posicion]}</Badge><h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">{team.nombre}</h2></div></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><button type="button" onClick={() => { void navigator.clipboard.writeText(team.codigo_equipo); toast.success('Código copiado') }} className="rounded-xl border border-primary/25 bg-base-100/50 p-4 text-left"><span className="block font-mono text-[0.6rem] font-bold uppercase tracking-widest text-base-content/40">Código del equipo</span><span className="mt-1 flex items-center gap-3 font-mono text-xl font-black tracking-[0.18em] text-primary">{team.codigo_equipo}<Clipboard className="size-4" /></span></button><Button asChild variant="outline"><Link to={`/app/equipos/${team.id}`}><Eye className="size-4" /> Ver equipo</Link></Button></div>
        </section>
        <div className="mt-8">
          <h3 className="font-display text-3xl font-black uppercase">Plantel</h3>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            {team.jugadores.length === 0 ? <EmptyState title="Sin jugadores" description="Compartí el código para sumar integrantes." /> : <Card className="overflow-hidden">{team.jugadores.map((player, index) => <Link to={`/app/jugadores/${player.id}`} key={player.id ?? `${player.nombre}-${index}`} className="flex items-center gap-4 border-b border-base-content/10 p-4 transition last:border-0 hover:bg-base-300/40"><span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary"><Users className="size-4" /></span><strong className="flex-1">{player.nombre}</strong><Badge variant="secondary">{positionLabel[player.posicion]}</Badge><Check className="size-4 text-primary" /></Link>)}</Card>}
            <InviteByEmail teamId={team.id} teamName={team.nombre} teamCode={team.codigo_equipo} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Cuenta general" title="Formá tu equipo" description="Podés crear un equipo o ingresar con el código que te compartieron. Cada cuenta puede pertenecer a un solo plantel." />
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="bg-[linear-gradient(145deg,rgba(53,244,110,.1),rgba(11,27,18,.8))] p-7"><div className="grid size-14 place-items-center rounded-xl bg-primary text-primary-content"><Shield className="size-7" /></div><h2 className="mt-8 font-display text-4xl font-black uppercase">Tu lugar en la cancha</h2><p className="mt-4 text-sm leading-6 text-base-content/55">Al crear un equipo quedás incorporado como primer jugador. Después podés compartir el código para completar el plantel.</p><ul className="mt-7 space-y-3 text-sm">{['Nombre único de equipo', 'Código automático de 6 caracteres', 'Un equipo por usuario'].map((item) => <li key={item} className="flex items-center gap-2"><Check className="size-4 text-primary" /> {item}</li>)}</ul></Card>
        <Card>
          <CardHeader><div className="tabs tabs-box bg-base-100"><button type="button" className={`tab flex-1 ${mode === 'create' ? 'tab-active bg-primary text-primary-content' : ''}`} onClick={() => setMode('create')}><PlusCircle className="mr-2 size-4" /> Crear</button><button type="button" className={`tab flex-1 ${mode === 'join' ? 'tab-active bg-primary text-primary-content' : ''}`} onClick={() => setMode('join')}><UserPlus className="mr-2 size-4" /> Unirme</button></div><CardTitle>{mode === 'create' ? 'Crear equipo' : 'Ingresar código'}</CardTitle><CardDescription>{mode === 'create' ? 'Elegí un nombre y tu posición.' : 'Elegí tu posición e ingresá el código del equipo.'}</CardDescription></CardHeader>
          <CardContent>
            {mode === 'create' ? <form className="space-y-5" onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}><div className="space-y-2"><Label htmlFor="team-name">Nombre del equipo</Label><Input id="team-name" placeholder="Ej. Los Pibes" {...createForm.register('nombre')} />{createForm.formState.errors.nombre && <p className="text-xs text-error">{createForm.formState.errors.nombre.message}</p>}</div><div className="space-y-2"><Label htmlFor="create-position">Tu posición</Label><Select id="create-position" {...createForm.register('posicion')}>{positions.map((position) => <option key={position} value={position}>{positionLabel[position]}</option>)}</Select></div><Button type="submit" className="w-full" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creando...' : 'Crear equipo'}</Button></form> : <form className="space-y-5" onSubmit={joinForm.handleSubmit((values) => joinMutation.mutate(values))}><div className="space-y-2"><Label htmlFor="team-code">Código del equipo</Label><Input id="team-code" maxLength={6} className="font-mono uppercase tracking-[0.18em]" placeholder="PIBES1" {...joinForm.register('codigo', { setValueAs: (value: string) => value.toUpperCase() })} />{joinForm.formState.errors.codigo && <p className="text-xs text-error">{joinForm.formState.errors.codigo.message}</p>}</div><div className="space-y-2"><Label htmlFor="join-position">Tu posición</Label><Select id="join-position" {...joinForm.register('posicion')}>{positions.map((position) => <option key={position} value={position}>{positionLabel[position]}</option>)}</Select></div><Button type="submit" className="w-full" disabled={joinMutation.isPending}>{joinMutation.isPending ? 'Ingresando...' : 'Unirme al equipo'}</Button></form>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
