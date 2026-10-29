// "Cómo funciona": tres pasos con ilustración, apareciendo escalonados al hacer scroll.
import type { CSSProperties, ReactNode } from 'react'

import { Jersey, TeamCrest, Trophy } from '@/components/visuals/art'

import { Reveal, SectionHeading, SHELL } from './reveal'

const STEPS: Array<{ title: string; text: string; art: ReactNode; glow: string }> = [
  {
    title: 'Armá tu equipo',
    text: 'Creá el equipo, elegí tu posición e invitá a tus amigos con su mail.',
    art: <Jersey name="Tu equipo" color="verde" pattern="bastones" className="size-32" />,
    glow: 'rgba(53,244,110,0.16)',
  },
  {
    title: 'Inscribite',
    text: 'Buscá un torneo abierto o uno privado con su código y anotá a tu equipo.',
    art: <TeamCrest name="Tu equipo" color="verde" className="h-32 w-[110px]" />,
    glow: 'rgba(53,244,110,0.16)',
  },
  {
    title: 'Jugá la llave',
    text: 'Cuando cierra la inscripción se arma la llave. Ganá cada cruce hasta levantar la copa.',
    art: <Trophy shine className="h-[138px] w-[110px]" />,
    glow: 'rgba(242,201,76,0.16)',
  },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="como-funciona" className="border-t border-[#f4f8f5]/6 py-14 md:py-24">
      <div className={`${SHELL} flex flex-col gap-10`}>
        <SectionHeading id="como-funciona" kicker="Cómo funciona" title="De la cancha a la copa en 3 pasos" />
        <Reveal self={false} as="ul" className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="lr-item" style={{ '--i': index } as CSSProperties}>
              <div className="card-lift group flex h-full flex-col gap-3.5 rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] p-7 shadow-[0_14px_34px_rgba(0,0,0,0.38)] hover:border-primary/30">
                <div
                  aria-hidden="true"
                  className="grid h-40 place-items-center rounded-[14px] [&>svg]:transition-transform [&>svg]:duration-500 motion-safe:group-hover:[&>svg]:-translate-y-1 motion-safe:group-hover:[&>svg]:scale-105"
                  style={{ background: `radial-gradient(circle at 50% 55%, ${step.glow}, transparent 65%)` }}
                >
                  {step.art}
                </div>
                <p className="font-mono text-xs font-bold text-primary">Paso {index + 1}</p>
                <h3 className="font-display text-[34px] font-extrabold uppercase leading-none">{step.title}</h3>
                <p className="text-[15px] leading-relaxed text-[#b7c8bd]">{step.text}</p>
              </div>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
