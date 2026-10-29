// Piezas chicas que comparten la lista y el detalle del torneo:
// color por estado (banda y chip), chips de modalidad/privado y la copa con texto encima.
import { LockKeyhole } from 'lucide-react'

import { Trophy } from '@/components/visuals/art'
import { cn } from '@/lib/utils'
import type { EstadoTorneo } from '@/types/domain'

// Banda de color por estado: verde inscripción, amarillo en curso, gris finalizado
const STATE_BAND: Record<EstadoTorneo, string> = {
  inscripcion: 'bg-[#35f46e]',
  en_curso: 'bg-[#f2c94c]',
  finalizado: 'bg-[#6f8577]',
}

export function StateBand({ state }: { state: EstadoTorneo }) {
  return <div aria-hidden="true" className={cn('h-1.5', STATE_BAND[state])} />
}

const STATE_CHIP: Record<EstadoTorneo, string> = {
  inscripcion: 'bg-[#35f46e]/16 text-[#35f46e]',
  en_curso: 'bg-[#f2c94c]/16 text-[#f2c94c]',
  // El gris de la banda no llega a 4.5:1 como texto: el chip usa uno más claro
  finalizado: 'bg-[#6f8577]/22 text-[#b7c8bd]',
}

const STATE_SHORT: Record<EstadoTorneo, string> = {
  inscripcion: 'Inscripción',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
}

const CHIP = 'inline-flex items-center gap-1.5 rounded-md font-mono font-bold uppercase'

export function StateChip({ state, large = false }: { state: EstadoTorneo; large?: boolean }) {
  return <span className={cn(CHIP, large ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-[5px] text-[11px]', STATE_CHIP[state])}>{STATE_SHORT[state]}</span>
}

export function ModalityChip({ tipo, large = false }: { tipo: number; large?: boolean }) {
  return <span className={cn(CHIP, large ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-[5px] text-[11px]', 'bg-[#f4f8f5]/8 text-[#b7c8bd]')}>Fútbol {tipo}</span>
}

export function PrivateChip({ large = false }: { large?: boolean }) {
  return (
    <span className={cn(CHIP, large ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-[5px] text-[11px]', 'bg-warning/12 text-warning')}>
      <LockKeyhole className="size-3.5" aria-hidden="true" /> Privado
    </span>
  )
}

// Copa con un texto escrito sobre el cuerpo ("F5", "90'"). El texto es HTML encima del SVG
// y escala con el ancho de la copa (unidades de contenedor).
export function LabelledTrophy({ text, dim = false, shine = false, label, className }: { text: string; dim?: boolean; shine?: boolean; label?: string; className?: string }) {
  return (
    <div className={cn('relative @container', className)}>
      <Trophy dim={dim} shine={shine} label={label} className="block h-auto w-full" />
      <span aria-hidden="true" className={cn('pointer-events-none absolute inset-x-0 top-[31%] -translate-y-1/2 text-center font-display text-[17cqw] font-black leading-none text-[#06110b]/80', dim && 'opacity-40')}>
        {text}
      </span>
    </div>
  )
}
