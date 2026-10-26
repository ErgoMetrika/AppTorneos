import { supabase } from '@/lib/supabase'
import type {
  EquipoDetalle,
  EquipoResumen,
  MiEquipo,
  NuevoTorneoInput,
  PartidoLlave,
  PerfilUsuario,
  PosicionJugador,
  Torneo,
  TorneoDetalle,
  TorneoListado,
} from '@/types/domain'

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function getTournaments(): Promise<TorneoListado[]> {
  const { data, error } = await supabase
    .from('torneos')
    .select('id, nombre, descripcion, tipo_futbol, max_equipos, visibilidad, fecha, lugar, estado, torneo_equipos(count)')
    .order('fecha')

  throwIfError(error)
  return (data ?? []).map((row) => ({
    ...row,
    inscriptos: row.torneo_equipos?.[0]?.count ?? 0,
  })) as TorneoListado[]
}

export async function getTournament(id: number): Promise<TorneoDetalle> {
  const { data, error } = await supabase
    .from('torneos')
    .select('*, torneo_equipos(inscripto_en, equipos(id, nombre))')
    .eq('id', id)
    .single()

  throwIfError(error)
  if (!data) throw new Error('El torneo no existe.')
  const raw = data as unknown as Torneo & {
    torneo_equipos: Array<{ inscripto_en: string; equipos: { id: number; nombre: string } | null }>
  }
  const teams = (raw.torneo_equipos ?? [])
    .filter((item) => item.equipos)
    .map((item) => ({
      id: item.equipos!.id,
      nombre: item.equipos!.nombre,
      inscripto_en: item.inscripto_en,
    }))

  return { ...raw, equipos: teams } as TorneoDetalle
}

export async function getBracket(tournamentId: number): Promise<PartidoLlave[]> {
  const { data, error } = await supabase
    .from('v_llave')
    .select('*')
    .eq('torneo_id', tournamentId)
    .order('ronda')
    .order('llave')

  throwIfError(error)
  return (data ?? []) as PartidoLlave[]
}

export async function getTeams(): Promise<EquipoResumen[]> {
  const { data, error } = await supabase
    .from('v_equipo_plantel')
    .select('*')
    .order('equipo')

  throwIfError(error)
  return (data ?? []) as EquipoResumen[]
}

export async function getTeam(id: number): Promise<EquipoDetalle> {
  const { data, error } = await supabase
    .from('equipos')
    .select('id, nombre, jugadores(posicion, usuarios(nombre))')
    .eq('id', id)
    .single()

  throwIfError(error)
  if (!data) throw new Error('El equipo no existe.')
  const raw = data as unknown as {
    id: number
    nombre: string
    jugadores: Array<{
      posicion: PosicionJugador
      usuarios: { nombre: string } | Array<{ nombre: string }> | null
    }>
  }
  const jugadores = (raw.jugadores ?? []).flatMap((player) => {
    const user = Array.isArray(player.usuarios) ? player.usuarios[0] : player.usuarios
    return user ? [{ nombre: user.nombre, posicion: player.posicion }] : []
  })

  return { id: raw.id, nombre: raw.nombre, jugadores }
}

export async function sendContact(input: { nombre: string; email: string; mensaje: string }) {
  const { error } = await supabase.from('contactos').insert(input)
  throwIfError(error)
}

export async function getProfile(userId: string): Promise<PerfilUsuario> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, email, rol')
    .eq('id', userId)
    .single()

  throwIfError(error)
  return data as PerfilUsuario
}

export async function getMyTeam(): Promise<MiEquipo | null> {
  const { data, error } = await supabase.rpc('mi_equipo')
  throwIfError(error)
  return data as MiEquipo | null
}

export async function createTeam(input: { nombre: string; posicion: PosicionJugador }) {
  const { data, error } = await supabase.rpc('crear_equipo', {
    p_nombre: input.nombre,
    p_posicion: input.posicion,
  })
  throwIfError(error)
  return data
}

export async function joinTeam(input: { codigo: string; posicion: PosicionJugador }) {
  const { data, error } = await supabase.rpc('unirse_a_equipo', {
    p_codigo: input.codigo.toUpperCase(),
    p_posicion: input.posicion,
  })
  throwIfError(error)
  return data
}

export async function enrollTeam(input: { tournamentId: number; teamId: number; accessCode?: string }) {
  const { data, error } = await supabase.rpc('inscribir_equipo', {
    p_torneo_id: input.tournamentId,
    p_equipo_id: input.teamId,
    p_codigo_acceso: input.accessCode || null,
  })
  throwIfError(error)
  return data
}

export async function searchPrivateTournament(code: string): Promise<Torneo[]> {
  const { data, error } = await supabase.rpc('buscar_torneo_privado', {
    p_codigo: code.toUpperCase(),
  })
  throwIfError(error)
  return (data ?? []) as Torneo[]
}

export async function createTournament(input: NuevoTorneoInput): Promise<Torneo> {
  const { data, error } = await supabase
    .from('torneos')
    .insert({
      ...input,
      descripcion: input.descripcion || null,
      lugar: input.lugar || null,
    })
    .select()
    .single()

  throwIfError(error)
  return data as Torneo
}
