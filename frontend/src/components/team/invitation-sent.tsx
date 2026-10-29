import { X } from 'lucide-react'
import { useId } from 'react'

import { Ball } from '@/components/visuals/art'
import { cn } from '@/lib/utils'

// Al aparecer, la tarjeta entra suave, la pelota sale del sobre con un rebote y
// brillan los trazos de "enviado". Corre una sola vez. Con "reducir movimiento" queda quieta.
const SENT_CSS = `
@keyframes t90-inv-tarjeta { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes t90-inv-pelota {
  0% { transform: translateY(85%) rotate(-90deg); }
  55% { transform: translateY(-25%) rotate(0deg); animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0); }
  75% { transform: translateY(0); animation-timing-function: cubic-bezier(0.33, 1, 0.66, 1); }
  88% { transform: translateY(-10%); }
  100% { transform: translateY(0); }
}
@keyframes t90-inv-brillo { 0%, 60% { opacity: 0; transform: scale(0.6); } 100% { opacity: 1; transform: none; } }
.t90-inv-tarjeta { animation: t90-inv-tarjeta 0.25s ease-out both; }
.t90-inv-pelota { animation: t90-inv-pelota 0.9s cubic-bezier(0.2, 0.8, 0.3, 1) both; }
.t90-inv-brillo { transform-box: fill-box; transform-origin: left bottom; animation: t90-inv-brillo 0.9s ease-out both; }
@media (prefers-reduced-motion: reduce) { .t90-inv-tarjeta, .t90-inv-pelota, .t90-inv-brillo { animation: none; } }
`

// Sobre abierto con una pelota saliendo. Va en tres capas (solapa de atrás, pelota y
// frente del sobre) para que la pelota "salga" de adentro. Es decorativo.
function EnvelopeWithBall({ className }: { className?: string }) {
  const id = useId()
  return (
    <div className={cn('relative h-[100px] w-[124px] shrink-0', className)} aria-hidden="true">
      <svg viewBox="0 0 124 100" fill="none" className="absolute inset-0 size-full">
        <ellipse cx="58" cy="95" rx="46" ry="4" fill="#000" fillOpacity="0.35" />
        <path d="M10 44l48-24 48 24" fill="#14351f" stroke="#35f46e" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="t90-inv-pelota absolute left-[32.26%] top-[6%] h-[40%] w-[32.26%]">
        <Ball className="size-full" />
      </div>
      <svg viewBox="0 0 124 100" fill="none" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1c4a2e" /><stop offset="1" stopColor="#10271a" /></linearGradient>
        </defs>
        <rect x="10" y="44" width="96" height="48" rx="6" fill={`url(#${id}s)`} stroke="#35f46e" strokeWidth="2" />
        <path d="M10 50l48 26 48-26" stroke="#35f46e" strokeWidth="2" strokeLinejoin="round" />
        <path className="t90-inv-brillo" d="M98 14l8-7M104 28h12M92 4l2-4" stroke="#35f46e" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// Tarjeta "Invitación lista" que aparece en el desplegable de invitación al tocar "Invitar".
export function InvitationSentCard({ name, onClose }: { name: string; onClose?: () => void }) {
  return (
    <div role="status" className="t90-inv-tarjeta relative flex items-center gap-4 border-b border-[#35f46e]/30 bg-[radial-gradient(circle_at_15%_50%,rgba(53,244,110,0.14),#0b1b12_65%)] p-4 pr-9">
      <style>{SENT_CSS}</style>
      <EnvelopeWithBall className="h-[72px] w-[90px] sm:h-[100px] sm:w-[124px]" />
      <div className="min-w-0">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#35f46e]">Invitación lista</p>
        <p className="mt-1 truncate font-bold text-[#f4f8f5]">{name}</p>
        <p className="mt-0.5 text-xs text-[#a9bcae]">Le llega un link: lo abre, inicia sesión y acepta.</p>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="absolute right-2 top-2 rounded p-1 text-xs text-[#a9bcae] hover:text-[#f4f8f5]" aria-label="Cerrar aviso de invitación">
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
