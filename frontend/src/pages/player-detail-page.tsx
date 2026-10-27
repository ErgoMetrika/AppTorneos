import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, Pencil, Shield, Trash2, UserRound } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { PlayerFormDialog } from '@/components/admin/player-form-dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/context/auth-context'
import { deletePlayer, getPlayer } from '@/lib/api'
import { formatDate, getErrorMessage, positionLabel } from '@/lib/utils'

export function PlayerDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const query = useQuery({ queryKey: ['player', id], queryFn: () => getPlayer(id), enabled: Number.isFinite(id) })
  const removeMutation = useMutation({
    mutationFn: () => deletePlayer(id),
    onSuccess: () => {
      toast.success('Jugador removido del plantel')
      void queryClient.invalidateQueries({ queryKey: ['players'] })
      void queryClient.invalidateQueries({ queryKey: ['teams'] })
      navigate('/app/jugadores')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (query.isLoading) return <LoadingState label="Cargando ficha del jugador" />
  if (query.isError) return <ErrorState message={query.error.message} retry={() => void query.refetch()} />
  if (!query.data) return <EmptyState title="Jugador inexistente" description="No encontramos la ficha solicitada." />
  const player = query.data

  return (
    <div>
      <Button asChild variant="ghost" size="sm"><Link to="/app/jugadores"><ArrowLeft className="size-4" /> Volver a jugadores</Link></Button>
      <section className="relative mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(120deg,rgba(53,244,110,.13),rgba(11,27,18,.94)_58%)] p-6 sm:p-8">
        <UserRound className="absolute -bottom-14 -right-8 size-72 text-primary/5" />
        <div className="relative flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-5"><span className="grid size-20 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary"><UserRound className="size-9" /></span><div><p className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-primary">Ficha de jugador</p><h1 className="mt-1 font-display text-4xl font-black uppercase sm:text-6xl">{player.nombre}</h1><Badge className="mt-3" variant="secondary">{positionLabel[player.posicion]}</Badge></div></div>
          {isAdmin && <div className="flex flex-wrap gap-2"><PlayerFormDialog player={player} trigger={<Button variant="outline"><Pencil className="size-4" /> Editar</Button>} /><Button variant="destructive" onClick={() => { if (window.confirm(`¿Remover a ${player.nombre} del plantel?`)) removeMutation.mutate() }} disabled={removeMutation.isPending}><Trash2 className="size-4" /> {removeMutation.isPending ? 'Removiendo...' : 'Remover'}</Button></div>}
        </div>
      </section>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Card className="p-6"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Shield className="size-5" /></span><p className="mt-5 font-mono text-[0.6rem] font-bold uppercase tracking-widest text-base-content/35">Equipo actual</p><Link to={`/app/equipos/${player.equipo_id}`} className="mt-1 block font-display text-3xl font-black uppercase transition hover:text-primary">{player.equipo}</Link></Card>
        <Card className="p-6"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><CalendarDays className="size-5" /></span><p className="mt-5 font-mono text-[0.6rem] font-bold uppercase tracking-widest text-base-content/35">Incorporación</p><p className="mt-1 font-display text-3xl font-black uppercase">{formatDate(player.unido_en, "dd 'de' MMMM, yyyy")}</p></Card>
      </div>
      {!isAdmin && <div className="mt-6 rounded-xl border border-base-content/10 bg-base-200/60 p-4 text-sm text-base-content/55">Esta ficha es de solo lectura. La asignación de planteles está reservada a administradores.</div>}
    </div>
  )
}
