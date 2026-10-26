import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { TeamMark } from '@/components/shared/team-mark'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getTeams } from '@/lib/api'

export function TeamsPage() {
  const [search, setSearch] = useState('')
  const query = useQuery({ queryKey: ['teams'], queryFn: getTeams })
  const teams = useMemo(
    () => (query.data ?? []).filter((item) => item.equipo.toLowerCase().includes(search.toLowerCase())),
    [query.data, search],
  )

  return (
    <div className="container-shell py-12 sm:py-16">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">Participantes</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase sm:text-6xl">Equipos</h1>
          <p className="mt-3 max-w-2xl text-sm text-base-content/55">El backend no almacena escudos: cada equipo se representa con una marca tipográfica basada en su nombre.</p>
        </div>
        <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-3.5 size-4 text-base-content/35" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar equipo..." className="pl-10" /></div>
      </div>
      <div className="mt-10">
        {query.isLoading && <LoadingState label="Cargando equipos" />}
        {query.isError && <ErrorState message={query.error.message} retry={() => void query.refetch()} />}
        {!query.isLoading && !query.isError && teams.length === 0 && <EmptyState title="Sin equipos" description="Todavía no hay equipos para mostrar." />}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.equipo_id} className="flex items-center gap-4 p-5 transition hover:border-primary/30">
              <TeamMark name={team.equipo} />
              <div className="min-w-0 flex-1"><h2 className="truncate font-display text-2xl font-bold uppercase">{team.equipo}</h2><p className="mt-1 flex items-center gap-2 text-xs text-base-content/45"><Users className="size-3.5" /> {team.cant_jugadores} jugadores</p></div>
              <Button asChild size="sm" variant="outline"><Link to={`/equipos/${team.equipo_id}`}>Ver</Link></Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
