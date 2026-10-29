import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { CreateTeamDialog } from '@/components/admin/create-team-dialog'
import { TeamMark } from '@/components/shared/team-mark'
import { Jersey } from '@/components/visuals/art'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-context'
import { getTeamCodes, getTeams } from '@/lib/api'

export function TeamsPage() {
  const [search, setSearch] = useState('')
  const location = useLocation()
  const inApp = location.pathname.startsWith('/app')
  const { isAdmin } = useAuth()

  const query = useQuery({ queryKey: ['teams'], queryFn: getTeams })
  // El admin ve el código de cada equipo
  const codesQuery = useQuery({ queryKey: ['team-codes'], queryFn: getTeamCodes, enabled: isAdmin && inApp })
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
          <p className="mt-3 max-w-2xl text-sm text-base-content/55">Cada equipo se identifica con una insignia creada a partir de sus iniciales.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row sm:items-center">{inApp && <CreateTeamDialog />}<div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3.5 size-4 text-base-content/35" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar equipo..." className="pl-10" /></div></div>
      </div>
      <div className="mt-10">
        {query.isLoading && <LoadingState label="Cargando equipos" />}
        {query.isError && <ErrorState message={query.error.message} retry={() => void query.refetch()} />}
        {!query.isLoading && !query.isError && teams.length === 0 && <EmptyState title="Sin equipos" description="Todavía no hay equipos para mostrar." />}
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.equipo_id} className="group relative flex items-center gap-4 overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_14px_30px_rgba(0,0,0,0.35)]">
              <Jersey name={team.equipo} className="pointer-events-none absolute -bottom-6 right-16 size-28 opacity-[0.14] transition group-hover:opacity-25" />
              <TeamMark name={team.equipo} label={`Escudo de ${team.equipo}`} className="h-[4.5rem] w-16" />
              <div className="min-w-0 flex-1"><h2 className="truncate font-display text-2xl font-bold uppercase">{team.equipo}</h2><p className="mt-1 flex items-center gap-2 text-xs text-base-content/45"><Users className="size-3.5" /> {team.cant_jugadores} jugadores</p>{codesQuery.data?.get(team.equipo_id) && <p className="mt-1 text-xs text-base-content/45">Código <span className="font-mono font-bold tracking-widest text-primary">{codesQuery.data.get(team.equipo_id)}</span></p>}</div>
              <Button asChild size="sm" variant="outline"><Link to={`${inApp ? '/app' : ''}/equipos/${team.equipo_id}`}>Ver</Link></Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
