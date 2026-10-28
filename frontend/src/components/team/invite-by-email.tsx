import { useQuery } from '@tanstack/react-query'
import { Check, Copy, Mail, Search, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { searchUsersByEmail } from '@/lib/api'

interface InviteByEmailProps {
  teamId: number
  teamName: string
  teamCode: string
}

// Busca usuarios registrados por mail y les manda la invitación con el código del equipo.
// El jugador invitado entra solo, desde Mi equipo, con ese código.
export function InviteByEmail({ teamId, teamName, teamCode }: InviteByEmailProps) {
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')

  const query = useQuery({
    queryKey: ['invite-search', search],
    queryFn: () => searchUsersByEmail(search),
    enabled: search.length >= 3,
  })

  const message = `Te invito a sumarte a ${teamName} en Torneo 90. Iniciá sesión, entrá a Mi equipo y usá el código ${teamCode}.`
  const mailtoFor = (email: string) =>
    `mailto:${email}?subject=${encodeURIComponent(`Invitación a ${teamName}`)}&body=${encodeURIComponent(message)}`

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = term.trim()
    if (value.length < 3) {
      toast.error('Escribí al menos 3 letras del mail.')
      return
    }
    setSearch(value)
  }

  const copyInvite = async () => {
    await navigator.clipboard.writeText(message)
    toast.success('Invitación copiada')
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <span className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><UserPlus className="size-5" /></span>
        <CardTitle>Invitar jugadores</CardTitle>
        <CardDescription>Buscá por mail a un usuario registrado y mandale el código del equipo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={submit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 size-4 text-base-content/30" />
            <Input type="search" className="pl-10" placeholder="mail del jugador" value={term} onChange={(event) => setTerm(event.target.value)} aria-label="Buscar jugador por mail" />
          </div>
          <Button type="submit" variant="outline">Buscar</Button>
        </form>

        {query.isFetching && <p className="text-xs text-base-content/45">Buscando...</p>}
        {query.isError && <p className="text-xs text-error">{query.error.message}</p>}
        {query.data && query.data.length === 0 && !query.isFetching && (
          <p className="text-sm text-base-content/55">No encontramos usuarios con ese mail. Puede que todavía no se haya registrado.</p>
        )}

        {query.data && query.data.length > 0 && (
          <ul className="divide-y divide-base-content/10 overflow-hidden rounded-xl border border-base-content/10">
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
                ) : (
                  <Button asChild size="sm"><a href={mailtoFor(user.email)}><Mail className="size-4" /> Invitar</a></Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-lg border border-base-content/10 bg-base-100/50 p-4 text-xs leading-5 text-base-content/55">
          La invitación lleva el código <strong className="font-mono tracking-widest text-primary">{teamCode}</strong>. El jugador lo ingresa en Mi equipo y elige su posición.
          <button type="button" onClick={() => void copyInvite()} className="mt-2 flex items-center gap-1 font-semibold text-primary hover:underline"><Copy className="size-3" /> Copiar invitación</button>
        </div>
      </CardContent>
    </Card>
  )
}
