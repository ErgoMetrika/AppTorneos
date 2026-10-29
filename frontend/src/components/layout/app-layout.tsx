import { Menu } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { AppSidebar } from '@/components/layout/app-sidebar'
import { Brand } from '@/components/shared/brand'

export function AppLayout() {
  // El drawer de daisyUI se controla con el checkbox: lo cerramos al navegar desde el menú (mobile)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const pageRef = useRef<HTMLDivElement>(null)

  // Transición de página: al cambiar de ruta reiniciamos la animación de entrada del
  // contenido sin volver a montar la página (no se pierde estado ni se repiten consultas)
  useLayoutEffect(() => {
    const el = pageRef.current
    if (!el) return
    el.classList.remove('anim-page')
    void el.offsetWidth // fuerza el reflow para que la animación arranque de nuevo
    el.classList.add('anim-page')
  }, [pathname])

  return (
    <div className="drawer lg:drawer-open min-h-screen bg-base-100">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" checked={open} onChange={(event) => setOpen(event.target.checked)} />
      <div className="drawer-content min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-base-content/10 px-4 lg:hidden">
          <Brand compact />
          <label htmlFor="app-drawer" className="btn btn-ghost btn-square" aria-label="Abrir panel">
            <Menu className="size-5" />
          </label>
        </header>
        <main className="min-h-screen p-5 sm:p-8 xl:p-10">
          <div ref={pageRef} className="anim-page mx-auto max-w-7xl"><Outlet /></div>
        </main>
      </div>
      <div className="drawer-side z-50">
        <label htmlFor="app-drawer" aria-label="Cerrar panel" className="drawer-overlay" />
        <aside className="h-full w-72 border-r border-[#f4f8f5]/10 shadow-[6px_0_24px_rgba(0,0,0,0.35)]">
          <AppSidebar close={() => setOpen(false)} />
        </aside>
      </div>
    </div>
  )
}
