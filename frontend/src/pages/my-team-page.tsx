import { useQuery } from '@tanstack/react-query'
import { Check, Eye, Shield, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/shared/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import { TeamMark } from '@/components/shared/team-mark'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getMyTeam } from '@/lib/api'
import { positionLabel } from '@/lib/utils'

export function MyTeamPage() {
  const query = useQuery({ queryKey: ['my-team'], queryFn: getMyTeam })

  if (query.isLoading) return <LoadingState label="Consultando tu equipo" />
  if (query.isError) return <ErrorState message={query.error.message} retry={() => void query.refetch()} />

  if (!query.data) {
    return (
      <div>
        <PageHeader eyebrow="Cuenta general" title="Mi equipo" description="La creación de equipos y la asignación de jugadores están reservadas al rol administrador." />
        <div className="mt-8"><EmptyState title="Todavía no tenés equipo" description="Cuando un administrador te asigne a un plantel, vas a encontrarlo en esta pantalla." /></div>
        <Card className="mt-5 flex items-start gap-4 border-info/20 bg-info/5 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-info/10 text-info"><Shield className="size-5" /></span><div><h2 className="font-display text-xl font-bold uppercase">Modo consulta</h2><p className="mt-1 text-sm leading-6 text-base-content/55">Podés recorrer torneos, equipos y jugadores. Para altas o cambios de plantel, contactá a un administrador.</p></div></Card>
      </div>
    )
  }

  const team = query.data
  return (
    <div>
      <PageHeader eyebrow="Cuenta general" title="Mi equipo" description="Tu plantel es administrado por la organización del torneo." />
      <section className="mt-8 flex flex-col gap-6 rounded-2xl border border-primary/20 bg-[linear-gradient(120deg,rgba(53,244,110,.12),rgba(11,27,18,.9)_58%)] p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex items-center gap-5"><TeamMark name={team.nombre} className="size-20" /><div><Badge>Mi posición: {positionLabel[team.mi_posicion]}</Badge><h2 className="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">{team.nombre}</h2></div></div>
        <Button asChild variant="outline"><Link to={`/app/equipos/${team.id}`}><Eye className="size-4" /> Ver ficha del equipo</Link></Button>
      </section>
      <div className="mt-8"><h3 className="font-display text-3xl font-black uppercase">Plantel</h3>{team.jugadores.length === 0 ? <div className="mt-4"><EmptyState title="Sin jugadores" description="El administrador todavía no cargó integrantes." /></div> : <Card className="mt-4 overflow-hidden">{team.jugadores.map((player, index) => <Link to={`/app/jugadores/${player.id}`} key={player.id ?? `${player.nombre}-${index}`} className="flex items-center gap-4 border-b border-base-content/10 p-4 transition last:border-0 hover:bg-base-300/40"><span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary"><Users className="size-4" /></span><strong className="flex-1">{player.nombre}</strong><Badge variant="secondary">{positionLabel[player.posicion]}</Badge>{player.usuario_id ? <Check className="size-4 text-primary" /> : null}</Link>)}</Card>}</div>
    </div>
  )
}
