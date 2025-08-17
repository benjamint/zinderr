import React, { useState } from 'react'
import { Menu, X, Star, Wallet, User, LogOut, MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ProfileModal } from './profile/ProfileModal'
import { HistoryModal } from './history/HistoryModal'
import { UniversalChatHeader } from './chat/UniversalChatHeader'
import { WalletPage } from './wallet/WalletPage'

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showWallet, setShowWallet] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Z</span>
                </div>
                <h1 className="text-xl font-black text-gray-900">Zinderr</h1>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              {/* Rating Display */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Star className="w-4 h-4 text-warning fill-current" />
                <span className="font-medium">
                  {profile?.average_rating?.toFixed(2) || '0.00'}
                </span>
                <span className="text-gray-500">
                  ({profile?.total_ratings || 0} reviews)
                </span>
              </div>

              {/* Universal Chat Header */}
              <UniversalChatHeader />

              {/* Wallet Button */}
              <button
                onClick={() => setShowWallet(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Wallet className="w-4 h-4" />
                <span>₵{profile?.wallet_balance?.toFixed(2) || '0.00'}</span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button onClick={() => setShowProfile(true)} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {profile?.full_name || 'User'}
                  </span>
                </button>
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-2">
            <button
              onClick={() => {
                setShowProfile(true)
                setSidebarOpen(false)
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
            
            <button
              onClick={() => {
                setShowWallet(true)
                setSidebarOpen(false)
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Wallet className="w-5 h-5" />
              <span>Wallet</span>
            </button>
            
            <button
              onClick={() => {
                setShowHistory(true)
                setSidebarOpen(false)
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <MessageCircle className="w-5 h-5" />
              <span>History</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-0">
        {showWallet ? (
          <WalletPage onClose={() => setShowWallet(false)} />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        )}
      </main>

      {/* Modals */}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
      
      {showHistory && (
        <HistoryModal 
          userType={profile?.user_type || 'poster'}
          onClose={() => setShowHistory(false)} 
        />
      )}
    </div>
  )
}