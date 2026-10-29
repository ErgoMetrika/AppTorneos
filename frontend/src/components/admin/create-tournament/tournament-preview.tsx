// Vista previa en vivo de cómo va a quedar la tarjeta del torneo (mismo lenguaje que la fila de Gestión).
// Recibe los valores que el formulario observa con useWatch; no toca la base.
import { isValid, parseISO } from 'date-fns'
import { CalendarDays, MapPin, Users } from 'lucide-react'

import { LabelledTrophy, ModalityChip, PrivateChip, StateChip } from '@/components/tournament/tournament-bits'
import { EmptyCrest } from '@/components/visuals/art'
import { formatDate } from '@/lib/utils'

import { plantelMinimo, primeraRonda } from './create-tournament-options'
import { FormationPitch } from './formation-pitch'

export interface PreviewValues {
  nombre?: string
  descripcion?: string
  tipo_futbol?: number
  max_equipos?: number
  visibilidad?: 'publico' | 'privado'
  fecha?: string
  lugar?: string
}

// Hasta este cupo se dibuja un escudo vacío por lugar; con más, una barra (igual que en Gestión)
const CRESTS_MAX = 8

function fechaLegible(value?: string) {
  if (!value) return null
  const date = parseISO(value)
  return isValid(date) ? formatDate(value, "EEEE d 'de' MMMM, yyyy") : null
}

export function TournamentPreview({ values }: { values: PreviewValues }) {
  const nombre = values.nombre?.trim() || 'Nuevo torneo'
  const tipo = values.tipo_futbol ?? 5
  const cupo = values.max_equipos ?? 4
  const fecha = fechaLegible(values.fecha)
  const lugar = values.lugar?.trim()
  const descripcion = values.descripcion?.trim()

  return (
    <article aria-label="Vista previa del torneo" className="anim-pop overflow-hidden rounded-[20px] border border-[#35f46e]/30 bg-[#0b1b12] shadow-[0_14px_34px_rgba(0,0,0,0.38)]">
      <div aria-hidden="true" className="h-1.5 bg-[#35f46e]" />
      <div className="relative bg-[radial-gradient(circle_at_30%_20%,rgba(53,244,110,0.14),transparent_70%)] px-5 pb-2 pt-5">
        {/* key: la cancha vuelve a aparecer con un pop cuando cambia la modalidad */}
        <FormationPitch key={tipo} tipo={tipo} active className="anim-pop" />
        <LabelledTrophy text={`F${tipo}`} shine className="absolute -bottom-3 right-3 w-14" />
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-2">
          <h3 className="break-words font-display text-[32px] font-extrabold uppercase leading-none">{nombre}</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <StateChip state="inscripcion" />
            <ModalityChip tipo={tipo} />
            {values.visibilidad === 'privado' && <PrivateChip />}
          </div>
        </div>

        {descripcion && <p className="line-clamp-3 break-words text-sm leading-6 text-[#b7c8bd]">{descripcion}</p>}

        <ul className="flex flex-col gap-2 text-[13px] text-[#b7c8bd]">
          <li className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-[#35f46e]" aria-hidden="true" />
            <span className="sr-only">Fecha:</span>
            {fecha ? <span className="first-letter:uppercase">{fecha}</span> : <span className="italic text-[#8fa596]">Fecha pendiente</span>}
          </li>
          <li className="flex min-w-0 items-center gap-2">
            <MapPin className="size-4 shrink-0 text-[#35f46e]" aria-hidden="true" />
            <span className="sr-only">Lugar:</span>
            {lugar ? <span className="truncate">{lugar}</span> : <span className="italic text-[#8fa596]">Lugar a confirmar</span>}
          </li>
          <li className="flex items-center gap-2">
            <Users className="size-4 shrink-0 text-[#35f46e]" aria-hidden="true" />
            Plantel mínimo de {plantelMinimo(tipo)} jugadores por equipo
          </li>
        </ul>

        <div className="flex flex-col gap-2 border-t border-[#f4f8f5]/8 pt-4">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#b7c8bd]">Cupo · 0/{cupo}</span>
          {cupo <= CRESTS_MAX ? (
            <div className="flex flex-wrap gap-1" aria-hidden="true">
              {Array.from({ length: cupo }, (_, slot) => <EmptyCrest key={slot} className="h-10 w-9" />)}
            </div>
          ) : (
            <div className="h-2.5 w-full overflow-hidden rounded-[5px] bg-[#f4f8f5]/8" aria-hidden="true" />
          )}
          <span className="text-xs text-[#8fa596]">{cupo} lugares libres · la llave arranca en {primeraRonda(cupo).toLowerCase()}</span>
        </div>
      </div>
    </article>
  )
}
