import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type User = {
  id: string
  email: string
  created_at: string
  user_metadata: any
}

type UserStats = {
  total: number
  trial: number
  active: number
  expired: number
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats>({ total: 0, trial: 0, active: 0, expired: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if current user is admin
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.user_metadata?.is_admin) {
        setError('Accès refusé ❌')
        return
      }
      loadUsers()
    }

    checkAdminAccess()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data: { users }, error } = await supabase.auth.admin.listUsers()
      
      if (error) throw error
      
      const formattedUsers = users.map(user => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        user_metadata: user.user_metadata || {}
      }))

      setUsers(formattedUsers)
      calculateStats(formattedUsers)
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs')
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (userList: User[]) => {
    const now = new Date()
    const stats = userList.reduce((acc, user) => {
      acc.total++
      
      const trialEnd = user.user_metadata.trial_end
      const status = user.user_metadata.status
      
      if (status === 'suspended') {
        // Suspended users counted separately
      } else if (trialEnd) {
        const trialDate = new Date(trialEnd)
        if (trialDate > now) {
          acc.trial++
        } else {
          acc.expired++
        }
      } else {
        acc.active++
      }
      
      return acc
    }, { total: 0, trial: 0, active: 0, expired: 0 })

    setStats(stats)
  }

  const getStatus = (user: User) => {
    const trialEnd = user.user_metadata.trial_end
    const status = user.user_metadata.status
    
    if (status === 'suspended') return 'Suspendu'
    if (trialEnd) {
      const trialDate = new Date(trialEnd)
      return trialDate > new Date() ? 'Essai' : 'Expiré'
    }
    return 'Actif'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Essai': return 'bg-yellow-100 text-yellow-800'
      case 'Actif': return 'bg-green-100 text-green-800'
      case 'Expiré': return 'bg-red-100 text-red-800'
      case 'Suspendu': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getExpiringTrials = () => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    return users.filter(user => {
      const trialEnd = user.user_metadata.trial_end
      if (!trialEnd) return false
      const trialDate = new Date(trialEnd)
      return trialDate >= now && trialDate <= tomorrow
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const handleExtendTrial = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId)
      if (!user) return

      const currentEnd = user.user_metadata.trial_end ? new Date(user.user_metadata.trial_end) : new Date()
      const newEnd = new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000)

      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user.user_metadata,
          trial_end: newEnd.toISOString()
        }
      })

      if (error) throw error
      
      loadUsers() // Refresh data
    } catch (err) {
      console.error('Error extending trial:', err)
    }
  }

  const handleSuspendUser = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId)
      if (!user) return

      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user.user_metadata,
          status: 'suspended'
        }
      })

      if (error) throw error
      
      loadUsers() // Refresh data
    } catch (err) {
      console.error('Error suspending user:', err)
    }
  }

  const handleReactivateUser = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId)
      if (!user) return

      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user.user_metadata,
          status: 'active',
          trial_end: null
        }
      })

      if (error) throw error
      
      loadUsers() // Refresh data
    } catch (err) {
      console.error('Error reactivating user:', err)
    }
  }

  if (error === 'Accès refusé') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Accès refusé</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 rounded-full border-2 border-[#1e3a8a] border-t-transparent animate-spin"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  const expiringTrials = getExpiringTrials()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1e3a8a] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">⚙️ Admin — Check-in Express</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white text-[#1e3a8a] rounded-lg hover:bg-gray-100 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="p-6">
        {/* Alert Banner */}
        {expiringTrials.length > 0 && (
          <div className="mb-6 bg-orange-100 border border-orange-300 text-orange-800 px-4 py-3 rounded-lg">
            <p className="font-medium">⚠️ {expiringTrials.length} essai(s) expire(nt) aujourd'hui ou demain</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-[#1e3a8a] mb-2">{stats.total}</div>
            <div className="text-gray-600 text-sm">Total inscrits</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-[#1e3a8a] mb-2">{stats.trial}</div>
            <div className="text-gray-600 text-sm">En essai (live)</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-[#1e3a8a] mb-2">{stats.active}</div>
            <div className="text-gray-600 text-sm">Actifs (payants)</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-[#1e3a8a] mb-2">{stats.expired}</div>
            <div className="text-gray-600 text-sm">Expirés</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Utilisateurs</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hôtel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pays</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscription</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin essai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scans</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => {
                  const status = getStatus(user)
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.user_metadata.hotel_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.user_metadata.country || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.user_metadata.trial_end 
                          ? new Date(user.user_metadata.trial_end).toLocaleDateString('fr-FR')
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.user_metadata.scan_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 text-xs">👁 Voir</button>
                        {status === 'Essai' && (
                          <button 
                            onClick={() => handleExtendTrial(user.id)}
                            className="text-green-600 hover:text-green-900 text-xs"
                          >
                            ⏱ Prolonger (+7j)
                          </button>
                        )}
                        {(status === 'Actif' || status === 'Essai') && (
                          <button 
                            onClick={() => handleSuspendUser(user.id)}
                            className="text-red-600 hover:text-red-900 text-xs"
                          >
                            🚫 Suspendre
                          </button>
                        )}
                        {(status === 'Suspendu' || status === 'Expiré') && (
                          <button 
                            onClick={() => handleReactivateUser(user.id)}
                            className="text-green-600 hover:text-green-900 text-xs"
                          >
                            ✅ Réactiver
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
