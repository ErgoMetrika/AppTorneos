import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Info, Search } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { ContactDetail } from '@/components/admin/contacts/contact-detail'
import { ContactEmpty } from '@/components/admin/contacts/contact-empty'
import { ContactList } from '@/components/admin/contacts/contact-list'
import { useReadContacts } from '@/components/admin/contacts/read-store'
import { deleteContact, getContacts } from '@/lib/api'
import { cn, getErrorMessage } from '@/lib/utils'

type Filter = 'sin-leer' | 'todas'

const CHIP = 'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm outline-none transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3]'
const BTN_SEC = 'inline-flex min-h-[46px] items-center justify-center rounded-xl border border-[#f4f8f5]/20 bg-[#10271a] px-[18px] text-[15px] font-bold text-[#f4f8f5] outline-none transition-colors hover:border-[#35f46e] hover:bg-[#143220] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3]'

// Pantalla del administrador general: bandeja de las consultas que llegan desde Contacto
export function AdminContactsPage() {
  const queryClient = useQueryClient()
  const contactsQuery = useQuery({ queryKey: ['contacts'], queryFn: getContacts })
  const { readIds, setRead, forget } = useReadContacts()

  const [filter, setFilter] = useState<Filter>('sin-leer')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  // En celular se ve una cosa por vez: la bandeja o el mail abierto
  const [mobileDetail, setMobileDetail] = useState(false)
  const itemRefs = useRef(new Map<number, HTMLButtonElement>())

  const contacts = useMemo(() => contactsQuery.data ?? [], [contactsQuery.data])
  const unread = contacts.filter((contact) => !readIds.has(contact.id))

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return contacts.filter((contact) => {
      if (filter === 'sin-leer' && readIds.has(contact.id)) return false
      if (!term) return true
      return contact.nombre.toLocaleLowerCase('es').includes(term) || contact.email.toLocaleLowerCase('es').includes(term)
    })
  }, [contacts, filter, readIds, search])

  // La abierta se busca entre todas: si la marcás como leída con el filtro "Sin leer", sigue a la vista
  const selected = contacts.find((contact) => contact.id === selectedId) ?? visible[0] ?? null

  const removeMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: async (_data, id) => {
      forget(id)
      setSelectedId(null)
      setMobileDetail(false)
      toast.success('Consulta borrada.')
      await queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })

  const removeSelected = async () => {
    if (!selected) return false
    try {
      await removeMutation.mutateAsync(selected.id)
      return true
    } catch (error) {
      toast.error(getErrorMessage(error))
      return false
    }
  }

  const select = (id: number) => {
    setSelectedId(id)
    setMobileDetail(true)
  }

  const backToList = () => {
    setMobileDetail(false)
    const id = selected?.id
    if (id != null) requestAnimationFrame(() => itemRefs.current.get(id)?.focus())
  }

  const showAll = () => {
    setFilter('todas')
    setSearch('')
  }

  const emptyVariant = contacts.length === 0 ? 'sin-consultas' : search.trim() ? 'sin-resultados' : 'al-dia'
  const emptyAction =
    emptyVariant === 'al-dia' && filter === 'sin-leer' ? (
      <button type="button" className={BTN_SEC} onClick={showAll}>
        Ver todas
      </button>
    ) : emptyVariant === 'sin-resultados' ? (
      <button type="button" className={BTN_SEC} onClick={() => setSearch('')}>
        Limpiar búsqueda
      </button>
    ) : undefined

  return (
    <div className="flex flex-col gap-8 text-[#f4f8f5]">
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#ffc94a]">
          <span className="h-[3px] w-[18px] rounded-sm bg-[#ffc94a]" aria-hidden="true" />
          Ayuda · Contacto
        </p>
        <h1 className="font-display text-5xl font-black uppercase leading-[0.9] sm:text-[72px]">Consultas de contacto</h1>
        <p className="mt-1 text-base text-[#b7c8bd]">Llegan desde el formulario de Contacto y se responden por mail.</p>
      </header>

      {contactsQuery.isPending ? (
        <div role="status" className="grid gap-6 lg:grid-cols-[0.95fr_1.25fr]">
          <span className="sr-only">Cargando consultas…</span>
          <div className="h-80 animate-pulse rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12]" />
          <div className="hidden h-80 animate-pulse rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] lg:block" />
        </div>
      ) : contactsQuery.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-4 rounded-[20px] border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-6 py-5">
          <p className="min-w-0 flex-1 text-[#ffc2c2]">No pudimos cargar las consultas. {getErrorMessage(contactsQuery.error)}</p>
          <button type="button" className={BTN_SEC} onClick={() => void contactsQuery.refetch()}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className={cn('flex flex-wrap items-center gap-3', mobileDetail && 'max-lg:hidden')}>
            <div role="group" aria-label="Filtrar consultas" className="flex gap-2">
              {(
                [
                  { value: 'sin-leer', label: 'Sin leer', count: unread.length },
                  { value: 'todas', label: 'Todas', count: contacts.length },
                ] as const
              ).map((option) => {
                const active = filter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      CHIP,
                      active ? 'border-[#f4f8f5] bg-[#f4f8f5] font-bold text-[#06110b]' : 'border-[#f4f8f5]/15 font-semibold text-[#b7c8bd] hover:border-[#35f46e]/50 hover:text-[#f4f8f5]',
                    )}
                  >
                    {option.label}
                    <span
                      className={cn(
                        'inline-grid h-[26px] min-w-[26px] place-items-center rounded-full px-2 font-mono text-xs font-bold',
                        active ? 'bg-[#06110b] text-[#f4f8f5]' : 'bg-[#b7c8bd] text-[#06110b]',
                      )}
                    >
                      <span aria-hidden="true">·&nbsp;</span>
                      {option.count}
                    </span>
                  </button>
                )
              })}
            </div>
            <label className="flex h-[46px] w-full items-center gap-2.5 rounded-xl border border-[#f4f8f5]/15 bg-[#0b1b12] px-3.5 text-[#8fa596] focus-within:border-[#35f46e]/60 sm:ml-auto sm:w-auto sm:flex-[0_1_340px]">
              <Search className="size-[18px] flex-none" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o mail"
                aria-label="Buscar por nombre o mail"
                className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#f4f8f5] outline-none placeholder:text-[#8fa596]"
              />
            </label>
          </div>

          {visible.length === 0 && !selected ? (
            <ContactEmpty variant={emptyVariant} action={emptyAction} />
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.25fr]">
              <div className={cn('min-w-0', mobileDetail && 'max-lg:hidden')}>
                <ContactList
                  contacts={visible}
                  readIds={readIds}
                  selectedId={selected?.id ?? null}
                  unreadCount={unread.length}
                  onSelect={select}
                  itemRefs={itemRefs}
                  empty={<ContactEmpty compact variant={emptyVariant} action={emptyAction} />}
                />
              </div>
              {selected && (
                <div className={cn('min-w-0 lg:sticky lg:top-6', !mobileDetail && 'max-lg:hidden')}>
                  <ContactDetail
                    key={selected.id}
                    contact={selected}
                    read={readIds.has(selected.id)}
                    onToggleRead={() => setRead(selected.id, !readIds.has(selected.id))}
                    onDelete={removeSelected}
                    deleting={removeMutation.isPending}
                    onBack={backToList}
                    focusOnMount={mobileDetail}
                  />
                </div>
              )}
            </div>
          )}

          <p className="flex items-center gap-2 text-xs text-[#8fa596]">
            <Info className="size-3.5 flex-none" aria-hidden="true" />
            Las marcas de leída se guardan en este navegador.
          </p>
        </>
      )}
    </div>
  )
}
