import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, LogOut, MapPin, Star, Settings, Wallet } from 'lucide-react'
import { ProfileModal } from './profile/ProfileModal'
import { WalletModal } from './wallet/WalletModal'
import { HistoryModal } from './history/HistoryModal'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth()
  const [showProfile, setShowProfile] = React.useState(false)
  const [showWallet, setShowWallet] = React.useState(false)
  const [showHistory, setShowHistory] = React.useState(false)

  if (!profile) return <>{children}</>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-modern border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Zinderr</h1>
                <p className="text-sm text-gray-500">Ghana's Trusted Errand Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3">
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-warning fill-current" />
                  <span>{profile.average_rating?.toFixed(2) || '0.00'}</span>
                  <span className="text-gray-400">({profile.total_ratings || 0} reviews)</span>
                </div>
                <div className="text-sm text-gray-600">
                  {profile.completed_tasks} completed
                </div>
                {profile.user_type === 'runner' && (
                  <button
                    onClick={() => setShowWallet(true)}
                    className="flex items-center space-x-1 text-sm text-success hover:text-success bg-success px-2 py-1 rounded-lg transition-colors"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>₵{profile.wallet_balance.toFixed(2)}</span>
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowHistory(true)}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="History"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowProfile(true)}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Profile Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">
                    {profile.display_username && profile.username ? profile.username : profile.full_name}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{profile.user_type}</div>
                </div>
                <button
                  onClick={signOut}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}

      {showWallet && profile.user_type === 'runner' && (
        <WalletModal onClose={() => setShowWallet(false)} />
      )}

      {showHistory && (
        <HistoryModal 
          userType={profile.user_type}
          onClose={() => setShowHistory(false)} 
        />
      )}
    </div>
  )
}