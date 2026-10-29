// Carta del jugador, estilo figurita: borde y tinte en el color del equipo,
// posición abreviada y escudo arriba, silueta al centro y nombre abajo.
import type { CSSProperties } from 'react'
import { Crown } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PitchLines, Silhouette, TeamCrest } from '@/components/visuals/art'
import { TEAM_COLORS, teamColorKey } from '@/components/visuals/palette'
import { cn, formatDate, positionLabel } from '@/lib/utils'
import type { PosicionJugador } from '@/types/domain'

const POSITION_TAG: Record<PosicionJugador, string> = { arquero: 'ARQ', defensor: 'DEF', mediocampista: 'MED', delantero: 'DEL' }

// "oct. 2026" -> "oct 2026"; si la fecha no se puede leer, no mostramos nada
function sinceLabel(value: string) {
  try {
    return `Desde ${formatDate(value, 'MMM yyyy').replace('.', '')}`
  } catch {
    return null
  }
}

export interface PlayerCardProps {
  nombre: string
  posicion: PosicionJugador
  equipo: string
  esAdminDelEquipo?: boolean
  unidoEn: string
  to: string
  className?: string
}

export function PlayerCard({ nombre, posicion, equipo, esAdminDelEquipo = false, unidoEn, to, className }: PlayerCardProps) {
  const color = TEAM_COLORS[teamColorKey(equipo)]
  const rol = esAdminDelEquipo ? 'Administrador del equipo' : 'Invitado'
  const since = sinceLabel(unidoEn)
  // Variables para el borde, el tinte del degradé y el brillo del hover (hex + alfa)
  const style = { '--accent': color.base, '--tint': `${color.base}38`, '--glow': `${color.base}59` } as CSSProperties

  return (
    <Link
      to={to}
      style={style}
      aria-label={`Ver ficha de ${nombre}: ${positionLabel[posicion]}, ${rol.toLowerCase()} de ${equipo}`}
      className={cn(
        'group relative flex aspect-[17/26] flex-col overflow-hidden rounded-[22px] border-2 border-[var(--accent)] text-base-content',
        'bg-[linear-gradient(165deg,var(--tint),#0b1b12_45%,#06110b)] shadow-[0_18px_40px_rgba(0,0,0,0.5)]',
        'hover:shadow-[0_22px_46px_rgba(0,0,0,0.55),0_0_24px_var(--glow)] focus-visible:shadow-[0_22px_46px_rgba(0,0,0,0.55),0_0_24px_var(--glow)]',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary',
        'motion-safe:transition motion-safe:duration-200 motion-safe:hover:-translate-y-1 motion-safe:focus-visible:-translate-y-1',
        className,
      )}
    >
      {/* Líneas de cancha tenues, giradas para que acompañen la carta vertical */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
        <PitchLines className="h-auto w-[150%] max-w-none rotate-90 opacity-[0.12]" />
      </div>

      <div className="relative flex items-start justify-between px-5 pt-5">
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-display text-[44px] font-black leading-none text-[var(--accent)]">{POSITION_TAG[posicion]}</span>
          <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#b7c8bd]">POSICIÓN</span>
        </div>
        <div className="relative">
          <TeamCrest name={equipo} className="h-[58px] w-[50px]" />
          {esAdminDelEquipo && (
            <span className="absolute -bottom-2 -left-3 grid size-7 place-items-center rounded-full border-2 border-[#06110b] bg-[#f2c94c] text-[#06110b] shadow-[0_4px_10px_rgba(0,0,0,0.45)]" title="Administrador del equipo" aria-hidden="true">
              <Crown className="size-3.5" strokeWidth={2.5} />
            </span>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-end justify-center px-6">
        <Silhouette className="h-full max-h-[250px] w-auto" />
      </div>

      <div className="relative flex flex-col items-center gap-2 border-t border-[var(--glow)] bg-[rgba(6,17,11,0.88)] px-4 pb-[18px] pt-4 text-center">
        <p className="line-clamp-2 break-words font-display text-[34px] font-black uppercase leading-none tracking-[0.02em] sm:text-[38px]">{nombre}</p>
        <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#b7c8bd]">
          <span>{equipo}</span>
          <span className="text-primary" aria-hidden="true">·</span>
          <span className={cn(esAdminDelEquipo && 'text-[#f2c94c]')}>{rol}</span>
          {since && (
            <>
              <span className="text-primary" aria-hidden="true">·</span>
              <span>{since}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  )
}
