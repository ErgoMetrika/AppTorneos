import { ArrowLeft, Check, Copy, Info, Mail, MailOpen, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { cn } from '@/lib/utils'
import type { Contacto } from '@/types/domain'

import { ReadPill } from './contact-list'
import { fullDate, replyHref } from './contact-utils'

const BTN = 'inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl px-[18px] text-[15px] font-bold transition-[background-color,border-color,color,box-shadow] duration-150 outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3]'
const BTN_SEC = cn(BTN, 'border border-[#f4f8f5]/20 bg-[#10271a] text-[#f4f8f5] hover:border-[#35f46e] hover:bg-[#143220]')

interface ContactDetailProps {
  contact: Contacto
  read: boolean
  onToggleRead: () => void
  onDelete: () => Promise<boolean>
  deleting: boolean
  // Sólo en celular: vuelve a la bandeja
  onBack: () => void
  // Al abrirlo desde la lista en celular movemos el foco al encabezado
  focusOnMount: boolean
}

export function ContactDetail({ contact, read, onToggleRead, onDelete, deleting, onBack, focusOnMount }: ContactDetailProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    // En escritorio la lista sigue a la vista: el foco se queda en la fila para seguir con las flechas
    if (focusOnMount && window.matchMedia('(max-width: 1023px)').matches) headingRef.current?.focus()
  }, [focusOnMount, contact.id])

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contact.email)
      toast.success('Mail copiado.')
    } catch {
      toast.error('No se pudo copiar. Seleccioná el mail y copialo a mano.')
    }
  }

  return (
    <article
      aria-labelledby="consulta-de"
      className="anim-pop flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#35f46e]/30 bg-[#0b1b12] shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
    >
      <div className="flex flex-col gap-3.5 border-b border-[#f4f8f5]/[0.08] bg-[linear-gradient(170deg,#0f2418,#0b1b12)] px-5 py-6 sm:px-7">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-1 text-sm font-semibold text-[#b7c8bd] outline-none hover:text-[#f4f8f5] focus-visible:outline-3 focus-visible:outline-[#7dffa3] lg:hidden"
        >
          <ArrowLeft className="size-[18px]" aria-hidden="true" />
          Volver a la bandeja
        </button>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#35f46e]">Mail desde el formulario de Contacto</p>
          <ReadPill read={read} />
        </div>
        <h2 id="consulta-de" ref={headingRef} tabIndex={-1} className="sr-only">
          Consulta de {contact.nombre}
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="font-semibold text-[#b7c8bd]">De</dt>
          <dd className="min-w-0 break-words font-bold">
            {contact.nombre} ·{' '}
            <a href={`mailto:${contact.email}`} className="text-[#35f46e] no-underline hover:text-[#7dffa3]">
              {contact.email}
            </a>
          </dd>
          <dt className="font-semibold text-[#b7c8bd]">Recibido</dt>
          <dd className="first-letter:uppercase">
            <time dateTime={contact.creado_en}>{fullDate(contact.creado_en)}</time>
          </dd>
        </dl>
      </div>

      <div className="flex flex-col gap-[22px] px-5 py-7 sm:px-7">
        <div className="border-l-[3px] border-[#35f46e]/50 py-1 pl-[18px]">
          <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#b7c8bd]">Mensaje</p>
          <p className="whitespace-pre-wrap break-words text-[17px] leading-[1.6] sm:text-lg">{contact.mensaje}</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <a
            href={replyHref(contact)}
            className={cn(BTN, 'bg-[#35f46e] px-[22px] font-extrabold text-[#06110b] shadow-[0_10px_24px_rgba(53,244,110,0.22)] hover:bg-[#7dffa3] hover:text-[#06110b] hover:shadow-[0_12px_30px_rgba(53,244,110,0.35)]')}
          >
            <Mail className="size-5" strokeWidth={2.2} aria-hidden="true" />
            Responder por mail
          </a>
          <button type="button" onClick={onToggleRead} className={BTN_SEC}>
            {read ? <MailOpen className="size-5 text-[#35f46e]" aria-hidden="true" /> : <Check className="size-5 text-[#35f46e]" strokeWidth={2.6} aria-hidden="true" />}
            {read ? 'Marcar como no leída' : 'Marcar como leída'}
          </button>
          <button type="button" onClick={() => void copyEmail()} aria-label={`Copiar el mail de ${contact.nombre}`} className={BTN_SEC}>
            <Copy className="size-[18px]" aria-hidden="true" />
            Copiar mail
          </button>
          <ConfirmDialog
            trigger={
              <button type="button" className={cn(BTN, 'border border-[#ff6b6b]/60 bg-[#ff6b6b]/10 text-[#ff9b9b] hover:bg-[#ff6b6b]/20 hover:text-[#ffc2c2]')}>
                <Trash2 className="size-[18px]" aria-hidden="true" />
                Borrar
              </button>
            }
            icon={<Trash2 className="size-5" aria-hidden="true" />}
            title="¿Borrar esta consulta?"
            description={
              <>
                Se borra para siempre la consulta de <strong>{contact.nombre}</strong> ({contact.email}).
              </>
            }
            note="Si todavía no le respondiste, copiá el mail antes de borrarla."
            confirmLabel="Borrar consulta"
            pendingLabel="Borrando…"
            pending={deleting}
            onConfirm={onDelete}
          />
        </div>

        <p className="flex items-start gap-2.5 text-[13px] leading-normal text-[#b7c8bd]">
          <Info className="mt-px size-[18px] flex-none" aria-hidden="true" />
          “Responder por mail” abre tu programa de mail con la dirección de {contact.nombre} y la consulta citada. La respuesta no queda guardada acá.
        </p>
      </div>
    </article>
  )
}
