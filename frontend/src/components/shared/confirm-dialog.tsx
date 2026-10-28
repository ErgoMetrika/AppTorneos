import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface ConfirmDialogProps {
  trigger: ReactNode
  icon: ReactNode
  title: string
  description: ReactNode
  note?: ReactNode
  confirmLabel: string
  pendingLabel: string
  pending: boolean
  // Devuelve true si salió bien, para cerrar la ventana
  onConfirm: () => Promise<boolean>
}

// Ventana de confirmación con el mismo diseño que la de invitar jugadores
export function ConfirmDialog({ trigger, icon, title, description, note, confirmLabel, pendingLabel, pending, onConfirm }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)

  const confirm = async () => {
    if (await onConfirm()) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <span className="mb-4 grid size-11 place-items-center rounded-lg bg-error/10 text-error">{icon}</span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {note && <div className="rounded-lg border border-base-content/10 bg-base-100/50 p-4 text-xs leading-5 text-base-content/55">{note}</div>}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void confirm()}>{pending ? pendingLabel : confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
