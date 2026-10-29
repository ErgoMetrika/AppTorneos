import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Ball, EmptyCrest, Pitch, Trophy } from '@/components/visuals/art'
import { cn } from '@/lib/utils'

// Pelota que rebota con su sombra. Con "reducir movimiento" queda quieta.
const BOUNCE_CSS = `
@keyframes t90-bote { 0%, 100% { transform: translateY(0); animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0); } 50% { transform: translateY(-28px); animation-timing-function: cubic-bezier(0.33, 1, 0.66, 1); } }
@keyframes t90-sombra { 0%, 100% { transform: scaleX(1); opacity: 0.45; } 50% { transform: scaleX(0.55); opacity: 0.18; } }
.t90-bote { animation: t90-bote 0.9s infinite; }
.t90-sombra { animation: t90-sombra 0.9s infinite; animation-timing-function: ease-in-out; }
@media (prefers-reduced-motion: reduce) { .t90-bote, .t90-sombra { animation: none; } }
`

export function LoadingState({ label = 'Cargando datos' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid min-h-64 place-items-center rounded-xl border border-base-content/10 bg-base-200/40">
      <style>{BOUNCE_CSS}</style>
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-24 flex-col items-center justify-end" aria-hidden="true">
          <div className="t90-bote"><Ball className="size-12" /></div>
          <div className="t90-sombra mt-1 h-2 w-10 rounded-[50%] bg-black" />
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-base-content/70">{label}</span>
      </div>
    </div>
  )
}

export type EmptyArt = 'cancha' | 'trofeo' | 'escudo' | 'pelota'

// Ilustración chica arriba del título de un estado vacío (decorativa)
function EmptyArtwork({ art }: { art: EmptyArt }) {
  switch (art) {
    case 'cancha':
      return <Pitch className="mx-auto w-40 opacity-80" />
    case 'trofeo':
      return <Trophy dim className="mx-auto h-20" />
    case 'escudo':
      return <EmptyCrest className="mx-auto h-16" />
    default:
      return <Ball className="mx-auto size-14 opacity-80" />
  }
}

export function EmptyState({ title, description, action, art = 'pelota' }: { title: string; description: string; action?: ReactNode; art?: EmptyArt }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-base-content/15 bg-base-200/30 p-8 text-center">
      <div className="max-w-sm">
        <div className="mb-5"><EmptyArtwork art={art} /></div>
        <h3 className="font-display text-2xl font-bold uppercase">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-base-content/70">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  )
}

// Tarjeta roja de árbitro, inclinada, con brillo y sombra
function RedCard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 48" fill="none" className={cn('shrink-0', className)} aria-hidden="true">
      <ellipse cx="21" cy="45" rx="11" ry="2" fill="#000" fillOpacity="0.35" />
      <g transform="rotate(12 20 22)">
        <rect x="9" y="4" width="22" height="32" rx="3" fill="#e5484d" />
        <rect x="9" y="4" width="22" height="32" rx="3" stroke="#06110b" strokeOpacity="0.35" strokeWidth="1.5" />
        <path d="M13 9v14" stroke="#fff" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="alert border border-error/30 bg-error/10 text-base-content">
      <RedCard className="h-9 w-8" />
      <span className="text-sm">{message}</span>
      {retry && (
        <Button size="sm" variant="outline" onClick={retry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
