import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/supabase'

export type AppProfile = Profile & { role: 'user' | 'admin' }

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: AppProfile | null
  loading: boolean
  profileLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile((data as AppProfile) ?? null)
    setProfileLoading(false)
  }

  useEffect(() => {
    let mounted = true

    // Failsafe: never let the app hang on a blank loading screen. If
    // getSession() is slow or the network can't reach Supabase, render the
    // app (as logged-out) after a short timeout instead of waiting forever.
    const failsafe = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 4000)

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        setSession(data.session)
        // Fire the profile fetch but don't block initial render on it.
        if (data.session?.user) fetchProfile(data.session.user.id)
      })
      .catch(() => {
        // Supabase unreachable — fall through and render as logged-out.
      })
      .finally(() => {
        if (!mounted) return
        clearTimeout(failsafe)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setProfileLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(failsafe)
      subscription.unsubscribe()
    }
  }, [])

  const refreshProfile = async () => {
    const id = session?.user?.id
    if (id) await fetchProfile(id)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setProfileLoading(false)
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, profileLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
