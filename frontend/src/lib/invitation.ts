// Invitaciones por link: /app/mi-equipo?invitacion=CODIGO
// El código se guarda en el navegador para que no se pierda si el invitado
// tiene que iniciar sesión o registrarse antes de aceptarla.

const STORAGE_KEY = 'torneo90-invitacion'
export const INVITE_PARAM = 'invitacion'

export function inviteLink(teamCode: string) {
  return `${window.location.origin}/app/mi-equipo?${INVITE_PARAM}=${encodeURIComponent(teamCode)}`
}

function normalize(code: string | null | undefined) {
  const clean = (code ?? '').trim().toUpperCase()
  return /^[A-Z0-9]{6}$/.test(clean) ? clean : null
}

export function savePendingInvite(code: string | null | undefined) {
  const clean = normalize(code)
  if (!clean) return
  try { localStorage.setItem(STORAGE_KEY, clean) } catch { /* sin almacenamiento: queda solo el link */ }
}

export function readPendingInvite() {
  try { return normalize(localStorage.getItem(STORAGE_KEY)) } catch { return null }
}

export function clearPendingInvite() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* nada que limpiar */ }
}

// Lee la invitación del link actual (y la guarda) o, si no hay, la que quedó guardada.
export function currentInvite(search: string) {
  const fromLink = normalize(new URLSearchParams(search).get(INVITE_PARAM))
  if (fromLink) {
    savePendingInvite(fromLink)
    return fromLink
  }
  return readPendingInvite()
}
