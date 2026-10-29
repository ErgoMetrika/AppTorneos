import { ArrowLeft } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { PitchLines } from '@/components/visuals/art'
import { useAuth } from '@/context/auth-context'

const DARK = '#06110b'

// Juez de línea con el banderín levantado: mismo estilo que las piezas de art.tsx
function Linesman({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 180 220" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}k`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0b1b12" /><stop offset="0.5" stopColor="#1d3a28" /><stop offset="1" stopColor="#0b1b12" /></linearGradient>
        <radialGradient id={`${id}s`} cx="0.4" cy="0.35" r="0.75"><stop offset="0" stopColor="#e9c4a0" /><stop offset="1" stopColor="#b8875f" /></radialGradient>
        <clipPath id={`${id}f`}><path d="M126 14h40v28h-40z" /></clipPath>
      </defs>
      {/* Sombra en el césped */}
      <ellipse cx="80" cy="210" rx="46" ry="6" fill="#000" fillOpacity="0.35" />
      {/* Banderín a cuadros, flameando */}
      <path d="M124 12v72" stroke="#d6e3da" strokeWidth="3.5" strokeLinecap="round" />
      <g clipPath={`url(#${id}f)`}>
        <path d="M126 14c8 4 20-4 40 2v26c-20-6-32 2-40-2z" fill="#f2c94c" />
        {[0, 1, 2, 3].map((col) =>
          [0, 1, 2].map((row) =>
            (col + row) % 2 === 0 ? <rect key={`${col}-${row}`} x={126 + col * 10} y={14 + row * 10} width="10" height="10" fill="#e5484d" /> : null,
          ),
        )}
      </g>
      <path d="M126 14c8 4 20-4 40 2v26c-20-6-32 2-40-2z" stroke={DARK} strokeOpacity="0.35" strokeWidth="1.5" />
      {/* Brazo levantado sosteniendo el banderín */}
      <path d="M98 78L118 52" stroke={`url(#${id}k)`} strokeWidth="13" strokeLinecap="round" />
      <circle cx="122" cy="48" r="7" fill={`url(#${id}s)`} />
      {/* Brazo pegado al cuerpo */}
      <path d="M58 82L50 124" stroke={`url(#${id}k)`} strokeWidth="12" strokeLinecap="round" />
      <circle cx="49" cy="130" r="6" fill={`url(#${id}s)`} />
      {/* Piernas, medias y botines */}
      <path d="M68 148v44M90 148v44" stroke={`url(#${id}s)`} strokeWidth="12" strokeLinecap="round" />
      <path d="M68 170v22M90 170v22" stroke="#0b1b12" strokeWidth="13" />
      <path d="M61.5 174h13M83.5 174h13" stroke="#35f46e" strokeOpacity="0.6" strokeWidth="3" />
      <path d="M58 198h18v6H56zM88 198h18l2 6H88z" fill="#e6f4ea" />
      {/* Short */}
      <path d="M58 132h42l4 26H84l-5-12-5 12H54z" fill="#0b1b12" stroke={DARK} strokeOpacity="0.5" strokeWidth="1.5" />
      {/* Camiseta con cuello y franja verde */}
      <path d="M56 76c6-6 14-8 23-8s17 2 23 8l-2 60H58z" fill={`url(#${id}k)`} />
      <path d="M57 104h44" stroke="#35f46e" strokeOpacity="0.55" strokeWidth="4" />
      <path d="M70 70c3 6 6 8 9 8s6-2 9-8" stroke="#35f46e" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 76c6-6 14-8 23-8s17 2 23 8l-2 60H58z" stroke={DARK} strokeOpacity="0.4" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Cabeza, pelo y silbato */}
      <rect x="74" y="58" width="10" height="12" rx="3" fill="#b8875f" />
      <circle cx="79" cy="44" r="16" fill={`url(#${id}s)`} />
      <path d="M63 42c0-12 8-18 16-18s16 6 16 16c-5-5-12-7-18-6s-10 4-14 8z" fill="#2a1c12" />
      <circle cx="85" cy="45" r="1.8" fill={DARK} />
      <path d="M84 52c2 1 4 1 6-1" stroke={DARK} strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function NotFoundPage() {
  const { session } = useAuth()
  const back = session ? '/app/torneos' : '/'
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#06110b] px-4 py-16 text-[#f4f8f5]">
      <PitchLines className="absolute inset-x-0 top-1/2 mx-auto w-[min(900px,140vw)] -translate-y-1/2 opacity-[0.06]" />
      <div className="relative flex max-w-md flex-col items-center text-center">
        <Linesman className="h-56 w-auto" />
        <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">Error 404</p>
        <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">Fuera de juego</h1>
        <p className="mt-4 text-base text-[#f4f8f5]/75">Esta página no existe</p>
        <Button asChild size="lg" className="mt-8">
          <Link to={back}><ArrowLeft className="size-4" /> Volver</Link>
        </Button>
      </div>
    </main>
  )
}
