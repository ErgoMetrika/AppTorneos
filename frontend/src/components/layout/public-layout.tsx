import { LogIn, Menu, UserPlus } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { Brand } from '@/components/shared/brand'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/torneos', label: 'Torneos' },
  { to: '/equipos', label: 'Equipos' },
  { to: '/contacto', label: 'Contacto' },
]

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'border-b-2 border-transparent py-2 font-mono text-[0.68rem] font-bold uppercase tracking-[0.12em] text-base-content/55 transition-colors hover:text-base-content',
    isActive && 'border-primary text-base-content',
  )
}

export function PublicLayout() {
  const { session } = useAuth()

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <header className="sticky top-0 z-50 border-b border-base-content/10 bg-base-100/90 backdrop-blur-xl">
        <div className="container-shell flex h-20 items-center justify-between gap-6">
          <Brand />

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Navegación principal">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            {session ? (
              <Button asChild size="sm">
                <NavLink to="/app/torneos">Ir al panel</NavLink>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <NavLink to="/login"><LogIn className="size-4" /> Ingresar</NavLink>
                </Button>
                <Button asChild size="sm">
                  <NavLink to="/registro"><UserPlus className="size-4" /> Registrarme</NavLink>
                </Button>
              </>
            )}
          </div>

          <div className="dropdown dropdown-end lg:hidden">
            <button type="button" tabIndex={0} className="btn btn-ghost btn-square" aria-label="Abrir menú">
              <Menu className="size-5" />
            </button>
            <ul tabIndex={0} className="menu dropdown-content z-50 mt-3 w-56 rounded-box border border-base-content/10 bg-base-200 p-2 shadow-xl">
              {navItems.map((item) => (
                <li key={item.to}><NavLink to={item.to} end={item.end}>{item.label}</NavLink></li>
              ))}
              <li><NavLink to={session ? '/app/torneos' : '/login'}>{session ? 'Ir al panel' : 'Ingresar'}</NavLink></li>
            </ul>
          </div>
        </div>
      </header>

      <main><Outlet /></main>

      <footer className="border-t border-base-content/10 bg-base-200/45">
        <div className="container-shell flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <p className="text-xs text-base-content/45">Torneos de eliminación directa para fútbol 5, 7, 9 y 11.</p>
        </div>
      </footer>
    </div>
  )
}
