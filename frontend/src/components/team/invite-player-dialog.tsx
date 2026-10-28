import { Copy, Mail, UserPlus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface InvitePlayerDialogProps {
  teamName: string
  teamCode: string
  trigger?: ReactNode
}

export function InvitePlayerDialog({ teamName, teamCode, trigger }: InvitePlayerDialogProps) {
  const [open, setOpen] = useState(false)
  const message = `Te invito a sumarte a ${teamName} en Torneo 90'. Registrate o iniciá sesión y usá el código ${teamCode} desde Mi equipo.`
  const mailto = `mailto:?subject=${encodeURIComponent(`Invitación a ${teamName}`)}&body=${encodeURIComponent(message)}`

  const copyCode = async () => {
    await navigator.clipboard.writeText(teamCode)
    toast.success('Código del equipo copiado')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button><UserPlus className="size-4" /> Invitar jugador</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <span className="mb-4 grid size-11 place-items-center rounded-lg bg-primary/10 text-primary"><UserPlus className="size-5" /></span>
          <DialogTitle>Sumar jugadores</DialogTitle>
          <DialogDescription>Compartí el código con usuarios registrados. Cada jugador elige su posición al ingresar al equipo.</DialogDescription>
        </DialogHeader>
        <button type="button" onClick={() => void copyCode()} className="flex w-full items-center justify-between rounded-xl border border-primary/25 bg-base-100/70 p-5 text-left transition hover:border-primary/50">
          <span><span className="block font-mono text-[0.6rem] font-bold uppercase tracking-widest text-base-content/40">Código de {teamName}</span><strong className="mt-2 block font-mono text-3xl tracking-[0.2em] text-primary">{teamCode}</strong></span>
          <Copy className="size-5 text-primary" />
        </button>
        <div className="mt-5 rounded-lg border border-base-content/10 bg-base-100/50 p-4 text-xs leading-5 text-base-content/55">El alta se completa cuando el jugador inicia sesión, abre Mi equipo e ingresa este código.</div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => void copyCode()}><Copy className="size-4" /> Copiar código</Button><Button asChild><a href={mailto}><Mail className="size-4" /> Compartir por email</a></Button></div>
      </DialogContent>
    </Dialog>
  )
}
