import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

// Sobre con tilde: la bandeja no tiene pendientes
export function CheckedEnvelope({ className }: { className?: string }) {
  // useId trae caracteres que rompen url(#...): nos quedamos con los seguros
  const gradientId = `sobre-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <svg viewBox="0 0 124 100" fill="none" aria-hidden="true" className={cn('h-auto w-[124px] flex-none', className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c4a2e" />
          <stop offset="1" stopColor="#10271a" />
        </linearGradient>
      </defs>
      <ellipse cx="62" cy="95" rx="46" ry="4" fill="#000" fillOpacity="0.35" />
      <rect x="10" y="24" width="104" height="66" rx="8" fill={`url(#${gradientId})`} stroke="#35f46e" strokeWidth="2.5" />
      <path d="M10 32l52 32 52-32" stroke="#35f46e" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M10 88l38-30M114 88L76 58" stroke="#35f46e" strokeOpacity="0.4" strokeWidth="2" />
      <circle cx="108" cy="24" r="14" fill="#35f46e" stroke="#06110b" strokeWidth="3" />
      <path d="M101 24l5 5 9-10" stroke="#06110b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Sobre vacío y apagado: todavía no llegó nada o la búsqueda no encontró
export function EmptyEnvelope({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 124 100" fill="none" aria-hidden="true" className={cn('h-auto w-[124px] flex-none', className)}>
      <ellipse cx="62" cy="95" rx="46" ry="4" fill="#000" fillOpacity="0.35" />
      <rect x="10" y="24" width="104" height="66" rx="8" fill="#10271a" stroke="#b7c8bd" strokeOpacity="0.55" strokeWidth="2.5" strokeDasharray="7 6" />
      <path d="M10 32l52 32 52-32" stroke="#b7c8bd" strokeOpacity="0.55" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

interface ContactEmptyProps {
  variant: 'al-dia' | 'sin-consultas' | 'sin-resultados'
  action?: ReactNode
  compact?: boolean
}

const COPY = {
  'al-dia': {
    eyebrow: 'No quedan consultas sin leer',
    title: 'Bandeja al día',
    text: 'No tenés mails de contacto pendientes. Los nuevos aparecen arriba de todo.',
  },
  'sin-consultas': {
    eyebrow: 'Bandeja vacía',
    title: 'Todavía no hay consultas',
    text: 'Cuando alguien escriba desde el formulario de Contacto, el mail va a aparecer acá.',
  },
  'sin-resultados': {
    eyebrow: 'Búsqueda',
    title: 'Sin resultados',
    text: 'Ninguna consulta coincide con ese nombre o mail. Probá con otra búsqueda.',
  },
} as const

export function ContactEmpty({ variant, action, compact = false }: ContactEmptyProps) {
  const copy = COPY[variant]
  return (
    <div
      role="status"
      className={cn(
        'anim-pop flex flex-wrap items-center gap-7',
        compact ? 'flex-col px-4 py-8 text-center' : 'rounded-[20px] border border-[#f4f8f5]/10 bg-[radial-gradient(circle_at_12%_50%,rgba(53,244,110,0.12),#0b1b12_50%)] px-6 py-7 shadow-[0_14px_34px_rgba(0,0,0,0.38)] sm:px-8',
      )}
    >
      {variant === 'al-dia' ? <CheckedEnvelope className={compact ? 'w-[100px]' : undefined} /> : <EmptyEnvelope className={compact ? 'w-[100px]' : undefined} />}
      <div className={cn('min-w-0 flex-1', !compact && 'min-w-[240px]')}>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#b7c8bd]">{copy.eyebrow}</p>
        <h2 className="mt-1.5 font-display text-[34px] font-black uppercase leading-none">{copy.title}</h2>
        <p className="mt-2 text-[15px] text-[#b7c8bd]">{copy.text}</p>
      </div>
      {action}
    </div>
  )
}
