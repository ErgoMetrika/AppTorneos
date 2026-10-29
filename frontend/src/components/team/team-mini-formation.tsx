// Canchita chica con un punto por jugador en el color del equipo.
// La lista de equipos no trae posiciones: los puntos se reparten parejo en columnas,
// sin inventar quién juega dónde. Los lugares punteados marcan lo que falta hasta un mínimo.
import { useId } from 'react'

import { TEAM_COLORS, teamColorKey } from '@/components/visuals/palette'
import { cn } from '@/lib/utils'

const DARK = '#06110b'
const LINE = '#e6f4ea'
// Más de esto no entra legible en la canchita: el resto se indica con "+N"
const MAX_DOTS = 12

// Reparte "total" lugares en una grilla pareja (filas a lo alto, columnas a lo ancho)
function layout(total: number) {
  if (total === 0) return []
  const rows = total <= 3 ? 1 : total <= 8 ? 2 : 3
  const cols = Math.ceil(total / rows)
  const spots: { x: number; y: number }[] = []
  for (let row = 0; row < rows; row += 1) {
    // La última fila puede quedar incompleta: se centra igual que las demás
    const inRow = Math.min(cols, total - row * cols)
    for (let col = 0; col < inRow; col += 1) {
      spots.push({ x: Math.round(((col + 1) * 600) / (inRow + 1)), y: Math.round(((row + 1) * 380) / (rows + 1)) })
    }
  }
  return spots
}

export function TeamMiniFormation({ name, players, minimum = 0, className }: { name: string; players: number; minimum?: number; className?: string }) {
  const id = useId()
  const c = TEAM_COLORS[teamColorKey(name)]
  const filled = Math.min(Math.max(players, 0), MAX_DOTS)
  const empty = Math.max(Math.min(minimum, MAX_DOTS) - filled, 0)
  const extra = Math.max(players - MAX_DOTS, 0)
  const spots = layout(filled + empty)
  return (
    <svg viewBox="0 0 600 380" fill="none" className={cn('h-14 w-[5.5rem] shrink-0', className)} role="img" aria-label={`Mini formación con ${players} ${players === 1 ? 'jugador' : 'jugadores'}`}>
      <defs><clipPath id={`${id}c`}><rect width="600" height="380" rx="14" /></clipPath></defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="600" height="380" fill="#0f2a1a" />
        {[1, 3, 5, 7, 9].map((i) => <rect key={i} x={i * 60} y="0" width="60" height="380" fill="#14351f" />)}
      </g>
      <g stroke={LINE} strokeOpacity="0.5" strokeWidth="2" fill="none">
        <rect x="20" y="20" width="560" height="340" rx="2" />
        <line x1="300" y1="20" x2="300" y2="360" />
        <circle cx="300" cy="190" r="46" />
        <path d="M20 110h76v160H20zM504 110h76v160h-76z" />
      </g>
      {spots.map((spot, index) =>
        index < filled ? (
          <g key={index}>
            <circle cx={spot.x} cy={spot.y + 4} r="28" fill="#000" fillOpacity="0.35" />
            <circle cx={spot.x} cy={spot.y} r="26" fill={c.base} stroke={DARK} strokeWidth="4" />
          </g>
        ) : (
          <circle key={index} cx={spot.x} cy={spot.y} r="26" stroke={c.base} strokeWidth="5" strokeDasharray="9 7" />
        ),
      )}
      {extra > 0 && (
        <g>
          <rect x="470" y="300" width="110" height="60" rx="14" fill={DARK} fillOpacity="0.85" />
          <text x="525" y="344" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontWeight="700" fontSize="36" fill="#f4f8f5">+{extra}</text>
        </g>
      )}
    </svg>
  )
}
