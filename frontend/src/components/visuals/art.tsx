// Ilustraciones de Torneo 90': escudo, camiseta, cancha, trofeo, pelota, silueta y avatar.
// Son SVG dibujados en código (sin imágenes externas) y comparten colores y trazos.
import { useId } from 'react'

import { cn } from '@/lib/utils'
import type { PosicionJugador } from '@/types/domain'

import { TEAM_COLORS, personInitials, teamColorKey, teamInitials, teamPattern, type JerseyPattern, type TeamColorKey } from './palette'

const DARK = '#06110b'
const LINE = '#e6f4ea'
const DISPLAY = "'Barlow Condensed', sans-serif"
const MONO = "'IBM Plex Mono', monospace"

type Labelled = { label?: string; className?: string }
// Con label: imagen con descripción para lectores de pantalla. Sin label: decorativa.
const a11y = (label?: string) => (label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const })

// ---------- Escudo de club: borde doble, franja y siglas ----------
const SH_OUT = 'M36 2L68 11v27c0 23-14 37-32 44C18 75 4 61 4 38V11L36 2z'
const SH_MID = 'M36 7L63 14.6V38c0 19.6-11.8 31.6-27 38.1C20.8 69.6 9 57.6 9 38V14.6L36 7z'
const SH_IN = 'M36 10.5L59.5 17.2V38c0 17.4-10.3 28.2-23.5 34.1C22.8 66.2 12.5 55.4 12.5 38V17.2L36 10.5z'

export function TeamCrest({ name, color, label, className }: Labelled & { name: string; color?: TeamColorKey }) {
  const id = useId()
  const c = TEAM_COLORS[color ?? teamColorKey(name)]
  const text = teamInitials(name)
  return (
    <svg viewBox="0 0 72 84" fill="none" className={cn('drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]', className)} {...a11y(label)}>
      <defs><linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.light} /><stop offset="1" stopColor={c.dark} /></linearGradient></defs>
      <path d={SH_OUT} fill={`url(#${id}g)`} />
      <path d={SH_MID} fill="#0b1b12" />
      <path d={SH_IN} fill={c.base} fillOpacity="0.1" stroke={c.base} strokeOpacity="0.6" strokeWidth="1.5" />
      <rect x="12.5" y="23" width="47" height="8" fill={c.base} />
      <rect x="12.5" y="23" width="47" height="2.5" fill={c.light} fillOpacity="0.6" />
      <text x="36" y="58" textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize={text.length > 2 ? 17 : 22} letterSpacing="0.5" fill={c.base}>{text}</text>
    </svg>
  )
}

// Lugar vacío (cupo libre en un torneo)
export function EmptyCrest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 84" fill="none" className={className} aria-hidden="true">
      <path d={SH_OUT} stroke="#8fa596" strokeOpacity="0.6" strokeWidth="2.5" strokeDasharray="5 4" />
    </svg>
  )
}

// ---------- Camiseta: cuello, mangas, costuras, degradé y variantes ----------
const BODY = 'M40 10L16 21L5 45l18 8 5-9v64h64V44l5 9 18-8-11-24-24-11c-4 8-11 12-20 12s-16-4-20-12z'

export function Jersey({ name, color, pattern, number, label, className }: Labelled & { name: string; color?: TeamColorKey; pattern?: JerseyPattern; number?: string }) {
  const id = useId()
  const c = TEAM_COLORS[color ?? teamColorKey(name)]
  const variant = pattern ?? teamPattern(name)
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} {...a11y(label)}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={c.dark} /><stop offset="0.45" stopColor={c.base} /><stop offset="1" stopColor={c.dark} /></linearGradient>
        <clipPath id={`${id}c`}><path d={BODY} /></clipPath>
      </defs>
      <ellipse cx="60" cy="113" rx="36" ry="4" fill="#000" fillOpacity="0.35" />
      <path d={BODY} fill={`url(#${id}g)`} />
      <g clipPath={`url(#${id}c)`}>
        {variant === 'bastones' && [33, 51, 69, 87].map((x) => <rect key={x} x={x} y="0" width="9" height="120" fill={DARK} fillOpacity="0.3" />)}
        {variant === 'bandas' && [48, 70, 92].map((y) => <rect key={y} x="0" y={y} width="120" height="10" fill={DARK} fillOpacity="0.3" />)}
        <rect x="0" y="0" width="120" height="30" fill={c.light} fillOpacity="0.12" />
      </g>
      <path d="M28 46V106M92 46V106" stroke={DARK} strokeOpacity="0.2" strokeWidth="1.5" />
      <path d="M28 44C31 32 34 22 39 11M92 44C89 32 86 22 81 11" stroke={DARK} strokeOpacity="0.25" strokeWidth="1.5" />
      <path d="M7.5 40l17 7.5M112.5 40l-17 7.5" stroke={DARK} strokeOpacity="0.35" strokeWidth="3" />
      <path d="M28 103h64" stroke={DARK} strokeOpacity="0.2" strokeWidth="2" />
      <path d="M40 10C44 18 51 22 60 22S76 18 80 10" stroke={DARK} strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" />
      <path d={BODY} stroke={DARK} strokeOpacity="0.35" strokeWidth="1.5" strokeLinejoin="round" />
      {number && <text x="60" y="80" textAnchor="middle" fontFamily={DISPLAY} fontWeight="900" fontSize="32" fill={DARK} fillOpacity="0.85">{number}</text>}
    </svg>
  )
}

// ---------- Trofeo: copa con asas, base escalonada y brillo ----------
export function Trophy({ label, className, dim = false }: Labelled & { dim?: boolean }) {
  const id = useId()
  return (
    <svg viewBox="0 0 120 150" fill="none" className={cn(dim && 'opacity-40 grayscale', className)} {...a11y(label)}>
      <defs><linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c99a22" /><stop offset="0.4" stopColor="#ffe08a" /><stop offset="0.7" stopColor="#f2c94c" /><stop offset="1" stopColor="#b8901f" /></linearGradient></defs>
      <ellipse cx="60" cy="144" rx="44" ry="5" fill="#000" fillOpacity="0.35" />
      <path d="M30 24C10 24 8 60 38 68M90 24c20 0 22 36-8 44" stroke="#d9ad34" strokeWidth="7" strokeLinecap="round" />
      <path d="M26 14h68v30c0 24-14 40-34 42-20-2-34-18-34-42V14z" fill={`url(#${id}g)`} />
      <rect x="22" y="9" width="76" height="9" rx="3" fill="#ffe08a" />
      <path d="M38 24v20c0 14 5 24 12 30" stroke="#fff6cf" strokeOpacity="0.6" strokeWidth="5" strokeLinecap="round" />
      <path d="M53 86h14v12H53z" fill="#b8901f" />
      <rect x="45" y="97" width="30" height="6" rx="2" fill="#e0b23a" />
      <rect x="38" y="103" width="44" height="14" rx="2" fill={`url(#${id}g)`} />
      <rect x="30" y="117" width="60" height="14" rx="2" fill="#c99a22" />
      <rect x="26" y="131" width="68" height="8" rx="2" fill="#8a6a16" />
      <rect x="46" y="121" width="28" height="6" rx="1" fill={DARK} fillOpacity="0.3" />
    </svg>
  )
}

// ---------- Pelota ----------
function pentagon(cx: number, cy: number, r: number, rotation = -90) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = ((rotation + i * 72) * Math.PI) / 180
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

export function Ball({ label, className }: Labelled) {
  const id = useId()
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} {...a11y(label)}>
      <defs>
        <radialGradient id={`${id}g`} cx="0.38" cy="0.32" r="0.75"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c4d3c9" /></radialGradient>
        <clipPath id={`${id}c`}><circle cx="50" cy="50" r="46" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${id}g)`} />
      <g clipPath={`url(#${id}c)`}>
        <polygon points={pentagon(50, 50, 15)} fill={DARK} />
        {[0, 1, 2, 3, 4].map((i) => {
          const a = ((-90 + i * 72) * Math.PI) / 180
          return (
            <g key={i}>
              <line x1={50 + 15 * Math.cos(a)} y1={50 + 15 * Math.sin(a)} x2={50 + 34 * Math.cos(a)} y2={50 + 34 * Math.sin(a)} stroke={DARK} strokeOpacity="0.55" strokeWidth="2" />
              <polygon points={pentagon(50 + 44 * Math.cos(a), 50 + 44 * Math.sin(a), 11, -90 + i * 72 + 36)} fill={DARK} />
            </g>
          )
        })}
      </g>
      <circle cx="50" cy="50" r="46" stroke={DARK} strokeOpacity="0.35" strokeWidth="2" />
      <path d="M26 30a30 30 0 0 1 16-12" stroke="#fff" strokeOpacity="0.8" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

// ---------- Silueta de jugador (sin foto) ----------
export function Silhouette({ label, className }: Labelled) {
  const id = useId()
  return (
    <svg viewBox="0 0 220 260" fill="none" className={className} {...a11y(label)}>
      <defs><linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4f8f5" stopOpacity="0.28" /><stop offset="1" stopColor="#f4f8f5" stopOpacity="0.08" /></linearGradient></defs>
      <circle cx="110" cy="84" r="50" fill={`url(#${id}g)`} />
      <path d="M18 260c6-62 44-98 92-98s86 36 92 98z" fill={`url(#${id}g)`} />
      <path d="M84 166c6 12 16 18 26 18s20-6 26-18" stroke="#f4f8f5" strokeOpacity="0.18" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

// ---------- Avatar con iniciales (el administrador del equipo, con borde verde) ----------
export function PlayerAvatar({ name, admin = false, className }: { name: string; admin?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full border-2 bg-[radial-gradient(circle_at_35%_30%,#245639,#0b1b12_80%)] font-display text-[17px] font-extrabold shadow-[0_4px_10px_rgba(0,0,0,0.35)]',
        admin ? 'border-primary text-primary' : 'border-base-content/20 text-base-content',
        className,
      )}
    >
      {personInitials(name)}
    </span>
  )
}

// ---------- Cancha: césped a franjas, líneas completas y fichas ----------
// Zona de cada posición sobre la cancha (atacando hacia la derecha)
const ZONE_X: Record<PosicionJugador, number> = { arquero: 62, defensor: 180, mediocampista: 300, delantero: 440 }
const ZONE_TAG: Record<PosicionJugador, string> = { arquero: 'ARQ', defensor: 'DEF', mediocampista: 'MED', delantero: 'DEL' }

export interface PitchPlayer { name: string; posicion: PosicionJugador; admin?: boolean; focus?: boolean }

// Reparte a los jugadores de una misma posición a lo alto de su zona
function placePlayers(players: PitchPlayer[]) {
  const groups = new Map<PosicionJugador, PitchPlayer[]>()
  for (const player of players) groups.set(player.posicion, [...(groups.get(player.posicion) ?? []), player])
  return [...groups.entries()].flatMap(([posicion, list]) =>
    list.map((player, index) => ({ ...player, x: ZONE_X[posicion], y: Math.round(((index + 1) * 380) / (list.length + 1)) })),
  )
}

export function Pitch({ players = [], large = false, label, className }: Labelled & { players?: PitchPlayer[]; large?: boolean }) {
  const id = useId()
  const area = large
    ? 'M20 80h100v220H20zM20 140h36v100H20zM120 157A46 46 0 0 1 120 223M480 80h100v220H480zM544 140h36v100h-36zM480 157A46 46 0 0 0 480 223'
    : 'M20 110h76v160H20zM20 152h30v76H20zM96 158A40 40 0 0 1 96 222M504 110h76v160h-76zM550 152h30v76h-30zM504 158A40 40 0 0 0 504 222'
  const spots = large ? [88, 512] : [72, 528]
  return (
    <svg viewBox="0 0 600 380" fill="none" className={cn('drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]', className)} {...a11y(label)}>
      <defs>
        <clipPath id={`${id}c`}><rect width="600" height="380" rx="14" /></clipPath>
        <radialGradient id={`${id}f`} cx="0.4" cy="0.35" r="0.75"><stop offset="0" stopColor="#245639" /><stop offset="1" stopColor="#0b1b12" /></radialGradient>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="600" height="380" fill="#0f2a1a" />
        {[1, 3, 5, 7, 9].map((i) => <rect key={i} x={i * 60} y="0" width="60" height="380" fill="#14351f" />)}
      </g>
      <g stroke={LINE} strokeOpacity="0.5" strokeWidth="2" fill="none">
        <rect x="20" y="20" width="560" height="340" rx="2" />
        <line x1="300" y1="20" x2="300" y2="360" />
        <circle cx="300" cy="190" r="46" />
        <path d={area} />
        <path d="M20 30A10 10 0 0 0 30 20M570 20A10 10 0 0 0 580 30M580 350A10 10 0 0 0 570 360M30 360A10 10 0 0 0 20 350" />
      </g>
      <g fill={LINE} fillOpacity="0.65"><circle cx="300" cy="190" r="3.5" /><circle cx={spots[0]} cy="190" r="3" /><circle cx={spots[1]} cy="190" r="3" /></g>
      <g stroke="#f4f8f5" strokeOpacity="0.8" strokeWidth="2.5" fill="#f4f8f5" fillOpacity="0.08"><rect x="8" y="166" width="12" height="48" rx="2" /><rect x="580" y="166" width="12" height="48" rx="2" /></g>
      {placePlayers(players).map((player) => {
        const highlight = player.admin || player.focus
        return (
          <g key={`${player.name}-${player.x}-${player.y}`}>
            {player.focus && <><circle cx={player.x} cy={player.y} r="40" fill="#35f46e" fillOpacity="0.16" /><circle cx={player.x} cy={player.y} r="31" stroke="#35f46e" strokeOpacity="0.5" strokeWidth="2" /></>}
            <circle cx={player.x} cy={player.y + 3} r="24" fill="#000" fillOpacity="0.35" />
            <circle cx={player.x} cy={player.y} r="22" fill={`url(#${id}f)`} stroke={highlight ? '#35f46e' : '#b7c8bd'} strokeWidth={highlight ? 3 : 2} />
            <text x={player.x} y={player.y + 6} textAnchor="middle" fontFamily={DISPLAY} fontWeight="800" fontSize="17" fill={highlight ? '#35f46e' : '#f4f8f5'}>{personInitials(player.name)}</text>
            <rect x={player.x - 20} y={player.y + 28} width="40" height="16" rx="8" fill={DARK} fillOpacity="0.75" />
            <text x={player.x} y={player.y + 40} textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="10" letterSpacing="1" fill="#d6e3da">{ZONE_TAG[player.posicion]}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ---------- Fondo decorativo con líneas de cancha ----------
export function PitchLines({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 340" fill="none" className={cn('pointer-events-none', className)} aria-hidden="true">
      <g stroke="#35f46e" strokeWidth="2">
        <rect x="10" y="10" width="500" height="320" rx="6" />
        <line x1="260" y1="10" x2="260" y2="330" />
        <circle cx="260" cy="170" r="54" />
        <rect x="10" y="95" width="70" height="150" />
        <rect x="440" y="95" width="70" height="150" />
      </g>
    </svg>
  )
}
