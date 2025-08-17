import React, { useState, useEffect } from 'react'
import { MessageCircle, X, Plus } from 'lucide-react'
import { useChat } from '../../contexts/ChatContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Errand } from '../../lib/supabase'
import { FloatingChat } from './FloatingChat'

interface ChatNotification {
  id: string
  errand_id: string
  sender_id: string
  message: string
  created_at: string
  errand?: Errand
  sender?: any
}

export function UniversalChatHeader() {
  const { profile } = useAuth()
  const { activeChats, openChat, closeChat } = useChat()
  const [showChatList, setShowChatList] = useState(false)
  const [notifications, setNotifications] = useState<ChatNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (profile) {
      fetchChatNotifications()
      subscribeToNewMessages()
    }
  }, [profile])

  const fetchChatNotifications = async () => {
    try {
      // Get all errands where user is involved and has unread messages
      const { data: errands, error: errandsError } = await supabase
        .from('errands')
        .select(`
          *,
          poster:profiles!errands_poster_id_fkey(*),
          assigned_runner:profiles!errands_assigned_runner_id_fkey(*)
        `)
        .or(`poster_id.eq.${profile?.id},assigned_runner_id.eq.${profile?.id}`)
        .in('status', ['in_progress', 'completed'])

      if (errandsError) throw errandsError

      // Get latest message for each errand
      const notificationsWithErrands = await Promise.all(
        (errands || []).map(async (errand) => {
          const { data: latestMessage } = await supabase
            .from('chat_messages')
            .select(`
              *,
              sender:profiles!chat_messages_sender_id_fkey(*)
            `)
            .eq('errand_id', errand.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (latestMessage) {
            return {
              ...latestMessage,
              errand,
              sender: latestMessage.sender
            }
          }
          return null
        })
      )

      const validNotifications = notificationsWithErrands.filter(n => n !== null) as ChatNotification[]
      setNotifications(validNotifications)
      setUnreadCount(validNotifications.length)
    } catch (error) {
      console.error('Error fetching chat notifications:', error)
    }
  }

  const subscribeToNewMessages = () => {
    const channel = supabase
      .channel('chat_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMessage = payload.new as ChatNotification
          // Check if this message is for an errand the user is involved in
          if (newMessage.errand_id) {
            fetchChatNotifications() // Refresh notifications
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleStartChat = (notification: ChatNotification) => {
    if (!notification.errand) return

    const otherUser = profile?.id === notification.errand.poster_id 
      ? notification.errand.assigned_runner 
      : notification.errand.poster

    if (otherUser) {
      openChat(notification.errand, otherUser)
      setShowChatList(false)
    }
  }

  const handleEndChat = (errandId: string) => {
    // Delete chat history for this errand
    deleteChatHistory(errandId)
    closeChat(`chat-${errandId}`)
  }

  const deleteChatHistory = async (errandId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('errand_id', errandId)

      if (error) throw error
      
      // Refresh notifications
      fetchChatNotifications()
    } catch (error) {
      console.error('Error deleting chat history:', error)
    }
  }

  const canInitiateChat = (errand: Errand) => {
    // Only poster can initiate chat
    return profile?.id === errand.poster_id && errand.status === 'in_progress'
  }

  const getOtherUser = (errand: Errand) => {
    if (profile?.id === errand.poster_id) {
      return errand.assigned_runner
    } else if (profile?.id === errand.assigned_runner_id) {
      return errand.poster
    }
    return null
  }

  return (
    <>
      {/* Chat Icon with Counter */}
      <div className="relative">
        <button
          onClick={() => setShowChatList(!showChatList)}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Chat List Dropdown */}
        {showChatList && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Active Chats</h3>
                <button
                  onClick={() => setShowChatList(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No active chats</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  if (!notification.errand) return null
                  
                  const otherUser = getOtherUser(notification.errand)
                  const canInitiate = canInitiateChat(notification.errand)
                  
                  return (
                    <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.errand.title}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              notification.errand.status === 'in_progress' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {notification.errand.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-500 mb-2">
                            {otherUser?.full_name} • {new Date(notification.created_at).toLocaleTimeString()}
                          </p>
                          
                          <p className="text-sm text-gray-600 truncate">
                            {notification.message}
                          </p>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          {canInitiate && (
                            <button
                              onClick={() => handleStartChat(notification)}
                              className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-dark transition-colors"
                            >
                              Start Chat
                            </button>
                          )}
                          
                          {notification.errand.status === 'completed' && (
                            <button
                              onClick={() => handleEndChat(notification.errand_id)}
                              className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                            >
                              End Chat
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Render active floating chats */}
      {activeChats.map((chat) => (
        <FloatingChat
          key={chat.id}
          errand={chat.errand}
          otherUser={chat.otherUser}
          onClose={() => closeChat(chat.id)}
          onEndChat={() => handleEndChat(chat.errand.id)}
          canEndChat={chat.errand.status === 'completed'}
        />
      ))}
    </>
  )
}
