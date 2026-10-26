import { Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-3', className)}>
      <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-content shadow-[0_0_32px_rgba(53,244,110,0.2)]">
        <Trophy className="size-5" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <strong className="font-display text-xl uppercase tracking-tight">Torneo 90&apos;</strong>
          <span className="mt-1 font-mono text-[0.55rem] font-bold uppercase tracking-[0.18em] text-primary">
            Donde empieza el juego
          </span>
        </span>
      )}
    </Link>
  )
}
