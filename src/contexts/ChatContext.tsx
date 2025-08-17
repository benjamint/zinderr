import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Errand, Profile } from '../lib/supabase'
import { FloatingChat } from '../components/chat/FloatingChat'

interface ActiveChat {
  id: string
  errand: Errand
  otherUser: Profile
}

interface ChatContextType {
  activeChats: ActiveChat[]
  openChat: (errand: Errand, otherUser: Profile) => void
  closeChat: (chatId: string) => void
  closeAllChats: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([])

  const openChat = (errand: Errand, otherUser: Profile) => {
    const chatId = `chat-${errand.id}`
    
    // Check if chat is already open
    if (activeChats.find(chat => chat.id === chatId)) {
      return
    }

    const newChat: ActiveChat = {
      id: chatId,
      errand,
      otherUser
    }

    setActiveChats(prev => [...prev, newChat])
  }

  const closeChat = (chatId: string) => {
    setActiveChats(prev => prev.filter(chat => chat.id !== chatId))
  }

  const closeAllChats = () => {
    setActiveChats([])
  }

  return (
    <ChatContext.Provider value={{ activeChats, openChat, closeChat, closeAllChats }}>
      {children}
      
      {/* Render floating chats */}
      {activeChats.map((chat) => (
        <FloatingChat
          key={chat.id}
          errand={chat.errand}
          otherUser={chat.otherUser}
          onClose={() => closeChat(chat.id)}
        />
      ))}
    </ChatContext.Provider>
  )
}
