import { supabase } from '@/lib/supabase'
import type {
  EquipoDetalle,
  EquipoAdmin,
  EquipoResumen,
  JugadorDetalle,
  MiEquipo,
  NuevoJugadorInput,
  NuevoTorneoInput,
  PartidoLlave,
  PerfilUsuario,
  PosicionJugador,
  Torneo,
  TorneoDetalle,
  TorneoListado,
  UsuarioSeleccionable,
} from '@/types/domain'

const tournamentOwnerColumnEnabled = import.meta.env.VITE_TOURNAMENT_OWNER_COLUMN === 'true'

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

export async function getTournament(id: number, includeAccessCode = false, privateCode?: string): Promise<TorneoDetalle> {
  const fields = [
    'id', 'nombre', 'descripcion', 'tipo_futbol', 'max_equipos', 'visibilidad', 'fecha', 'lugar', 'estado',
    ...(includeAccessCode ? ['codigo_acceso'] : []),
    ...(tournamentOwnerColumnEnabled ? ['user_id'] : []),
  ].join(', ')
  const { data, error } = await supabase
    .from('torneos')
    .select(`${fields}, torneo_equipos(inscripto_en, equipos(id, nombre))`)
    .eq('id', id)
    .single()

  if (error && privateCode) {
    const privateTournaments = await searchPrivateTournament(privateCode)
    const privateTournament = privateTournaments.find((tournament) => tournament.id === id)
    if (privateTournament) {
      return { ...privateTournament, codigo_acceso: includeAccessCode ? privateTournament.codigo_acceso : undefined, equipos: [] }
    }
  }
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
    .select('id, nombre, jugadores(id, usuario_id, posicion, unido_en, usuarios(nombre))')
    .eq('id', id)
    .single()

  throwIfError(error)
  if (!data) throw new Error('El equipo no existe.')
  const raw = data as unknown as {
    id: number
    nombre: string
    jugadores: Array<{
      id: number
      usuario_id: string
      posicion: PosicionJugador
      unido_en: string
      usuarios: { nombre: string } | Array<{ nombre: string }> | null
    }>
  }
  const jugadores = (raw.jugadores ?? []).flatMap((player) => {
    const user = Array.isArray(player.usuarios) ? player.usuarios[0] : player.usuarios
    return user ? [{ id: player.id, usuario_id: player.usuario_id, nombre: user.nombre, posicion: player.posicion, unido_en: player.unido_en }] : []
  })

  return { id: raw.id, nombre: raw.nombre, jugadores }
}

export async function getPlayers(): Promise<JugadorDetalle[]> {
  const { data, error } = await supabase
    .from('jugadores')
    .select('id, usuario_id, equipo_id, posicion, unido_en, usuarios(nombre), equipos(nombre)')
    .order('unido_en', { ascending: false })

  throwIfError(error)
  return (data ?? []).flatMap((row) => {
    const raw = row as unknown as {
      id: number
      usuario_id: string
      equipo_id: number
      posicion: PosicionJugador
      unido_en: string
      usuarios: { nombre: string } | Array<{ nombre: string }> | null
      equipos: { nombre: string } | Array<{ nombre: string }> | null
    }
    const user = Array.isArray(raw.usuarios) ? raw.usuarios[0] : raw.usuarios
    const team = Array.isArray(raw.equipos) ? raw.equipos[0] : raw.equipos
    return user && team ? [{
      id: raw.id,
      usuario_id: raw.usuario_id,
      nombre: user.nombre,
      posicion: raw.posicion,
      unido_en: raw.unido_en,
      equipo_id: raw.equipo_id,
      equipo: team.nombre,
    }] : []
  })
}

export async function getPlayer(id: number): Promise<JugadorDetalle> {
  const { data, error } = await supabase
    .from('jugadores')
    .select('id, usuario_id, equipo_id, posicion, unido_en, usuarios(nombre), equipos(nombre)')
    .eq('id', id)
    .single()

  throwIfError(error)
  if (!data) throw new Error('El jugador no existe.')
  const raw = data as unknown as {
    id: number
    usuario_id: string
    equipo_id: number
    posicion: PosicionJugador
    unido_en: string
    usuarios: { nombre: string } | Array<{ nombre: string }> | null
    equipos: { nombre: string } | Array<{ nombre: string }> | null
  }
  const user = Array.isArray(raw.usuarios) ? raw.usuarios[0] : raw.usuarios
  const team = Array.isArray(raw.equipos) ? raw.equipos[0] : raw.equipos
  if (!user || !team) throw new Error('No se pudo cargar el perfil del jugador.')
  return {
    id: raw.id,
    usuario_id: raw.usuario_id,
    nombre: user.nombre,
    posicion: raw.posicion,
    unido_en: raw.unido_en,
    equipo_id: raw.equipo_id,
    equipo: team.nombre,
  }
}

export async function getAvailableUsers(): Promise<UsuarioSeleccionable[]> {
  const [{ data: users, error: usersError }, { data: players, error: playersError }] = await Promise.all([
    supabase.from('usuarios').select('id, nombre, email, rol').eq('rol', 'general').order('nombre'),
    supabase.from('jugadores').select('usuario_id'),
  ])
  throwIfError(usersError)
  throwIfError(playersError)
  const assigned = new Set((players ?? []).map((player) => player.usuario_id))
  return (users ?? []).filter((user) => !assigned.has(user.id)) as UsuarioSeleccionable[]
}

export async function createAdminTeam(nombre: string): Promise<EquipoAdmin> {
  const { data, error } = await supabase
    .from('equipos')
    .insert({ nombre: nombre.trim() })
    .select('id, nombre, creado_en')
    .single()
  throwIfError(error)
  return data as EquipoAdmin
}

export async function createPlayer(input: NuevoJugadorInput): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from('jugadores')
    .insert(input)
    .select('id')
    .single()
  throwIfError(error)
  return data as { id: number }
}

export async function updatePlayer(id: number, input: Pick<NuevoJugadorInput, 'equipo_id' | 'posicion'>) {
  const { error } = await supabase.from('jugadores').update(input).eq('id', id)
  throwIfError(error)
}

export async function deletePlayer(id: number) {
  const { error } = await supabase.from('jugadores').delete().eq('id', id)
  throwIfError(error)
}

export async function generateBracket(tournamentId: number) {
  const { data, error } = await supabase.rpc('generar_llave', { p_torneo_id: tournamentId })
  throwIfError(error)
  return data
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

export async function createTeam(input: { nombre: string; posicion: PosicionJugador }): Promise<{ id: number }> {
  const { data, error } = await supabase.rpc('crear_equipo', {
    p_nombre: input.nombre.trim(),
    p_posicion: input.posicion,
  })
  throwIfError(error)
  return data as { id: number }
}

export async function joinTeam(input: { codigo: string; posicion: PosicionJugador }) {
  const { data, error } = await supabase.rpc('unirse_a_equipo', {
    p_codigo: input.codigo.trim().toUpperCase(),
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
  const { user_id, ...tournament } = input
  const { data, error } = await supabase
    .from('torneos')
    .insert({
      ...tournament,
      ...(tournamentOwnerColumnEnabled && user_id ? { user_id } : {}),
      descripcion: input.descripcion || null,
      lugar: input.lugar || null,
    })
    .select()
    .single()

  throwIfError(error)
  return data as Torneo
}
