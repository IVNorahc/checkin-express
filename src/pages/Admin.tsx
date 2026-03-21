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
      case 'Essai': return 'bg-yellow-100 text-yellow-700'
      case 'Actif': return 'bg-green-100 text-green-700'
      case 'Expiré': return 'bg-red-100 text-red-700'
      case 'Suspendu': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
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
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-[#1a2744]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">⚙️ Admin — Check-in Express</h1>
              <p className="text-white text-sm sm:text-base mt-1">Gestion des utilisateurs et KPIs</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md bg-transparent text-white border border-white/30 hover:bg-white/10 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6">
        {/* Alert Banner */}
        {expiringTrials.length > 0 && (
          <div className="mb-6 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg">
            <p className="font-medium">⚠️ {expiringTrials.length} compte(s) expirent dans moins de 2 jours</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white border border-[#e2e8f0] shadow-sm rounded-xl p-4 sm:p-6">
            <div className="text-[#c17b3f] font-bold text-2xl sm:text-3xl mb-2">{stats.total}</div>
            <div className="text-[#64748b] text-xs sm:text-sm">Total inscrits</div>
          </div>
          <div className="bg-white border border-[#e2e8f0] shadow-sm rounded-xl p-4 sm:p-6">
            <div className="text-[#c17b3f] font-bold text-2xl sm:text-3xl mb-2">{stats.trial}</div>
            <div className="text-[#64748b] text-xs sm:text-sm">En essai (live)</div>
          </div>
          <div className="bg-white border border-[#e2e8f0] shadow-sm rounded-xl p-4 sm:p-6">
            <div className="text-[#c17b3f] font-bold text-2xl sm:text-3xl mb-2">{stats.active}</div>
            <div className="text-[#64748b] text-xs sm:text-sm">Actifs (payants)</div>
          </div>
          <div className="bg-white border border-[#e2e8f0] shadow-sm rounded-xl p-4 sm:p-6">
            <div className="text-[#c17b3f] font-bold text-2xl sm:text-3xl mb-2">{stats.expired}</div>
            <div className="text-[#64748b] text-xs sm:text-sm">Expirés</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-[#e2e8f0] shadow-sm rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e2e8f0]">
            <h2 className="text-base sm:text-lg font-bold text-[#1a2744]">Utilisateurs</h2>
          </div>
          
          {/* Mobile: Cards View */}
          <div className="sm:hidden divide-y divide-[#e2e8f0]">
            {profiles.map((profile) => {
              const status = getStatus(profile)
              return (
                <div key={profile.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#0f172a] text-sm truncate">
                        {profile.hotel_name || 'Non spécifié'}
                      </div>
                      <div className="text-xs text-[#64748b] truncate">
                        {profile.email || '-'}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#64748b]">Pays:</span>
                      <span className="ml-1 text-[#0f172a]">{profile.country || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Inscription:</span>
                      <span className="ml-1 text-[#0f172a]">
                        {new Date(profile.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Fin essai:</span>
                      <span className="ml-1 text-[#0f172a]">
                        {profile.trial_end 
                          ? new Date(profile.trial_end).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })
                          : '-'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Scans:</span>
                      <span className="ml-1 text-[#0f172a]">{profile.total_scans || 0}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button className="text-[#c17b3f] hover:underline text-xs">👁</button>
                    {status === 'Essai' && (
                      <button 
                        onClick={() => handleExtendTrial(profile.id)}
                        className="text-[#c17b3f] hover:underline text-xs"
                      >
                        ⏱ +7j
                      </button>
                    )}
                    {(status === 'Actif' || status === 'Essai') && (
                      <button 
                        onClick={() => handleSuspendUser(profile.id)}
                        className="text-[#c17b3f] hover:underline text-xs"
                      >
                        🚫
                      </button>
                    )}
                    {(status === 'Suspendu' || status === 'Expiré') && (
                      <button 
                        onClick={() => handleReactivateUser(profile.id)}
                        className="text-[#c17b3f] hover:underline text-xs"
                      >
                        ✅
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8f9fa]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Hôtel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Pays</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Inscription</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Fin essai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Scans</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#e2e8f0]">
                {profiles.map((profile) => {
                  const status = getStatus(profile)
                  return (
                    <tr key={profile.id} className="hover:bg-[#f8f9fa]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0f172a]">
                        {profile.hotel_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0f172a]">
                        {profile.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0f172a]">
                        {profile.country || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0f172a]">
                        {new Date(profile.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0f172a]">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0f172a]">
                        {profile.total_scans || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-[#c17b3f] hover:underline text-xs">👁 Voir</button>
                        {status === 'Essai' && (
                          <button 
                            onClick={() => handleExtendTrial(profile.id)}
                            className="text-[#c17b3f] hover:underline text-xs"
                          >
                            ⏱ +7j
                          </button>
                        )}
                        {(status === 'Actif' || status === 'Essai') && (
                          <button 
                            onClick={() => handleSuspendUser(profile.id)}
                            className="text-[#c17b3f] hover:underline text-xs"
                          >
                            🚫 Suspendre
                          </button>
                        )}
                        {(status === 'Suspendu' || status === 'Expiré') && (
                          <button 
                            onClick={() => handleReactivateUser(profile.id)}
                            className="text-[#c17b3f] hover:underline text-xs"
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
