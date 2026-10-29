import { useQuery } from '@tanstack/react-query'
import { Contact, LockKeyhole, LogOut, Plus, Shield, Trophy as TrophyIcon, UserRound, Users, type LucideIcon } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import { EmptyCrest, PlayerAvatar, TeamCrest, Trophy } from '@/components/visuals/art'
import { useAuth } from '@/context/auth-context'
import { getMyTeam, getTournaments } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import type { TorneoListado } from '@/types/domain'

interface NavItem { to: string; label: string; icon: LucideIcon; action?: boolean }
interface NavSection { id: string; label: string; items: NavItem[] }

const torneos: NavItem = { to: '/app/torneos', label: 'Torneos', icon: TrophyIcon }
const equipos: NavItem = { to: '/app/equipos', label: 'Equipos', icon: Shield }
// Contacto se abre dentro del panel, sin salir al sitio público
const contacto: NavItem = { to: '/app/contacto', label: 'Contacto', icon: Contact }

// Jugador general: no ve Jugadores, tiene Mi equipo
const playerSections: NavSection[] = [
  { id: 'jugar', label: 'Jugar', items: [torneos, { to: '/app/mi-equipo', label: 'Mi equipo', icon: Users }] },
  { id: 'explorar', label: 'Explorar', items: [equipos] },
  { id: 'ayuda', label: 'Ayuda', items: [contacto] },
]

// Admin general: gestiona jugadores y crea torneos
const adminSections: NavSection[] = [
  { id: 'gestion', label: 'Gestión', items: [torneos, equipos, { to: '/app/jugadores', label: 'Jugadores', icon: UserRound }] },
  { id: 'crear', label: 'Crear', items: [{ to: '/app/admin/torneos/nuevo', label: 'Nuevo torneo', icon: Plus, action: true }] },
  { id: 'ayuda', label: 'Ayuda', items: [contacto] },
]

const sectionLabel = 'mb-1.5 ml-3 font-mono text-[0.625rem] font-bold uppercase tracking-[0.16em] text-[#8fa596]'

function SidebarNav({ sections, label, close }: { sections: NavSection[]; label: string; close: () => void }) {
  return (
    <nav aria-label={label} className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.id}>
          <p id={`nav-${section.id}`} className={sectionLabel}>{section.label}</p>
          <div role="group" aria-labelledby={`nav-${section.id}`} className="flex flex-col gap-1">
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={close}
                  className={({ isActive }) => cn(
                    'relative flex h-11 items-center gap-3 rounded-full px-4 text-[0.9375rem] font-semibold text-[#b7c8bd] transition-[color,background-color,box-shadow] duration-200 ease-out hover:bg-[#10271a] hover:text-[#f4f8f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#35f46e]',
                    // Marcador verde a la izquierda: siempre está, pero sólo crece en el ítem activo
                    'before:absolute before:left-1.5 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:scale-y-0 before:rounded-full before:bg-[#35f46e] before:opacity-0 before:transition-[scale,opacity] before:duration-300 before:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:before:transition-none',
                    item.action && !isActive && 'border border-dashed border-[#35f46e]/55 font-bold text-[#35f46e] hover:text-[#7dffa3]',
                    // Ítem activo: píldora resaltada y marcador visible
                    isActive && 'bg-[#35f46e]/15 font-bold text-[#f4f8f5] ring-1 ring-[#35f46e]/40 before:scale-y-100 before:opacity-100',
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('size-5 shrink-0 transition-[color,scale] duration-200 ease-out', isActive && 'scale-110 text-[#35f46e]')} aria-hidden="true" />
                      <span className="flex-1">{item.label}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

// Tarjeta del equipo del jugador (o invitación a armar uno si todavía no tiene)
function TeamCard({ close }: { close: () => void }) {
  const { data: team, isLoading } = useQuery({ queryKey: ['my-team'], queryFn: getMyTeam })

  if (isLoading) return <div className="h-[5.75rem] animate-pulse rounded-2xl border border-[#f4f8f5]/10 bg-[#10271a]" aria-hidden="true" />

  if (!team) {
    return (
      <Link
        to="/app/mi-equipo"
        onClick={close}
        className="flex items-center gap-3.5 rounded-2xl border border-dashed border-[#35f46e]/45 bg-[#10271a] p-4 transition-colors hover:border-[#35f46e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#35f46e]"
      >
        <EmptyCrest className="h-[3.25rem] w-11 shrink-0" />
        <div className="min-w-0">
          <p className="font-display text-xl font-extrabold uppercase leading-none text-[#f4f8f5]">Armá tu equipo</p>
          <p className="mt-1.5 font-mono text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[#35f46e]">Todavía no tenés equipo</p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to="/app/mi-equipo"
      onClick={close}
      className="relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-[#35f46e]/35 bg-[linear-gradient(150deg,rgba(53,244,110,0.2),#0b1b12_70%)] p-4 transition-colors hover:border-[#35f46e]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#35f46e]"
    >
      <TeamCrest name={team.nombre} className="anim-pop h-[3.9rem] w-[3.4rem] shrink-0" />
      <div className="min-w-0">
        <p className="truncate font-display text-[1.75rem] font-extrabold uppercase leading-none text-[#f4f8f5]">{team.nombre}</p>
        <p className="mt-1.5 font-mono text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[#35f46e]">
          {team.soy_creador ? 'Administrador del equipo' : 'Invitado'}
        </p>
      </div>
    </Link>
  )
}

// Próximo torneo con inscripción abierta o en curso: primero el más cercano desde hoy
function pickNextTournament(tournaments: TorneoListado[]) {
  const today = new Date().toISOString().slice(0, 10)
  const active = tournaments
    .filter((t) => t.estado === 'inscripcion' || t.estado === 'en_curso')
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  return active.find((t) => t.fecha.slice(0, 10) >= today) ?? active[0]
}

function NextTournament({ close }: { close: () => void }) {
  const { data: tournaments = [] } = useQuery({ queryKey: ['tournaments'], queryFn: getTournaments })
  const next = pickNextTournament(tournaments)
  if (!next) return null

  return (
    <Link
      to={`/app/torneos/${next.id}`}
      onClick={close}
      className="flex items-center gap-3 rounded-[0.875rem] border border-[#f2c94c]/30 bg-[#f2c94c]/[0.07] p-3.5 transition-colors hover:border-[#f2c94c]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2c94c]"
    >
      <Trophy shine className="h-[2.7rem] w-[2.1rem] shrink-0" />
      <div className="min-w-0">
        <p className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[#f2c94c]">Próximo torneo</p>
        <p className="mt-0.5 truncate font-bold text-[#f4f8f5]">
          {next.nombre}
          {next.fecha && <span className="font-semibold text-[#b7c8bd]"> · {formatDate(next.fecha, 'd MMM')}</span>}
        </p>
      </div>
    </Link>
  )
}

function UserCard({ admin }: { admin: boolean }) {
  const { profile, signOut } = useAuth()
  const name = profile?.nombre ?? 'Usuario'

  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border bg-[#10271a] p-3', admin ? 'border-[#ffc94a]/30' : 'border-[#f4f8f5]/10')}>
      {admin
        ? <PlayerAvatar name={name} className="border-[#ffc94a] bg-none bg-[#ffc94a] text-[#06110b]" />
        : <PlayerAvatar name={name} admin />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#f4f8f5]">{name}</p>
        <p className="font-mono text-[0.625rem] font-bold uppercase tracking-wider text-[#b7c8bd]">{admin ? 'Administrador general' : 'Jugador'}</p>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="btn btn-ghost btn-square btn-sm text-[#b7c8bd] hover:text-[#f4f8f5]"
        aria-label="Cerrar sesión"
      >
        <LogOut className="size-[1.125rem]" aria-hidden="true" />
      </button>
    </div>
  )
}

function BrandMark() {
  return (
    <Link to="/app/torneos" className="inline-block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#35f46e]">
      <span className="font-display text-[1.375rem] font-black uppercase tracking-[0.04em] text-[#f4f8f5]">Torneo <span className="text-[#35f46e]">90&apos;</span></span>
    </Link>
  )
}

export function AppSidebar({ close }: { close: () => void }) {
  const { isAdmin } = useAuth()

  if (isAdmin) {
    return (
      <div className="flex h-full flex-col overflow-y-auto bg-[#0b1b12] text-[#f4f8f5]">
        {/* Franja ámbar: deja claro que es la cuenta de administración */}
        <div className="h-1.5 flex-none bg-[repeating-linear-gradient(135deg,#ffc94a_0_10px,#0b1b12_10px_20px)]" aria-hidden="true" />
        <div className="flex flex-col gap-4 px-5 pt-5">
          <BrandMark />
          <div className="flex items-center gap-2.5 rounded-xl border border-[#ffc94a]/45 bg-[#ffc94a]/10 px-3 py-2.5 text-[#ffc94a]">
            <LockKeyhole className="size-[1.125rem] shrink-0" aria-hidden="true" />
            <span className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.12em]">Modo administrador</span>
          </div>
        </div>
        <div className="px-3 pt-6">
          <SidebarNav sections={adminSections} label="Menú del administrador general" close={close} />
        </div>
        <div className="mt-auto p-4 pt-6">
          <UserCard admin />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-[#0b1b12] px-[1.125rem] py-[1.375rem] text-[#f4f8f5]">
      <BrandMark />
      <TeamCard close={close} />
      <SidebarNav sections={playerSections} label="Menú del jugador" close={close} />
      <div className="mt-auto flex flex-col gap-4">
        <NextTournament close={close} />
        <UserCard admin={false} />
      </div>
    </div>
  )
}
