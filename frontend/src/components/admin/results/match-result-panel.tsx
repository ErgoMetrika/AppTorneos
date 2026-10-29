import { ArrowRight, Check, CircleAlert, Minus, Plus, Save } from 'lucide-react'
import { useId } from 'react'

import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { TeamCrest } from '@/components/visuals/art'
import { cn } from '@/lib/utils'

import { clampGoals, draftWinner, isTied, type MatchRow, type ScoreDraft } from './bracket-utils'

const LEGEND = 'flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em]'
const STEP_BADGE = 'inline-grid size-[22px] place-items-center rounded-full border-2 text-[11px]'
const SIDE_BTN = 'grid size-11 shrink-0 place-items-center rounded-xl border border-[#f4f8f5]/20 bg-[#10271a] text-[#f4f8f5] transition hover:border-primary hover:bg-[#143220] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#f4f8f5]/20'

// Número con − y +: nunca baja de 0
function GoalStepper({ id, team, value, highlight, onChange }: { id: string; team: string; value: number; highlight: boolean; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={`Restar un gol a ${team}`} disabled={value <= 0} onClick={() => onChange(clampGoals(value - 1))} className={SIDE_BTN}>
        <Minus className="size-5" aria-hidden="true" />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={99}
        value={value}
        onChange={(event) => onChange(clampGoals(event.target.valueAsNumber))}
        onFocus={(event) => event.target.select()}
        className={cn(
          'h-[60px] w-[68px] rounded-xl border-2 bg-[#0b1b12] text-center font-display text-[34px] font-black text-[#f4f8f5] outline-none [appearance:textfield] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          highlight ? 'border-primary' : 'border-[#f4f8f5]/30',
        )}
      />
      <button type="button" aria-label={`Sumar un gol a ${team}`} disabled={value >= 99} onClick={() => onChange(clampGoals(value + 1))} className={SIDE_BTN}>
        <Plus className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}

function PenaltyInput({ id, value, highlight, onChange }: { id: string; value: number; highlight: boolean; onChange: (value: number) => void }) {
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={0}
      max={99}
      value={value}
      onChange={(event) => onChange(clampGoals(event.target.valueAsNumber))}
      onFocus={(event) => event.target.select()}
      className={cn(
        'h-[52px] w-[62px] rounded-[10px] border-2 bg-[#06110b] text-center font-display text-[28px] font-black text-[#f4f8f5] outline-none [appearance:textfield] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dffa3] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        highlight ? 'border-primary' : 'border-[#f4f8f5]/30',
      )}
    />
  )
}

interface MatchResultPanelProps {
  match: MatchRow
  name: string
  isFinal: boolean
  draft: ScoreDraft
  onDraftChange: (draft: ScoreDraft) => void
  pending: boolean
  onSave: () => Promise<boolean>
  onCancel: () => void
}

// Panel del partido elegido: goles, penales si empatan, quién avanza y guardar con confirmación
export function MatchResultPanel({ match, name, isFinal, draft, onDraftChange, pending, onSave, onCancel }: MatchResultPanelProps) {
  const uid = useId()
  const local = match.local ?? 'Local'
  const visitante = match.visitante ?? 'Visitante'
  const tied = isTied(draft)
  const winnerSide = draftWinner(draft)
  const winner = winnerSide === 'local' ? local : winnerSide === 'visitante' ? visitante : null
  const loser = winnerSide === 'local' ? visitante : local
  const canSave = winner !== null && !pending
  const set = (patch: Partial<ScoreDraft>) => onDraftChange({ ...draft, ...patch })

  const scoreText = tied
    ? `${draft.golesLocal} a ${draft.golesVisitante}, penales ${draft.penalesLocal} a ${draft.penalesVisitante}`
    : `${draft.golesLocal} a ${draft.golesVisitante}`
  const winnerDetail = winner
    ? tied
      ? `Ganó ${Math.max(draft.penalesLocal, draft.penalesVisitante)} a ${Math.min(draft.penalesLocal, draft.penalesVisitante)} por penales`
      : `Ganó ${Math.max(draft.golesLocal, draft.golesVisitante)} a ${Math.min(draft.golesLocal, draft.golesVisitante)} a ${loser}`
    : null

  return (
    <section aria-labelledby={`${uid}-titulo`} className="anim-page flex min-w-0 flex-col gap-[22px] rounded-[20px] border border-primary/35 p-6 shadow-[0_18px_44px_rgba(0,0,0,0.45)] sm:px-[30px] sm:py-7" style={{ background: 'linear-gradient(170deg, #0f2418, #0b1b12 40%)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{name}</p>
          <h2 id={`${uid}-titulo`} className="mt-1 break-words font-display text-3xl font-black uppercase leading-none sm:text-4xl">{local} vs {visitante}</h2>
        </div>
        <span className="inline-flex h-[26px] items-center gap-[7px] whitespace-nowrap rounded-full border border-[#ffc94a]/32 bg-[#ffc94a]/14 px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[#ffc94a]">
          <span className="size-[7px] rounded-full bg-[#ffc94a]" aria-hidden="true" />Por cargar
        </span>
      </div>

      {/* Paso 2: goles */}
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className={cn(LEGEND, 'mb-3.5 text-[#f4f8f5]')}><span className={cn(STEP_BADGE, 'border-primary text-primary')}>2</span>Goles</legend>
        <div className="grid grid-cols-1 items-center gap-4 rounded-2xl border border-[#f4f8f5]/8 bg-[#06110b] p-5 sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
          {([['local', local, draft.golesLocal, 'golesLocal'], ['visitante', visitante, draft.golesVisitante, 'golesVisitante']] as const).map(([side, team, value, key], index) => (
            <div key={side} className={cn('flex min-w-0 flex-col items-center gap-2.5', index === 1 && 'sm:order-3')}>
              <TeamCrest name={team} className="anim-pop h-[70px] w-[60px]" />
              <label htmlFor={`${uid}-${key}`} className="max-w-full break-words text-center font-bold">{team}</label>
              <GoalStepper id={`${uid}-${key}`} team={team} value={value} highlight={winnerSide === side} onChange={(next) => set({ [key]: next })} />
            </div>
          ))}
          <span aria-hidden="true" className="hidden font-display text-3xl font-black text-[#8fa596] sm:order-2 sm:block">–</span>
        </div>
      </fieldset>

      {/* Paso 3: penales, solo si empatan */}
      {tied && (
        <fieldset className="anim-page m-0 flex min-w-0 flex-col gap-3.5 rounded-2xl border border-[#ffc94a]/50 bg-[#ffc94a]/6 px-5 pb-[18px] pt-2">
          <legend className={cn(LEGEND, 'px-2 text-[#ffc94a]')}><span className={cn(STEP_BADGE, 'border-dashed border-[#ffc94a]')}>3</span>Penales · aparecen porque empataron</legend>
          <p className="flex items-start gap-2.5 text-[15px] font-semibold leading-normal">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-[#ffc94a]" aria-hidden="true" />
            Si empatan, se define por penales y no pueden quedar empatados.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <label htmlFor={`${uid}-pl`} className="text-sm font-semibold text-[#b7c8bd]">{local}</label>
            <PenaltyInput id={`${uid}-pl`} value={draft.penalesLocal} highlight={winnerSide === 'local'} onChange={(next) => set({ penalesLocal: next })} />
            <span aria-hidden="true" className="font-display text-2xl font-black text-[#8fa596]">–</span>
            <PenaltyInput id={`${uid}-pv`} value={draft.penalesVisitante} highlight={winnerSide === 'visitante'} onChange={(next) => set({ penalesVisitante: next })} />
            <label htmlFor={`${uid}-pv`} className="text-sm font-semibold text-[#b7c8bd]">{visitante}</label>
          </div>
          <p className={cn('text-xs', winner ? 'text-[#b7c8bd]' : 'font-semibold text-[#ffc94a]')}>
            {winner ? 'Penales listos: no quedaron empatados.' : 'Los penales están empatados: "Guardar resultado" no se habilita hasta que uno haga más.'}
          </p>
        </fieldset>
      )}

      {/* Quién avanza, calculado en vivo */}
      <div
        aria-live="polite"
        className={cn(
          'relative flex items-center gap-4 rounded-[18px] border p-4 sm:p-5',
          winner ? 'border-primary/35' : 'border-dashed border-[#f4f8f5]/20',
        )}
        style={winner ? { background: 'radial-gradient(circle at 80% 50%, rgba(53,244,110,0.18), #06110b 70%)' } : { background: '#06110b' }}
      >
        {winner
          ? (
            <>
              <TeamCrest key={winner} name={winner} className="anim-pop h-[64px] w-[55px] shrink-0" />
              <ArrowRight className="hidden size-7 shrink-0 text-primary sm:block" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{isFinal ? 'Es la final: sale campeón' : 'Pasa al partido siguiente'}</p>
                <p className="mt-1 break-words font-display text-[30px] font-black uppercase leading-none">Avanza: {winner}</p>
                <p className="mt-1 text-[13px] text-[#b7c8bd]">{winnerDetail}</p>
              </div>
            </>
          )
          : <p className="text-sm font-semibold text-[#b7c8bd]">Todavía no hay ganador: cargá los penales para definir quién avanza.</p>}
      </div>

      {/* Paso 4: guardar */}
      <div className="flex flex-col gap-2.5">
        <p className={cn(LEGEND, 'text-[#f4f8f5]')}><span className={cn(STEP_BADGE, 'border-[#f4f8f5]/40')}>4</span>Guardá</p>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <ConfirmDialog
            trigger={(
              <button type="button" disabled={!canSave} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2.5 rounded-xl bg-primary px-5 text-base font-extrabold text-[#06110b] shadow-[0_10px_24px_rgba(53,244,110,0.22)] transition hover:bg-[#7dffa3] disabled:cursor-not-allowed disabled:border disabled:border-dashed disabled:border-[#f4f8f5]/25 disabled:bg-transparent disabled:text-[#8fa596] disabled:shadow-none">
                <Check className="size-5" strokeWidth={3} aria-hidden="true" />Guardar resultado
              </button>
            )}
            icon={<Save className="size-5" aria-hidden="true" />}
            title="¿Guardar el resultado?"
            description={<>{name}: {local} {scoreText} {visitante}. {winner && <>Avanza <strong>{winner}</strong>.</>}</>}
            note={isFinal ? 'Es la final: al guardar, el torneo queda finalizado y no se puede cambiar el resultado.' : 'Una vez guardado no se puede editar: el ganador pasa solo al partido siguiente.'}
            confirmLabel="Sí, guardar"
            pendingLabel="Guardando..."
            pending={pending}
            onConfirm={onSave}
          />
          <button type="button" onClick={onCancel} className="inline-flex min-h-14 items-center justify-center rounded-xl border border-[#f4f8f5]/20 bg-[#10271a] px-5 font-bold text-[#f4f8f5] transition hover:border-primary hover:bg-[#143220]">
            Cancelar
          </button>
        </div>
      </div>
    </section>
  )
}
