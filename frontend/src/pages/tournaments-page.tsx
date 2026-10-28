import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarDays, KeyRound, LockKeyhole, MapPin, Plus, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ErrorState, LoadingState, EmptyState } from '@/components/shared/states'
import { TournamentStateBadge } from '@/components/shared/tournament-state-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-context'
import { getTournaments, searchPrivateTournament } from '@/lib/api'
import { formatDate, getErrorMessage } from '@/lib/utils'

export function TournamentsPage() {
  const [search, setSearch] = useState('')
  const [privateCode, setPrivateCode] = useState('')
  const navigate = useNavigate()
  const { session, isAdmin } = useAuth()
  const location = useLocation()
  const inApp = location.pathname.startsWith('/app')
  console.log(isAdmin)
  console.log(inApp)
  console.log(session)
  const query = useQuery({ queryKey: ['tournaments'], queryFn: getTournaments })
  const privateMutation = useMutation({
    mutationFn: searchPrivateTournament,
    onSuccess: (data) => {
      const tournament = data[0]
      if (!tournament) {
        toast.error('No encontramos un torneo con ese código.')
        return
      }
      sessionStorage.setItem(`private-tournament-code:${tournament.id}`, privateCode)
      navigate(`/torneos/${tournament.id}`, { state: { accessCode: privateCode } })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const tournaments = useMemo(
    () => (query.data ?? []).filter((item) => item.nombre.toLowerCase().includes(search.toLowerCase())),
    [query.data, search],
  )

  return (
    <div className="container-shell py-12 sm:py-16">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">Competencias públicas</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase sm:text-6xl">Torneos</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-base-content/55">
            <span className="sm:hidden">Consultá fecha, sede, modalidad y cupos. Los torneos privados se encuentran con su código<br />desde el panel del usuario.</span>
            <span className="hidden sm:inline lg:hidden">Consultá fecha, sede, modalidad y cupos. Los torneos privados se encuentran con su código desde el panel<br />del usuario.</span>
            <span className="hidden lg:inline">Consultá fecha, sede, modalidad y cupos. Los torneos privados se encuentran con su código desde el panel del usuario.</span>
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row">{isAdmin && <Button asChild><Link to="/app/admin/torneos/nuevo"><Plus className="size-4" /> Crear torneo</Link></Button>}<div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-3.5 size-4 text-base-content/35" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar torneo..." className="pl-10" />
        </div></div>
      </div>

      {session && (
        <Card className="mt-8 flex flex-col gap-4 border-info/20 bg-info/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-info/10 text-info"><KeyRound className="size-5" /></span><div><h2 className="font-display text-xl font-bold uppercase">Torneo privado</h2><p className="text-xs text-base-content/45">Ingresá el código de 6 caracteres que te compartieron.</p></div></div>
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); privateMutation.mutate(privateCode) }}><Input value={privateCode} onChange={(event) => setPrivateCode(event.target.value.toUpperCase())} maxLength={6} placeholder="A7K2PQ" className="w-36 font-mono uppercase tracking-widest" /><Button type="submit" disabled={privateCode.length !== 6 || privateMutation.isPending}>{privateMutation.isPending ? 'Buscando...' : 'Buscar'}</Button></form>
        </Card>
      )}

      <div className="mt-10">
        {query.isLoading && <LoadingState label="Cargando torneos" />}
        {query.isError && <ErrorState message={query.error.message} retry={() => void query.refetch()} />}
        {!query.isLoading && !query.isError && tournaments.length === 0 && <EmptyState title="Sin torneos" description="No encontramos torneos públicos con ese nombre." />}
        <div className="grid gap-5 2xl:grid-cols-2">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="group overflow-hidden transition hover:border-primary/35 hover:bg-base-200">
              <div className="h-1 bg-gradient-to-r from-primary to-primary/10" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><TournamentStateBadge state={tournament.estado} />{tournament.visibilidad === 'privado' && <LockKeyhole className="size-4 text-warning" />}</div>
                    <h2 className="mt-4 font-display text-3xl font-black uppercase leading-none">{tournament.nombre}</h2>
                  </div>
                  <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/10 font-display text-xl font-black text-primary">F{tournament.tipo_futbol}</div>
                </div>
                <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-relaxed text-base-content/50">{tournament.descripcion || 'Torneo de eliminación directa.'}</p>
                <div className="mt-6 grid gap-3 border-y border-base-content/10 py-4 text-xs sm:grid-cols-3">
                  <span className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /> {formatDate(tournament.fecha, 'dd MMM yyyy')}</span>
                  <span className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> {tournament.lugar || 'A confirmar'}</span>
                  <span className="flex items-center gap-2"><Users className="size-4 text-primary" /> {tournament.inscriptos} / {tournament.max_equipos}</span>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="font-mono text-[0.65rem] font-bold uppercase tracking-wider text-base-content/35">Eliminación directa</span>
                  <Button asChild size="sm"><Link to={`${inApp ? '/app' : ''}/torneos/${tournament.id}`}>Ver torneo</Link></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
