import { supabase } from '@/lib/supabase'
import type {
  Contacto,
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
  TorneoDelEquipo,
  TorneoListado,
  UsuarioBuscado,
  UsuarioSeleccionable,
} from '@/types/domain'

const tournamentOwnerColumnEnabled = import.meta.env.VITE_TOURNAMENT_OWNER_COLUMN === 'true'

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function getTournaments(): Promise<TorneoListado[]> {
  const { data, error } = await supabase
    .from('torneos')
    .select('id, nombre, descripcion, tipo_futbol, max_equipos, visibilidad, fecha, lugar, estado, torneo_equipos(equipos(id, nombre))')
    .order('fecha')

  throwIfError(error)
  // Cada torneo trae sus equipos inscriptos (para dibujar el cupo con escudos y nombres)
  return ((data ?? []) as unknown as Array<Torneo & { torneo_equipos?: Array<{ equipos: { id: number; nombre: string } | Array<{ id: number; nombre: string }> | null }> }>).map(({ torneo_equipos, ...row }) => {
    const equipos = (torneo_equipos ?? [])
      .map((item) => (Array.isArray(item.equipos) ? item.equipos[0] : item.equipos))
      .filter((team): team is { id: number; nombre: string } => !!team)
    return { ...row, inscriptos: equipos.length, equipos_inscriptos: equipos }
  }) as TorneoListado[]
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
    .select('id, nombre, creado_por, jugadores(id, usuario_id, posicion, unido_en, usuarios(nombre))')
    .eq('id', id)
    .single()

  throwIfError(error)
  if (!data) throw new Error('El equipo no existe.')
  const raw = data as unknown as {
    id: number
    nombre: string
    creado_por: string | null
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
    return user ? [{ id: player.id, usuario_id: player.usuario_id, nombre: user.nombre, posicion: player.posicion, unido_en: player.unido_en, es_admin_del_equipo: player.usuario_id === raw.creado_por }] : []
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

// Usuarios generales sin equipo (solo admin). Los mails no se leen directo de la
// tabla: los entrega una función de la base que controla quién pregunta.
export async function getAvailableUsers(): Promise<UsuarioSeleccionable[]> {
  const { data, error } = await supabase.rpc('usuarios_disponibles')
  throwIfError(error)
  return (data ?? []) as UsuarioSeleccionable[]
}

// ¿El texto es un mail completo? La búsqueda de invitados solo funciona con el mail entero.
export function isFullEmail(term: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(term.trim())
}

// Busca un jugador por su mail COMPLETO para invitarlo al equipo.
// Solo puede usarla el administrador del equipo; la base lo controla.
export async function searchUsersByEmail(term: string): Promise<UsuarioBuscado[]> {
  if (!isFullEmail(term)) return []
  const { data, error } = await supabase.rpc('buscar_jugador_por_mail', { p_mail: term.trim() })
  throwIfError(error)
  return (data ?? []) as UsuarioBuscado[]
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

// Perfil del usuario logueado (con su mail). El parámetro queda por compatibilidad:
// la base devuelve siempre el perfil de quien está logueado.
export async function getProfile(_userId: string): Promise<PerfilUsuario> {
  const { data, error } = await supabase.rpc('mi_perfil')
  throwIfError(error)
  const perfil = (data as PerfilUsuario[] | null)?.[0]
  if (!perfil) throw new Error('No encontramos tu perfil.')
  return perfil
}

// ---------- Administrador general ----------

// Carga el resultado de un partido. La base define el ganador (penales si empatan)
// y lo pasa al partido siguiente; si era la final, el torneo queda finalizado.
export async function loadMatchResult(input: { partidoId: number; golesLocal: number; golesVisitante: number; penalesLocal?: number | null; penalesVisitante?: number | null }) {
  const { error } = await supabase.rpc('cargar_resultado', {
    p_partido_id: input.partidoId,
    p_goles_local: input.golesLocal,
    p_goles_visitante: input.golesVisitante,
    p_penales_local: input.penalesLocal ?? null,
    p_penales_visitante: input.penalesVisitante ?? null,
  })
  throwIfError(error)
}

// Edita los datos de un torneo (solo el admin: lo controla la base)
export async function updateTournament(id: number, input: Partial<NuevoTorneoInput>) {
  const { error } = await supabase.from('torneos').update(input).eq('id', id)
  throwIfError(error)
}

// Borra un torneo con sus inscripciones y partidos (solo el admin)
export async function deleteTournament(id: number) {
  const { error } = await supabase.from('torneos').delete().eq('id', id)
  throwIfError(error)
}

// Consultas del formulario de Contacto (solo las lee el admin)
export async function getContacts(): Promise<Contacto[]> {
  const { data, error } = await supabase
    .from('contactos')
    .select('id, nombre, email, mensaje, creado_en')
    .order('creado_en', { ascending: false })
  throwIfError(error)
  return (data ?? []) as Contacto[]
}

export async function deleteContact(id: number) {
  const { error } = await supabase.from('contactos').delete().eq('id', id)
  throwIfError(error)
}

// Torneos en los que está anotado un equipo (los privados solo los ven sus integrantes y el admin)
export async function getTeamTournaments(teamId: number): Promise<TorneoDelEquipo[]> {
  const { data, error } = await supabase
    .from('torneo_equipos')
    .select('torneos(id, nombre, tipo_futbol, estado, fecha, max_equipos)')
    .eq('equipo_id', teamId)
  throwIfError(error)
  return ((data ?? []) as unknown as Array<{ torneos: TorneoDelEquipo | TorneoDelEquipo[] | null }>)
    .map((row) => (Array.isArray(row.torneos) ? row.torneos[0] : row.torneos))
    .filter((torneo): torneo is TorneoDelEquipo => !!torneo)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// Solo para el admin: código de cada equipo, por id de equipo
export async function getTeamCodes(): Promise<Map<number, string>> {
  const { data, error } = await supabase.rpc('codigos_de_equipos')
  throwIfError(error)
  return new Map(((data ?? []) as Array<{ equipo_id: number; codigo_equipo: string }>).map((row) => [row.equipo_id, row.codigo_equipo]))
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

// Administrador del equipo: saca a un invitado
export async function removeTeamPlayer(jugadorId: number) {
  const { error } = await supabase.rpc('quitar_jugador', { p_jugador_id: jugadorId })
  throwIfError(error)
}

// Cualquier jugador: deja su equipo
export async function leaveTeam() {
  const { error } = await supabase.rpc('salir_del_equipo')
  throwIfError(error)
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
