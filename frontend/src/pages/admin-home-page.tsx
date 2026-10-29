// Inicio del administrador general (/app/admin): el admin cae acá al entrar al panel.
// Todo sale de la base: torneos (getTournaments), llaves (getBracket) y consultas (getContacts).
// Si una consulta falla, esa parte muestra su error y el resto de la pantalla sigue funcionando.
import { useQueries, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { ActionList, type LiveBracket } from '@/components/admin/home/action-list'
import { ChampionsCard, type ChampionEntry } from '@/components/admin/home/champions-card'
import { BTN_PRIMARY, bracketProgress, byDateAsc, byDateDesc, championOf } from '@/components/admin/home/home-data'
import { LiveTournamentCard, NoLiveTournamentCard } from '@/components/admin/home/live-tournament-card'
import { ContactsCard, QuickLinks } from '@/components/admin/home/side-cards'
import { StateCounters } from '@/components/admin/home/state-counters'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { useAuth } from '@/context/auth-context'
import { getBracket, getContacts, getTournaments } from '@/lib/api'
import { cn, getErrorMessage } from '@/lib/utils'

// Finales que se revisan para "Últimos campeones" (las más recientes) y cuántos se muestran
const FINALS_TO_CHECK = 5
const MAX_CHAMPIONS = 3

export function AdminHomePage() {
  const { profile } = useAuth()
  const firstName = profile?.nombre?.trim().split(/\s+/)[0]

  const tournamentsQuery = useQuery({ queryKey: ['tournaments'], queryFn: getTournaments })
  const contactsQuery = useQuery({ queryKey: ['contacts'], queryFn: getContacts })

  const tournaments = useMemo(() => tournamentsQuery.data ?? [], [tournamentsQuery.data])
  const live = useMemo(() => tournaments.filter((item) => item.estado === 'en_curso').sort(byDateAsc), [tournaments])
  const open = useMemo(() => tournaments.filter((item) => item.estado === 'inscripcion').sort(byDateAsc), [tournaments])
  const finished = useMemo(() => tournaments.filter((item) => item.estado === 'finalizado').sort(byDateDesc).slice(0, FINALS_TO_CHECK), [tournaments])

  // Una llave por torneo en curso (avance y partidos por cargar) y por final reciente (campeón).
  // Misma queryKey que el detalle del torneo: comparten caché y se invalidan juntas.
  const liveBrackets = useQueries({ queries: live.map((item) => ({ queryKey: ['bracket', item.id], queryFn: () => getBracket(item.id) })) })
  const finalBrackets = useQueries({ queries: finished.map((item) => ({ queryKey: ['bracket', item.id], queryFn: () => getBracket(item.id) })) })

  const liveState: LiveBracket[] = live.map((tournament, index) => {
    const query = liveBrackets[index]
    return { tournament, progress: query?.data ? bracketProgress(query.data) : null, loading: !!query?.isLoading, failed: !!query?.isError }
  })
  // Protagonista: el primer torneo en curso con partidos por cargar; si ninguno tiene, el primero
  const featuredIndex = Math.max(0, liveState.findIndex((item) => (item.progress?.toLoad ?? 0) > 0))
  const featured = liveState[featuredIndex]

  const champions: ChampionEntry[] = finished
    .map((tournament, index) => {
      const data = finalBrackets[index]?.data
      const champion = data ? championOf(data) : null
      return champion ? { tournament, champion: champion.name } : null
    })
    .filter((item): item is ChampionEntry => item !== null)
    .slice(0, MAX_CHAMPIONS)
  const finalsLoading = finalBrackets.some((query) => query.isLoading)
  const finalsFailed = finalBrackets.some((query) => query.isError)

  return (
    <div className="anim-page flex flex-col gap-8 text-[#f4f8f5]">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#ffc94a]">
            <span aria-hidden="true" className="h-[3px] w-[18px] rounded-sm bg-[#ffc94a]" />Panel del organizador
          </p>
          <h1 className="break-words font-display text-5xl font-black uppercase leading-[0.9] sm:text-[72px]">
            {firstName ? `Hola, ${firstName}` : 'Hola'}
          </h1>
          <p className="mt-1 text-base text-[#b7c8bd]">Esto es lo que necesita atención hoy en tus torneos.</p>
        </div>
        <Link to="/app/admin/torneos/nuevo" className={cn(BTN_PRIMARY, 'min-h-[54px] px-[26px] text-base')}>
          <Plus className="size-5" strokeWidth={2.6} aria-hidden="true" />Nuevo torneo
        </Link>
      </header>

      {tournamentsQuery.isLoading && <LoadingState label="Cargando tus torneos" />}
      {tournamentsQuery.isError && (
        <ErrorState message={`No pudimos cargar los torneos: ${getErrorMessage(tournamentsQuery.error)}`} retry={() => void tournamentsQuery.refetch()} />
      )}

      {tournamentsQuery.data && (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {featured ? (
              <LiveTournamentCard
                tournament={featured.tournament}
                bracket={{ progress: featured.progress, loading: featured.loading, failed: featured.failed, retry: () => void liveBrackets[featuredIndex]?.refetch() }}
              />
            ) : (
              <NoLiveTournamentCard openCount={open.length} />
            )}
            <ActionList live={liveState} open={open} />
          </div>

          <StateCounters tournaments={tournaments} />
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <ContactsCard
          count={contactsQuery.data ? contactsQuery.data.length : null}
          loading={contactsQuery.isLoading}
          failed={contactsQuery.isError}
          retry={() => void contactsQuery.refetch()}
        />
        <QuickLinks />
        {tournamentsQuery.data && (
          <ChampionsCard
            champions={champions}
            loading={finalsLoading}
            failed={finalsFailed}
            retry={() => { for (const query of finalBrackets) if (query.isError) void query.refetch() }}
            liveName={featured?.tournament.nombre}
          />
        )}
      </div>
    </div>
  )
}
