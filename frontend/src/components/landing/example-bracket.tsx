// Llave de ejemplo (ilustrativa, con equipos genéricos): al entrar en pantalla se va completando
// sola, ronda por ronda, hasta el campeón. Con "reducir movimiento" se muestra completa.
import { useEffect, useState } from 'react'

import { TeamCrest, Trophy } from '@/components/visuals/art'
import type { TeamColorKey } from '@/components/visuals/palette'
import { cn } from '@/lib/utils'

import { SectionHeading, SHELL } from './reveal'
import { usePrefersReducedMotion, useReveal } from './use-reveal'

type ExampleTeam = { name: string; color: TeamColorKey }
const VERDE: ExampleTeam = { name: 'Equipo Verde', color: 'verde' }
const AMARILLO: ExampleTeam = { name: 'Equipo Amarillo', color: 'amarillo' }
const VIOLETA: ExampleTeam = { name: 'Equipo Violeta', color: 'violeta' }
const CELESTE: ExampleTeam = { name: 'Equipo Celeste', color: 'celeste' }

// Pasos de la animación: 0 cruces armados · 1 ganan las semis · 2 se arma la final · 3 gana la final · 4 campeón
const FINAL_STEP = 4
const STEP_TIMES = [450, 1100, 1800, 2450]

// Coordenadas del dibujo original (1120 × 300) pasadas a % para que escale
const W = 1120
const H = 300
const box = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, width: `${(300 / W) * 100}%`, height: `${(54 / H) * 100}%` })

function Slot({ team, x, y, won, lost, pending = false }: { team: ExampleTeam; x: number; y: number; won: boolean; lost: boolean; pending?: boolean }) {
  return (
    <div
      data-pending={pending}
      className={cn(
        'lr-slot absolute flex items-center gap-[4%] rounded-xl border-2 px-[4.5%] font-semibold',
        won ? 'border-primary bg-primary/12 text-[#f4f8f5]' : 'border-[#f4f8f5]/12 bg-[#10271a]',
        lost ? 'text-[#b7c8bd]' : !won && 'text-[#f4f8f5]',
      )}
      style={box(x, y)}
    >
      <TeamCrest name={team.name} color={team.color} className="h-[70%] w-auto shrink-0 drop-shadow-none" />
      <span className="truncate text-[clamp(13px,1.45vw,16px)]">{team.name}</span>
    </div>
  )
}

export function ExampleBracket() {
  const { ref, visible } = useReveal<HTMLDivElement>({ rootMargin: '0px 0px -20% 0px' })
  const reduced = usePrefersReducedMotion()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!visible || reduced) return
    const timers = STEP_TIMES.map((time, index) => window.setTimeout(() => setStep(index + 1), time))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [visible, reduced])

  const shown = reduced ? FINAL_STEP : step
  const semis = shown >= 1
  const finalists = shown >= 2
  const finalDone = shown >= 3
  const champion = shown >= 4

  return (
    <section aria-labelledby="la-llave" className="py-14 md:py-24">
      <div className={`${SHELL} flex flex-col gap-9`}>
        <SectionHeading id="la-llave" kicker="La llave" title="Cada cruce, a la vista">
          <p className="flex flex-wrap items-center gap-2.5 text-[15px] text-[#b7c8bd]">
            <span className="rounded-md bg-[#f4f8f5]/8 px-2.5 py-[5px] font-mono text-[11px] font-bold uppercase text-[#f4f8f5]">Ejemplo</span>
            Así se ve una llave de 4 equipos. Los nombres son ilustrativos.
          </p>
        </SectionHeading>

        <div
          ref={ref}
          role="region"
          aria-label="Llave de ejemplo"
          tabIndex={0}
          className={cn('lr-reveal lr-self overflow-x-auto rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.38)] outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-7', visible && 'is-visible')}
        >
          <div
            role="img"
            aria-label="Llave de ejemplo: Equipo Verde le gana la semifinal a Equipo Amarillo, Equipo Violeta le gana a Equipo Celeste, y en la final Equipo Verde le gana a Equipo Violeta y sale campeón."
            className="relative aspect-[1120/300] min-w-[760px]"
          >
            {/* Conectores: base gris y, encima, el trazo verde del ganador que se dibuja */}
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" fill="none" aria-hidden="true">
              <path d="M300 37h30v32h90M300 101h30V69M300 199h30v32h90M300 263h30v-32M720 69h40v81h60M720 231h40v-81" stroke="#f4f8f5" strokeOpacity="0.25" strokeWidth="2" />
              <path className="lr-path" data-on={semis} pathLength={1} d="M300 37h30v32h90" stroke="#35f46e" strokeWidth="3" />
              <path className="lr-path" data-on={semis} pathLength={1} d="M300 199h30v32h90" stroke="#35f46e" strokeWidth="3" />
              <path className="lr-path" data-on={finalDone} pathLength={1} d="M720 69h40v81h60" stroke="#35f46e" strokeWidth="3" />
              <circle cx="930" cy="110" r="90" fill="#f2c94c" fillOpacity={champion ? 0.1 : 0.04} style={{ transition: 'fill-opacity 700ms ease' }} />
            </svg>

            <p className="absolute left-0 top-[-2%] -translate-y-full font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#8fa596]" aria-hidden="true">Semifinales</p>
            <Slot team={VERDE} x={0} y={10} won={semis} lost={false} />
            <Slot team={AMARILLO} x={0} y={74} won={false} lost={semis} />
            <Slot team={VIOLETA} x={0} y={172} won={semis} lost={false} />
            <Slot team={CELESTE} x={0} y={236} won={false} lost={semis} />

            <Slot team={VERDE} x={420} y={42} won={finalDone} lost={false} pending={!finalists} />
            <Slot team={VIOLETA} x={420} y={204} won={false} lost={finalDone} pending={!finalists} />

            {/* Campeón: la copa con el escudo del ganador */}
            <div data-on={champion} className="lr-champ absolute inset-y-0 left-[74%] right-0">
              <div className="absolute left-[14.4%] top-[8%] w-[41%]">
                <Trophy shine={champion} className="block h-auto w-full" />
                <TeamCrest name={VERDE.name} color={VERDE.color} className="absolute left-[35%] top-[53%] w-[30%] drop-shadow-none" />
              </div>
              <div className="absolute left-[35%] top-[62%] -translate-x-1/2 text-center">
                <p className="font-display text-[clamp(24px,2.9vw,32px)] font-black leading-none text-primary">CAMPEÓN</p>
                <p className="mt-1 whitespace-nowrap text-[15px] font-semibold text-[#f4f8f5]">{VERDE.name}</p>
              </div>
            </div>
          </div>
        </div>
        <p className="-mt-5 text-sm text-[#b7c8bd] md:hidden">Deslizá la llave hacia el costado para verla completa.</p>
      </div>
    </section>
  )
}
