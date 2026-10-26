import { Shield } from 'lucide-react'

import { cn } from '@/lib/utils'

export function TeamMark({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()

  return (
    <div className={cn('relative grid size-14 place-items-center text-primary', className)} aria-hidden="true">
      <Shield className="absolute inset-0 size-full fill-primary/10 stroke-primary/70" />
      <span className="relative z-10 font-display text-sm font-black">{initials}</span>
    </div>
  )
}
