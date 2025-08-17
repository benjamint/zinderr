import React, { useState, useEffect, useRef } from 'react'
import { X, Send, Minimize2, Maximize2, MessageCircle, MapPin, DollarSign, Clock, User, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Errand, Profile, CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/supabase'

interface ChatMessage {
  id: string
  sender_id: string
  receiver_id: string
  errand_id: string
  message: string
  created_at: string
  sender?: Profile
}

interface FloatingChatProps {
  errand: Errand
  otherUser: Profile
  onClose: () => void
  onEndChat?: () => void
  canEndChat?: boolean
}

export function FloatingChat({ errand, otherUser, onClose, onEndChat, canEndChat }: FloatingChatProps) {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showErrandDetails, setShowErrandDetails] = useState(true)
  const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 20 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    const channel = supabase
      .channel(`chat:${errand.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `errand_id=eq.${errand.id}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [errand.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(*)
        `)
        .eq('errand_id', errand.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile) return

    try {
      setSending(true)
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: profile.id,
          receiver_id: otherUser.id,
          errand_id: errand.id,
          message: newMessage.trim()
        })

      if (error) throw error
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const isOwnMessage = (message: ChatMessage) => {
    return message.sender_id === profile?.id
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === chatRef.current || (chatRef.current?.contains(e.target as Node))) {
      setIsDragging(true)
      const rect = chatRef.current?.getBoundingClientRect()
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const handleEndChat = () => {
    if (onEndChat) {
      onEndChat()
    }
  }

  if (isMinimized) {
    return (
      <div
        ref={chatRef}
        style={{
          position: 'fixed',
          top: position.y,
          right: window.innerWidth - position.x,
          zIndex: 1000,
          cursor: 'pointer'
        }}
        onMouseDown={handleMouseDown}
        onClick={toggleMinimize}
        className="bg-primary text-white rounded-lg shadow-lg p-3 hover:bg-primary-dark transition-colors"
      >
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Chat with {otherUser.full_name}</span>
          <span className="text-xs bg-white bg-opacity-20 rounded-full px-2 py-1">
            {messages.length}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={chatRef}
      style={{
        position: 'fixed',
        top: position.y,
        right: window.innerWidth - position.x,
        zIndex: 1000,
        width: '380px',
        maxHeight: '600px'
      }}
      onMouseDown={handleMouseDown}
      className="bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-primary text-white rounded-t-lg cursor-move">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Chat with {otherUser.full_name}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={toggleMinimize}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Errand Details */}
      {showErrandDetails && (
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Errand Details</h4>
            <button
              onClick={() => setShowErrandDetails(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Hide
            </button>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <span className="font-medium">{errand.title}</span>
              <span className={`px-1 py-0.5 rounded text-xs ${CATEGORY_COLORS[errand.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['Others']}`}>
                {CATEGORY_ICONS[errand.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['Others']} {errand.category}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <DollarSign className="w-3 h-3" />
              <span>₵{errand.amount}</span>
              <span>•</span>
              <MapPin className="w-3 h-3" />
              <span>{errand.location}</span>
            </div>
            {errand.deadline && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Due {formatDate(errand.deadline)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  isOwnMessage(message)
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-medium">
                    {message.sender?.full_name || 'Unknown'}
                  </span>
                  <span className="text-xs opacity-75">
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <p>{message.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {/* End Chat Button */}
        {canEndChat && onEndChat && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <button
              onClick={handleEndChat}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>End Chat & Clear History</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
