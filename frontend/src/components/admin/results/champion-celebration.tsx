import { X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { TeamCrest, Trophy } from '@/components/visuals/art'

// Confeti sutil: pocos papelitos que caen una sola vez. Con "reducir movimiento" no se muestran.
const CONFETTI_CSS = `
@keyframes t90-confeti { 0% { transform: translate3d(0, -20px, 0) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate3d(var(--dx, 0px), 260px, 0) rotate(540deg); opacity: 0; } }
@keyframes t90-halo { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.06); } }
.t90-confeti { animation: t90-confeti 2.6s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0s) 1 both; }
.t90-halo { animation: t90-halo 3.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .t90-confeti { display: none; } .t90-halo { animation: none; } }
`

const COLORS = ['#35f46e', '#ffc94a', '#f4f8f5', '#7dffa3', '#f2c94c']
const PIECES = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  color: COLORS[i % COLORS.length],
  delay: `${(i % 7) * 0.12}s`,
  dx: `${((i * 23) % 60) - 30}px`,
  size: 6 + (i % 3) * 2,
  round: i % 4 === 0,
}))

// Tarjeta del campeón al guardar la final: copa con brillo, escudo y confeti
export function ChampionCelebration({ champion, tournamentName, tournamentId, onClose }: { champion: string; tournamentName: string; tournamentId: number; onClose: () => void }) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={`${champion} es el campeón de ${tournamentName}`}
      className="anim-pop relative overflow-hidden rounded-[20px] border border-[#ffc94a]/45 p-6 shadow-[0_18px_44px_rgba(0,0,0,0.45)] sm:p-8"
      style={{ background: 'radial-gradient(circle at 50% 30%, rgba(255,201,74,0.22), transparent 55%), linear-gradient(170deg, #10271a, #0b1b12 60%)' }}
    >
      <style>{CONFETTI_CSS}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full">
        {PIECES.map((piece, index) => (
          <span
            key={index}
            className="t90-confeti absolute top-0"
            style={{ left: piece.left, width: piece.size, height: piece.round ? piece.size : piece.size * 1.8, background: piece.color, borderRadius: piece.round ? '50%' : 2, '--d': piece.delay, '--dx': piece.dx } as CSSProperties}
          />
        ))}
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar el aviso del campeón" className="absolute right-3 top-3 grid size-11 place-items-center rounded-xl border border-[#f4f8f5]/12 text-[#b7c8bd] transition hover:border-primary hover:text-[#f4f8f5]">
        <X className="size-5" aria-hidden="true" />
      </button>
      <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
        <div className="relative grid size-44 shrink-0 place-items-center">
          <span aria-hidden="true" className="t90-halo absolute inset-0 rounded-full bg-[#f2c94c]/12" />
          <div className="relative w-[110px]">
            <Trophy shine label={`Copa del campeón, ${champion}`} className="block h-auto w-full drop-shadow-[0_12px_28px_rgba(242,201,76,0.35)]" />
            <TeamCrest name={champion} className="absolute left-1/2 top-[13%] h-auto w-[34%] -translate-x-1/2 drop-shadow-none" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#ffc94a]">{tournamentName} · Torneo finalizado</p>
          <p className="mt-2 font-display text-5xl font-black uppercase leading-[0.9] sm:text-6xl">¡Campeón!</p>
          <p className="mt-2 break-words font-display text-3xl font-black uppercase leading-none text-[#ffc94a] sm:text-4xl">{champion}</p>
          <p className="mt-3 text-sm text-[#b7c8bd]">La llave quedó cerrada y el campeón ya se ve en el torneo.</p>
          <Link to={`/app/torneos/${tournamentId}`} className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[#f4f8f5]/20 bg-[#10271a] px-4 text-sm font-bold text-[#f4f8f5] transition hover:border-primary">
            Ver el torneo
          </Link>
        </div>
      </div>
    </section>
  )
}
