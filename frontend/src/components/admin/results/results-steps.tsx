import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export type StepState = 'listo' | 'ahora' | 'pendiente' | 'opcional' | 'no-hace-falta'

const STEPS = ['Elegí el partido', 'Cargá los goles', 'Penales', 'Guardá', 'El ganador avanza']

const TAG: Record<StepState, string> = {
  listo: 'Listo',
  ahora: 'Ahora',
  pendiente: '',
  opcional: 'Si empatan',
  'no-hace-falta': 'No hace falta',
}

// Paso a paso de arriba: marca lo hecho, lo que toca ahora y los penales como opcionales
export function ResultsSteps({ states }: { states: StepState[] }) {
  return (
    <ol aria-label="Pasos para cargar un resultado" className="m-0 grid list-none grid-cols-1 gap-3 rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.38)] sm:grid-cols-2 lg:grid-cols-5 lg:gap-2.5 lg:px-6">
      {STEPS.map((label, index) => {
        const state = states[index] ?? 'pendiente'
        const current = state === 'ahora'
        const amber = state === 'opcional'
        const tag = TAG[state]
        return (
          <li
            key={label}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-[14px] border border-transparent px-2.5 py-2 transition-colors',
              current && 'border-primary/35 bg-primary/10',
            )}
          >
            <span
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-full font-display text-lg font-black',
                state === 'listo' && 'bg-primary text-[#06110b]',
                current && 'border-2 border-primary text-primary',
                amber && 'border-2 border-dashed border-[#ffc94a] text-[#ffc94a]',
                (state === 'pendiente' || state === 'no-hace-falta') && 'border-2 border-[#f4f8f5]/30 text-[#b7c8bd]',
              )}
            >
              {state === 'listo' ? <Check className="size-[18px]" strokeWidth={3} aria-hidden="true" /> : index + 1}
            </span>
            <div className="min-w-0">
              <p className={cn('font-mono text-[10px] font-bold uppercase tracking-[0.1em]', state === 'listo' || current ? 'text-primary' : amber ? 'text-[#ffc94a]' : 'text-[#b7c8bd]')}>
                Paso {index + 1}{tag && ` · ${tag}`}
              </p>
              <p className={cn('mt-0.5 text-sm font-bold', state === 'no-hace-falta' && 'text-[#8fa596] line-through decoration-[#8fa596]/60')}>{label}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
