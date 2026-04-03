import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const FREE_UPLOAD_LIMIT = 3

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data || null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const refreshProfile = useCallback(() => {
    if (user) return fetchProfile(user.id)
  }, [user, fetchProfile])

  async function signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null)
  }

  // Reset upload count if week has changed
  async function checkWeekReset() {
    if (!profile || !user) return
    const resetAt = new Date(profile.week_reset_at || 0)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sun,1=Mon
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    if (resetAt < monday) {
      await supabase.from('profiles').update({
        uploads_this_week: 0,
        week_reset_at: now.toISOString(),
      }).eq('id', user.id)
      await refreshProfile()
    }
  }

  useEffect(() => {
    if (profile) checkWeekReset()
  }, [profile?.id])

  const isPro = profile?.is_pro === true
  const proExpiresAt = profile?.pro_expires_at ?? null
  const uploadsThisWeek = profile?.uploads_this_week ?? 0
  const canUpload = isPro || uploadsThisWeek < FREE_UPLOAD_LIMIT

  return (
    <AuthContext.Provider value={{
      user, profile, loading, isPro, proExpiresAt,
      uploadsThisWeek, FREE_UPLOAD_LIMIT, canUpload,
      signUp, signIn, signOut, refreshProfile,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
