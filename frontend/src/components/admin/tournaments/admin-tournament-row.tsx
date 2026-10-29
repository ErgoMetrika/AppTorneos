import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, CircleCheck, ClipboardList, Eye, Info, MapPin, Network, Trash2, Trophy as TrophyIcon } from 'lucide-react'
import { useId, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { LabelledTrophy, ModalityChip, PrivateChip, StateChip } from '@/components/tournament/tournament-bits'
import { EmptyCrest, Pitch, TeamCrest } from '@/components/visuals/art'
import { deleteTournament, generateBracket, getBracket } from '@/lib/api'
import { cn, formatDate, getErrorMessage } from '@/lib/utils'
import type { EstadoTorneo, TorneoListado } from '@/types/domain'

import { BTN_AMBER, BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY } from './admin-styles'
import { EditTournamentDialog } from './edit-tournament-dialog'
import { TournamentAccessKey } from './tournament-access-key'
import { consultasDelTorneo, estadoLlave, listaNombres, resumenLlave } from './tournament-admin-utils'

// Banda lateral (el mockup la pone a la izquierda, vertical)
const BAND: Record<EstadoTorneo, string> = {
  inscripcion: 'bg-[#35f46e]',
  en_curso: 'bg-[#f2c94c]',
  finalizado: 'bg-[#6f8577]',
}

// Hasta este cupo se dibuja un escudo por lugar; con más, una barra
const CRESTS_MAX = 8

const LABEL = 'font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#b7c8bd]'

function Slots({ tournament, index }: { tournament: TorneoListado; index: number }) {
  const teams = tournament.equipos_inscriptos
  const free = Math.max(0, tournament.max_equipos - teams.length)
  const percent = Math.min(100, Math.round((teams.length / Math.max(1, tournament.max_equipos)) * 100))
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className={LABEL}>
        Cupo · {teams.length}/{tournament.max_equipos}
        <span className="sr-only"> equipos inscriptos</span>
      </span>
      {tournament.max_equipos <= CRESTS_MAX ? (
        <ul className="flex flex-wrap gap-1" aria-label={teams.length ? `Inscriptos: ${listaNombres(teams.map((team) => team.nombre))}` : 'Sin equipos inscriptos'}>
          {teams.map((team) => (
            <li key={team.id} title={team.nombre} className="anim-pop">
              <TeamCrest name={team.nombre} label={team.nombre} className="h-10 w-9 drop-shadow-none" />
            </li>
          ))}
          {Array.from({ length: free }, (_, slot) => (
            <li key={`libre-${slot}`} aria-hidden="true"><EmptyCrest className="h-10 w-9" /></li>
          ))}
        </ul>
      ) : (
        <div className="h-2.5 w-full min-w-40 overflow-hidden rounded-[5px] bg-[#f4f8f5]/8" aria-hidden="true">
          <div className="anim-fill h-full rounded-[5px] bg-[linear-gradient(90deg,#1a9c45,#35f46e)]" style={{ width: `${percent}%`, '--i': index } as CSSProperties} />
        </div>
      )}
      <span className="text-xs text-[#8fa596]">{free === 0 ? 'Cupo completo' : free === 1 ? '1 lugar libre' : `${free} lugares libres`}</span>
    </div>
  )
}

function StatusChip({ tone, children }: { tone: 'green' | 'amber' | 'grey'; children: string }) {
  const color = { green: '#35f46e', amber: '#ffc94a', grey: '#b7c8bd' }[tone]
  return (
    <span
      className="inline-flex h-[26px] items-center gap-[7px] whitespace-nowrap rounded-full border px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em]"
      style={{ color, backgroundColor: `${color}24`, borderColor: `${color}52` }}
    >
      <span className="size-[7px] rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {children}
    </span>
  )
}

export function AdminTournamentRow({ tournament, index }: { tournament: TorneoListado; index: number }) {
  const queryClient = useQueryClient()
  const statusId = useId()
  const { id, estado, nombre } = tournament
  const finished = estado === 'finalizado'
  const isPrivate = tournament.visibilidad === 'privado'
  const readiness = estadoLlave(tournament)

  // La llave solo existe una vez que arrancó el torneo
  const bracketQuery = useQuery({ queryKey: ['bracket', id], queryFn: () => getBracket(id), enabled: estado !== 'inscripcion' })
  const bracket = bracketQuery.data ? resumenLlave(bracketQuery.data) : null

  const invalidate = () => {
    for (const queryKey of consultasDelTorneo(id)) void queryClient.invalidateQueries({ queryKey: [...queryKey] })
  }

  const bracketMutation = useMutation({
    mutationFn: () => generateBracket(id),
    onSuccess: () => {
      toast.success(`Llave de ${nombre} generada`)
      invalidate()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTournament(id),
    onSuccess: () => {
      toast.success(`Torneo ${nombre} borrado`)
      // El detalle y la llave ya no existen: se sacan de la caché en vez de pedirlos de nuevo
      queryClient.removeQueries({ queryKey: ['tournament', id] })
      queryClient.removeQueries({ queryKey: ['bracket', id] })
      for (const queryKey of [['tournaments'], ['team-tournaments'], ['my-team']]) void queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const teamNames = tournament.equipos_inscriptos.map((team) => team.nombre)
  const deleteText = [
    teamNames.length === 0
      ? 'Se borra el torneo. Todavía no tiene equipos inscriptos.'
      : `Se borra el torneo y ${teamNames.length === 1 ? `la inscripción de ${teamNames[0]}` : `las ${teamNames.length} inscripciones (${listaNombres(teamNames)})`}.`,
    estado !== 'inscripcion' ? 'También se borran todos los partidos de la llave con sus resultados.' : '',
    'Esta acción no se puede deshacer.',
  ].filter(Boolean).join(' ')

  // Texto de estado de la barra inferior
  let status: { icon: 'info' | 'ok' | 'trophy'; text: string }
  if (estado === 'inscripcion') status = { icon: readiness.puede ? 'ok' : 'info', text: readiness.motivo }
  else if (estado === 'en_curso') {
    status = {
      icon: 'info',
      text: bracket?.rondaActual
        ? `Llave generada · ${bracket.rondaActual}: ${bracket.porCargar === 1 ? '1 partido por cargar' : `${bracket.porCargar} partidos por cargar`}`
        : 'Llave generada',
    }
  } else status = { icon: 'trophy', text: bracket?.campeon ? `Torneo terminado · Campeón: ${bracket.campeon}` : 'Torneo terminado' }

  const progress = readiness.objetivo > 0 ? Math.min(100, Math.round((tournament.inscriptos / readiness.objetivo) * 100)) : 0

  return (
    <article
      aria-labelledby={`${statusId}-t`}
      className="anim-stagger card-lift flex overflow-hidden rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] shadow-[0_14px_34px_rgba(0,0,0,0.38)] hover:border-[#35f46e]/45"
      style={{ '--i': index } as CSSProperties}
    >
      <div aria-hidden="true" className={cn('w-1.5 flex-none', BAND[estado])} />
      <div className="grid min-w-0 flex-1 items-center gap-x-8 gap-y-5 p-4 sm:px-6 sm:py-[22px] lg:grid-cols-[minmax(0,1.5fr)_auto_auto]">
        {/* Identidad: cancha chica con la copa, nombre, chips y datos */}
        <div className="flex min-w-0 items-center gap-[18px]">
          <div className="relative hidden h-[74px] w-[116px] shrink-0 sm:block" aria-hidden="true">
            <Pitch large={tournament.tipo_futbol >= 9} className={cn('h-full w-full', finished && 'opacity-60')} />
            <LabelledTrophy text={`F${tournament.tipo_futbol}`} dim={finished} className="absolute -bottom-2 -right-2 w-9" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <h2 id={`${statusId}-t`} className="break-words font-display text-[28px] font-extrabold uppercase leading-none sm:text-[34px]">{nombre}</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <StateChip state={estado} />
              <ModalityChip tipo={tournament.tipo_futbol} />
              {isPrivate && <PrivateChip />}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#b7c8bd]">
              <p className="flex items-center gap-1.5"><CalendarDays className="size-4 shrink-0 text-[#35f46e]" aria-hidden="true" /><span className="sr-only">Fecha:</span>{formatDate(tournament.fecha, 'd MMM yyyy')}</p>
              <p className="flex min-w-0 items-center gap-1.5"><MapPin className="size-4 shrink-0 text-[#35f46e]" aria-hidden="true" /><span className="sr-only">Lugar:</span><span className="truncate">{tournament.lugar || 'Lugar a confirmar'}</span></p>
            </div>
          </div>
        </div>

        <Slots tournament={tournament} index={index} />

        {isPrivate ? (
          <TournamentAccessKey tournamentId={id} tournamentName={nombre} />
        ) : estado !== 'inscripcion' ? (
          <div className="flex flex-col gap-2">
            <span className={LABEL}>Llave</span>
            {finished ? (
              <StatusChip tone="grey">{bracket?.campeon ? `Campeón ${bracket.campeon}` : 'Terminada'}</StatusChip>
            ) : (
              <StatusChip tone="amber">{bracket?.rondaActual ? `${bracket.rondaActual} por cargar` : 'En juego'}</StatusChip>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className={LABEL}>Visibilidad</span>
            <StatusChip tone="green">Público</StatusChip>
          </div>
        )}

        {/* Estado y acciones */}
        <div className="flex flex-col gap-3 border-t border-[#f4f8f5]/8 pt-4 lg:col-span-full lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-2 lg:min-w-60">
            {status.icon === 'ok' ? (
              <CircleCheck className="size-5 shrink-0 text-[#35f46e]" aria-hidden="true" />
            ) : status.icon === 'trophy' ? (
              <TrophyIcon className="size-5 shrink-0 text-[#f2c94c]" aria-hidden="true" />
            ) : (
              <Info className="size-5 shrink-0 text-[#b7c8bd]" aria-hidden="true" />
            )}
            <span id={statusId} className="min-w-0 text-sm text-[#b7c8bd]">{status.text}</span>
            {estado === 'inscripcion' && (
              <div className="h-1.5 w-40 max-w-full overflow-hidden rounded-[3px] bg-[#f4f8f5]/10" aria-hidden="true">
                <div className="anim-fill h-full rounded-[3px] bg-[linear-gradient(90deg,#1a9c45,#35f46e)]" style={{ width: `${progress}%`, '--i': index } as CSSProperties} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            {estado === 'inscripcion' && (
              <button
                type="button"
                className={cn(BTN_PRIMARY, 'col-span-2')}
                disabled={!readiness.puede || bracketMutation.isPending}
                aria-describedby={statusId}
                onClick={() => bracketMutation.mutate()}
              >
                <Network aria-hidden="true" />
                {bracketMutation.isPending ? 'Generando…' : 'Generar llave'}
              </button>
            )}
            {estado === 'en_curso' && (
              <Link to={`/app/admin/resultados?torneo=${id}`} className={cn(BTN_AMBER, 'col-span-2')}>
                <ClipboardList aria-hidden="true" />
                Cargar resultados
              </Link>
            )}
            <Link to={`/app/torneos/${id}`} className={BTN_SECONDARY} aria-label={estado === 'inscripcion' ? `Ver ${nombre}` : `Ver llave de ${nombre}`}>
              <Eye aria-hidden="true" />
              {estado === 'inscripcion' ? 'Ver' : 'Ver llave'}
            </Link>
            <EditTournamentDialog tournament={tournament} />
            <ConfirmDialog
              trigger={
                <button type="button" className={cn(BTN_DANGER, 'col-span-2 sm:col-span-1')} aria-label={`Borrar ${nombre}`}>
                  <Trash2 aria-hidden="true" />
                  Borrar
                </button>
              }
              icon={<Trash2 className="size-5" aria-hidden="true" />}
              title={`¿Borrar ${nombre}?`}
              description={deleteText}
              confirmLabel="Sí, borrar"
              pendingLabel="Borrando…"
              pending={deleteMutation.isPending}
              onConfirm={async () => {
                try {
                  await deleteMutation.mutateAsync()
                  return true
                } catch {
                  return false
                }
              }}
            />
          </div>
        </div>
      </div>
    </article>
  )
}
