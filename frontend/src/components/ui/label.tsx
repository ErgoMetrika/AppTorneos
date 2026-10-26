import type { LabelHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('font-mono text-[0.68rem] font-bold uppercase tracking-[0.12em] text-base-content/55', className)}
      {...props}
    />
  )
}
