// Escudos elegidos por los equipos: modelos dibujados, colores, imagen propia,
// y las llamadas a Supabase para leerlos y guardarlos.
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export type EscudoModelo = 'pelota' | 'alas' | 'rayo' | 'sol' | 'corona' | 'estrellas' | 'parche' | 'llamas' | 'diamante' | 'montana'
export type EscudoColor = 'verde' | 'amarillo' | 'celeste' | 'naranja' | 'blanco' | 'violeta' | 'rojo' | 'azul' | 'negro'
export type EscudoColor2 = EscudoColor | 'auto'
export type EscudoBorde = 'oro' | 'plata'

// Lo que se guarda en la tabla equipos
export interface Escudo {
  escudo_modelo: EscudoModelo | null
  escudo_color: EscudoColor | null
  escudo_color2: EscudoColor2 | null
  escudo_borde: EscudoBorde | null
  escudo_url: string | null
}

export const MODELOS: Array<{ id: EscudoModelo; nombre: string }> = [
  { id: 'pelota', nombre: 'Pelota' },
  { id: 'alas', nombre: 'Alas' },
  { id: 'rayo', nombre: 'Rayo' },
  { id: 'sol', nombre: 'Sol' },
  { id: 'corona', nombre: 'Corona' },
  { id: 'estrellas', nombre: 'Estrellas' },
  { id: 'parche', nombre: 'Parche' },
  { id: 'llamas', nombre: 'Llamas' },
  { id: 'diamante', nombre: 'Diamante' },
  { id: 'montana', nombre: 'Montaña' },
]

// base, oscuro y claro de cada color
export const ESCUDO_COLORES: Record<EscudoColor, { base: string; dark: string; light: string }> = {
  verde: { base: '#35f46e', dark: '#1a9c45', light: '#8dffb1' },
  amarillo: { base: '#f2c94c', dark: '#b8901f', light: '#ffe79a' },
  celeste: { base: '#56ccf2', dark: '#2a8fb3', light: '#b2ebfc' },
  naranja: { base: '#ff8a4c', dark: '#c45a22', light: '#ffc4a3' },
  blanco: { base: '#e9f0eb', dark: '#9fb3a6', light: '#ffffff' },
  violeta: { base: '#c18cff', dark: '#8350cc', light: '#e6d1ff' },
  rojo: { base: '#e5484d', dark: '#9e1f24', light: '#ff9a9d' },
  azul: { base: '#3b6ff5', dark: '#1d3fa3', light: '#a9c0ff' },
  negro: { base: '#2a332e', dark: '#0e1411', light: '#56635b' },
}

export const COLORES = Object.keys(ESCUDO_COLORES) as EscudoColor[]

// Elección por defecto al crear un equipo
export const ESCUDO_INICIAL = { modelo: 'pelota' as EscudoModelo, color: 'verde' as EscudoColor, color2: 'auto' as EscudoColor2, borde: 'oro' as EscudoBorde }

const COLUMNAS = 'nombre, escudo_modelo, escudo_color, escudo_color2, escudo_borde, escudo_url'

// Todos los escudos elegidos, por nombre de equipo (el nombre es único).
// Así cualquier pantalla que dibuja un escudo con el nombre muestra el elegido.
async function getEscudos(): Promise<Map<string, Escudo>> {
  const { data, error } = await supabase
    .from('equipos')
    .select(COLUMNAS)
    .or('escudo_modelo.not.is.null,escudo_url.not.is.null')
  if (error) throw error
  return new Map(((data ?? []) as Array<Escudo & { nombre: string }>).map(({ nombre, ...escudo }) => [nombre, escudo]))
}

export function useEscudo(nombre: string | undefined, enabled = true): Escudo | undefined {
  const query = useQuery({ queryKey: ['escudos'], queryFn: getEscudos, staleTime: 5 * 60 * 1000, enabled })
  return nombre ? query.data?.get(nombre) : undefined
}

// Sube la imagen a escudos/<equipo_id>/<fecha>.<ext> y devuelve su URL pública
export async function subirImagenEscudo(equipoId: number, archivo: File): Promise<string> {
  const ext = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg'
  const ruta = `${equipoId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('escudos').upload(ruta, archivo, { contentType: archivo.type, upsert: false })
  if (error) throw error
  return supabase.storage.from('escudos').getPublicUrl(ruta).data.publicUrl
}

// Borra las imágenes viejas del equipo (todas menos la que queda en uso)
async function borrarImagenesViejas(equipoId: number, urlEnUso: string | null) {
  const { data } = await supabase.storage.from('escudos').list(String(equipoId))
  const viejas = (data ?? [])
    .map((archivo) => `${equipoId}/${archivo.name}`)
    .filter((ruta) => !urlEnUso || !urlEnUso.endsWith(ruta))
  if (viejas.length > 0) await supabase.storage.from('escudos').remove(viejas)
}

export const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_IMAGEN = 2 * 1024 * 1024

// Lo que el usuario eligió en el selector
export interface EleccionEscudo {
  modo: 'modelo' | 'imagen'
  modelo: EscudoModelo
  color: EscudoColor
  color2: EscudoColor2
  borde: EscudoBorde
  archivo: File | null // imagen nueva para subir
  url: string | null // imagen que ya tenía guardada
}

export function validarImagen(archivo: File): string | null {
  if (!TIPOS_IMAGEN.includes(archivo.type)) return 'La imagen tiene que ser PNG, JPG o WEBP.'
  if (archivo.size > MAX_IMAGEN) return 'La imagen no puede pesar más de 2 MB.'
  return null
}

// Guarda la elección: sube la imagen si hay una nueva y llama a cambiar_escudo()
export async function guardarEscudo(equipoId: number, eleccion: EleccionEscudo) {
  let url: string | null = null
  if (eleccion.modo === 'imagen') {
    url = eleccion.archivo ? await subirImagenEscudo(equipoId, eleccion.archivo) : eleccion.url
    if (!url) throw new Error('Elegí una imagen para el escudo.')
  }
  const { error } = await supabase.rpc('cambiar_escudo', {
    p_equipo_id: equipoId,
    p_modelo: eleccion.modelo,
    p_color: eleccion.color,
    p_color2: eleccion.color2,
    p_borde: eleccion.borde,
    p_url: url,
  })
  if (error) throw error
  // Limpieza: si falla no pasa nada, el escudo ya quedó guardado
  await borrarImagenesViejas(equipoId, url).catch(() => undefined)
}

// Elección inicial a partir de lo guardado (o los valores por defecto)
export function eleccionDesde(escudo: Escudo | undefined): EleccionEscudo {
  return {
    modo: escudo?.escudo_url ? 'imagen' : 'modelo',
    modelo: escudo?.escudo_modelo ?? ESCUDO_INICIAL.modelo,
    color: escudo?.escudo_color ?? ESCUDO_INICIAL.color,
    color2: escudo?.escudo_color2 ?? ESCUDO_INICIAL.color2,
    borde: escudo?.escudo_borde ?? ESCUDO_INICIAL.borde,
    archivo: null,
    url: escudo?.escudo_url ?? null,
  }
}
