import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

export function LoadingState({ label = 'Cargando datos' }: { label?: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-xl border border-base-content/10 bg-base-200/40">
      <div className="flex items-center gap-3 text-sm text-base-content/60">
        <LoaderCircle className="size-5 animate-spin text-primary" />
        {label}
      </div>
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-base-content/15 bg-base-200/30 p-8 text-center">
      <div className="max-w-sm">
        <Inbox className="mx-auto mb-4 size-9 text-primary" />
        <h3 className="font-display text-2xl font-bold uppercase">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-base-content/55">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  )
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="alert border border-error/30 bg-error/10 text-base-content">
      <AlertCircle className="size-5 text-error" />
      <span className="text-sm">{message}</span>
      {retry && (
        <Button size="sm" variant="outline" onClick={retry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
