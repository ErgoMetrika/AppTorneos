// Portada pública para visitantes sin cuenta. Con sesión iniciada, la ruta ya redirige al panel.
// Todos los datos son reales (torneos visibles y planteles); la llave es un ejemplo marcado como tal.
import { useQuery } from '@tanstack/react-query'
import { parseISO } from 'date-fns'
import { useMemo } from 'react'

import { Audiences } from '@/components/landing/audiences'
import { ClosingCta } from '@/components/landing/closing-cta'
import { ExampleBracket } from '@/components/landing/example-bracket'
import { Faq } from '@/components/landing/faq'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { OpenTournaments, type PlatformNumbers } from '@/components/landing/open-tournaments'
import { getTeams, getTournaments } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import type { TorneoListado } from '@/types/domain'

// Cuántas tarjetas de torneo se muestran en la portada
const MAX_CARDS = 3

const dayStart = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.getTime()
}

// Próximo torneo: entre los de inscripción o en curso, el de fecha más cercana a hoy
// (primero los que vienen; si todos ya empezaron, el más reciente)
function pickNext(tournaments: TorneoListado[]) {
  const today = dayStart()
  const active = tournaments.filter((item) => item.estado !== 'finalizado')
  const time = (item: TorneoListado) => parseISO(item.fecha).getTime()
  const upcoming = active.filter((item) => time(item) >= today).sort((a, b) => time(a) - time(b))
  if (upcoming.length > 0) return upcoming[0]
  return [...active].sort((a, b) => time(b) - time(a))[0]
}

// Para las tarjetas: primero los de inscripción, después los en curso; dentro de cada grupo, por fecha
function pickCards(tournaments: TorneoListado[]) {
  const rank = (item: TorneoListado) => (item.estado === 'inscripcion' ? 0 : 1)
  return tournaments
    .filter((item) => item.estado !== 'finalizado')
    .sort((a, b) => rank(a) - rank(b) || parseISO(a.fecha).getTime() - parseISO(b.fecha).getTime())
    .slice(0, MAX_CARDS)
}

export function HomePage() {
  const tournamentsQuery = useQuery({ queryKey: ['tournaments'], queryFn: getTournaments })
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: getTeams })

  const tournaments = useMemo(() => tournamentsQuery.data ?? [], [tournamentsQuery.data])
  const nextTournament = useMemo(() => pickNext(tournaments), [tournaments])
  const cards = useMemo(() => pickCards(tournaments), [tournaments])

  // Números: si una consulta falla, ese número queda sin dato ("—") en lugar de inventar un valor
  const numbers: PlatformNumbers = {
    openTournaments: tournamentsQuery.data ? tournamentsQuery.data.filter((item) => item.estado === 'inscripcion').length : null,
    teams: teamsQuery.data ? teamsQuery.data.length : null,
    players: teamsQuery.data ? teamsQuery.data.reduce((total, team) => total + (team.cant_jugadores ?? 0), 0) : null,
  }

  return (
    <div className="overflow-x-clip">
      <Hero nextTournament={nextTournament} loading={tournamentsQuery.isLoading} failed={tournamentsQuery.isError} />
      <HowItWorks />
      <OpenTournaments
        tournaments={cards}
        loading={tournamentsQuery.isLoading}
        error={tournamentsQuery.isError ? getErrorMessage(tournamentsQuery.error) : null}
        retry={() => void tournamentsQuery.refetch()}
        numbers={numbers}
        numbersLoading={tournamentsQuery.isLoading || teamsQuery.isLoading}
        numbersFailed={tournamentsQuery.isError || teamsQuery.isError}
      />
      <ExampleBracket />
      <Audiences />
      <Faq />
      <ClosingCta />
    </div>
  )
}
