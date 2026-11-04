// Campo "Lugar" con buscador: mientras se escribe, sugiere lugares reales (OpenStreetMap, vía Photon).
// Al elegir uno se guardan el texto y las coordenadas; si se escribe a mano, queda solo el texto.
// Photon es gratis y no pide clave. Se consulta con una pausa entre teclas para no saturarlo.
import { Check, Loader2, MapPin } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface LugarElegido {
  lugar: string
  latitud: number
  longitud: number
}

interface Sugerencia extends LugarElegido {
  id: string
  titulo: string
  detalle: string
}

// Solo resultados de Argentina, priorizando los cercanos a zona oeste (Haedo)
const PHOTON_URL = 'https://photon.komoot.io/api/'
const ARGENTINA_BBOX = '-73.6,-55.1,-53.6,-21.8'
const CERCA_DE = { lat: -34.64, lon: -58.6 }
const MIN_LETRAS = 3
const PAUSA_MS = 350
const MAX_LARGO = 160

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_id?: number
    name?: string
    street?: string
    housenumber?: string
    city?: string
    district?: string
    locality?: string
    state?: string
  }
}

// Redondeo a 6 decimales (unos 10 cm): es lo que guarda la base
const redondear = (valor: number) => Math.round(valor * 1e6) / 1e6

function aSugerencia(feature: PhotonFeature, index: number): Sugerencia {
  const p = feature.properties
  const [longitud, latitud] = feature.geometry.coordinates
  const calle = [p.street, p.housenumber].filter(Boolean).join(' ')
  const ciudad = p.city || p.locality || p.district || ''
  const titulo = p.name || calle || ciudad || 'Lugar sin nombre'
  // Si el nombre ya es la calle (resultado de una calle), no repetirla
  const partes = [titulo, calle !== titulo ? calle : '', ciudad !== titulo ? ciudad : ''].filter(Boolean)
  return {
    id: `${p.osm_id ?? index}-${index}`,
    titulo,
    detalle: [calle !== titulo ? calle : '', ciudad !== titulo ? ciudad : '', p.state].filter(Boolean).join(', '),
    lugar: partes.join(', ').slice(0, MAX_LARGO),
    latitud: redondear(latitud),
    longitud: redondear(longitud),
  }
}

async function buscarLugares(texto: string, signal: AbortSignal): Promise<Sugerencia[]> {
  const params = new URLSearchParams({ q: texto, limit: '6', bbox: ARGENTINA_BBOX, lat: String(CERCA_DE.lat), lon: String(CERCA_DE.lon) })
  const response = await fetch(`${PHOTON_URL}?${params}`, { signal })
  if (!response.ok) throw new Error('No se pudo buscar el lugar')
  const data = (await response.json()) as { features?: PhotonFeature[] }
  const sugerencias = (data.features ?? []).map(aSugerencia)
  // Sin repetidos (a veces OSM trae el mismo lugar dos veces)
  return sugerencias.filter((s, i) => sugerencias.findIndex((o) => o.lugar === s.lugar) === i)
}

interface PlaceSearchInputProps {
  id: string
  value: string
  // Hay coordenadas guardadas para el texto actual
  exacto: boolean
  // Se escribió a mano: llega el texto y las coordenadas se descartan
  onTextChange: (texto: string) => void
  // Se eligió una sugerencia
  onSelect: (lugar: LugarElegido) => void
  onBlur?: () => void
  invalid?: boolean
  describedBy?: string
  placeholder?: string
}

export function PlaceSearchInput({ id, value, exacto, onTextChange, onSelect, onBlur, invalid, describedBy, placeholder = 'Complejo, club o dirección' }: PlaceSearchInputProps) {
  const listId = useId()
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [fallo, setFallo] = useState(false)
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([])
  const [activa, setActiva] = useState(-1)
  // Texto que el usuario escribió (no el que se completó al elegir): es lo único que dispara búsquedas
  const [consulta, setConsulta] = useState('')
  const contenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const texto = consulta.trim()
    if (texto.length < MIN_LETRAS) return
    const control = new AbortController()
    const espera = window.setTimeout(() => {
      buscarLugares(texto, control.signal)
        .then((resultado) => {
          setSugerencias(resultado)
          setFallo(false)
          setActiva(-1)
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setSugerencias([])
          setFallo(true)
        })
        .finally(() => {
          if (!control.signal.aborted) setCargando(false)
        })
    }, PAUSA_MS)
    return () => {
      window.clearTimeout(espera)
      control.abort()
    }
  }, [consulta])

  // Cerrar la lista al tocar afuera
  useEffect(() => {
    if (!abierto) return
    const cerrar = (event: PointerEvent) => {
      if (!contenedor.current?.contains(event.target as Node)) setAbierto(false)
    }
    document.addEventListener('pointerdown', cerrar)
    return () => document.removeEventListener('pointerdown', cerrar)
  }, [abierto])

  const elegir = (sugerencia: Sugerencia) => {
    onSelect({ lugar: sugerencia.lugar, latitud: sugerencia.latitud, longitud: sugerencia.longitud })
    setConsulta('')
    setSugerencias([])
    setAbierto(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (abierto) event.preventDefault()
      setAbierto(false)
      return
    }
    if (!sugerencias.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setAbierto(true)
      setActiva((i) => (i + 1) % sugerencias.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setAbierto(true)
      setActiva((i) => (i <= 0 ? sugerencias.length - 1 : i - 1))
    } else if (event.key === 'Enter' && abierto && activa >= 0) {
      // Enter elige la sugerencia marcada en vez de enviar el formulario
      event.preventDefault()
      elegir(sugerencias[activa])
    }
  }

  const mostrarLista = abierto && consulta.trim().length >= MIN_LETRAS

  return (
    <div ref={contenedor} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={mostrarLista}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={mostrarLista && activa >= 0 ? `${listId}-${activa}` : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        autoComplete="off"
        maxLength={MAX_LARGO}
        placeholder={placeholder}
        value={value}
        className="pr-10"
        onChange={(event) => {
          const nuevo = event.target.value
          onTextChange(nuevo)
          setConsulta(nuevo)
          setAbierto(true)
          // Con pocas letras no se busca; con suficientes, se muestra "Buscando…" hasta que llegue la respuesta
          const buscar = nuevo.trim().length >= MIN_LETRAS
          setCargando(buscar)
          if (!buscar) setSugerencias([])
        }}
        onFocus={() => {
          if (consulta.trim().length >= MIN_LETRAS) setAbierto(true)
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      <span className="pointer-events-none absolute right-3 top-3 text-[#8fa596]" aria-hidden="true">
        {cargando ? <Loader2 className="size-5 animate-spin" /> : exacto ? <Check className="size-5 text-primary" /> : <MapPin className="size-5" />}
      </span>

      {mostrarLista && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-lg border border-[#f4f8f5]/12 bg-[#0b1b12] shadow-[0_14px_32px_rgba(0,0,0,0.5)]">
          <ul id={listId} role="listbox" aria-label="Lugares sugeridos" className="max-h-72 overflow-y-auto py-1">
            {sugerencias.map((sugerencia, index) => (
              <li
                key={sugerencia.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activa}
                // pointerdown + preventDefault: elige sin que el input pierda el foco antes
                onPointerDown={(event) => {
                  event.preventDefault()
                  elegir(sugerencia)
                }}
                onPointerEnter={() => setActiva(index)}
                className={cn('flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm', index === activa ? 'bg-primary/12' : 'hover:bg-[#f4f8f5]/5')}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[#f4f8f5]">{sugerencia.titulo}</span>
                  {sugerencia.detalle && <span className="block truncate text-xs text-[#8fa596]">{sugerencia.detalle}</span>}
                </span>
              </li>
            ))}
          </ul>
          {!sugerencias.length && (
            <p className="px-3 py-3 text-sm text-[#b7c8bd]" role="status">
              {cargando ? 'Buscando lugares…' : fallo ? 'No pudimos buscar ahora. Podés dejarlo escrito a mano.' : 'No encontramos ese lugar. Podés dejarlo escrito a mano.'}
            </p>
          )}
          <p className="border-t border-[#f4f8f5]/8 px-3 py-1.5 text-right text-[10px] text-[#8fa596]">
            Datos ©{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
              OpenStreetMap
            </a>
          </p>
        </div>
      )}

      <p className="mt-1.5 text-xs text-[#8fa596]" aria-live="polite">
        {exacto ? 'Ubicación exacta: "Cómo llegar" lleva justo a este lugar.' : value.trim() ? 'Sin ubicación exacta: elegí una sugerencia para marcarla en el mapa.' : 'Escribí al menos 3 letras para ver sugerencias.'}
      </p>
    </div>
  )
}
