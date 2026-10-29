import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { LoadingState } from '@/components/shared/states'
import { useAuth } from '@/context/auth-context'
import { INVITE_PARAM, savePendingInvite } from '@/lib/invitation'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="p-8"><LoadingState label="Validando sesión" /></div>
  if (!session) {
    // Si llega con un link de invitación, se guarda antes de pedir el login
    savePendingInvite(new URLSearchParams(location.search).get(INVITE_PARAM))
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

// Páginas del sitio público que, con la sesión iniciada, ya están dentro del panel.
// Si hay sesión, manda directo a su versión del panel.
export function GuestOnly({ to, children }: { to: string; children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-8"><LoadingState label="Validando sesión" /></div>
  if (session) return <Navigate to={to} replace />
  return children
}

// Rutas viejas fuera del panel (/torneos, /equipos/3, …): siempre van a /app/…
// Si no hay sesión, el panel pide iniciar sesión, igual que antes.
export function RedirectToApp() {
  const location = useLocation()
  return <Navigate to={`/app${location.pathname}${location.search}`} replace />
}

// Inicio del panel (/app): el admin general va a su propio inicio; el resto ve la página indicada
export function AppIndex({ player }: { player: ReactNode }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <div className="p-8"><LoadingState label="Validando sesión" /></div>
  if (isAdmin) return <Navigate to="/app/admin" replace />
  return player
}

export function AdminRoute() {
  const { isAdmin, loading } = useAuth()
  if (loading) return <div className="p-8"><LoadingState label="Validando permisos" /></div>
  if (!isAdmin) return <Navigate to="/app/torneos" replace />
  return <Outlet />
}
