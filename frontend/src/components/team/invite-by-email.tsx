import { useQuery } from '@tanstack/react-query'
import { Check, Link2, Mail, Search, Send, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isFullEmail, searchUsersByEmail } from '@/lib/api'
import { inviteLink } from '@/lib/invitation'

import { InvitationSentCard } from './invitation-sent'

interface InviteSearchBarProps {
  teamId: number
  teamName: string
  teamCode: string
}

// Barra de invitación de Mi equipo: busca usuarios registrados por mail y les manda
// un link que los lleva directo a aceptar la invitación, sin escribir el código.
export function InviteSearchBar({ teamId, teamName, teamCode }: InviteSearchBarProps) {
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
  const [invited, setInvited] = useState<Set<string>>(new Set())
  // Último invitado: muestra la tarjeta "Invitación lista" arriba de los resultados
  const [lastInvited, setLastInvited] = useState<{ id: string; nombre: string } | null>(null)

  // Busca solo mientras se escribe, con una pequeña pausa
  useEffect(() => {
    const timer = setTimeout(() => setSearch(term.trim()), 300)
    return () => clearTimeout(timer)
  }, [term])

  const query = useQuery({
    queryKey: ['invite-search', search],
    queryFn: () => searchUsersByEmail(search),
    enabled: isFullEmail(search),
  })

  const link = inviteLink(teamCode)
  const message = `Te invito a sumarte a ${teamName} en Torneo 90. Entrá con este link y aceptá la invitación: ${link}`
  const mailtoFor = (email: string) =>
    `mailto:${email}?subject=${encodeURIComponent(`Invitación a ${teamName}`)}&body=${encodeURIComponent(message)}`

  const markInvited = (userId: string, nombre: string) => {
    setInvited((current) => new Set(current).add(userId))
    setLastInvited({ id: userId, nombre })
    toast.success('Invitación lista para enviar por mail')
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(link)
    toast.success('Link de invitación copiado')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!isFullEmail(term)) toast.error('Escribí el mail completo del jugador.')
    else setSearch(term.trim())
  }

  const open = isFullEmail(search)

  return (
    <div className="relative w-full sm:w-[28rem]">
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 size-4 text-base-content/30" />
          <Input type="search" className="pl-10 pr-9" placeholder="Mail completo del jugador" value={term} onChange={(event) => setTerm(event.target.value)} aria-label="Buscar jugador por mail" />
          {term && <button type="button" onClick={() => { setTerm(''); setSearch(''); setLastInvited(null) }} className="absolute right-3 top-3 text-base-content/40 hover:text-base-content" aria-label="Limpiar búsqueda"><X className="size-4" /></button>}
        </div>
        <Button type="submit"><Send className="size-4" /> Invitar</Button>
      </form>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-base-content/10 bg-base-200 shadow-2xl">
          {/* La key reinicia la animación con cada invitado nuevo */}
          {lastInvited && <InvitationSentCard key={lastInvited.id} name={lastInvited.nombre} onClose={() => setLastInvited(null)} />}
          {query.isFetching && <p className="p-4 text-xs text-base-content/45">Buscando...</p>}
          {query.isError && <p className="p-4 text-xs text-error">{query.error.message}</p>}
          {query.data && query.data.length === 0 && !query.isFetching && (
            <p className="p-4 text-sm text-base-content/55">Nadie se registró con ese mail. Copiá el link y mandáselo para que se registre.</p>
          )}
          {query.data && query.data.length > 0 && (
            <ul className="divide-y divide-base-content/10">
              {query.data.map((user) => (
                <li key={user.id} className="flex items-center gap-3 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">{user.nombre.slice(0, 2).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{user.nombre}</p>
                    <p className="truncate text-xs text-base-content/45">{user.email}</p>
                  </div>
                  {user.equipo_id === teamId ? (
                    <Badge variant="secondary"><Check className="mr-1 size-3" /> En tu equipo</Badge>
                  ) : user.equipo_id ? (
                    <Badge variant="secondary">Ya tiene equipo</Badge>
                  ) : invited.has(user.id) ? (
                    <Badge><Check className="mr-1 size-3" /> Invitado</Badge>
                  ) : (
                    <Button asChild size="sm"><a href={mailtoFor(user.email)} onClick={() => markInvited(user.id, user.nombre)}><Mail className="size-4" /> Invitar</a></Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => void copyLink()} className="flex w-full items-center gap-2 border-t border-base-content/10 p-3 text-left text-xs font-semibold text-primary hover:bg-base-300/50">
            <Link2 className="size-4" /> Copiar link de invitación
          </button>
        </div>
      )}
    </div>
  )
}
