import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, userData: { full_name: string; user_type: 'poster' | 'runner'; location: string; phone?: string }) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      console.log('🔍 Fetching profile for user:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Error fetching profile:', error)
        
        // Check if it's a "no rows" error (table doesn't exist or profile not created)
        if (error.code === 'PGRST116') {
          console.error('⚠️ Profile not found. This could mean:')
          console.error('   1. Database migrations not run yet')
          console.error('   2. Profile was not created during sign-up')
          console.error('   3. User signed up but profile creation failed')
        }
        
        throw error
      }
      
      console.log('✅ Profile fetched successfully:', data)
      setProfile(data)
    } catch (error) {
      console.error('❌ Error fetching profile:', error)
      // Don't set loading to false here, let the user see the error
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return {}
    } catch (error) {
      return { error: 'An unexpected error occurred' }
    }
  }

  const signUp = async (email: string, password: string, userData: { full_name: string; user_type: 'poster' | 'runner'; location: string; phone?: string }) => {
    try {
      console.log('🚀 Starting sign-up process for:', email)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('❌ Auth sign-up error:', error.message)
        return { error: error.message }
      }

      console.log('✅ Auth sign-up successful, user created:', data.user?.id)

      if (data.user) {
        console.log('📝 Creating profile for user:', data.user.id)
        
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            ...userData
          }])

        if (profileError) {
          console.error('❌ Profile creation error:', profileError)
          
          if (profileError.code === '42P01') {
            console.error('⚠️ The "profiles" table does not exist!')
            console.error('   Please run the database migrations in Supabase.')
            return { error: 'Database not set up. Please run migrations first.' }
          }
          
          return { error: profileError.message }
        }
        
        console.log('✅ Profile created successfully')
      }

      return {}
    } catch (error) {
      console.error('❌ Unexpected error during sign-up:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}