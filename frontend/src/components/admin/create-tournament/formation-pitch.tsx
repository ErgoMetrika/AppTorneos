// Cancha de la modalidad con una formación de ejemplo encima (un punto por jugador titular).
// Usa la cancha de art.tsx de fondo; las áreas grandes son para fútbol 9 y 11.
import { Pitch } from '@/components/visuals/art'
import { cn } from '@/lib/utils'

import { FORMACION } from './create-tournament-options'

const GK_X = 62
const FIRST_LINE_X = 175
const LAST_LINE_X = 490

function puntos(tipo: number) {
  const lineas = FORMACION[tipo] ?? []
  const paso = lineas.length > 1 ? (LAST_LINE_X - FIRST_LINE_X) / (lineas.length - 1) : 0
  const campo = lineas.flatMap((cantidad, linea) =>
    Array.from({ length: cantidad }, (_, i) => ({ x: FIRST_LINE_X + linea * paso, y: 20 + ((i + 1) * 340) / (cantidad + 1), arquero: false })),
  )
  return [{ x: GK_X, y: 190, arquero: true }, ...campo]
}

export function FormationPitch({ tipo, active = false, className }: { tipo: number; active?: boolean; className?: string }) {
  return (
    <div className={cn('relative aspect-[600/380] w-full', className)} aria-hidden="true">
      <Pitch large={tipo >= 9} className={cn('absolute inset-0 h-full w-full transition-opacity', !active && 'opacity-70')} />
      <svg viewBox="0 0 600 380" className="absolute inset-0 h-full w-full" fill="none">
        {puntos(tipo).map((punto) => (
          <g key={`${punto.x}-${punto.y}`}>
            <circle cx={punto.x} cy={punto.y + 3} r="17" fill="#000" fillOpacity="0.35" />
            <circle
              cx={punto.x}
              cy={punto.y}
              r="15"
              fill={punto.arquero ? '#f2c94c' : active ? '#35f46e' : '#b7c8bd'}
              stroke="#06110b"
              strokeOpacity="0.55"
              strokeWidth="3"
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
