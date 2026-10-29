import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clipboard, MailOpen, PlusCircle, Shield, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeader } from '@/components/shared/page-header'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { TeamMark } from '@/components/shared/team-mark'
import { InviteSearchBar } from '@/components/team/invite-by-email'
import { LeaveTeamButton, TeamRoster } from '@/components/team/team-roster'
import { PositionSummary, TeamTournaments } from '@/components/team/team-tournaments'
import { Jersey, PitchLines } from '@/components/visuals/art'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { createTeam, getMyTeam, joinTeam } from '@/lib/api'
import { clearPendingInvite, currentInvite } from '@/lib/invitation'
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
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  // Invitación que llegó por link (o que quedó guardada si tuvo que iniciar sesión antes)
  const [invite, setInvite] = useState(() => currentInvite(location.search))
  const [invitePosition, setInvitePosition] = useState<PosicionJugador>('defensor')
  const dismissInvite = () => {
    clearPendingInvite()
    setInvite(null)
    setSearchParams({}, { replace: true })
  }
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
  const joinMutation = useMutation({ mutationFn: joinTeam, onSuccess: () => { dismissInvite(); refreshTeam('Te sumaste al equipo') }, onError: (error) => toast.error(getErrorMessage(error)) })

  if (query.isLoading) return <LoadingState label="Consultando tu equipo" />
  if (query.isError) return <ErrorState message={query.error.message} retry={() => void query.refetch()} />

  if (query.data) {
    const team = query.data
    return (
      <div>
        <PageHeader
          eyebrow="Cuenta general"
          title="Mi equipo"
          description={team.soy_creador ? 'Buscá jugadores por mail para invitarlos, o consultá la ficha completa del plantel.' : 'Consultá tu equipo y el plantel completo.'}
          action={team.soy_creador && team.codigo_equipo ? <InviteSearchBar teamId={team.id} teamName={team.nombre} teamCode={team.codigo_equipo} /> : undefined}
        />
        {invite && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-base-content/10 bg-base-200/60 p-4 text-sm text-base-content/60">
            <span>{invite === team.codigo_equipo ? 'Esa invitación es de tu propio equipo: ya estás adentro.' : 'Recibiste una invitación a otro equipo, pero cada cuenta puede estar en un solo equipo.'}</span>
            <Button type="button" size="sm" variant="outline" onClick={dismissInvite}>Cerrar</Button>
          </div>
        )}
        <section className="relative mt-8 flex flex-col gap-6 overflow-hidden rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_12%_50%,rgba(53,244,110,.18),transparent_40%),linear-gradient(120deg,rgba(53,244,110,.08),rgba(11,27,18,.95)_58%)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.4)] md:flex-row md:items-center md:justify-between md:p-8">
          <PitchLines className="absolute -right-16 -top-6 hidden h-[340px] w-[520px] opacity-[0.12] md:block" />
          <div className="relative flex items-center gap-5"><TeamMark name={team.nombre} label={`Escudo de ${team.nombre}`} className="h-28 w-24" /><Jersey name={team.nombre} className="hidden size-24 lg:block" /><div><div className="flex flex-wrap gap-2"><Badge>{team.soy_creador ? 'Administrador del equipo' : 'Invitado'}</Badge><Badge variant="secondary">Mi posición: {positionLabel[team.mi_posicion]}</Badge></div><h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">{team.nombre}</h2></div></div>
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">{team.soy_creador && team.codigo_equipo ? <button type="button" onClick={() => { void navigator.clipboard.writeText(team.codigo_equipo ?? ''); toast.success('Código copiado') }} className="rounded-xl border border-primary/25 bg-base-100/50 p-4 text-left"><span className="block font-mono text-[0.6rem] font-bold uppercase tracking-widest text-base-content/40">Código del equipo</span><span className="mt-1 flex items-center gap-3 font-mono text-xl font-black tracking-[0.18em] text-primary">{team.codigo_equipo}<Clipboard className="size-4" /></span></button> : <p className="max-w-56 rounded-xl border border-base-content/10 bg-base-100/50 p-4 text-xs leading-5 text-base-content/55">El código y las invitaciones los maneja el administrador del equipo.</p>}<LeaveTeamButton team={team} /></div>
        </section>
        <div className="mt-8"><PositionSummary players={team.jugadores} /></div>
        <div className="mt-6"><TeamTournaments teamId={team.id} players={team.jugadores} /></div>
        <TeamRoster team={team} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Cuenta general" title="Formá tu equipo" description="Podés crear un equipo o ingresar con el código que te compartieron. Cada cuenta puede pertenecer a un solo plantel." />
      {invite && (
        <Card className="mt-8 border-primary/40 bg-[linear-gradient(120deg,rgba(53,244,110,.14),rgba(11,27,18,.9)_60%)]">
          <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-content"><MailOpen className="size-6" /></span>
              <div>
                <p className="font-mono text-[0.6rem] font-bold uppercase tracking-widest text-primary">Invitación</p>
                <h2 className="mt-1 font-display text-2xl font-black uppercase">Te invitaron a sumarte a un equipo</h2>
                <p className="mt-1 text-sm text-base-content/55">Código <strong className="font-mono tracking-widest text-primary">{invite}</strong>. Elegí tu posición y aceptá.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select aria-label="Tu posición" value={invitePosition} onChange={(event) => setInvitePosition(event.target.value as PosicionJugador)}>{positions.map((position) => <option key={position} value={position}>{positionLabel[position]}</option>)}</Select>
              <Button type="button" disabled={joinMutation.isPending} onClick={() => joinMutation.mutate({ codigo: invite, posicion: invitePosition })}>{joinMutation.isPending ? 'Entrando...' : 'Aceptar invitación'}</Button>
              <Button type="button" variant="outline" onClick={dismissInvite}>Ignorar</Button>
            </div>
          </CardContent>
        </Card>
      )}
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
