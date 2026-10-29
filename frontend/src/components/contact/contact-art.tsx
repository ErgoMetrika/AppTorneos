// Ilustraciones de la pantalla Contacto: banderín de córner (portada) y pelota que entra al arco (envío exitoso).
// SVG dibujados en código, en el mismo estilo que components/visuals/art.tsx.
import { useId } from 'react'

import { Ball } from '@/components/visuals/art'
import { cn } from '@/lib/utils'

const LINE = '#e6f4ea'

// Animaciones cortas. Con "reducir movimiento" no se mueve nada y todo queda en su posición final.
const CONTACT_CSS = `
@keyframes t90-bandera { 0%, 100% { transform: skewY(0deg) scaleX(1); } 50% { transform: skewY(-3deg) scaleX(0.96); } }
@keyframes t90-gol { 0% { transform: translate(-130px, 70px) scale(1.5) rotate(-300deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; } }
@keyframes t90-red { 0%, 100% { transform: scale(1); } 40% { transform: scale(1.05, 1.03); } 70% { transform: scale(0.99); } }
@keyframes t90-aparece { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.t90-bandera { transform-box: fill-box; transform-origin: left center; animation: t90-bandera 2.8s ease-in-out infinite; }
.t90-gol { animation: t90-gol 0.75s cubic-bezier(0.2, 0.7, 0.3, 1) both; }
.t90-red { transform-box: fill-box; transform-origin: center; animation: t90-red 0.5s ease-out 0.7s both; }
.t90-aparece { animation: t90-aparece 0.4s ease-out 0.8s both; }
@media (prefers-reduced-motion: reduce) { .t90-bandera, .t90-gol, .t90-red, .t90-aparece { animation: none; } }
`

export function ContactStyles() {
  return <style>{CONTACT_CSS}</style>
}

// ---------- Banderín de córner con la pelota al lado (decorativo) ----------
export function CornerFlagScene({ className }: { className?: string }) {
  const id = useId()
  return (
    <div className={cn('relative', className)} aria-hidden="true">
      <svg viewBox="0 0 220 180" fill="none" className="h-full w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]">
        <defs>
          <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c4d3c9" /><stop offset="0.5" stopColor="#ffffff" /><stop offset="1" stopColor="#9fb3a6" /></linearGradient>
          <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6dff97" /><stop offset="1" stopColor="#1fbf50" /></linearGradient>
          <radialGradient id={`${id}g`} cx="0.5" cy="0.2" r="0.8"><stop offset="0" stopColor="#245639" /><stop offset="1" stopColor="#0b1b12" stopOpacity="0" /></radialGradient>
        </defs>
        {/* Césped y líneas del córner en perspectiva */}
        <ellipse cx="110" cy="160" rx="104" ry="18" fill={`url(#${id}g)`} />
        <path d="M14 162H206" stroke={LINE} strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M62 162L30 178" stroke={LINE} strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M104 162C100 172 84 178 70 178" stroke={LINE} strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="72" cy="163" rx="18" ry="3.5" fill="#000" fillOpacity="0.4" />
        {/* Palo */}
        <rect x="68" y="20" width="7" height="143" rx="3" fill={`url(#${id}p)`} />
        <circle cx="71.5" cy="19" r="5" fill="#ffffff" />
        {/* Banderín flameando */}
        <g className="t90-bandera">
          <path d="M75 24C100 16 118 36 152 26V74C118 84 100 64 75 72Z" fill={`url(#${id}f)`} />
          <path d="M75 24C100 16 118 36 152 26L75 72Z" fill="#06110b" fillOpacity="0.22" />
          <path d="M75 30C96 24 112 40 140 34" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </svg>
      <Ball className="absolute bottom-[6%] right-[14%] size-[24%]" />
    </div>
  )
}

// ---------- Pelota que entra al arco (decorativo; el texto lo pone la página) ----------
export function GoalCelebration({ className }: { className?: string }) {
  const id = useId()
  const netV = [62, 84, 106, 128, 150, 172, 194]
  const netH = [44, 60, 76, 92, 108]
  return (
    <div className={cn('relative aspect-[240/140] w-full max-w-[260px]', className)} aria-hidden="true">
      {/* Fondo del arco */}
      <svg viewBox="0 0 240 140" fill="none" className="absolute inset-0 h-full w-full">
        <ellipse cx="120" cy="128" rx="104" ry="8" fill="#000" fillOpacity="0.35" />
        <path d="M44 28L60 40H180L196 28" stroke={LINE} strokeOpacity="0.2" strokeWidth="2" />
        <rect x="60" y="40" width="120" height="84" fill="#35f46e" fillOpacity="0.06" />
      </svg>
      {/* Pelota: termina en el centro del arco */}
      <div className="absolute left-1/2 top-[58%] -ml-[9%] -mt-[9%] w-[18%]">
        <div className="t90-gol"><Ball className="w-full" /></div>
      </div>
      {/* Red y palos por delante de la pelota */}
      <svg viewBox="0 0 240 140" fill="none" className="absolute inset-0 h-full w-full">
        <defs><clipPath id={`${id}n`}><rect x="44" y="28" width="152" height="96" /></clipPath></defs>
        <g className="t90-red" clipPath={`url(#${id}n)`} stroke={LINE} strokeOpacity="0.32" strokeWidth="1.2">
          {netV.map((x) => <line key={`v${x}`} x1={x} y1="28" x2={x} y2="124" />)}
          {netH.map((y) => <line key={`h${y}`} x1="44" y1={y} x2="196" y2={y} />)}
        </g>
        <path d="M44 124V28H196V124" stroke="#f4f8f5" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M14 124H226" stroke={LINE} strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}
