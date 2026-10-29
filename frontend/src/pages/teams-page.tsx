import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { CreateTeamDialog } from '@/components/admin/create-team-dialog'
import { TeamMark } from '@/components/shared/team-mark'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { TeamMiniFormation } from '@/components/team/team-mini-formation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Jersey } from '@/components/visuals/art'
import { TEAM_COLORS, teamColorKey } from '@/components/visuals/palette'
import { useAuth } from '@/context/auth-context'
import { getTeamCodes, getTeams } from '@/lib/api'

// Mínimo de referencia para la mini formación: los 5 que salen a la cancha en fútbol 5
const MIN_PLAYERS = 5

// Tarjeta de un equipo: escudo y camiseta con su color, nombre y plantel como mini formación
function TeamListCard({ name, players, code, to }: { name: string; players: number; code?: string; to: string }) {
  const c = TEAM_COLORS[teamColorKey(name)]
  const missing = Math.max(MIN_PLAYERS - players, 0)
  return (
    <article
      className="flex min-w-0 flex-col gap-4 rounded-[18px] border p-5 shadow-[0_14px_34px_rgba(0,0,0,0.38)] transition duration-200 hover:shadow-[0_18px_40px_rgba(0,0,0,0.45)] motion-safe:hover:-translate-y-1 sm:p-6"
      style={{ borderColor: `${c.base}47`, background: `radial-gradient(circle at 20% 15%, ${c.base}24, #0b1b12 60%)` }}
    >
      <div className="flex items-center justify-between gap-3">
        <TeamMark name={name} label={`Escudo de ${name}`} className="h-[5.25rem] w-[4.5rem]" />
        <Jersey name={name} label={`Camiseta de ${name}`} className="size-20 shrink-0 sm:size-24" />
      </div>
      <h2 className="truncate font-display text-4xl font-extrabold uppercase leading-none">{name}</h2>
      <div className="flex items-center gap-3.5 border-t border-base-content/10 pt-4">
        <TeamMiniFormation name={name} players={players} minimum={MIN_PLAYERS} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">{players} {players === 1 ? 'jugador' : 'jugadores'}</p>
          <p className="mt-0.5 text-[13px] text-base-content/65">{missing > 0 ? `Faltan ${missing} para llegar a ${MIN_PLAYERS}` : 'Un punto por jugador'}</p>
          {code && <p className="mt-0.5 text-[13px] text-base-content/65">Código <span className="font-mono font-bold tracking-widest text-primary">{code}</span></p>}
        </div>
        <Button asChild size="sm" variant="outline"><Link to={to} aria-label={`Ver ${name}`}>Ver</Link></Button>
      </div>
    </article>
  )
}

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
          <p className="mt-3 max-w-2xl text-sm text-base-content/65">Cada equipo tiene su escudo y su camiseta, con un color propio que sale de su nombre.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row sm:items-center">{inApp && <CreateTeamDialog />}<div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3.5 size-4 text-base-content/35" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar equipo..." aria-label="Buscar equipo" className="pl-10" /></div></div>
      </div>
      <div className="mt-10">
        {query.isLoading && <LoadingState label="Cargando equipos" />}
        {query.isError && <ErrorState message={query.error.message} retry={() => void query.refetch()} />}
        {!query.isLoading && !query.isError && teams.length === 0 && <EmptyState title="Sin equipos" description="Todavía no hay equipos para mostrar." />}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <TeamListCard key={team.equipo_id} name={team.equipo} players={team.cant_jugadores} code={codesQuery.data?.get(team.equipo_id)} to={`${inApp ? '/app' : ''}/equipos/${team.equipo_id}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
