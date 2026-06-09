import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/supabase'

const SESSION_KEY = 'ttc_session_id'

export type AppProfile = Profile & { role: 'user' | 'admin' }

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: AppProfile | null
  loading: boolean
  profileLoading: boolean
  kickedOut: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  kickedOut: false,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [kickedOut, setKickedOut] = useState(false)

  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const currentUserIdRef = useRef<string | null>(null)

  // Forcibly end the session on this device because another device signed in.
  const forceSignOut = async () => {
    localStorage.removeItem(SESSION_KEY)
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }
    await supabase.auth.signOut()
    setProfile(null)
    setProfileLoading(false)
    setKickedOut(true)
  }

  // Returns false if a different device has claimed this account.
  const isSessionStillValid = (profileData: Profile): boolean => {
    const localId = localStorage.getItem(SESSION_KEY)
    if (!localId || !profileData.active_session_id) return true
    return localId === profileData.active_session_id
  }

  // Subscribe to profile row changes so we can detect a takeover instantly.
  const subscribeToProfileChanges = (userId: string) => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
    }
    const channel = supabase
      .channel(`profile-session:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const newSessionId = (payload.new as Profile).active_session_id
          const localId = localStorage.getItem(SESSION_KEY)
          if (localId && newSessionId && newSessionId !== localId) {
            forceSignOut()
          }
        }
      )
      .subscribe()
    realtimeChannelRef.current = channel
  }

  const fetchProfile = async (userId: string, enforceSession = false) => {
    setProfileLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!data) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    if (enforceSession && !isSessionStillValid(data)) {
      await forceSignOut()
      return
    }

    setProfile(data as AppProfile)
    setProfileLoading(false)
  }

  useEffect(() => {
    let mounted = true

    const failsafe = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 4000)

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        setSession(data.session)
        if (data.session?.user) {
          currentUserIdRef.current = data.session.user.id
          // Validate existing session on page load / tab restore
          fetchProfile(data.session.user.id, true)
          subscribeToProfileChanges(data.session.user.id)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!mounted) return
        clearTimeout(failsafe)
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (!mounted) return
      setSession(sess)
      currentUserIdRef.current = sess?.user?.id ?? null

      if (!sess?.user) {
        setProfile(null)
        setProfileLoading(false)
        if (realtimeChannelRef.current) {
          supabase.removeChannel(realtimeChannelRef.current)
          realtimeChannelRef.current = null
        }
        return
      }

      if (event === 'SIGNED_IN') {
        // New login — claim this device as the sole active session.
        const sessionId = crypto.randomUUID()
        localStorage.setItem(SESSION_KEY, sessionId)
        await supabase.from('profiles')
          .update({ active_session_id: sessionId })
          .eq('id', sess.user.id)
        subscribeToProfileChanges(sess.user.id)
        fetchProfile(sess.user.id)
      } else if (event === 'TOKEN_REFRESHED') {
        // Hourly token refresh — validate we're still the active device.
        fetchProfile(sess.user.id, true)
      } else {
        fetchProfile(sess.user.id)
      }
    })

    // Re-validate when the user returns to this tab (e.g. after using another device).
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUserIdRef.current) {
        fetchProfile(currentUserIdRef.current, true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mounted = false
      clearTimeout(failsafe)
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }
    }
  }, [])

  const refreshProfile = async () => {
    const id = session?.user?.id
    if (id) await fetchProfile(id)
  }

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY)
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }
    await supabase.auth.signOut()
    setProfile(null)
    setProfileLoading(false)
    setKickedOut(false)
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileLoading,
      kickedOut,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
