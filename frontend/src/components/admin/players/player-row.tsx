// Fila de un jugador: avatar con iniciales, escudo del equipo, chip de posición,
// marca de administrador del equipo y, para el admin, editar y borrar.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Crown, Eye, Pencil, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { PlayerFormDialog } from '@/components/admin/player-form-dialog'
import { BTN_DANGER, BTN_ICON, BTN_SECONDARY } from '@/components/admin/tournaments/admin-styles'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PlayerAvatar, TeamCrest } from '@/components/visuals/art'
import { TEAM_COLORS, teamColorKey } from '@/components/visuals/palette'
import { deletePlayer } from '@/lib/api'
import { consultasDelPlantel, invalidarConsultas } from '@/lib/query-keys'
import { cn, formatDate, getErrorMessage } from '@/lib/utils'
import type { JugadorDetalle } from '@/types/domain'

import { FOCUS } from './players-utils'
import { PositionChip } from './position-chip'

// "oct. 2026" -> "oct 2026"; si la fecha no se puede leer, no mostramos nada
function sinceLabel(value: string) {
  try {
    return `Desde ${formatDate(value, 'MMM yyyy').replace('.', '')}`
  } catch {
    return null
  }
}

interface PlayerRowProps {
  player: JugadorDetalle
  index: number
  // undefined mientras no sabemos (todavía se está cargando el plantel del equipo)
  isTeamAdmin?: boolean
  canManage: boolean
}

export function PlayerRow({ player, index, isTeamAdmin = false, canManage }: PlayerRowProps) {
  const queryClient = useQueryClient()
  const { id, nombre, equipo } = player
  const band = TEAM_COLORS[teamColorKey(equipo)].base
  const since = sinceLabel(player.unido_en)

  const deleteMutation = useMutation({
    mutationFn: () => deletePlayer(id),
    onSuccess: () => {
      toast.success('Jugador removido del plantel')
      invalidarConsultas(queryClient, consultasDelPlantel)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <article
      aria-label={nombre}
      className="anim-stagger card-lift flex overflow-hidden rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] shadow-[0_14px_34px_rgba(0,0,0,0.38)] hover:border-[#35f46e]/45"
      style={{ '--i': index } as CSSProperties}
    >
      {/* Banda lateral en el color del equipo */}
      <div aria-hidden="true" className="w-1.5 flex-none" style={{ backgroundColor: band }} />
      <div className="grid min-w-0 flex-1 items-center gap-4 p-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_150px_auto] lg:gap-x-6">
        {/* Identidad */}
        <div className="flex min-w-0 items-center gap-3.5">
          <PlayerAvatar name={nombre} admin={isTeamAdmin} className="size-12 text-lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="truncate font-display text-[24px] font-extrabold uppercase leading-none sm:text-[26px]" title={nombre}>{nombre}</h2>
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#8fa596]">
              <span>#{String(id).padStart(3, '0')}</span>
              {since && <><span className="text-[#35f46e]" aria-hidden="true">·</span><span>{since}</span></>}
            </p>
            {isTeamAdmin && (
              <span className="mt-0.5 inline-flex h-[24px] w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-[#f2c94c]/40 bg-[#f2c94c]/14 px-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#f2c94c]">
                <Crown className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                Admin del equipo
              </span>
            )}
          </div>
        </div>

        {/* Equipo y posición (en celular van en la misma línea) */}
        <div className="flex min-w-0 items-center justify-between gap-3 lg:contents">
          <Link to={`/app/equipos/${player.equipo_id}`} className={cn('group flex min-w-0 items-center gap-2.5 rounded-lg text-[#f4f8f5] no-underline', FOCUS)}>
            <TeamCrest name={equipo} className="h-10 w-9 shrink-0 drop-shadow-none" />
            <span className="flex min-w-0 flex-col">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#8fa596]">Equipo</span>
              <span className="truncate text-sm font-bold group-hover:text-[#7dffa3]" title={equipo}>{equipo}</span>
            </span>
          </Link>
          <div className="shrink-0">
            <PositionChip posicion={player.posicion} />
          </div>
        </div>

        {/* Acciones */}
        <div className={cn('grid gap-2', canManage ? 'grid-cols-[minmax(0,1fr)_auto_auto]' : 'grid-cols-1', 'lg:flex')}>
          <Link to={`/app/jugadores/${id}`} className={BTN_SECONDARY} aria-label={`Ver ficha de ${nombre}`}>
            <Eye aria-hidden="true" />
            Ver ficha
          </Link>
          {canManage && (
            <>
              <PlayerFormDialog
                player={player}
                trigger={
                  <button type="button" className={BTN_ICON} aria-label={`Editar a ${nombre}`} title="Editar equipo o posición">
                    <Pencil aria-hidden="true" />
                  </button>
                }
              />
              <ConfirmDialog
                trigger={
                  <button type="button" className={cn(BTN_DANGER, 'w-11 px-0')} aria-label={`Quitar a ${nombre} del plantel`} title="Quitar del plantel">
                    <Trash2 aria-hidden="true" />
                  </button>
                }
                icon={<Trash2 className="size-5" aria-hidden="true" />}
                title={`¿Quitar a ${nombre}?`}
                description={`Sale del plantel de ${equipo}. Su cuenta sigue existiendo y después se lo puede sumar a otro equipo.`}
                confirmLabel="Sí, quitar"
                pendingLabel="Quitando…"
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
            </>
          )}
        </div>
      </div>
    </article>
  )
}
