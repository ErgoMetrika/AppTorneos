import { TeamCrest } from '@/components/visuals/art'
import { cn } from '@/lib/utils'

// Insignia del equipo: escudo de club con las siglas y un color propio derivado del nombre
export function TeamMark({ name, className, label }: { name: string; className?: string; label?: string }) {
  return <TeamCrest name={name} label={label} className={cn('size-14 shrink-0', className)} />
}
