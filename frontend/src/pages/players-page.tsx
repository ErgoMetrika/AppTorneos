import { useQuery } from '@tanstack/react-query'
import { Search, Shield, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PlayerFormDialog } from '@/components/admin/player-form-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-context'
import { getPlayers } from '@/lib/api'
import { positionLabel } from '@/lib/utils'

export function PlayersPage() {
  const [search, setSearch] = useState('')
  const { isAdmin } = useAuth()
  const query = useQuery({ queryKey: ['players'], queryFn: getPlayers })
  const players = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (query.data ?? []).filter((player) => !term || player.nombre.toLowerCase().includes(term) || player.equipo.toLowerCase().includes(term))
  }, [query.data, search])

  return (
    <div>
      <PageHeader
        eyebrow={isAdmin ? 'Gestión de planteles' : 'Planteles registrados'}
        title="Jugadores"
        description={isAdmin ? 'Asigná usuarios registrados a sus equipos y consultá cada ficha.' : 'Consultá los jugadores y el equipo al que pertenecen.'}
        action={isAdmin ? <PlayerFormDialog /> : undefined}
      />
      <div className="mt-8 flex justify-end"><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-3.5 size-4 text-base-content/35" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar jugador o equipo..." className="pl-10" /></div></div>
      <div className="mt-6">
        {query.isLoading && <LoadingState label="Cargando jugadores" />}
        {query.isError && <ErrorState message={query.error.message} retry={() => void query.refetch()} />}
        {!query.isLoading && !query.isError && players.length === 0 && <EmptyState title="Sin jugadores" description={isAdmin ? 'Agregá el primer jugador a un equipo.' : 'Todavía no hay jugadores registrados.'} />}
        {players.length > 0 && <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(180px,.7fr)_160px_90px] border-b border-base-content/10 bg-base-300/50 px-5 py-3 font-mono text-[0.6rem] font-bold uppercase tracking-widest text-base-content/40 md:grid"><span>Jugador</span><span>Equipo</span><span>Posición</span><span /></div>
          {players.map((player) => <div key={player.id} className="grid gap-4 border-b border-base-content/10 p-5 last:border-0 md:grid-cols-[minmax(0,1fr)_minmax(180px,.7fr)_160px_90px] md:items-center">
            <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UserRound className="size-5" /></span><div className="min-w-0"><p className="truncate font-bold">{player.nombre}</p><p className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-wider text-base-content/35">Jugador #{String(player.id).padStart(3, '0')}</p></div></div>
            <span className="flex items-center gap-2 text-sm text-base-content/70"><Shield className="size-4 text-primary" /> {player.equipo}</span>
            <div><Badge variant="secondary">{positionLabel[player.posicion]}</Badge></div>
            <Button asChild variant="outline" size="sm"><Link to={`/app/jugadores/${player.id}`}>Ver ficha</Link></Button>
          </div>)}
        </Card>}
      </div>
    </div>
  )
}
