import React, { useState, useEffect } from 'react'
import { Users, Package, DollarSign, TrendingUp, TrendingDown, UserPlus, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface DashboardMetrics {
  totalUsers: number
  totalErrands: number
  totalRevenue: number
  activeUsers: number
  newUsersToday: number
  newErrandsToday: number
  completedErrands: number
  pendingErrands: number
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    totalErrands: 0,
    totalRevenue: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newErrandsToday: 0,
    completedErrands: 0,
    pendingErrands: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardMetrics()
  }, [])

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true)

      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Get total errands
      const { count: totalErrands } = await supabase
        .from('errands')
        .select('*', { count: 'exact', head: true })

      // Get total revenue (sum of all completed errands)
      const { data: completedErrands } = await supabase
        .from('errands')
        .select('amount')
        .eq('status', 'completed')

      const totalRevenue = completedErrands?.reduce((sum, errand) => sum + errand.amount, 0) || 0

      // Get active users (users who have posted or bid in last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', thirtyDaysAgo.toISOString())

      // Get new users today
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // Get new errands today
      const { count: newErrandsToday } = await supabase
        .from('errands')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // Get completed errands count
      const { count: completedErrandsCount } = await supabase
        .from('errands')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      // Get pending errands count
      const { count: pendingErrands } = await supabase
        .from('errands')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')

      setMetrics({
        totalUsers: totalUsers || 0,
        totalErrands: totalErrands || 0,
        totalRevenue: totalRevenue,
        activeUsers: activeUsers || 0,
        newUsersToday: newUsersToday || 0,
        newErrandsToday: newErrandsToday || 0,
        completedErrands: completedErrandsCount || 0,
        pendingErrands: pendingErrands || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const metricCards = [
    {
      title: 'Total Users',
      value: metrics.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: metrics.newUsersToday,
      changeLabel: 'new today'
    },
    {
      title: 'Total Errands',
      value: metrics.totalErrands,
      icon: Package,
      color: 'bg-green-500',
      change: metrics.newErrandsToday,
      changeLabel: 'new today'
    },
    {
      title: 'Total Revenue',
      value: `₵${metrics.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
      change: null,
      changeLabel: ''
    },
    {
      title: 'Active Users',
      value: metrics.activeUsers,
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: null,
      changeLabel: ''
    }
  ]

  const statusCards = [
    {
      title: 'Completed Errands',
      value: metrics.completedErrands,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Pending Errands',
      value: metrics.pendingErrands,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of Zinderr platform metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  {card.change !== null && card.change > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      <UserPlus className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">+{card.change}</span>
                      <span className="text-sm text-gray-500">{card.changeLabel}</span>
                    </div>
                  )}
                </div>
                <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statusCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">View All Users</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Package className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-700">Manage Errands</span>
          </button>
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-700">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  )
}
