// Plano ilustrado del lugar del torneo: manzanas, avenida, una canchita y un pin con halo.
// Es decorativo (no es un mapa real): la base solo guarda el texto del lugar.
import { MapPin, Navigation } from 'lucide-react'
import { useId } from 'react'

import { cn } from '@/lib/utils'

// Halo del pin que late suave. Con "reducir movimiento" queda quieto.
const HALO_CSS = `
@keyframes t90-halo { 0%, 100% { transform: scale(0.8); opacity: 0.55; } 50% { transform: scale(1.15); opacity: 1; } }
.t90-halo { transform-box: fill-box; transform-origin: center; animation: t90-halo 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .t90-halo { animation: none; } }
`

function MapArt({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 460 210" fill="none" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <clipPath id={`${id}c`}><rect width="460" height="210" rx="12" /></clipPath>
        <radialGradient id={`${id}h`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#35f46e" stopOpacity="0.4" />
          <stop offset="1" stopColor="#35f46e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="460" height="210" fill="#0f2a1a" />
        {/* Manzanas */}
        <rect x="20" y="20" width="70" height="40" rx="4" fill="#123120" />
        <rect x="130" y="20" width="100" height="40" rx="4" fill="#123120" />
        <rect x="20" y="96" width="70" height="80" rx="4" fill="#123120" />
        <rect x="130" y="96" width="100" height="80" rx="4" fill="#123120" />
        <rect x="266" y="20" width="84" height="40" rx="4" fill="#123120" />
        <rect x="380" y="20" width="70" height="40" rx="4" fill="#123120" />
        <rect x="380" y="96" width="70" height="80" rx="4" fill="#123120" />
        {/* Calles y avenida en diagonal con su línea punteada */}
        <path d="M0 78h460M0 186h460M108 0v210M248 0v210M364 0v210" stroke="#1e4a31" strokeWidth="12" />
        <path d="M-10 40L470 200" stroke="#2a5c3f" strokeWidth="18" />
        <path d="M-10 40L470 200" stroke="#e6f4ea" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="8 8" />
        {/* Canchita */}
        <g transform="translate(266 98)">
          <rect width="84" height="52" rx="4" fill="#14351f" stroke="#35f46e" strokeWidth="1.5" />
          <line x1="42" y1="0" x2="42" y2="52" stroke="#35f46e" strokeOpacity="0.7" strokeWidth="1.5" />
          <circle cx="42" cy="26" r="9" stroke="#35f46e" strokeOpacity="0.7" strokeWidth="1.5" />
        </g>
        {/* Pin con halo */}
        <circle className="t90-halo" cx="308" cy="96" r="38" fill={`url(#${id}h)`} />
        <ellipse cx="308" cy="98" rx="8" ry="3" fill="#000" fillOpacity="0.4" />
        <path d="M308 96s-22-22-22-40a22 22 0 0 1 44 0c0 18-22 40-22 40z" fill="#35f46e" stroke="#06110b" strokeWidth="2" />
        <circle cx="308" cy="56" r="8" fill="#06110b" />
      </g>
    </svg>
  )
}

export function VenueMap({ lugar, className }: { lugar: string | null; className?: string }) {
  const place = lugar?.trim() || null
  const mapsUrl = place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : null

  const art = (
    <>
      <MapArt className="block h-[210px] w-full" />
      {/* Cartel con el lugar, como en un plano */}
      <span className="absolute bottom-2.5 left-3.5 max-w-[calc(100%-1.75rem)] truncate rounded bg-[#06110b]/75 px-2 py-1 font-mono text-[11px] font-bold uppercase text-[#b7c8bd]">
        {place ?? 'Lugar a confirmar'}
      </span>
    </>
  )

  return (
    <section className={cn('flex min-w-0 flex-col gap-3.5 rounded-2xl border border-[#f4f8f5]/10 bg-[#0b1b12] p-6 shadow-[0_10px_28px_rgba(0,0,0,0.35)]', className)}>
      <style>{HALO_CSS}</style>
      <h2 className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-primary"><MapPin className="size-3.5" aria-hidden="true" /> Dónde se juega</h2>
      {mapsUrl ? (
        <a href={mapsUrl} target="_blank" rel="noreferrer" aria-label={`Abrir ${place} en Google Maps`} className="relative block overflow-hidden rounded-xl outline-none ring-primary/70 transition hover:brightness-110 focus-visible:ring-2">
          {art}
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-md bg-[#06110b]/80 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-primary"><Navigation className="size-3" aria-hidden="true" /> Cómo llegar</span>
        </a>
      ) : (
        <div className="relative overflow-hidden rounded-xl opacity-70">{art}</div>
      )}
      <p className="text-sm text-[#b7c8bd]">{place ? `${place}. Tocando el mapa abre la ruta.` : 'El organizador todavía no cargó el lugar del torneo.'}</p>
    </section>
  )
}
