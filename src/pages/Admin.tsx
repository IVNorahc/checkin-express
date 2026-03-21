import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  hotel_name: string | null
  email: string | null
  country: string | null
  status: string
  trial_start: string
  trial_end: string
  total_scans: number
  created_at: string
}

type UserStats = {
  total: number
  trial: number
  active: number
  expired: number
}

export default function Admin() {
  const [profiles, setProfiles] = useState<Profile[]>([])
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
      loadProfiles()
    }

    checkAdminAccess()
  }, [])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setProfiles(profiles || [])
      calculateStats(profiles || [])
    } catch (err) {
      setError('Erreur lors du chargement des profils')
      console.error('Error loading profiles:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (profilesList: Profile[]) => {
    const now = new Date()
    
    const total = profilesList?.length || 0
    
    const enEssai = profilesList?.filter(p => {
      return p.status === 'trial' && 
        new Date(p.trial_end) > now
    }).length || 0
    
    const actifs = profilesList?.filter(p => 
      p.status === 'active'
    ).length || 0
    
    const expires = profilesList?.filter(p => {
      return p.status === 'expired' || 
        (p.status === 'trial' && 
        new Date(p.trial_end) < now)
    }).length || 0

    setStats({ total, trial: enEssai, active: actifs, expired: expires })
  }

  const getStatus = (profile: Profile) => {
    const trialEnd = new Date(profile.trial_end)
    const now = new Date()
    
    if (profile.status === 'suspended') return 'Suspendu'
    if (profile.status === 'active') return 'Actif'
    if (profile.status === 'expired') return 'Expiré'
    if (profile.status === 'trial') {
      return trialEnd > now ? 'Essai' : 'Expiré'
    }
    return 'Inconnu'
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
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    
    return profiles.filter(profile => {
      if (profile.status !== 'trial') return false
      const trialDate = new Date(profile.trial_end)
      return trialDate >= now && trialDate <= twoDaysFromNow
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const handleExtendTrial = async (profileId: string) => {
    try {
      const profile = profiles.find(p => p.id === profileId)
      if (!profile) return

      const currentEnd = new Date(profile.trial_end)
      const newEnd = new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000)

      const { error } = await supabase
        .from('profiles')
        .update({ trial_end: newEnd.toISOString() })
        .eq('id', profileId)

      if (error) throw error
      
      loadProfiles() // Refresh data
    } catch (err) {
      console.error('Error extending trial:', err)
    }
  }

  const handleSuspendUser = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'suspended' })
        .eq('id', profileId)

      if (error) throw error
      
      loadProfiles() // Refresh data
    } catch (err) {
      console.error('Error suspending user:', err)
    }
  }

  const handleReactivateUser = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'trial' })
        .eq('id', profileId)

      if (error) throw error
      
      loadProfiles() // Refresh data
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
            <p className="font-medium">⚠️ {expiringTrials.length} compte(s) expirent dans moins de 2 jours</p>
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
                {profiles.map((profile) => {
                  const status = getStatus(profile)
                  return (
                    <tr key={profile.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {profile.hotel_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {profile.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {profile.country || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(profile.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {profile.trial_end 
                          ? new Date(profile.trial_end).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {profile.total_scans || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 text-xs">👁 Voir</button>
                        {status === 'Essai' && (
                          <button 
                            onClick={() => handleExtendTrial(profile.id)}
                            className="text-green-600 hover:text-green-900 text-xs"
                          >
                            ⏱ +7j
                          </button>
                        )}
                        {(status === 'Actif' || status === 'Essai') && (
                          <button 
                            onClick={() => handleSuspendUser(profile.id)}
                            className="text-red-600 hover:text-red-900 text-xs"
                          >
                            🚫 Suspendre
                          </button>
                        )}
                        {(status === 'Suspendu' || status === 'Expiré') && (
                          <button 
                            onClick={() => handleReactivateUser(profile.id)}
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
