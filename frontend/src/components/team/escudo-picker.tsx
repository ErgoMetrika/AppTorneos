// Selector de escudo: modelo dibujado (con colores y borde) o imagen propia.
// Se usa al crear un equipo y al cambiar el escudo desde la ficha del equipo.
import { ImageIcon, Upload } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, type ReactNode } from 'react'
import { toast } from 'sonner'

import { ProCrest } from '@/components/visuals/pro-crest'
import { COLORES, ESCUDO_COLORES, MODELOS, validarImagen, type EleccionEscudo, type EscudoColor2 } from '@/lib/escudos'
import { cn } from '@/lib/utils'

const ETIQUETA = 'font-mono text-[0.65rem] font-bold uppercase tracking-widest text-base-content/55'

function Muestra({ hex, activo, etiqueta, onClick, children }: { hex: string; activo: boolean; etiqueta: string; onClick: () => void; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      aria-label={etiqueta}
      title={etiqueta}
      style={{ background: hex }}
      className={cn('grid size-9 place-items-center rounded-full border-[3px] border-base-200 text-[0.6rem] font-bold text-base-content/70 outline-none transition focus-visible:ring-2 focus-visible:ring-primary', activo ? 'ring-[3px] ring-base-content' : 'ring-1 ring-base-content/25 hover:ring-base-content/60')}
    >
      {children}
    </button>
  )
}

export function EscudoPicker({ nombre, value, onChange }: { nombre: string; value: EleccionEscudo; onChange: (value: EleccionEscudo) => void }) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const set = (cambios: Partial<EleccionEscudo>) => onChange({ ...value, ...cambios })
  const nombreVisible = nombre.trim() || 'Tu equipo'

  // Vista previa de la imagen recién elegida (todavía no subida)
  const previa = useMemo(() => (value.archivo ? URL.createObjectURL(value.archivo) : null), [value.archivo])
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa) }, [previa])
  const imagen = previa ?? value.url
  const enImagen = value.modo === 'imagen'

  const elegirArchivo = (archivo: File | undefined) => {
    if (!archivo) return
    const error = validarImagen(archivo)
    if (error) {
      toast.error(error)
      return
    }
    set({ modo: 'imagen', archivo })
  }

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_200px]">
      <div className="min-w-0 space-y-5">
        <fieldset>
          <legend className={cn(ETIQUETA, 'mb-2')}>Modelo</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {MODELOS.map((modelo) => {
              const activo = !enImagen && value.modelo === modelo.id
              return (
                <button
                  key={modelo.id}
                  type="button"
                  onClick={() => set({ modo: 'modelo', modelo: modelo.id })}
                  aria-pressed={activo}
                  className={cn('flex flex-col items-center gap-1 rounded-lg border-2 bg-base-100/70 px-1 pb-1.5 pt-2.5 text-[0.7rem] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-primary', activo ? 'border-primary bg-primary/10' : 'border-base-content/10 hover:border-base-content/30')}
                >
                  <ProCrest name={nombreVisible} modelo={modelo.id} color={value.color} color2={value.color2} borde={value.borde} className="h-14 w-12" />
                  {modelo.nombre}
                </button>
              )
            })}
            <label
              htmlFor={inputId}
              onClick={() => { if (imagen) set({ modo: 'imagen' }) }}
              className={cn('relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-1 pb-1.5 pt-2.5 text-center text-[0.7rem] font-semibold transition focus-within:ring-2 focus-within:ring-primary', enImagen ? 'border-primary bg-primary/10' : 'border-primary/40 bg-base-100/70 hover:border-primary/70')}
            >
              <span className="grid h-14 w-12 place-items-center"><Upload className="size-6 text-primary" aria-hidden="true" /></span>
              Subir imagen
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => { elegirArchivo(event.target.files?.[0]); event.target.value = '' }}
              />
            </label>
          </div>
        </fieldset>

        {enImagen ? (
          <p className="rounded-lg border border-base-content/10 bg-base-100/60 p-3 text-xs leading-5 text-base-content/55">
            PNG, JPG o WEBP de hasta 2 MB. Queda mejor con fondo transparente y el escudo centrado.
            {imagen && <> <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => inputRef.current?.click()}>Cambiar imagen</button></>}
          </p>
        ) : (
          <>
            <fieldset>
              <legend className={cn(ETIQUETA, 'mb-2')}>Color principal</legend>
              <div className="flex flex-wrap gap-2">
                {COLORES.map((color) => <Muestra key={color} hex={ESCUDO_COLORES[color].base} activo={value.color === color} etiqueta={`Color principal ${color}`} onClick={() => set({ color })} />)}
              </div>
            </fieldset>
            <fieldset>
              <legend className={cn(ETIQUETA, 'mb-2')}>Color secundario</legend>
              <div className="flex flex-wrap gap-2">
                <Muestra hex="#06110b" activo={value.color2 === 'auto'} etiqueta="Color secundario automático" onClick={() => set({ color2: 'auto' })}>Auto</Muestra>
                {COLORES.map((color) => <Muestra key={color} hex={ESCUDO_COLORES[color].base} activo={value.color2 === color} etiqueta={`Color secundario ${color}`} onClick={() => set({ color2: color as EscudoColor2 })} />)}
              </div>
            </fieldset>
            <fieldset>
              <legend className={cn(ETIQUETA, 'mb-2')}>Borde</legend>
              <div className="inline-flex gap-1 rounded-lg border border-base-content/10 bg-base-100/70 p-1">
                {(['oro', 'plata'] as const).map((borde) => (
                  <button
                    key={borde}
                    type="button"
                    onClick={() => set({ borde })}
                    aria-pressed={value.borde === borde}
                    className={cn('min-h-9 rounded-md px-4 text-xs font-bold capitalize transition', value.borde === borde ? (borde === 'oro' ? 'bg-[#f2c94c] text-[#0b1b12]' : 'bg-[#d5dde1] text-[#0b1b12]') : 'text-base-content/60 hover:text-base-content')}
                  >
                    {borde}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-base-content/10 bg-[radial-gradient(circle_at_50%_40%,rgba(53,244,110,0.14),transparent_70%)] p-4">
        <p className={ETIQUETA}>Vista previa</p>
        {enImagen ? (
          imagen ? (
            <img src={imagen} alt={`Escudo de ${nombreVisible}`} className="h-44 w-[150px] object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.5)]" />
          ) : (
            <label htmlFor={inputId} className="flex h-44 w-[150px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/50 p-3 text-center text-xs text-base-content/60">
              <ImageIcon className="size-8 text-primary" aria-hidden="true" />
              <span className="font-bold text-base-content">Subí tu escudo</span>
            </label>
          )
        ) : (
          <ProCrest name={nombreVisible} modelo={value.modelo} color={value.color} color2={value.color2} borde={value.borde} label={`Escudo de ${nombreVisible}`} className="h-44 w-[154px]" />
        )}
        <p className="max-w-full truncate text-center font-display text-xl font-black uppercase">{nombreVisible}</p>
      </div>
    </div>
  )
}
