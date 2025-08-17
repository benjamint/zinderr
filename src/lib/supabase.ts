import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables are not set!')
  console.error('Please create a .env file with:')
  console.error('VITE_SUPABASE_URL=your_supabase_project_url')
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key')
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

// Test function to verify Supabase connection
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      return false
    }
    console.log('✅ Supabase connection successful!')
    return true
  } catch (error) {
    console.error('❌ Supabase connection error:', error)
    return false
  }
}

export type Profile = {
  id: string
  user_type: 'poster' | 'runner'
  full_name: string
  username?: string
  display_username: boolean
  phone?: string
  location: string
  latitude?: number
  longitude?: number
  avatar_url?: string
  rating: number
  completed_tasks: number
  wallet_balance: number
  verification_status: 'pending' | 'verified' | 'rejected'
  ghana_card_front_url?: string
  ghana_card_back_url?: string
  selfie_url?: string
  verification_notes?: string
  verified_at?: string
  created_at: string
  updated_at: string
  // New rating statistics fields
  total_ratings?: number
  average_rating?: number
  last_rating_update?: string
}

export interface Errand {
  id: string
  poster_id: string
  title: string
  description: string
  location: string
  amount: number
  deadline?: string
  notes?: string
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  category: string
  image_url?: string
  assigned_runner_id?: string
  created_at: string
  updated_at: string
  poster?: Profile
  assigned_runner?: Profile
  destination_lat?: number | null
  destination_lng?: number | null
}

// Category constants
export const ERRAND_CATEGORIES = [
  'Groceries',
  'Package Delivery', 
  'Pharmacy',
  'Bill Payments',
  'Courier',
  'Home Help',
  'Shopping',
  'Food Pickup',
  'Laundry',
  'Others'
] as const

export type ErrandCategory = typeof ERRAND_CATEGORIES[number]

// Category icons mapping
export const CATEGORY_ICONS: Record<ErrandCategory, string> = {
  'Groceries': '🛒',
  'Package Delivery': '📦',
  'Pharmacy': '💊',
  'Bill Payments': '💳',
  'Courier': '🚚',
  'Home Help': '🏠',
  'Shopping': '🛍️',
  'Food Pickup': '🍕',
  'Laundry': '👕',
  'Others': '📋'
}

// Category colors mapping
export const CATEGORY_COLORS: Record<ErrandCategory, string> = {
  'Groceries': 'bg-green-100 text-green-800',
  'Package Delivery': 'bg-blue-100 text-blue-800',
  'Pharmacy': 'bg-red-100 text-red-800',
  'Bill Payments': 'bg-purple-100 text-purple-800',
  'Courier': 'bg-orange-100 text-orange-800',
  'Home Help': 'bg-indigo-100 text-indigo-800',
  'Shopping': 'bg-pink-100 text-pink-800',
  'Food Pickup': 'bg-yellow-100 text-yellow-800',
  'Laundry': 'bg-teal-100 text-teal-800',
  'Others': 'bg-gray-100 text-gray-800'
}

export type Bid = {
  id: string
  errand_id: string
  runner_id: string
  amount: number
  message?: string
  status: 'pending' | 'accepted' | 'rejected' | 'retracted'
  created_at: string
  retracted_at?: string
  retraction_reason?: string
  runner?: Profile
}

export type Rating = {
  id: string
  errand_id: string
  poster_id: string
  runner_id: string
  rating: number
  comment?: string
  created_at: string
  poster?: Profile
  runner?: Profile
}

export type Transaction = {
  id: string
  errand_id: string
  poster_id: string
  runner_id: string
  amount: number
  status: 'completed' | 'disputed'
  completed_at: string
  created_at: string
  errand?: Errand
  poster?: Profile
  runner?: Profile
}

export type MutualRating = {
  id: string
  transaction_id: string
  errand_id: string
  rater_id: string
  rated_id: string
  rating: number
  comment?: string
  rating_type: 'poster_to_runner' | 'runner_to_poster'
  created_at: string
  rater?: Profile
  rated?: Profile
}

export type Wallet = {
  id: string
  runner_id: string
  total_earned: number
  available_balance: number
  total_withdrawn: number
  created_at: string
  updated_at: string
}