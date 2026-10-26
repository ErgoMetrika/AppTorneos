import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em]',
  {
    variants: {
      variant: {
        default: 'bg-primary/15 text-primary',
        secondary: 'bg-base-300 text-base-content/65',
        info: 'bg-info/15 text-info',
        warning: 'bg-warning/15 text-warning',
        error: 'bg-error/15 text-error',
        outline: 'border border-base-content/15 text-base-content/70',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
