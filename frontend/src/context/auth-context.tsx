import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { getProfile } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { PerfilUsuario } from '@/types/domain'

interface AuthContextValue {
  session: Session | null
  profile: PerfilUsuario | null
  loading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<PerfilUsuario | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()
  // Usuario de la sesión anterior: si cambia (logout o login con otra cuenta),
  // se vacía la caché para no mostrar datos del usuario anterior.
  const lastUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    let active = true

    const onUserChange = (nextSession: Session | null) => {
      const nextUserId = nextSession?.user.id ?? null
      if (lastUserId.current !== undefined && lastUserId.current !== nextUserId) {
        queryClient.clear()
        setProfile(null)
      }
      lastUserId.current = nextUserId
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      onUserChange(data.session)
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      onUserChange(nextSession)
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [queryClient])

  useEffect(() => {
    if (!session?.user.id) return
    setLoading(true)
    getProfile(session.user.id)
      .then(setProfile)
      .finally(() => setLoading(false))
  }, [session?.user.id])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      isAdmin: profile?.rol === 'admin',
      signOut: async () => {
        await supabase.auth.signOut()
        queryClient.clear()
      },
    }),
    [loading, profile, session, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
