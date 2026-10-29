import { Mail } from 'lucide-react'
import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react'

import { cn } from '@/lib/utils'
import type { Contacto } from '@/types/domain'

import { firstLine, shortDate } from './contact-utils'

export function ReadPill({ read }: { read: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-[26px] items-center gap-[7px] whitespace-nowrap rounded-full border px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em]',
        read ? 'border-[#b7c8bd]/30 bg-[#b7c8bd]/15 text-[#b7c8bd]' : 'border-[#35f46e]/30 bg-[#35f46e]/15 text-[#35f46e]',
      )}
    >
      <span className={cn('size-[7px] rounded-full', read ? 'bg-[#b7c8bd]' : 'bg-[#35f46e]')} aria-hidden="true" />
      {read ? 'Leída' : 'Sin leer'}
    </span>
  )
}

interface ContactListProps {
  contacts: Contacto[]
  readIds: ReadonlySet<number>
  selectedId: number | null
  unreadCount: number
  onSelect: (id: number) => void
  // Se muestra en lugar de las filas cuando el filtro no deja ninguna
  empty?: ReactNode
  // Para devolverle el foco a la fila al volver del detalle en el celular
  itemRefs: RefObject<Map<number, HTMLButtonElement>>
}

export function ContactList({ contacts, readIds, selectedId, unreadCount, onSelect, empty, itemRefs }: ContactListProps) {
  const listRef = useRef<HTMLUListElement>(null)

  // Flechas, Inicio y Fin recorren la bandeja como en un programa de mail
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key) || contacts.length === 0) return
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-contact-id]') ?? [])
    const index = buttons.findIndex((button) => button === document.activeElement)
    let next = index
    if (event.key === 'ArrowDown') next = Math.min(buttons.length - 1, index + 1)
    if (event.key === 'ArrowUp') next = Math.max(0, index - 1)
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = buttons.length - 1
    const target = buttons[next]
    if (!target) return
    event.preventDefault()
    target.focus()
    onSelect(Number(target.dataset.contactId))
  }

  return (
    <section aria-labelledby="bandeja-titulo" className="flex min-w-0 flex-col gap-1.5 rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] px-3.5 pb-3.5 pt-[22px] shadow-[0_14px_34px_rgba(0,0,0,0.38)]">
      <div className="flex items-center gap-3 px-2.5 pb-2.5">
        <Mail className="size-[22px] text-[#35f46e]" aria-hidden="true" />
        <h2 id="bandeja-titulo" className="font-display text-[30px] font-extrabold uppercase leading-none">Bandeja</h2>
        {unreadCount > 0 && (
          <span className="inline-grid h-[26px] min-w-[26px] place-items-center rounded-full bg-[#35f46e] px-2 font-mono text-xs font-bold text-[#06110b]">
            {unreadCount}
            <span className="sr-only"> sin leer</span>
          </span>
        )}
      </div>

      {contacts.length === 0 ? (
        empty
      ) : (
        <ul ref={listRef} onKeyDown={onKeyDown} aria-label="Consultas recibidas" className="flex flex-col gap-1.5">
          {contacts.map((contact, index) => {
            const read = readIds.has(contact.id)
            const selected = contact.id === selectedId
            return (
              <li key={contact.id} className="anim-stagger" style={{ '--i': index } as CSSProperties}>
                <button
                  type="button"
                  data-contact-id={contact.id}
                  ref={(node) => {
                    if (node) itemRefs.current.set(contact.id, node)
                    else itemRefs.current.delete(contact.id)
                  }}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelect(contact.id)}
                  className={cn(
                    'card-lift flex w-full gap-3.5 rounded-2xl border p-4 text-left text-[#f4f8f5] outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3]',
                    selected ? 'border-[#35f46e]/40 bg-[#35f46e]/10' : 'border-transparent hover:border-[#35f46e]/45 hover:bg-[#f4f8f5]/[0.03]',
                  )}
                >
                  <span
                    className={cn(
                      'relative grid size-11 flex-none place-items-center rounded-xl',
                      read ? 'bg-[#f4f8f5]/[0.06] text-[#b7c8bd]' : 'bg-[#35f46e]/15 text-[#35f46e]',
                    )}
                  >
                    <Mail className="size-[22px]" aria-hidden="true" />
                    {!read && <span className="absolute -right-[3px] -top-[3px] size-3 rounded-full border-2 border-[#0b1b12] bg-[#35f46e]" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn('min-w-0 flex-1 truncate', read ? 'font-semibold text-[#b7c8bd]' : 'font-extrabold')}>{contact.nombre}</span>
                      <time dateTime={contact.creado_en} className="flex-none text-xs text-[#b7c8bd]">{shortDate(contact.creado_en)}</time>
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-[#b7c8bd]">{contact.email}</span>
                    <span className={cn('mt-2 block truncate text-sm', read && 'text-[#b7c8bd]')}>{firstLine(contact.mensaje)}</span>
                    <span className="mt-2.5 block">
                      <ReadPill read={read} />
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
