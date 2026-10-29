// Portada: título, botones y la escena ilustrada (cancha inclinada, trofeo con brillo y
// escudos flotando) con la tarjeta del próximo torneo real encima.
import { ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { StateChip } from '@/components/tournament/tournament-bits'
import { Pitch, TeamCrest, Trophy } from '@/components/visuals/art'
import type { TeamColorKey } from '@/components/visuals/palette'
import { formatDate } from '@/lib/utils'
import type { TorneoListado } from '@/types/domain'

import { SHELL } from './reveal'

// Escudos decorativos alrededor de la cancha. Posiciones en % de una escena de 580 × 400.
const CRESTS: Array<{ name: string; color: TeamColorKey; left: string; top: string; width: string; delay: string }> = [
  { name: 'Los Pibes', color: 'verde', left: '4.8%', top: '6%', width: '12.8%', delay: '0s' },
  { name: 'Atlético Ramos', color: 'amarillo', left: '81%', top: '2.5%', width: '12.8%', delay: '-1.1s' },
  { name: 'San Lorenzo', color: 'violeta', left: '85.8%', top: '59%', width: '11.4%', delay: '-2.3s' },
  { name: 'Belgrano', color: 'celeste', left: '1.4%', top: '62.5%', width: '11.4%', delay: '-3.2s' },
]

function HeroScene() {
  return (
    <div
      role="img"
      aria-label="Ilustración: cancha vista desde arriba con un trofeo en el centro y escudos de equipos alrededor"
      className="relative aspect-[580/400] w-full"
    >
      <div className="lr-pitch absolute left-[5.2%] top-[17.5%] w-[89.7%] drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]">
        <Pitch className="block h-auto w-full drop-shadow-none" />
      </div>
      {/* Halo dorado detrás de la copa */}
      <div aria-hidden="true" className="lr-glow absolute left-[41.4%] top-[23%] h-[43.75%] w-[24.1%] rounded-full bg-[radial-gradient(circle,rgba(242,201,76,0.3),transparent_65%)]" />
      <div className="anim-pop absolute left-[43.4%] top-[17.5%] w-[20%] [animation-delay:250ms]">
        <Trophy shine className="block h-auto w-full" />
      </div>
      {CRESTS.map((crest, index) => (
        <div
          key={crest.name}
          className="anim-pop absolute"
          style={{ left: crest.left, top: crest.top, width: crest.width, animationDelay: `${350 + index * 110}ms` }}
        >
          <div className="lr-float" style={{ '--float-delay': crest.delay } as CSSProperties}>
            <TeamCrest name={crest.name} color={crest.color} className="block h-auto w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function NextTournamentCard({ tournament, loading, failed }: { tournament?: TorneoListado; loading: boolean; failed: boolean }) {
  const shell = 'anim-pop relative z-10 mx-auto -mt-[12%] flex w-[min(100%,320px)] flex-col gap-2.5 rounded-[18px] border border-primary/35 bg-[#0b1b12]/95 p-[18px_20px] shadow-[0_20px_44px_rgba(0,0,0,0.55)] backdrop-blur [animation-delay:650ms]'

  if (loading) {
    return (
      <div className={shell} role="status" aria-live="polite">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Próximo torneo</span>
        <span className="h-8 w-3/4 animate-pulse rounded-md bg-[#f4f8f5]/8 motion-reduce:animate-none" />
        <span className="h-4 w-1/2 animate-pulse rounded bg-[#f4f8f5]/8 motion-reduce:animate-none" />
        <span className="sr-only">Cargando el próximo torneo</span>
      </div>
    )
  }

  if (failed || !tournament) {
    return (
      <div className={shell}>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Próximo torneo</span>
        <p className="font-display text-[26px] font-black uppercase leading-none">{failed ? 'No pudimos cargarlo' : 'Muy pronto'}</p>
        <p className="text-[13px] text-[#b7c8bd]">
          {failed ? 'Probá de nuevo en un rato o mirá la lista de torneos.' : 'Todavía no hay torneos abiertos. Creá tu cuenta y enterate primero.'}
        </p>
        <Link to="/torneos" className="self-start text-sm font-bold text-primary hover:text-[#7dffa3]">Ver torneos →</Link>
      </div>
    )
  }

  const percent = Math.min(100, Math.round((tournament.inscriptos / Math.max(1, tournament.max_equipos)) * 100))
  return (
    <article className={shell} aria-labelledby="proximo-torneo">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Próximo torneo</span>
        <StateChip state={tournament.estado} />
      </div>
      <h2 id="proximo-torneo" className="break-words font-display text-[34px] font-black uppercase leading-none">{tournament.nombre}</h2>
      <p className="text-[13px] text-[#b7c8bd]">
        {formatDate(tournament.fecha, 'd MMM yyyy')} · Fútbol {tournament.tipo_futbol} · {tournament.inscriptos}/{tournament.max_equipos} equipos
      </p>
      <div className="h-1.5 overflow-hidden rounded-[3px] bg-[#f4f8f5]/10" role="progressbar" aria-label="Cupo ocupado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="anim-fill h-full bg-[linear-gradient(90deg,#1a9c45,#35f46e)] [animation-delay:900ms]" style={{ width: `${percent}%` }} />
      </div>
      <Link to={`/app/torneos/${tournament.id}`} className="self-start text-sm font-bold text-primary hover:text-[#7dffa3]">
        Ver detalle <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}

export function Hero({ nextTournament, loading, failed }: { nextTournament?: TorneoListado; loading: boolean; failed: boolean }) {
  return (
    <section
      aria-labelledby="portada-titulo"
      className="relative bg-[radial-gradient(circle_at_78%_45%,rgba(53,244,110,0.14),transparent_45%),radial-gradient(circle_at_10%_0%,rgba(53,244,110,0.08),transparent_40%)]"
    >
      <div className={`${SHELL} grid items-center gap-10 pb-14 pt-10 md:pb-[72px] md:pt-16 lg:grid-cols-[1.05fr_1fr]`}>
        <div className="flex min-w-0 flex-col gap-[18px]">
          <p className="anim-stagger font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-primary" style={{ '--i': 0 } as CSSProperties}>
            Plataforma de torneos de fútbol
          </p>
          <h1
            id="portada-titulo"
            className="anim-stagger font-display text-[88px] font-black uppercase leading-[0.82] tracking-[-0.01em] sm:text-[120px] lg:text-[clamp(120px,11.5vw,168px)]"
            style={{ '--i': 1 } as CSSProperties}
          >
            Torneo<br />90&apos;
          </h1>
          <p className="anim-stagger font-display text-[28px] font-extrabold uppercase leading-[1.05] text-primary sm:text-[34px]" style={{ '--i': 2 } as CSSProperties}>
            Todo el fútbol, bien organizado.
          </p>
          <p className="anim-stagger max-w-[520px] text-[17px] leading-relaxed text-[#b7c8bd]" style={{ '--i': 3 } as CSSProperties}>
            Armá tu equipo, invitá a tus amigos por mail e inscribite en torneos de fútbol 5 y fútbol 11. La llave se arma sola y ves cada cruce hasta la final.
          </p>
          <div className="anim-stagger mt-2 flex flex-wrap gap-3" style={{ '--i': 4 } as CSSProperties}>
            <Link
              to="/torneos"
              className="inline-flex h-[52px] items-center gap-2.5 rounded-xl bg-primary px-6 text-base font-extrabold text-[#06110b] shadow-[0_10px_26px_rgba(53,244,110,0.25)] transition hover:-translate-y-0.5 hover:bg-[#5cff8c] hover:shadow-[0_14px_30px_rgba(53,244,110,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              Explorar torneos <ArrowRight className="size-[18px]" strokeWidth={2.5} aria-hidden="true" />
            </Link>
            <Link
              to="/registro"
              className="inline-flex h-[52px] items-center rounded-xl border border-[#f4f8f5]/25 px-6 text-base font-bold text-[#f4f8f5] transition hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/8 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              Crear cuenta general
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[580px]">
          <HeroScene />
          <NextTournamentCard tournament={nextTournament} loading={loading} failed={failed} />
        </div>
      </div>
    </section>
  )
}
