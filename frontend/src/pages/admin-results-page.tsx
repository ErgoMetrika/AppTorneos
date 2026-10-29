// Pantalla del administrador general: Cargar resultados.
// Elegís un torneo en curso, un partido de la llave, cargás goles (y penales si empatan) y al guardar
// la base (cargar_resultado) valida todo y pasa al ganador al partido siguiente.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, CircleAlert, Lock, Network } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EMPTY_DRAFT, draftWinner, groupRounds, isTied, matchName, matchStatus, roundName, type MatchRow, type ScoreDraft } from '@/components/admin/results/bracket-utils'
import { ChampionCelebration } from '@/components/admin/results/champion-celebration'
import { MatchResultPanel } from '@/components/admin/results/match-result-panel'
import { ResultsBracket, type AdvancePreview } from '@/components/admin/results/results-bracket'
import { ResultsSteps, type StepState } from '@/components/admin/results/results-steps'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { TeamCrest } from '@/components/visuals/art'
import { getBracket, getTournaments, loadMatchResult } from '@/lib/api'
import { cn, getErrorMessage } from '@/lib/utils'
import type { TorneoListado } from '@/types/domain'

const CARD = 'rounded-[20px] border border-[#f4f8f5]/10 bg-[#0b1b12] shadow-[0_14px_34px_rgba(0,0,0,0.38)]'
const CHIP = 'inline-flex min-h-[46px] items-center gap-2 rounded-full border px-4 text-left text-sm font-semibold transition'

interface SavedInfo { matchId: number; name: string; winner: string; detail: string; nextName: string | null }

const backLink = (
  <Link to="/app/admin/torneos" className="inline-flex items-center gap-2 self-start text-[13px] font-bold uppercase tracking-[0.06em] text-[#b7c8bd] transition hover:text-primary">
    <ChevronLeft className="size-4" aria-hidden="true" /> Volver a torneos
  </Link>
)

// Llave y carga de un torneo. Se monta de nuevo al cambiar de torneo, así arranca sin partido elegido.
function TournamentResults({ tournament, onFinished }: { tournament: TorneoListado; onFinished: (id: number) => void }) {
  const queryClient = useQueryClient()
  const bracketQuery = useQuery({ queryKey: ['bracket', tournament.id], queryFn: () => getBracket(tournament.id) })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState<ScoreDraft>(EMPTY_DRAFT)
  const [touched, setTouched] = useState(false)
  const [saved, setSaved] = useState<SavedInfo | null>(null)
  const [champion, setChampion] = useState<string | null>(null)

  const matches = useMemo(() => (bracketQuery.data ?? []) as MatchRow[], [bracketQuery.data])
  const rounds = useMemo(() => groupRounds(matches), [matches])
  const lastRound = rounds[rounds.length - 1]?.round ?? 1
  const playable = matches.filter((match) => matchStatus(match) === 'jugable')
  // Si al refrescar el partido ya no se puede cargar (p. ej. recién guardado), se suelta la selección
  const selected = playable.find((match) => match.id === selectedId) ?? null
  const isFinal = selected ? selected.ronda === lastRound && !selected.partido_siguiente_id : false

  const winnerSide = selected ? draftWinner(draft) : null
  const winnerName = winnerSide === 'local' ? selected?.local ?? null : winnerSide === 'visitante' ? selected?.visitante ?? null : null
  const tied = isTied(draft)

  // Próximo partido del ganador (para dibujarlo en vivo en la llave)
  const nextMatch = selected?.partido_siguiente_id ? matches.find((match) => match.id === selected.partido_siguiente_id) ?? null : null
  const preview: AdvancePreview | null = selected && winnerName && nextMatch
    ? { matchId: nextMatch.id, side: selected.lado_siguiente ?? (selected.llave % 2 === 1 ? 'local' : 'visitante'), name: winnerName }
    : null

  const selectMatch = (id: number) => {
    setSelectedId(id)
    setDraft(EMPTY_DRAFT)
    setTouched(false)
    setSaved(null)
  }

  const mutation = useMutation({
    mutationFn: (input: { match: MatchRow; draft: ScoreDraft }) => {
      const matchTied = isTied(input.draft)
      return loadMatchResult({
        partidoId: input.match.id,
        golesLocal: input.draft.golesLocal,
        golesVisitante: input.draft.golesVisitante,
        penalesLocal: matchTied ? input.draft.penalesLocal : null,
        penalesVisitante: matchTied ? input.draft.penalesVisitante : null,
      })
    },
    onSuccess: () => {
      toast.success('¡Resultado cargado!')
      void queryClient.invalidateQueries({ queryKey: ['bracket', tournament.id] })
      void queryClient.invalidateQueries({ queryKey: ['tournaments'] })
      void queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] })
      void queryClient.invalidateQueries({ queryKey: ['team-tournaments'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const save = async () => {
    if (!selected || !winnerName) return false
    try {
      await mutation.mutateAsync({ match: selected, draft })
    } catch {
      return false
    }
    const name = matchName(selected, lastRound)
    const high = tied ? Math.max(draft.penalesLocal, draft.penalesVisitante) : Math.max(draft.golesLocal, draft.golesVisitante)
    const low = tied ? Math.min(draft.penalesLocal, draft.penalesVisitante) : Math.min(draft.golesLocal, draft.golesVisitante)
    setSaved({
      matchId: selected.id,
      name,
      winner: winnerName,
      detail: `Ganó ${high} a ${low}${tied ? ' por penales' : ''}`,
      nextName: nextMatch ? matchName(nextMatch, lastRound) : null,
    })
    if (isFinal) {
      setChampion(winnerName)
      onFinished(tournament.id)
    }
    setSelectedId(null)
    return true
  }

  // Estado de cada paso de arriba
  // Recién guardado (y sin otro partido elegido): todo listo. Los penales solo cuentan si hay empate.
  const steps: StepState[] = saved && !selected
    ? ['listo', 'listo', 'listo', 'listo', 'listo']
    : [
        selected ? 'listo' : 'ahora',
        selected ? (touched ? 'listo' : 'ahora') : 'pendiente',
        selected && touched ? (tied ? (winnerName ? 'listo' : 'ahora') : 'no-hace-falta') : 'opcional',
        selected && touched && winnerName ? 'ahora' : 'pendiente',
        'pendiente',
      ]

  // Primera ronda que todavía espera equipos (para el aviso de la fila de partidos)
  const lockedRound = rounds.find(({ list }) => list.some((match) => matchStatus(match) === 'bloqueado'))

  if (bracketQuery.isLoading) return <LoadingState label="Cargando llave" />
  if (bracketQuery.isError) return <ErrorState message={getErrorMessage(bracketQuery.error)} retry={() => void bracketQuery.refetch()} />
  if (!matches.length) return <EmptyState title="Llave pendiente" description="Este torneo todavía no tiene la llave generada. Generala desde el detalle del torneo." art="cancha" />

  return (
    <>
      {champion && <ChampionCelebration champion={champion} tournamentName={tournament.nombre} tournamentId={tournament.id} onClose={() => setChampion(null)} />}

      <ResultsSteps states={steps} />

      {/* La llave a lo ancho */}
      <section aria-labelledby="titulo-llave" className={cn(CARD, 'flex min-w-0 flex-col gap-5 p-5 sm:px-7 sm:py-[26px]')} style={{ background: 'radial-gradient(circle at 82% 50%, rgba(242,201,76,0.12), transparent 35%), #0b1b12' }}>
        <div className="flex items-center gap-3">
          <Network className="size-[22px] text-primary" aria-hidden="true" />
          <h2 id="titulo-llave" className="font-display text-[30px] font-extrabold uppercase leading-none">La llave</h2>
        </div>

        <div role="group" aria-label="Elegí el partido" className="flex flex-wrap gap-2.5">
          {playable.map((match) => {
            const active = match.id === selected?.id
            return (
              <button
                key={match.id}
                type="button"
                aria-pressed={active}
                onClick={() => selectMatch(match.id)}
                className={cn(CHIP, active ? 'border-[#f4f8f5] bg-[#f4f8f5] font-bold text-[#06110b]' : 'border-[#f4f8f5]/16 text-[#b7c8bd] hover:border-primary/50 hover:text-[#f4f8f5]')}
              >
                <span className="break-words">{matchName(match, lastRound)} · {match.local} vs {match.visitante}</span>
                {!active && (
                  <span className="inline-flex h-[26px] shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full border border-[#ffc94a]/32 bg-[#ffc94a]/14 px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[#ffc94a]">
                    <span className="size-[7px] rounded-full bg-[#ffc94a]" aria-hidden="true" />Por cargar
                  </span>
                )}
              </button>
            )
          })}
          {lockedRound && (
            <button type="button" disabled className={cn(CHIP, 'cursor-not-allowed border-[#f4f8f5]/16 text-[#b7c8bd] opacity-60')}>
              <Lock className="size-4 shrink-0" aria-hidden="true" />
              {roundName(lockedRound.round, lastRound)} · se habilita al terminar {roundName(lockedRound.round - 1, lastRound).toLowerCase()}
            </button>
          )}
          {!playable.length && (
            <p className="flex items-center gap-2 text-sm text-[#b7c8bd]">
              <Check className="size-5 text-primary" aria-hidden="true" />
              {lockedRound ? 'No hay partidos listos para cargar.' : 'No quedan partidos por cargar: la llave está completa.'}
            </p>
          )}
        </div>

        <ResultsBracket matches={matches} selectedId={selected?.id ?? null} preview={preview} onSelect={selectMatch} />

        <p className="flex items-center gap-2.5 text-sm text-[#b7c8bd]">
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-primary" />
          Los partidos con borde ámbar están listos para cargar; los punteados esperan a sus equipos.
        </p>
      </section>

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        {selected
          ? (
            <MatchResultPanel
              key={selected.id}
              match={selected}
              name={matchName(selected, lastRound)}
              isFinal={isFinal}
              draft={draft}
              onDraftChange={(next) => { setDraft(next); setTouched(true) }}
              pending={mutation.isPending}
              onSave={save}
              onCancel={() => setSelectedId(null)}
            />
          )
          : (
            <section className={cn(CARD, 'grid min-h-64 place-items-center border-dashed p-8 text-center')}>
              <div className="max-w-sm">
                <p className="font-display text-3xl font-black uppercase leading-none">Elegí un partido</p>
                <p className="mt-2 text-sm text-[#b7c8bd]">
                  {playable.length ? 'Tocá un partido con borde ámbar en la llave para cargar los goles.' : 'Cuando haya un partido con los dos equipos definidos, lo vas a poder cargar acá.'}
                </p>
              </div>
            </section>
          )}

        {/* Paso 5: qué pasa al guardar */}
        <section aria-labelledby="titulo-despues" className={cn(CARD, 'flex min-w-0 flex-col gap-[18px] p-6 sm:px-7')}>
          <div className="flex items-center gap-2.5">
            <span className={cn('inline-grid size-[22px] place-items-center rounded-full border-2 font-mono text-[11px] font-bold', saved ? 'border-primary bg-primary text-[#06110b]' : 'border-[#f4f8f5]/40')}>5</span>
            <h2 id="titulo-despues" className="font-display text-[30px] font-extrabold uppercase leading-none">Al guardar</h2>
          </div>
          {saved && (
            <div className="anim-pop flex items-center gap-4 rounded-[18px] border border-primary/35 p-5" style={{ background: 'radial-gradient(circle at 80% 50%, rgba(53,244,110,0.18), #06110b 70%)' }}>
              <TeamCrest name={saved.winner} className="h-[64px] w-[55px] shrink-0" />
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{saved.nextName ? `Avanza a ${saved.nextName.toLowerCase()}` : 'Campeón'}</p>
                <p className="mt-1 break-words font-display text-[30px] font-black uppercase leading-none">{saved.winner}</p>
                <p className="mt-1 text-[13px] text-[#b7c8bd]">{saved.name} · {saved.detail}</p>
              </div>
            </div>
          )}
          <ul className="flex flex-col gap-3 text-sm leading-normal">
            <li className="flex gap-2.5"><Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />El partido pasa a jugado y la llave se actualiza para todos los jugadores.</li>
            <li className="flex gap-2.5"><Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />El ganador pasa solo al partido siguiente; cuando los dos lados están definidos, ese partido se habilita.</li>
            <li className="flex gap-2.5"><Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />Al guardar la final, el torneo queda finalizado con su campeón.</li>
            <li className="flex gap-2.5"><CircleAlert className="mt-0.5 size-5 shrink-0 text-[#ffc94a]" aria-hidden="true" />Si empatan, se define por penales y no pueden quedar empatados.</li>
          </ul>
        </section>
      </div>
    </>
  )
}

export function AdminResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tournamentsQuery = useQuery({ queryKey: ['tournaments'], queryFn: getTournaments })
  // Torneo recién terminado en esta pantalla: se mantiene a la vista para mostrar al campeón
  const [finishedId, setFinishedId] = useState<number | null>(null)

  const options = useMemo(
    () => (tournamentsQuery.data ?? []).filter((tournament) => tournament.estado === 'en_curso' || tournament.id === finishedId),
    [tournamentsQuery.data, finishedId],
  )
  const requestedId = Number(searchParams.get('torneo'))
  const requested = searchParams.get('torneo') ? options.find((tournament) => tournament.id === requestedId) ?? null : null
  // Con ?torneo=ID se preselecciona; si hay uno solo en curso, se elige solo
  const current = requested ?? (options.length === 1 ? options[0] : null)
  const invalidRequest = Boolean(searchParams.get('torneo')) && !requested && !tournamentsQuery.isLoading

  const chooseTournament = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('torneo', value)
    else next.delete('torneo')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="anim-page flex min-w-0 flex-col gap-8">
      <header className="flex flex-col gap-3.5">
        {backLink}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#ffc94a]">
              <span aria-hidden="true" className="h-[3px] w-[18px] rounded-sm bg-[#ffc94a]" />
              {current ? `${current.nombre} · Fútbol ${current.tipo_futbol} · ${current.inscriptos}/${current.max_equipos}` : 'Modo administrador'}
            </p>
            <h1 className="font-display text-5xl font-black uppercase leading-[0.9] sm:text-[72px]">Cargar resultados</h1>
            <p className="mt-1 text-base text-[#b7c8bd]">Elegí el partido, cargá los goles y guardá: el ganador avanza solo en la llave.</p>
          </div>

          {options.length > 0 && (
            <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:min-w-[300px]">
              <label htmlFor="torneo-resultados" className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#b7c8bd]">Torneo en curso</label>
              <select
                id="torneo-resultados"
                value={current ? String(current.id) : ''}
                onChange={(event) => chooseTournament(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#f4f8f5]/20 bg-[#10271a] px-4 text-[15px] font-semibold text-[#f4f8f5] outline-none transition hover:border-primary/50 focus-visible:border-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3]"
              >
                {!current && <option value="">Elegí un torneo</option>}
                {options.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.nombre}{tournament.estado === 'finalizado' ? ' (finalizado)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {tournamentsQuery.isLoading && <LoadingState label="Cargando torneos" />}
      {tournamentsQuery.isError && <ErrorState message={getErrorMessage(tournamentsQuery.error)} retry={() => void tournamentsQuery.refetch()} />}

      {invalidRequest && options.length > 0 && (
        <p role="alert" className="flex items-start gap-2.5 rounded-xl border border-[#ffc94a]/35 bg-[#ffc94a]/8 p-4 text-sm font-semibold text-[#ffc94a]">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          El torneo que pediste no está en curso. Elegí uno de la lista.
        </p>
      )}

      {tournamentsQuery.data && options.length === 0 && (
        <EmptyState
          title="No hay torneos en curso"
          description="Los resultados se cargan cuando un torneo tiene la llave generada y está en juego."
          art="trofeo"
          action={<Link to="/app/admin/torneos" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-extrabold text-[#06110b] transition hover:bg-[#7dffa3]">Ir a torneos</Link>}
        />
      )}

      {options.length > 0 && !current && !invalidRequest && (
        <section className={cn(CARD, 'grid min-h-48 place-items-center border-dashed p-8 text-center')}>
          <div className="max-w-sm">
            <p className="font-display text-3xl font-black uppercase leading-none">Elegí un torneo</p>
            <p className="mt-2 text-sm text-[#b7c8bd]">Hay {options.length} torneos en curso. Elegí cuál querés cargar en el selector de arriba.</p>
          </div>
        </section>
      )}

      {current && <TournamentResults key={current.id} tournament={current} onFinished={setFinishedId} />}
    </div>
  )
}
