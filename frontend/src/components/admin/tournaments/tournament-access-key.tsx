import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { getTournament } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'

import { BTN_ICON } from './admin-styles'

// Clave de un torneo privado: oculta hasta que el admin la pide. Usa la misma consulta
// que el detalle del torneo (['tournament', id, esAdmin, códigoPrivado]) para compartir la caché.
export function TournamentAccessKey({ tournamentId, tournamentName }: { tournamentId: number; tournamentName: string }) {
  const queryClient = useQueryClient()
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)
  const queryKey = ['tournament', tournamentId, true, ''] as const
  const queryFn = () => getTournament(tournamentId, true)
  const query = useQuery({ queryKey, queryFn, enabled: shown })
  const code = query.data?.codigo_acceso?.trim()

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      const data = await queryClient.fetchQuery({ queryKey, queryFn, staleTime: 30_000 })
      const value = data.codigo_acceso?.trim()
      if (!value) {
        toast.error('Este torneo todavía no tiene clave.')
        return
      }
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success('Clave del torneo copiada')
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  let text = '••••••'
  if (shown) text = query.isLoading ? 'Cargando…' : query.isError ? 'No se pudo leer' : (code ?? 'Sin clave')

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#b7c8bd]">Clave del privado</span>
      <div className="flex items-center gap-1.5">
        <span
          aria-live="polite"
          className="min-w-[7.5rem] rounded-[10px] border border-[#ffc94a]/45 bg-[#06110b] px-3 py-2 text-center font-mono text-sm font-bold tracking-[0.14em] text-[#ffc94a]"
        >
          <span className="sr-only">{shown ? `Clave de ${tournamentName}: ` : 'Clave oculta'}</span>
          <span aria-hidden={!shown}>{text}</span>
        </span>
        <button type="button" className={BTN_ICON} aria-label={shown ? 'Ocultar la clave' : 'Mostrar la clave'} onClick={() => setShown((value) => !value)}>
          {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
        <button type="button" className={BTN_ICON} aria-label="Copiar la clave" onClick={() => void copy()}>
          {copied ? <Check className="text-[#35f46e]" aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
