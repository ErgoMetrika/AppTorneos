import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-base-content/55">{description}</p>}
      </div>
      {action}
    </header>
  )
}
