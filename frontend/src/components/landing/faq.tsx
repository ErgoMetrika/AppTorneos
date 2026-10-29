// Preguntas frecuentes con <details>/<summary> nativos (teclado y lectores de pantalla incluidos).
import type { CSSProperties } from 'react'

import { Reveal, SectionHeading } from './reveal'

const QUESTIONS = [
  { q: '¿Es gratis?', a: 'Sí. Crear una cuenta y usar la plataforma no tiene costo: armás tu equipo y te inscribís en torneos sin pagar nada.' },
  { q: '¿Cómo invito a mis amigos?', a: 'El administrador del equipo los busca por su mail y les manda un link para sumarse. También puede compartirles el código del equipo.' },
  { q: '¿Qué pasa si empatamos?', a: 'Se define por penales, y los penales no pueden terminar empatados: en la llave siempre pasa un solo equipo.' },
  { q: '¿Puedo estar en dos equipos?', a: 'No. Cada cuenta está en un solo equipo.' },
]

export function Faq() {
  return (
    <section aria-labelledby="preguntas" className="py-14 md:py-24">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-8 px-4">
        <SectionHeading id="preguntas" kicker="Preguntas frecuentes" title="Antes de salir a la cancha" center />
        <Reveal self={false} className="flex flex-col gap-3">
          {QUESTIONS.map((item, index) => (
            <details
              key={item.q}
              open={index === 0}
              className="lr-faq lr-item group rounded-2xl border border-[#f4f8f5]/10 bg-[#0b1b12] px-6 py-5 shadow-[0_10px_26px_rgba(0,0,0,0.32)] open:border-primary/30 hover:border-primary/25"
              style={{ '--i': index } as CSSProperties}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-md text-lg font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b1b12]">
                {item.q}
                <span aria-hidden="true" className="lr-faq-plus flex-none text-[26px] leading-none text-primary">+</span>
              </summary>
              <p className="lr-faq-body mt-3 text-[15px] leading-relaxed text-[#b7c8bd]">{item.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
