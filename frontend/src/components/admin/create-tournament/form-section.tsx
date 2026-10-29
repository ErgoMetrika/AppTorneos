import type { CSSProperties, ReactNode } from 'react'

// Sección numerada del formulario (misma tarjeta oscura que el resto del panel del admin)
export function FormSection({ step, title, description, index, children }: { step: number; title: string; description: string; index: number; children: ReactNode }) {
  const headingId = `nuevo-torneo-seccion-${step}`
  return (
    <section
      aria-labelledby={headingId}
      className="anim-stagger flex flex-col gap-5 rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.38)] sm:p-6"
      style={{ '--i': index } as CSSProperties}
    >
      <header className="flex items-start gap-3.5">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#35f46e]/12 font-mono text-sm font-bold text-[#35f46e]">
          {String(step).padStart(2, '0')}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className="font-display text-2xl font-extrabold uppercase leading-none sm:text-[28px]">{title}</h2>
          <p className="text-sm text-[#b7c8bd]">{description}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="text-xs text-error">{message}</p>
}

// Contador de caracteres: se pone ámbar cerca del tope y rojo si se pasa
export function CharCount({ value, max }: { value: string; max: number }) {
  const length = value.length
  const tone = length > max ? 'text-error' : length > max * 0.9 ? 'text-[#ffc94a]' : 'text-[#8fa596]'
  return <span aria-hidden="true" className={`font-mono text-[11px] ${tone}`}>{length}/{max}</span>
}
