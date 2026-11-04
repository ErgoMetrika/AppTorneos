// "Dónde se juega": mapa real de Google Maps (embebido, sin clave) con el pin en el lugar del torneo,
// y el botón "Cómo llegar" que abre la ruta. Con coordenadas (lugar elegido del buscador) va al punto
// exacto; si no, busca por el texto. Sin lugar cargado se muestra un plano dibujado de relleno.
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

interface VenueMapProps {
  lugar: string | null
  latitud?: number | null
  longitud?: number | null
  className?: string
}

// Link de Google Maps con la ruta hasta el lugar (no pide clave)
// Mapa embebido: el formato "output=embed" de Google Maps no pide clave ni cuenta
function mapaEmbebido(place: string, latitud?: number | null, longitud?: number | null) {
  const punto = latitud != null && longitud != null ? `${latitud},${longitud}` : place
  return `https://maps.google.com/maps?q=${encodeURIComponent(punto)}&z=16&hl=es&output=embed`
}

function rutaEnMaps(place: string, latitud?: number | null, longitud?: number | null) {
  const destino = latitud != null && longitud != null ? `${latitud},${longitud}` : place
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`
}

export function VenueMap({ lugar, latitud, longitud, className }: VenueMapProps) {
  const place = lugar?.trim() || null


  return (
    <section className={cn('flex min-w-0 flex-col gap-3.5 rounded-2xl border border-[#f4f8f5]/10 bg-[#0b1b12] p-6 shadow-[0_10px_28px_rgba(0,0,0,0.35)]', className)}>
      <style>{HALO_CSS}</style>
      <h2 className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-primary"><MapPin className="size-3.5" aria-hidden="true" /> Dónde se juega</h2>
      {place ? (
        <div className="relative overflow-hidden rounded-xl border border-[#f4f8f5]/10 bg-[#0f2a1a]">
          <iframe
            title={`Mapa de ${place}`}
            src={mapaEmbebido(place, latitud, longitud)}
            className="block h-[240px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <a
            href={rutaEnMaps(place, latitud, longitud)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Cómo llegar a ${place} (abre Google Maps)`}
            className="absolute right-2.5 top-2.5 inline-flex min-h-9 items-center gap-1.5 rounded-md bg-[#06110b]/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary shadow-lg outline-none ring-primary/70 transition hover:bg-[#06110b] focus-visible:ring-2"
          >
            <Navigation className="size-3.5" aria-hidden="true" /> Cómo llegar
          </a>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl opacity-70">
          <MapArt className="block h-[210px] w-full" />
          <span className="absolute bottom-2.5 left-3.5 rounded bg-[#06110b]/75 px-2 py-1 font-mono text-[11px] font-bold uppercase text-[#b7c8bd]">Lugar a confirmar</span>
        </div>
      )}
      <p className="text-sm text-[#b7c8bd]">{place ?? 'El organizador todavía no cargó el lugar del torneo.'}</p>
    </section>
  )
}
