// Jugadores: todos los planteles juntos, con contadores, buscador y filtros por posición y equipo.
// El admin además agrega, edita y quita jugadores; el resto solo consulta.
import { useQueries, useQuery } from '@tanstack/react-query'
import { Search, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PlayerFormDialog } from '@/components/admin/player-form-dialog'
import { PlayerRow } from '@/components/admin/players/player-row'
import { PlayersCounters } from '@/components/admin/players/players-counters'
import { PlayersEmpty } from '@/components/admin/players/players-empty'
import { POSITIONS, POSITION_COLOR, normalize, type FiltroPosicion } from '@/components/admin/players/players-utils'
import { BTN_PRIMARY } from '@/components/admin/tournaments/admin-styles'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { useAuth } from '@/context/auth-context'
import { getPlayers, getTeam } from '@/lib/api'
import { cn, getErrorMessage, positionLabel } from '@/lib/utils'
import type { PosicionJugador } from '@/types/domain'

const PILL = 'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3]'
const PILL_ON = 'border-[#f4f8f5] bg-[#f4f8f5] font-bold text-[#06110b]'
const PILL_OFF = 'border-[#f4f8f5]/16 bg-transparent font-semibold text-[#b7c8bd] hover:border-[#35f46e]/50 hover:text-[#f4f8f5]'
const FIELD = 'flex h-[46px] items-center gap-2.5 rounded-xl border border-[#f4f8f5]/14 bg-[#0b1b12] px-3.5 text-[#8fa596] focus-within:border-[#35f46e]'

export function PlayersPage() {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<FiltroPosicion>('todas')
  // 0 = todos los equipos
  const [teamId, setTeamId] = useState(0)
  const { isAdmin } = useAuth()
  const query = useQuery({ queryKey: ['players'], queryFn: getPlayers })
  const all = useMemo(() => query.data ?? [], [query.data])

  // Equipos que tienen al menos un jugador, ordenados por nombre (para el filtro y el contador)
  const teams = useMemo(() => {
    const map = new Map<number, string>()
    for (const player of all) map.set(player.equipo_id, player.equipo)
    return [...map.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [all])

  // getPlayers no trae quién administra cada equipo: lo sacamos del plantel de cada equipo
  // (misma consulta y clave que la ficha del equipo, así se comparte la caché)
  const adminIds = useQueries({
    queries: teams.map((team) => ({ queryKey: ['team', team.id], queryFn: () => getTeam(team.id) })),
    combine: (results) => new Set(results.flatMap((result) => result.data?.jugadores.filter((player) => player.es_admin_del_equipo).map((player) => player.id) ?? [])),
  })

  const byPosition = useMemo(() => {
    const result: Record<PosicionJugador, number> = { arquero: 0, defensor: 0, mediocampista: 0, delantero: 0 }
    for (const player of all) result[player.posicion] += 1
    return result
  }, [all])

  // Si el equipo elegido se quedó sin jugadores, el filtro vuelve a "todos"
  const activeTeam = teams.some((team) => team.id === teamId) ? teamId : 0

  const visible = useMemo(() => {
    const term = normalize(search.trim())
    return all.filter((player) => {
      if (position !== 'todas' && player.posicion !== position) return false
      if (activeTeam && player.equipo_id !== activeTeam) return false
      return !term || normalize(`${player.nombre} ${player.equipo}`).includes(term)
    })
  }, [all, search, position, activeTeam])

  const filtering = search.trim().length > 0 || position !== 'todas' || activeTeam !== 0
  const clearFilters = () => {
    setSearch('')
    setPosition('todas')
    setTeamId(0)
  }

  const addButton = (
    <PlayerFormDialog
      trigger={
        <button type="button" className={cn(BTN_PRIMARY, 'min-h-[54px] px-[26px] text-base max-sm:w-full')}>
          <UserPlus aria-hidden="true" />
          Agregar jugador
        </button>
      }
    />
  )

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#ffc94a]">
            <span className="h-[3px] w-[18px] rounded-sm bg-[#ffc94a]" aria-hidden="true" />
            {isAdmin ? 'Gestión de planteles' : 'Planteles registrados'}
          </p>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.9] sm:text-7xl">Jugadores</h1>
          <p className="mt-1 text-base text-[#b7c8bd]">
            {isAdmin ? 'Asigná usuarios registrados a sus equipos y consultá cada ficha.' : 'Consultá los jugadores y el equipo al que pertenecen.'}
          </p>
        </div>
        {isAdmin && addButton}
      </header>

      {!query.isError && <PlayersCounters total={all.length} byPosition={byPosition} teams={teams.length} loading={query.isLoading} />}

      {/* Filtros: posición (con cuántos hay), equipo y buscador */}
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filtrar por posición" className="flex flex-wrap gap-2">
          {(['todas', ...POSITIONS] as FiltroPosicion[]).map((value) => {
            const active = position === value
            const count = value === 'todas' ? all.length : byPosition[value]
            return (
              <button key={value} type="button" aria-pressed={active} onClick={() => setPosition(value)} className={cn(PILL, active ? PILL_ON : PILL_OFF)}>
                {value !== 'todas' && <span className="size-[7px] rounded-full" style={{ backgroundColor: POSITION_COLOR[value] }} aria-hidden="true" />}
                {value === 'todas' ? 'Todas' : positionLabel[value]}
                <span className={cn('inline-grid h-[26px] min-w-[26px] place-items-center rounded-full px-2 font-mono text-xs font-bold', active ? 'bg-[#06110b] text-[#f4f8f5]' : 'bg-[#f4f8f5]/10 text-[#f4f8f5]')}>
                  {query.isLoading ? '–' : count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row lg:ml-auto lg:w-auto">
          <label className={cn(FIELD, 'min-w-0 sm:w-56')}>
            <span className="sr-only">Filtrar por equipo</span>
            <select
              value={activeTeam}
              onChange={(event) => setTeamId(Number(event.target.value))}
              disabled={teams.length === 0}
              className="min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent text-[15px] text-[#f4f8f5] outline-none disabled:cursor-not-allowed disabled:text-[#8fa596] [&>option]:bg-[#0b1b12]"
            >
              <option value={0}>Todos los equipos</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.nombre}</option>)}
            </select>
          </label>
          <label className={cn(FIELD, 'min-w-0 sm:w-72')}>
            <Search className="size-[18px] shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar jugador o equipo"
              aria-label="Buscar jugador por nombre o equipo"
              className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#f4f8f5] outline-none placeholder:text-[#8fa596]"
            />
          </label>
        </div>
      </div>

      {query.isLoading ? (
        <LoadingState label="Cargando jugadores" />
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} retry={() => void query.refetch()} />
      ) : (
        <>
          <p className="sr-only" role="status" aria-live="polite">
            {visible.length === 1 ? 'Se muestra 1 jugador' : `Se muestran ${visible.length} jugadores`}
          </p>
          {visible.length === 0 ? (
            <PlayersEmpty filtering={filtering && all.length > 0} isAdmin={isAdmin} onClear={clearFilters} action={addButton} />
          ) : (
            <section aria-label="Lista de jugadores" className="flex flex-col gap-3.5">
              {visible.map((player, index) => (
                <PlayerRow key={player.id} player={player} index={index} isTeamAdmin={adminIds.has(player.id)} canManage={isAdmin} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
