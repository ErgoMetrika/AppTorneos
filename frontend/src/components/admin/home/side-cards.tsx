// Tarjeta chica del Inicio: accesos rápidos.
import { ClipboardPen, LayoutList, Plus } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { BTN_PRIMARY, BTN_SECONDARY, CARD, SECTION_TITLE } from './home-data'

export function QuickLinks() {
  return (
    <nav aria-labelledby="inicio-rapidos" className={cn(CARD, 'anim-stagger flex flex-col gap-3 p-6 sm:px-7')} style={{ '--i': 6 } as CSSProperties}>
      <h2 id="inicio-rapidos" className={SECTION_TITLE}>Accesos rápidos</h2>
      <Link to="/app/admin/torneos/nuevo" className={cn(BTN_PRIMARY, 'min-h-[54px] justify-start')}>
        <Plus className="size-5" strokeWidth={2.6} aria-hidden="true" />Nuevo torneo
      </Link>
      <Link to="/app/admin/torneos" className={cn(BTN_SECONDARY, 'min-h-[54px] justify-start')}>
        <LayoutList className="size-5 text-[#35f46e]" aria-hidden="true" />Gestión de torneos
      </Link>
      <Link to="/app/admin/resultados" className={cn(BTN_SECONDARY, 'min-h-[54px] justify-start')}>
        <ClipboardPen className="size-5 text-[#35f46e]" aria-hidden="true" />Cargar resultados
      </Link>
    </nav>
  )
}
