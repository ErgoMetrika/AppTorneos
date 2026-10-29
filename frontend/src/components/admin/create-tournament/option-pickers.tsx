// Selectores del formulario "Nuevo torneo" como tarjetas grandes.
// Son radios nativos (accesibles con teclado: flechas para moverse) con el input oculto a la vista.
import { Globe, LockKeyhole, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

import { CUPOS, MODALIDADES, plantelMinimo, primeraRonda } from './create-tournament-options'
import { FormationPitch } from './formation-pitch'

// Tarjeta seleccionable: borde verde y fondo levemente verde cuando está marcada; anillo visible con teclado
const OPTION =
  'card-lift relative flex cursor-pointer flex-col rounded-2xl border bg-[#06110b]/60 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#7dffa3]'
const OPTION_ON = 'border-[#35f46e] bg-[#35f46e]/8 shadow-[0_0_0_1px_#35f46e,0_14px_30px_rgba(53,244,110,0.12)]'
const OPTION_OFF = 'border-[#f4f8f5]/12 hover:border-[#35f46e]/50'

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute right-3 top-3 grid size-5 place-items-center rounded-full border-2 transition-colors',
        on ? 'border-[#35f46e] bg-[#35f46e]' : 'border-[#f4f8f5]/30 bg-[#06110b]',
      )}
    >
      {on && <span className="size-2 rounded-full bg-[#06110b]" />}
    </span>
  )
}

const LEGEND = 'mb-3 font-mono text-[0.68rem] font-bold uppercase tracking-[0.12em] text-base-content/55'

// ---------- Modalidad: cancha con la formación y plantel mínimo ----------
export function ModalityPicker({ name, value, onChange, onBlur }: { name: string; value: number; onChange: (value: number) => void; onBlur: () => void }) {
  return (
    <fieldset>
      <legend className={LEGEND}>Modalidad</legend>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {MODALIDADES.map((tipo) => {
          const on = value === tipo
          return (
            <label key={tipo} className={cn(OPTION, 'gap-3 p-3', on ? OPTION_ON : OPTION_OFF)}>
              <input type="radio" name={name} value={tipo} checked={on} onChange={() => onChange(tipo)} onBlur={onBlur} className="sr-only" />
              <Check on={on} />
              <span className="pr-7 font-display text-2xl font-extrabold uppercase leading-none">
                Fútbol {tipo}
              </span>
              <FormationPitch tipo={tipo} active={on} />
              <span className="flex flex-col gap-0.5 text-xs text-[#b7c8bd]">
                <span><strong className="font-bold text-[#f4f8f5]">{tipo}</strong> por lado</span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5 shrink-0 text-[#35f46e]" aria-hidden="true" />
                  Plantel mínimo: <strong className="font-bold text-[#f4f8f5]">{plantelMinimo(tipo)}</strong>
                </span>
              </span>
            </label>
          )
        })}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#8fa596]">Cada equipo necesita los titulares de la modalidad más 2 suplentes para inscribirse.</p>
    </fieldset>
  )
}

// ---------- Cupo: cantidad de equipos y con qué ronda arranca la llave ----------
export function CupoPicker({ name, value, onChange, onBlur }: { name: string; value: number; onChange: (value: number) => void; onBlur: () => void }) {
  return (
    <fieldset>
      <legend className={LEGEND}>Cupo de equipos</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CUPOS.map((cupo) => {
          const on = value === cupo
          return (
            <label key={cupo} className={cn(OPTION, 'items-start gap-1 px-4 py-3', on ? OPTION_ON : OPTION_OFF)}>
              <input type="radio" name={name} value={cupo} checked={on} onChange={() => onChange(cupo)} onBlur={onBlur} className="sr-only" />
              <Check on={on} />
              <span className="font-display text-[34px] font-black leading-none">{cupo}</span>
              <span className="text-xs text-[#b7c8bd]">equipos · arranca en {primeraRonda(cupo).toLowerCase()}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

// ---------- Visibilidad: público o privado, con lo que implica cada uno ----------
const VISIBILIDADES = [
  {
    value: 'publico',
    title: 'Público',
    Icon: Globe,
    color: '#35f46e',
    text: 'Cualquier equipo lo ve y se puede inscribir directamente mientras haya cupo.',
  },
  {
    value: 'privado',
    title: 'Privado',
    Icon: LockKeyhole,
    color: '#ffc94a',
    text: 'Para inscribirse hace falta una clave. Se genera automáticamente y queda disponible en el detalle del torneo para que la compartas.',
  },
] as const

export function VisibilityPicker({ name, value, onChange, onBlur }: { name: string; value: string; onChange: (value: 'publico' | 'privado') => void; onBlur: () => void }) {
  return (
    <fieldset>
      <legend className="sr-only">Visibilidad</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {VISIBILIDADES.map(({ value: option, title, Icon, color, text }) => {
          const on = value === option
          return (
            <label key={option} className={cn(OPTION, 'gap-3 p-4', on ? OPTION_ON : OPTION_OFF)}>
              <input type="radio" name={name} value={option} checked={on} onChange={() => onChange(option)} onBlur={onBlur} className="sr-only" />
              <Check on={on} />
              <span className="flex items-center gap-3 pr-7">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg" style={{ color, backgroundColor: `${color}1f` }} aria-hidden="true">
                  <Icon className="size-5" />
                </span>
                <span className="font-display text-2xl font-extrabold uppercase leading-none">{title}</span>
              </span>
              <span className="text-sm leading-6 text-[#b7c8bd]">{text}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
