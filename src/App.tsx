import React, { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
import { ToastProvider } from './contexts/ToastContext'
import { AuthForm } from './components/auth/AuthForm'
import { Layout } from './components/Layout'
import { AdminLayout } from './components/admin/AdminLayout'
import { PosterDashboard } from './components/dashboard/PosterDashboard'
import { RunnerDashboard } from './components/dashboard/RunnerDashboard'
import { testSupabaseConnection } from './lib/supabase'

function AppContent() {
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    testSupabaseConnection()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return <AuthForm />
  }

  // Check if user is admin
  if (profile.user_type === 'admin') {
    return <AdminLayout />
  }

  // Regular user dashboard
  return (
    <Layout>
      {profile.user_type === 'poster' ? <PosterDashboard /> : <RunnerDashboard />}
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ChatProvider>
    </AuthProvider>
  )
}

export default App