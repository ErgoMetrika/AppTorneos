import { Contact, LogOut, Menu, PlusCircle, Shield, Trophy, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { Brand } from '@/components/shared/brand'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/utils'

const baseItems = [
  { to: '/app/torneos', label: 'Torneos', icon: Trophy },
  { to: '/app/equipos', label: 'Equipos', icon: Shield },
  { to: '/app/mi-equipo', label: 'Mi equipo', icon: Users },
  { to: '/contacto', label: 'Contacto', icon: Contact },
]

function SidebarContent({ close }: { close?: () => void }) {
  const { profile, isAdmin, signOut } = useAuth()
  const items = isAdmin
    ? [...baseItems, { to: '/app/admin/torneos/nuevo', label: 'Nuevo torneo', icon: PlusCircle }]
    : baseItems

  return (
    <div className="flex h-full flex-col bg-base-200/75 p-4">
      <div className="px-2 py-3"><Brand /></div>
      <div className="my-5 h-px bg-base-content/10" />
      <p className="px-3 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] text-base-content/35">Organización</p>
      <nav className="mt-3 flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={close}
              className={({ isActive }) => cn(
                'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-base-content/55 transition-colors hover:bg-base-300 hover:text-base-content',
                isActive && 'bg-primary text-primary-content hover:bg-primary hover:text-primary-content',
              )}
            >
              <Icon className="size-4" /> {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="mt-auto rounded-lg border border-base-content/10 bg-base-100/60 p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-primary/15 font-display font-bold text-primary">
            {profile?.nombre?.slice(0, 2).toUpperCase() ?? 'U'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{profile?.nombre ?? 'Usuario'}</p>
            <p className="font-mono text-[0.58rem] uppercase tracking-wider text-base-content/40">{profile?.rol ?? 'general'}</p>
          </div>
          <button type="button" onClick={() => void signOut()} className="btn btn-ghost btn-square btn-sm" aria-label="Cerrar sesión">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AppLayout() {
  return (
    <div className="drawer lg:drawer-open min-h-screen bg-base-100">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-base-content/10 px-4 lg:hidden">
          <Brand compact />
          <label htmlFor="app-drawer" className="btn btn-ghost btn-square" aria-label="Abrir panel">
            <Menu className="size-5" />
          </label>
        </header>
        <main className="min-h-screen p-5 sm:p-8 xl:p-10">
          <div className="mx-auto max-w-7xl"><Outlet /></div>
        </main>
      </div>
      <div className="drawer-side z-50">
        <label htmlFor="app-drawer" aria-label="Cerrar panel" className="drawer-overlay" />
        <aside className="h-full w-72 border-r border-base-content/10"><SidebarContent /></aside>
      </div>
    </div>
  )
}
