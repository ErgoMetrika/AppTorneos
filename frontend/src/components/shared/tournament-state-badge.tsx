import { Circle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { tournamentStateLabel } from '@/lib/utils'
import type { EstadoTorneo } from '@/types/domain'

export function TournamentStateBadge({ state }: { state: EstadoTorneo }) {
  const variant = state === 'inscripcion' ? 'default' : state === 'en_curso' ? 'info' : 'secondary'
  return (
    <Badge variant={variant}>
      <Circle className="size-2 fill-current" />
      {tournamentStateLabel[state]}
    </Badge>
  )
}
