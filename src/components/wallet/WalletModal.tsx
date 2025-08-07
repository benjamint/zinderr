import React, { useState, useEffect } from 'react'
import { X, Wallet, TrendingUp, Download, Eye, DollarSign } from 'lucide-react'
import { supabase, Wallet as WalletType, Transaction } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface WalletModalProps {
  onClose: () => void
}

export function WalletModal({ onClose }: WalletModalProps) {
  const { profile } = useAuth()
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchWalletData()
    }
  }, [profile])

  const fetchWalletData = async () => {
    try {
      // Fetch wallet data
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('runner_id', profile!.id)
        .single()

      if (walletError && walletError.code !== 'PGRST116') throw walletError
      setWallet(walletData)

      // Fetch recent transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select(`
          *,
          errand:errands(title, description)
        `)
        .eq('runner_id', profile!.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10)

      if (transactionError) throw transactionError
      setTransactions(transactionData || [])
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-content max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">₵{profile?.wallet_balance.toFixed(2)}</h3>
            <p className="text-gray-600">Available Balance</p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Recent Transactions</h4>
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-500">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.errand?.title || 'Errand'}
                        </p>
                        <p className="text-gray-500">{formatDate(transaction.created_at)}</p>
                      </div>
                      <span className={`font-semibold ${
                        transaction.status === 'completed' ? 'text-success' : 'text-warning'
                      }`}>
                        ₵{transaction.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-primary bg-opacity-10 rounded-lg p-4">
              <h4 className="font-medium text-primary mb-2">How it works</h4>
              <ul className="text-sm text-primary space-y-1">
                <li>• Complete errands to earn money</li>
                <li>• Payments are processed automatically</li>
                <li>• Withdrawals available soon</li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={onClose}
              className="btn-primary w-full"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}