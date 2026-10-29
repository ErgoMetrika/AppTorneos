// Pantalla del administrador general: Gestión de torneos.
// Lista todos los torneos con filtros por estado, buscador y las acciones de cada uno.
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { AdminTournamentRow } from '@/components/admin/tournaments/admin-tournament-row'
import { BTN_PRIMARY } from '@/components/admin/tournaments/admin-styles'
import { FILTROS, ORDEN_ESTADO, type FiltroEstado } from '@/components/admin/tournaments/tournament-admin-utils'
import { TournamentsEmpty } from '@/components/admin/tournaments/tournaments-empty'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { getTournaments } from '@/lib/api'
import { cn, getErrorMessage } from '@/lib/utils'

// Color del contador de cada filtro (mismo código de color que la banda de estado)
const COUNT_COLOR: Record<FiltroEstado, string> = {
  todos: 'bg-[#06110b] text-[#f4f8f5]',
  inscripcion: 'bg-[#35f46e] text-[#06110b]',
  en_curso: 'bg-[#f2c94c] text-[#06110b]',
  finalizado: 'bg-[#b7c8bd] text-[#06110b]',
}

// Sin tildes ni mayúsculas, para que "fútbol" encuentre "futbol"
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function AdminTournamentsPage() {
  const [filter, setFilter] = useState<FiltroEstado>('todos')
  const [search, setSearch] = useState('')
  const query = useQuery({ queryKey: ['tournaments'], queryFn: getTournaments })

  const sorted = useMemo(
    // getTournaments ya viene por fecha; el orden estable deja primero los que necesitan atención
    () => [...(query.data ?? [])].sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]),
    [query.data],
  )

  const counts = useMemo(() => {
    const result: Record<FiltroEstado, number> = { todos: sorted.length, inscripcion: 0, en_curso: 0, finalizado: 0 }
    for (const tournament of sorted) result[tournament.estado] += 1
    return result
  }, [sorted])

  const visible = useMemo(() => {
    const term = normalize(search.trim())
    return sorted.filter((tournament) => {
      if (filter !== 'todos' && tournament.estado !== filter) return false
      if (!term) return true
      return normalize(`${tournament.nombre} ${tournament.lugar ?? ''}`).includes(term)
    })
  }, [sorted, filter, search])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#ffc94a]">
            <span className="h-[3px] w-[18px] rounded-sm bg-[#ffc94a]" aria-hidden="true" />
            Gestión
          </p>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.9] sm:text-7xl">Torneos</h1>
          <p className="mt-1 text-base text-[#b7c8bd]">Creá, editá y seguí cada torneo desde acá.</p>
        </div>
        <Link to="/app/admin/torneos/nuevo" className={cn(BTN_PRIMARY, 'min-h-[54px] px-[26px] text-base max-sm:w-full')}>
          <Plus aria-hidden="true" />
          Nuevo torneo
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
          {FILTROS.map((item) => {
            const active = filter === item.value
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(item.value)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3]',
                  active
                    ? 'border-[#f4f8f5] bg-[#f4f8f5] font-bold text-[#06110b]'
                    : 'border-[#f4f8f5]/16 bg-transparent font-semibold text-[#b7c8bd] hover:border-[#35f46e]/50 hover:text-[#f4f8f5]',
                )}
              >
                {item.label}
                <span className={cn('inline-grid h-[26px] min-w-[26px] place-items-center rounded-full px-2 font-mono text-xs font-bold', COUNT_COLOR[item.value])}>
                  {query.isLoading ? '–' : counts[item.value]}
                </span>
              </button>
            )
          })}
        </div>
        <label className="flex h-[46px] w-full items-center gap-2.5 rounded-xl border border-[#f4f8f5]/14 bg-[#0b1b12] px-3.5 text-[#8fa596] focus-within:border-[#35f46e] sm:ml-auto sm:w-80">
          <Search className="size-[18px] shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar torneo"
            aria-label="Buscar torneo por nombre o lugar"
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#f4f8f5] outline-none placeholder:text-[#8fa596]"
          />
        </label>
      </div>

      {query.isLoading ? (
        <LoadingState label="Cargando torneos" />
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} retry={() => void query.refetch()} />
      ) : (
        <>
          <p className="sr-only" role="status" aria-live="polite">
            {visible.length === 1 ? 'Se muestra 1 torneo' : `Se muestran ${visible.length} torneos`}
          </p>
          {visible.length === 0 ? (
            <TournamentsEmpty filter={filter} search={search} onShowAll={() => setFilter('todos')} onClearSearch={() => setSearch('')} />
          ) : (
            <section aria-label="Lista de torneos" className="flex flex-col gap-3.5">
              {visible.map((tournament, index) => (
                <AdminTournamentRow key={tournament.id} tournament={tournament} index={index} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
