import { Lock } from 'lucide-react'
import { useMemo, type CSSProperties } from 'react'

import { TeamCrest, Trophy } from '@/components/visuals/art'
import { cn } from '@/lib/utils'

import { groupRounds, matchName, matchStatus, roundName, type MatchRow } from './bracket-utils'

const LABEL = 'font-mono text-[10px] font-bold uppercase tracking-[0.12em]'

// Ganador que se está cargando, para dibujarlo ya en el partido siguiente
export interface AdvancePreview { matchId: number; side: 'local' | 'visitante'; name: string }

interface SlotTeam { id: number | null; name: string | null; goals: number | null; penalties: number | null }

function Row({ team, winner, showScore, preview }: { team: SlotTeam; winner: boolean; showScore: boolean; preview: string | null }) {
  // Lugar vacío: si el partido elegido manda acá a su ganador, se muestra en vivo
  if (!team.name) {
    if (preview) {
      return (
        <div className="anim-pop flex h-12 items-center gap-3 rounded-[10px] border-2 border-dashed border-primary bg-primary/12 pl-3 pr-3">
          <TeamCrest name={preview} className="h-[30px] w-[26px] shrink-0 drop-shadow-none" />
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{preview}</span>
          <span className={cn(LABEL, 'text-primary')}>Avanza</span>
        </div>
      )
    }
    return <div className="flex h-12 items-center rounded-[10px] border border-dashed border-[#f4f8f5]/25 px-4 text-[15px] font-semibold text-[#8fa596]">Por definir</div>
  }
  return (
    <div className={cn('flex h-12 items-center gap-3 rounded-[10px] border bg-[#10271a] pl-3 pr-4', winner ? 'border-primary/50 shadow-[inset_3px_0_0_#35f46e]' : 'border-[#f4f8f5]/12')}>
      <TeamCrest name={team.name} className="h-[30px] w-[26px] shrink-0 drop-shadow-none" />
      <span title={team.name} className={cn('min-w-0 flex-1 truncate text-[15px] font-semibold', winner ? 'font-bold text-[#f4f8f5]' : showScore && 'text-[#b7c8bd]')}>{team.name}</span>
      {showScore && (
        <span className={cn('font-display text-[22px] font-black leading-none', winner ? 'text-primary' : 'text-[#b7c8bd]')}>
          {team.goals ?? '–'}{team.penalties !== null && <small className="ml-1 text-base">({team.penalties})</small>}
        </span>
      )}
    </div>
  )
}

function MatchCard({ match, lastRound, last, selected, preview, onSelect }: {
  match: MatchRow
  lastRound: number
  last: boolean
  selected: boolean
  preview: AdvancePreview | null
  onSelect: (id: number) => void
}) {
  const status = matchStatus(match)
  const finished = status === 'finalizado'
  const name = matchName(match, lastRound)
  const previewFor = (side: 'local' | 'visitante') => (preview && preview.matchId === match.id && preview.side === side ? preview.name : null)
  const teams: Array<SlotTeam & { side: 'local' | 'visitante' }> = [
    { side: 'local', id: match.equipo_local_id, name: match.local, goals: match.goles_local, penalties: match.penales_local },
    { side: 'visitante', id: match.equipo_visitante_id, name: match.visitante, goals: match.goles_visitante, penalties: match.penales_visitante },
  ]

  const tag = finished ? 'Jugado' : status === 'jugable' ? (selected ? 'Seleccionado' : 'Por cargar') : 'Por definir'
  const body = (
    <>
      <span className={cn(LABEL, 'flex items-center gap-1.5', selected ? 'text-primary' : status === 'jugable' ? 'text-[#ffc94a]' : finished ? 'text-primary/80' : 'text-[#8fa596]')}>
        {status === 'bloqueado' && <Lock className="size-3" aria-hidden="true" />}
        {name} · {tag}
      </span>
      {teams.map((team) => (
        <Row key={team.side} team={team} winner={finished && team.id !== null && team.id === match.ganador_id} showScore={finished} preview={previewFor(team.side)} />
      ))}
    </>
  )

  const base = 'relative flex w-[264px] flex-col gap-2 rounded-[16px] border p-2.5 text-left sm:w-[292px]'
  return (
    <div className="relative">
      {status === 'jugable'
        ? (
          <button
            type="button"
            aria-pressed={selected}
            aria-label={`${name}: ${match.local} contra ${match.visitante}. ${selected ? 'Seleccionado' : 'Por cargar'}.`}
            onClick={() => onSelect(match.id)}
            className={cn(base, 'card-lift cursor-pointer', selected ? 'border-2 border-primary bg-primary/[0.07] shadow-[0_0_0_4px_rgba(53,244,110,0.12)]' : 'border-[#ffc94a]/35 bg-[#ffc94a]/[0.04] hover:border-primary/50')}
          >
            {body}
          </button>
        )
        : <div className={cn(base, 'border-[#f4f8f5]/8', status === 'bloqueado' && 'opacity-70')}>{body}</div>}
      {/* Conector hacia la ronda siguiente (en la final, línea recta a la copa) */}
      {last
        ? <span aria-hidden="true" className="absolute left-full top-1/2 w-14 border-t-2 border-primary/40" />
        : (
          <>
            <span aria-hidden="true" className={cn('absolute left-full top-[57px] bottom-[34px] w-7 border-y-2 border-r-2', selected ? 'border-primary' : 'border-[#f4f8f5]/25')} />
            <span aria-hidden="true" className={cn('absolute left-[calc(100%+1.75rem)] top-[calc(50%+11px)] w-7 border-t-2', selected ? 'border-primary' : 'border-[#f4f8f5]/25')} />
          </>
        )}
    </div>
  )
}

function ChampionColumn({ name }: { name: string | null }) {
  return (
    <div className="flex w-52 shrink-0 flex-col items-center justify-center text-center">
      <span className={cn(LABEL, 'mb-3 text-[#b7c8bd]')}>Campeón</span>
      <div className="relative grid size-40 place-items-center rounded-full bg-[#f2c94c]/8">
        <div className="relative w-[96px]">
          <Trophy shine={Boolean(name)} label={name ? `Copa del campeón, ${name}` : 'Copa del campeón, a definir'} className="block h-auto w-full drop-shadow-[0_10px_24px_rgba(242,201,76,0.25)]" />
          {name && <TeamCrest name={name} className="absolute left-1/2 top-[13%] h-auto w-[34%] -translate-x-1/2 drop-shadow-none" />}
        </div>
      </div>
      <p className={cn('mt-2 max-w-full break-words font-display font-black uppercase leading-none', name ? 'text-2xl text-[#f2c94c]' : 'text-[28px]')}>{name ?? 'A definir'}</p>
      {!name && <p className="mt-1 text-[13px] text-[#b7c8bd]">Sale de la final</p>}
    </div>
  )
}

// Llave a lo ancho: rondas en columnas, partidos jugables como botones y la copa al final
export function ResultsBracket({ matches, selectedId, preview, onSelect }: {
  matches: MatchRow[]
  selectedId: number | null
  preview: AdvancePreview | null
  onSelect: (id: number) => void
}) {
  const rounds = useMemo(() => groupRounds(matches), [matches])
  const lastRound = rounds[rounds.length - 1]?.round ?? 1
  const finalMatch = rounds[rounds.length - 1]?.list.length === 1 ? rounds[rounds.length - 1].list[0] : null
  const champion = finalMatch?.ganador_id ? finalMatch.ganador : null

  return (
    <div className="-mx-2 overflow-x-auto px-2 pb-2 pt-1">
      <div className="flex min-w-max gap-14">
        {rounds.map(({ round, list }) => (
          <section key={round} aria-label={roundName(round, lastRound)} className="flex flex-col gap-4">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#b7c8bd]">{roundName(round, lastRound)}</h3>
            <div className="flex flex-1 flex-col justify-around gap-5">
              {list.map((match, index) => (
                <div key={match.id} className="anim-stagger" style={{ '--i': index + round } as CSSProperties}>
                  <MatchCard match={match} lastRound={lastRound} last={round === lastRound} selected={match.id === selectedId} preview={preview} onSelect={onSelect} />
                </div>
              ))}
            </div>
          </section>
        ))}
        <ChampionColumn name={champion} />
      </div>
    </div>
  )
}
