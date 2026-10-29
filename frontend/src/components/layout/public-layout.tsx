import { Menu } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { TeamCrest } from '@/components/visuals/art'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/torneos', label: 'Torneos' },
  { to: '/contacto', label: 'Contacto' },
]

const footerItems = [
  { to: '/torneos', label: 'Torneos' },
  { to: '/equipos', label: 'Equipos' },
  { to: '/contacto', label: 'Contacto', accent: true },
]

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'relative py-2 text-[15px] font-semibold text-[#b7c8bd] transition-colors hover:text-[#f4f8f5]',
    // Rayita verde debajo del link activo
    'after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 motion-reduce:after:transition-none',
    isActive && 'text-[#f4f8f5] after:scale-x-100',
  )
}

// Marca del sitio público: escudo con el "90" y el nombre con la bajada
function SiteBrand({ small = false }: { small?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-md text-inherit no-underline sm:gap-3" aria-label="Torneo 90' — Inicio">
      <TeamCrest name="90" color="verde" className={cn('w-auto shrink-0 drop-shadow-none', small ? 'h-8' : 'h-10')} />
      <span className="flex flex-col">
        <span className={cn('font-display font-black uppercase leading-none', small ? 'text-xl' : 'text-2xl')}>
          Torneo <span className="text-primary">90&apos;</span>
        </span>
        {!small && <span className="text-xs text-[#8fa596]">Donde empieza el juego</span>}
      </span>
    </Link>
  )
}

const BTN = 'inline-flex h-11 items-center rounded-[10px] px-3.5 text-sm transition sm:px-[18px]'

export function PublicLayout() {
  const { session } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-base-100 text-base-content">
      <header className="sticky top-0 z-50 border-b border-[#f4f8f5]/8 bg-[#06110b]/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1240px] items-center gap-3 px-4 py-[18px] md:gap-7">
          <SiteBrand />

          <nav className="ml-3 hidden items-center gap-7 md:flex" aria-label="Principal">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {session ? (
              <Link to="/app/torneos" className={cn(BTN, 'bg-primary font-extrabold text-[#06110b] hover:bg-[#5cff8c]')}>Ir al panel</Link>
            ) : (
              <>
                <Link to="/login" className={cn(BTN, 'hidden border border-[#f4f8f5]/22 font-bold text-[#f4f8f5] hover:border-primary/60 hover:bg-primary/8 sm:inline-flex')}>Ingresar</Link>
                <Link to="/registro" className={cn(BTN, 'bg-primary font-extrabold text-[#06110b] hover:bg-[#5cff8c]')}>Registrarme</Link>
              </>
            )}

            {/* En pantallas chicas los links van en un menú desplegable */}
            <div className="dropdown dropdown-end md:hidden">
              <button type="button" tabIndex={0} className="btn btn-ghost btn-square btn-sm" aria-label="Abrir menú">
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
        </div>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t border-[#f4f8f5]/8">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-x-7 gap-y-4 px-4 pb-9 pt-7">
          <SiteBrand small />
          <span className="text-sm text-[#8fa596]">Donde empieza el juego</span>
          <nav aria-label="Pie de página" className="flex gap-5 sm:ml-auto">
            {footerItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn('text-sm transition-colors', item.accent ? 'font-bold text-primary hover:text-[#7dffa3]' : 'font-semibold text-[#b7c8bd] hover:text-[#f4f8f5]')}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  )
}
