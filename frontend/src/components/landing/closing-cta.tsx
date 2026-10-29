// Cierre: "¿Arrancamos?" con la pelota que cae y rebota al aparecer.
import { Link } from 'react-router-dom'

import { Ball } from '@/components/visuals/art'

import { Reveal } from './reveal'

export function ClosingCta() {
  return (
    <section aria-labelledby="arrancamos" className="px-4 pb-20">
      <Reveal className="relative mx-auto flex max-w-[1240px] flex-col items-center gap-5 overflow-hidden rounded-[28px] border border-primary/35 bg-[radial-gradient(circle_at_50%_120%,rgba(53,244,110,0.3),#0b1b12_65%)] px-6 py-16 text-center shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        {/* Líneas de cancha de fondo */}
        <svg viewBox="0 0 600 380" fill="none" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 w-[900px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-10">
          <g stroke="#35f46e" strokeWidth="2">
            <rect x="20" y="20" width="560" height="340" rx="2" />
            <line x1="300" y1="20" x2="300" y2="360" />
            <circle cx="300" cy="190" r="46" />
            <rect x="20" y="110" width="76" height="160" />
            <rect x="504" y="110" width="76" height="160" />
          </g>
        </svg>
        <div className="relative flex flex-col items-center" aria-hidden="true">
          <div className="lr-ball"><Ball className="size-[72px]" /></div>
          <div className="lr-ball-shadow mt-1 h-2 w-12 rounded-[50%] bg-black/80" />
        </div>
        <h2 id="arrancamos" className="relative font-display text-[44px] font-black uppercase leading-[0.95] md:text-[64px]">¿Arrancamos?</h2>
        <p className="relative max-w-[520px] text-[17px] leading-relaxed text-[#b7c8bd]">Creá tu cuenta, armá tu equipo y anotate en el próximo torneo.</p>
        <Link
          to="/registro"
          className="relative inline-flex h-16 items-center rounded-2xl bg-primary px-10 text-xl font-black text-[#06110b] shadow-[0_14px_34px_rgba(53,244,110,0.3)] transition hover:-translate-y-0.5 hover:bg-[#5cff8c] hover:shadow-[0_18px_40px_rgba(53,244,110,0.4)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Crear mi cuenta
        </Link>
      </Reveal>
    </section>
  )
}
