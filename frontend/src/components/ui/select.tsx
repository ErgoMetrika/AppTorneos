import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-md border border-base-content/15 bg-base-100 px-3 text-sm text-base-content outline-none focus:border-primary focus:ring-2 focus:ring-primary/15',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
