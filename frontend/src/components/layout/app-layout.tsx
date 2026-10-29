import { Menu, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { AppSidebar } from '@/components/layout/app-sidebar'
import { Brand } from '@/components/shared/brand'

const PANEL_ID = 'app-drawer-panel'

export function AppLayout() {
  const { pathname } = useLocation()
  // El drawer de daisyUI (celular) se controla con el checkbox. Guardamos la ruta en la que se abrió:
  // si se navega a otra ruta queda cerrado solo, sin efectos extra.
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt === pathname
  const openDrawer = useCallback(() => setOpenedAt(pathname), [pathname])
  const closeDrawer = useCallback(() => setOpenedAt(null), [])

  const pageRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const wasOpen = useRef(false)

  // Transición de página: al cambiar de ruta reiniciamos la animación de entrada del
  // contenido sin volver a montar la página (no se pierde estado ni se repiten consultas)
  useLayoutEffect(() => {
    const el = pageRef.current
    if (!el) return
    el.classList.remove('anim-page')
    void el.offsetWidth // fuerza el reflow para que la animación arranque de nuevo
    el.classList.add('anim-page')
  }, [pathname])

  // Foco: al abrir pasa al menú; al cerrar vuelve al botón que lo abrió
  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => panelRef.current?.focus())
      wasOpen.current = true
      return () => cancelAnimationFrame(frame)
    }
    if (wasOpen.current) {
      wasOpen.current = false
      toggleRef.current?.focus()
    }
  }, [open])

  // Escape cierra el menú mientras está abierto
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, closeDrawer])

  return (
    <div className="drawer lg:drawer-open min-h-screen bg-base-100">
      {/* El checkbox sólo maneja el CSS del drawer: se abre y cierra con los botones */}
      <input id="app-drawer" type="checkbox" className="drawer-toggle" checked={open} onChange={(event) => (event.target.checked ? openDrawer() : closeDrawer())} tabIndex={-1} aria-hidden="true" />
      <div className="drawer-content min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-base-content/10 px-4 lg:hidden">
          <Brand compact />
          <button ref={toggleRef} type="button" className="btn btn-ghost btn-square" aria-label="Abrir panel" aria-expanded={open} aria-controls={PANEL_ID} onClick={openDrawer}>
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </header>
        <main className="min-h-screen p-5 sm:p-8 xl:p-10">
          <div ref={pageRef} className="anim-page mx-auto max-w-7xl"><Outlet /></div>
        </main>
      </div>
      <div className="drawer-side z-50">
        <button type="button" aria-label="Cerrar panel" tabIndex={-1} className="drawer-overlay" onClick={closeDrawer} />
        <aside ref={panelRef} id={PANEL_ID} tabIndex={-1} aria-label="Panel de navegación" className="relative h-full w-72 border-r border-[#f4f8f5]/10 shadow-[6px_0_24px_rgba(0,0,0,0.35)] outline-none">
          <button type="button" className="btn btn-ghost btn-square btn-sm absolute right-3 top-3 z-10 text-[#f4f8f5] lg:hidden" aria-label="Cerrar panel" onClick={closeDrawer}>
            <X className="size-5" aria-hidden="true" />
          </button>
          <AppSidebar close={closeDrawer} />
        </aside>
      </div>
    </div>
  )
}
