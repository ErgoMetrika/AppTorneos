import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarDays, Shield, Trophy, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { TournamentStateBadge } from '@/components/shared/tournament-state-badge'
import { Button } from '@/components/ui/button'
import { getTournaments } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export function HomePage() {
  const { data: tournaments = [] } = useQuery({ queryKey: ['tournaments'], queryFn: getTournaments })
  const nextTournament = tournaments.find((item) => item.estado !== 'finalizado')

  return (
    <>
      <section className="hero-grid relative overflow-hidden border-b border-base-content/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(53,244,110,0.16),transparent_28%),linear-gradient(90deg,rgba(6,17,11,0.98)_0%,rgba(6,17,11,0.78)_58%,rgba(6,17,11,0.92)_100%)]" />
        <div className="pitch-lines absolute inset-y-0 right-0 hidden w-[44%] opacity-45 md:block" />
        <div className="container-shell relative grid min-h-[720px] items-center gap-9 py-16 md:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-20">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">
              <span className="size-2 rounded-full bg-primary" /> Plataforma de torneos de fútbol
            </p>
            <h1 className="mt-6 font-display text-6xl font-black uppercase leading-[0.86] tracking-[-0.04em] sm:text-7xl lg:text-8xl xl:text-9xl">
              Torneo 90&apos;
            </h1>
            <h2 className="mt-3 font-display text-3xl font-black uppercase leading-none text-primary sm:text-4xl xl:text-5xl">
              Todo el fútbol,<br />bien organizado.
            </h2>
            <p className="mt-7 max-w-xl text-base leading-7 text-base-content/65 lg:text-lg">
              Organizá competencias de eliminación directa, reuní equipos y seguí cada llave. Los usuarios generales pueden crear su equipo, sumarse con un código e inscribirse a torneos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/torneos">Explorar torneos <ArrowRight className="size-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/registro"><UserPlus className="size-4" /> Crear cuenta general</Link></Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
            <div className="absolute -inset-12 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative rounded-2xl border border-primary/25 bg-base-200/90 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-12 place-items-center rounded-lg bg-primary text-primary-content"><Trophy className="size-6" /></div>
                <span className="badge badge-info badge-sm font-mono text-[0.6rem] font-bold uppercase">Datos en vivo</span>
              </div>
              {nextTournament ? (
                <>
                  <p className="mt-7 font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Próximo torneo</p>
                  <h3 className="mt-2 font-display text-4xl font-black uppercase leading-none">{nextTournament.nombre}</h3>
                  <TournamentStateBadge state={nextTournament.estado} />
                  <dl className="mt-7 grid gap-3 border-t border-base-content/10 pt-5 text-sm">
                    <div className="flex items-center justify-between"><dt className="text-base-content/45">Fecha</dt><dd className="font-semibold">{formatDate(nextTournament.fecha, 'dd MMM yyyy')}</dd></div>
                    <div className="flex items-center justify-between"><dt className="text-base-content/45">Modalidad</dt><dd className="font-semibold">Fútbol {nextTournament.tipo_futbol}</dd></div>
                    <div className="flex items-center justify-between"><dt className="text-base-content/45">Equipos</dt><dd className="font-semibold">{nextTournament.inscriptos} / {nextTournament.max_equipos}</dd></div>
                  </dl>
                  <Button asChild className="mt-6 w-full"><Link to={`/torneos/${nextTournament.id}`}>Ver detalle <ArrowRight className="size-4" /></Link></Button>
                </>
              ) : (
                <div className="py-12 text-center text-base-content/50">Todavía no hay torneos próximos.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 sm:py-20">
        <div className="grid overflow-hidden rounded-xl border border-base-content/10 bg-base-200/50 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Trophy, 'Torneos', 'Públicos y privados'],
            [Shield, 'Equipos', 'Código único de acceso'],
            [Users, 'Planteles', 'Nombre y posición real'],
            [CalendarDays, 'Llaves', 'Eliminación directa'],
          ].map(([Icon, title, text]) => (
            <div key={String(title)} className="flex items-center gap-4 border-b border-base-content/10 p-6 last:border-0 sm:border-r lg:border-b-0">
              <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span>
              <div><h3 className="font-mono text-xs font-bold uppercase tracking-wider">{String(title)}</h3><p className="mt-1 text-xs text-base-content/45">{String(text)}</p></div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
