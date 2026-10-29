import { useCallback, useSyncExternalStore } from 'react'

// La base no tiene columna de "leída": las marcas se guardan sólo en este navegador
const STORAGE_KEY = 'torneo90-consultas-leidas'

const listeners = new Set<() => void>()
let current: ReadonlySet<number> | null = null

function parse(raw: string | null): ReadonlySet<number> {
  if (!raw) return new Set()
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return new Set()
    return new Set(value.filter((id): id is number => typeof id === 'number' && Number.isFinite(id)))
  } catch {
    return new Set()
  }
}

function load(): ReadonlySet<number> {
  try {
    return parse(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    // Ventana privada o almacenamiento bloqueado: arrancamos sin marcas
    return new Set()
  }
}

function getSnapshot(): ReadonlySet<number> {
  if (current === null) current = load()
  return current
}

function save(next: ReadonlySet<number>) {
  current = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
  } catch {
    // Si no se puede guardar, la marca dura hasta recargar la página
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Si se marcan en otra pestaña, nos enteramos acá también
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    current = load()
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

const EMPTY: ReadonlySet<number> = new Set()

// Ids de consultas leídas + funciones para cambiarlas
export function useReadContacts() {
  const readIds = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)

  const setRead = useCallback((id: number, read: boolean) => {
    const next = new Set(getSnapshot())
    if (read) next.add(id)
    else next.delete(id)
    save(next)
  }, [])

  // Al borrar una consulta sacamos su marca para no acumular basura
  const forget = useCallback((id: number) => {
    if (!getSnapshot().has(id)) return
    const next = new Set(getSnapshot())
    next.delete(id)
    save(next)
  }, [])

  return { readIds, setRead, forget }
}
