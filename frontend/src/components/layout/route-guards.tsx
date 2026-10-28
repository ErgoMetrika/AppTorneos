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

export function AdminRoute() {
  const { isAdmin, loading } = useAuth()
  if (loading) return <div className="p-8"><LoadingState label="Validando permisos" /></div>
  if (!isAdmin) return <Navigate to="/app/torneos" replace />
  return <Outlet />
}
