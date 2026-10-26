import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { LoadingState } from '@/components/shared/states'
import { useAuth } from '@/context/auth-context'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="p-8"><LoadingState label="Validando sesión" /></div>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function AdminRoute() {
  const { isAdmin, loading } = useAuth()
  if (loading) return <div className="p-8"><LoadingState label="Validando permisos" /></div>
  if (!isAdmin) return <Navigate to="/app/torneos" replace />
  return <Outlet />
}
