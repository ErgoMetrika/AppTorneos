// Tarjetas chicas del Inicio: consultas de contacto y accesos rápidos.
import { ArrowRight, ClipboardPen, LayoutList, Mail, Plus } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { BTN_PRIMARY, BTN_SECONDARY, CARD, FOCUS, SECTION_TITLE, plural } from './home-data'

// Sobre dibujado (decorativo), con el punto ámbar de "hay mensajes" sólo si hay alguno
function Envelope({ dot }: { dot: boolean }) {
  return (
    <svg viewBox="0 0 124 100" fill="none" aria-hidden="true" className="anim-pop h-[77px] w-24 flex-none">
      <defs><linearGradient id="inicio-sobre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1c4a2e" /><stop offset="1" stopColor="#10271a" /></linearGradient></defs>
      <ellipse cx="62" cy="95" rx="46" ry="4" fill="#000" fillOpacity="0.35" />
      <rect x="10" y="24" width="104" height="66" rx="8" fill="url(#inicio-sobre)" stroke="#35f46e" strokeWidth="2.5" />
      <path d="M10 32l52 32 52-32" stroke="#35f46e" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M10 88l38-30M114 88L76 58" stroke="#35f46e" strokeOpacity="0.4" strokeWidth="2" />
      {dot && <circle cx="108" cy="24" r="13" fill="#ffc94a" stroke="#06110b" strokeWidth="3" />}
    </svg>
  )
}

export function ContactsCard({ count, loading, failed, retry }: { count: number | null; loading: boolean; failed: boolean; retry: () => void }) {
  let text: string
  if (loading) text = 'Contando las consultas…'
  else if (failed || count === null) text = 'No pudimos leer las consultas'
  else if (count === 0) text = 'Todavía no llegó ninguna consulta'
  else text = count === 1 ? 'consulta recibida por el formulario de contacto' : 'consultas recibidas por el formulario de contacto'

  return (
    <section
      aria-labelledby="inicio-consultas"
      className={cn(CARD, 'anim-stagger flex flex-col gap-4 bg-[radial-gradient(circle_at_80%_20%,rgba(53,244,110,0.12),#0b1b12_60%)] p-6 sm:px-7')}
      style={{ '--i': 5 } as CSSProperties}
    >
      <div className="flex items-center gap-3">
        <Mail className="size-[22px] text-[#35f46e]" aria-hidden="true" />
        <h2 id="inicio-consultas" className={SECTION_TITLE}>Consultas</h2>
      </div>
      <div className="flex items-center gap-[18px]" role={loading ? 'status' : undefined}>
        <Envelope dot={!!count} />
        <div className="min-w-0">
          {!loading && !failed && count !== null && count > 0 && (
            <p className="font-display text-[52px] font-black leading-none">{count}</p>
          )}
          <p className={cn('mt-0.5 text-sm', failed ? 'text-[#ff9b9b]' : 'text-[#b7c8bd]')}>
            {text}
            {failed && (
              <>
                {' · '}
                <button type="button" onClick={retry} className={cn('font-bold text-[#f4f8f5] underline underline-offset-2', FOCUS)}>Reintentar</button>
              </>
            )}
          </p>
        </div>
      </div>
      <Link to="/app/admin/consultas" className={cn('mt-auto inline-flex min-h-11 items-center gap-1.5 self-start font-bold text-[#35f46e] hover:text-[#7dffa3]', FOCUS)}>
        {count ? `Abrir la bandeja (${plural(count, 'consulta', 'consultas')})` : 'Abrir la bandeja'}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  )
}

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
      <Link to="/app/admin/consultas" className={cn(BTN_SECONDARY, 'min-h-[54px] justify-start')}>
        <Mail className="size-5 text-[#35f46e]" aria-hidden="true" />Consultas
      </Link>
    </nav>
  )
}
