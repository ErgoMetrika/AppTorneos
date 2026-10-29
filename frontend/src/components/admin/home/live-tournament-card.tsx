// Tarjeta protagonista del Inicio: el torneo que se está jugando, con la copa, los escudos
// de los inscriptos y el avance de la llave ronda por ronda (todo sale de getBracket).
import { Check, ClipboardPen, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PitchLines, TeamCrest, Trophy } from '@/components/visuals/art'
import { cn, formatDate } from '@/lib/utils'
import type { TorneoListado } from '@/types/domain'

import { BTN_AMBER, BTN_PRIMARY, CARD, FOCUS, LABEL, plural, type BracketProgress } from './home-data'

// Escudos visibles en la tarjeta; el resto se resume en "+N"
const MAX_CRESTS = 8

const CHIP = 'inline-flex h-[26px] items-center gap-[7px] whitespace-nowrap rounded-full border px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em]'

export interface BracketState {
  progress: BracketProgress | null
  loading: boolean
  failed: boolean
  retry: () => void
}

export function LiveTournamentCard({ tournament, bracket }: { tournament: TorneoListado; bracket: BracketState }) {
  const { progress } = bracket
  const crests = tournament.equipos_inscriptos.slice(0, MAX_CRESTS)
  const hiddenCrests = tournament.equipos_inscriptos.length - crests.length
  const details = [`Fútbol ${tournament.tipo_futbol}`, tournament.lugar, formatDate(tournament.fecha), `${tournament.inscriptos}/${tournament.max_equipos} equipos`].filter(Boolean).join(' · ')

  return (
    <section
      aria-labelledby="inicio-en-juego"
      className={cn(
        CARD,
        'anim-stagger relative flex flex-col-reverse items-start gap-6 overflow-hidden border-[#f2c94c]/35 p-6 sm:flex-row sm:items-center sm:p-8',
        'bg-[radial-gradient(circle_at_82%_45%,rgba(242,201,76,0.2),transparent_42%),linear-gradient(135deg,#12291b,#0b1b12_60%)]',
      )}
    >
      <PitchLines className="absolute -bottom-28 -left-24 w-[520px] opacity-10" />

      <div className="relative flex min-w-0 flex-1 flex-col gap-3.5">
        <div className="flex flex-wrap gap-2">
          <span className={cn(CHIP, 'border-[#f2c94c]/30 bg-[#f2c94c]/14 text-[#f2c94c]')}>
            <span aria-hidden="true" className="size-[7px] rounded-full bg-[#f2c94c]" />En curso
          </span>
          {progress?.current && progress.toLoad > 0 && (
            <span className={cn(CHIP, 'border-[#ffc94a]/30 bg-[#ffc94a]/14 text-[#ffc94a]')}>
              <span aria-hidden="true" className="size-[7px] rounded-full bg-[#ffc94a]" />
              {progress.current.name}: {plural(progress.toLoad, 'partido', 'partidos')} por cargar
            </span>
          )}
        </div>
        <p className={cn(LABEL, 'text-[#b7c8bd]')}>Torneo en juego</p>
        <h2 id="inicio-en-juego" className="break-words font-display text-4xl font-black uppercase leading-[0.95] sm:text-[46px]">
          {tournament.nombre}
        </h2>
        <p className="text-sm text-[#b7c8bd]">{details}</p>

        {crests.length > 0 && (
          <ul aria-label="Equipos inscriptos" className="flex flex-wrap items-center gap-1.5">
            {crests.map((team, index) => (
              <li key={team.id} className="anim-pop" style={{ animationDelay: `${80 + index * 50}ms` }}>
                <TeamCrest name={team.nombre} label={team.nombre} className="h-10 w-[34px]" />
              </li>
            ))}
            {hiddenCrests > 0 && <li className="ml-1 font-mono text-xs font-bold text-[#b7c8bd]">+{hiddenCrests}</li>}
          </ul>
        )}

        <BracketSteps bracket={bracket} />

        <div className="mt-1.5 flex flex-wrap gap-3">
          <Link to={`/app/admin/resultados?torneo=${tournament.id}`} className={BTN_AMBER}>
            <ClipboardPen className="size-5" aria-hidden="true" />Cargar resultados
          </Link>
          <Link to={`/app/torneos/${tournament.id}`} className={cn('inline-flex min-h-[46px] items-center px-2 text-sm font-bold text-[#35f46e] hover:text-[#7dffa3]', FOCUS)}>
            Ver la llave
          </Link>
        </div>
      </div>

      <div className="anim-pop relative mx-auto flex-none sm:mx-0">
        <Trophy shine label={`Copa de ${tournament.nombre}`} className="h-32 w-auto sm:h-[188px]" />
      </div>
    </section>
  )
}

// Avance de la llave: Inscripción (siempre hecha) y cada ronda con sus partidos jugados
function BracketSteps({ bracket }: { bracket: BracketState }) {
  if (bracket.loading) {
    return <p role="status" className="text-sm text-[#b7c8bd]">Revisando la llave…</p>
  }
  if (bracket.failed || !bracket.progress) {
    return (
      <p role="alert" className="text-sm text-[#ff9b9b]">
        No pudimos leer la llave de este torneo.{' '}
        <button type="button" onClick={bracket.retry} className="font-bold text-[#f4f8f5] underline underline-offset-2">Reintentar</button>
      </p>
    )
  }
  const { rounds, current, played, total } = bracket.progress
  if (rounds.length === 0) {
    return <p className="text-sm text-[#b7c8bd]">La llave todavía no tiene partidos.</p>
  }

  return (
    <div className="mt-1 flex flex-col gap-2.5">
      <ol aria-label="Avance de la llave" className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[13px] font-bold">
        <Step label="Inscripción" state="done" />
        {rounds.map((round) => {
          const state = round.played === round.total ? 'done' : round === current ? 'current' : 'next'
          return <Step key={round.round} label={round.name} detail={`${round.played}/${round.total}`} state={state} connector />
        })}
      </ol>
      <div className="flex max-w-sm items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-[#f4f8f5]/10" aria-hidden="true">
          <div className="anim-fill h-full rounded-[3px] bg-[linear-gradient(90deg,#1a9c45,#35f46e)]" style={{ width: `${total ? (played / total) * 100 : 0}%` }} />
        </div>
        <span className="font-mono text-xs text-[#b7c8bd]">{played}/{total} partidos finalizados</span>
      </div>
    </div>
  )
}

type StepState = 'done' | 'current' | 'next'

function Step({ label, detail, state, connector = false }: { label: string; detail?: string; state: StepState; connector?: boolean }) {
  return (
    <li
      aria-current={state === 'current' ? 'step' : undefined}
      className={cn('inline-flex items-center gap-2', state === 'done' && 'text-[#35f46e]', state === 'current' && 'text-[#ffc94a]', state === 'next' && 'text-[#8fa596]')}
    >
      {/* Tramo que une con el paso anterior: verde si ya se llegó a este paso */}
      {connector && <span aria-hidden="true" className={cn('mr-0.5 h-0.5 w-5 sm:w-7', state === 'next' ? 'bg-[#f4f8f5]/20' : 'bg-[#35f46e]')} />}
      {state === 'done' && (
        <span aria-hidden="true" className="grid size-[22px] place-items-center rounded-full bg-[#35f46e] text-[#06110b]"><Check className="size-3.5" strokeWidth={3} /></span>
      )}
      {state === 'current' && (
        <span aria-hidden="true" className="grid size-[22px] place-items-center rounded-full border-2 border-[#ffc94a] motion-safe:animate-pulse"><span className="size-2 rounded-full bg-[#ffc94a]" /></span>
      )}
      {state === 'next' && <span aria-hidden="true" className="size-[22px] rounded-full border-2 border-[#f4f8f5]/30" />}
      <span>
        {label}
        {detail && <span className="ml-1 font-mono text-[11px] font-semibold opacity-80">{detail}</span>}
        <span className="sr-only">{state === 'done' ? ' (completa)' : state === 'current' ? ' (en juego)' : ' (por jugar)'}</span>
      </span>
    </li>
  )
}

// Sin torneo en curso: la misma tarjeta, con la copa apagada y la invitación a crear uno
export function NoLiveTournamentCard({ openCount }: { openCount: number }) {
  return (
    <section aria-labelledby="inicio-en-juego" className={cn(CARD, 'anim-stagger relative flex flex-col-reverse items-start gap-6 overflow-hidden p-6 sm:flex-row sm:items-center sm:p-8')}>
      <PitchLines className="absolute -bottom-28 -left-24 w-[520px] opacity-[0.06]" />
      <div className="relative flex min-w-0 flex-1 flex-col gap-3.5">
        <p className={cn(LABEL, 'text-[#b7c8bd]')}>Torneo en juego</p>
        <h2 id="inicio-en-juego" className="font-display text-4xl font-black uppercase leading-[0.95]">No hay torneos en juego</h2>
        <p className="max-w-md text-sm leading-relaxed text-[#b7c8bd]">
          {openCount > 0
            ? `Tenés ${plural(openCount, 'torneo', 'torneos')} con la inscripción abierta. Cuando se complete el cupo y generes la llave, el torneo aparece acá.`
            : 'Creá un torneo y abrí la inscripción: cuando arranque, lo vas a seguir desde acá.'}
        </p>
        <Link to="/app/admin/torneos/nuevo" className={cn(BTN_PRIMARY, 'mt-1.5 self-start')}>
          <Plus className="size-5" strokeWidth={2.6} aria-hidden="true" />Nuevo torneo
        </Link>
      </div>
      <Trophy dim className="relative mx-auto h-28 w-auto flex-none sm:mx-0 sm:h-40" />
    </section>
  )
}
