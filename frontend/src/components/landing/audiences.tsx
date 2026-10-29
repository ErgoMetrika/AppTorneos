// "Para quién es": tarjeta del jugador (verde) y del organizador (dorada).
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Jersey, Trophy } from '@/components/visuals/art'
import { cn } from '@/lib/utils'

import { Reveal, SectionHeading, SHELL } from './reveal'

function Check({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M5 12l5 5 9-10" />
    </svg>
  )
}

type Audience = { title: string; items: string[]; art: ReactNode; cta: string; to: string; tone: 'verde' | 'dorado' }

const AUDIENCES: Audience[] = [
  {
    title: 'Jugador',
    items: ['Armá tu equipo', 'Invitá por mail', 'Inscribite en torneos'],
    art: <Jersey name="Jugador" color="verde" pattern="bastones" className="size-[84px]" />,
    cta: 'Quiero jugar',
    to: '/registro',
    tone: 'verde',
  },
  {
    title: 'Organizador',
    items: ['Creá torneos', 'Generá la llave con un clic', 'Seguí cada partido'],
    art: <Trophy shine className="h-[85px] w-[68px]" />,
    cta: 'Quiero organizar',
    to: '/contacto',
    tone: 'dorado',
  },
]

export function Audiences() {
  return (
    <section aria-labelledby="para-quien" className="bg-[linear-gradient(180deg,#081a0f,#06110b)] py-14 md:py-24">
      <div className={`${SHELL} flex flex-col gap-9`}>
        <SectionHeading id="para-quien" kicker="Para quién es" title="Para los que juegan y los que organizan" />
        <Reveal self={false} className="grid gap-5 md:grid-cols-2">
          {AUDIENCES.map((audience, index) => {
            const gold = audience.tone === 'dorado'
            return (
              <div key={audience.title} className="lr-item" style={{ '--i': index } as CSSProperties}>
                <div
                  className={cn(
                    'card-lift group relative flex h-full flex-col gap-[18px] overflow-hidden rounded-[22px] border p-6 shadow-[0_14px_34px_rgba(0,0,0,0.38)] sm:p-8',
                    gold ? 'border-[#f2c94c]/28 hover:border-[#f2c94c]/55' : 'border-primary/28 hover:border-primary/55',
                  )}
                  style={{ background: `radial-gradient(circle at 85% 20%, ${gold ? 'rgba(242,201,76,0.14)' : 'rgba(53,244,110,0.16)'}, #0b1b12 60%)` }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-display text-[40px] font-black uppercase leading-none sm:text-5xl">{audience.title}</h3>
                    <span aria-hidden="true" className="transition-transform duration-500 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:rotate-[-4deg]">{audience.art}</span>
                  </div>
                  <ul className="flex flex-col gap-3 text-base">
                    {audience.items.map((item) => (
                      <li key={item} className="flex items-center gap-3"><Check color={gold ? '#f2c94c' : '#35f46e'} />{item}</li>
                    ))}
                  </ul>
                  <Link
                    to={audience.to}
                    className={cn(
                      'mt-auto inline-flex h-12 items-center self-start rounded-xl px-[22px] font-extrabold transition',
                      gold ? 'border border-[#f2c94c]/50 text-[#f2c94c] hover:bg-[#f2c94c]/10' : 'bg-primary text-[#06110b] hover:bg-[#5cff8c]',
                    )}
                  >
                    {audience.cta}
                  </Link>
                </div>
              </div>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
