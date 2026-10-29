// Colores e identidad visual de cada equipo, derivados de su nombre.
// No se guardan en la base: el mismo nombre siempre da el mismo color y camiseta.

export type TeamColorKey = 'verde' | 'amarillo' | 'celeste' | 'naranja' | 'blanco' | 'violeta'
export type JerseyPattern = 'lisa' | 'bastones' | 'bandas'

export const TEAM_COLORS: Record<TeamColorKey, { base: string; dark: string; light: string }> = {
  verde: { base: '#35f46e', dark: '#1a9c45', light: '#8dffb1' },
  amarillo: { base: '#f2c94c', dark: '#b8901f', light: '#ffe79a' },
  celeste: { base: '#56ccf2', dark: '#2a8fb3', light: '#b2ebfc' },
  naranja: { base: '#ff8a4c', dark: '#c45a22', light: '#ffc4a3' },
  blanco: { base: '#e9f0eb', dark: '#9fb3a6', light: '#ffffff' },
  violeta: { base: '#c18cff', dark: '#8350cc', light: '#e6d1ff' },
}

const KEYS = Object.keys(TEAM_COLORS) as TeamColorKey[]
const PATTERNS: JerseyPattern[] = ['bastones', 'bandas', 'lisa']

function hash(text: string) {
  let value = 0
  for (const char of (text ?? '').trim().toLowerCase()) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
}

export function teamColorKey(name: string): TeamColorKey {
  return KEYS[hash(name) % KEYS.length]
}

export function teamPattern(name: string): JerseyPattern {
  return PATTERNS[Math.floor(hash(name) / KEYS.length) % PATTERNS.length]
}

// "Los Pibes" -> "LP", "Atlético Ramos" -> "AR", "River" -> "RI"
export function teamInitials(name: string) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'EQ'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words.slice(0, 3).map((word) => word[0]).join('').toUpperCase()
}

export function personInitials(name: string) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  // Nombre vacío o solo espacios: un signo neutro en lugar de romper la pantalla
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
