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
      case 'Essai': return 'bg-[#fef3c7] text-[#92400e]'
      case 'Actif': return 'bg-[#dcfce7] text-[#166534]'
      case 'Expiré': return 'bg-[#fee2e2] text-[#991b1b]'
      case 'Suspendu': return 'bg-[#f1f5f9] text-[#64748b]'
      default: return 'bg-[#f1f5f9] text-[#64748b]'
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
    window.location.href = '/'
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
    <div style={{minHeight: "100vh", background: "#e8f4fd"}}>
      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #1e3a8a, #4a90d9)",
        boxShadow: "0 4px 16px rgba(30,58,138,0.2)"
      }}>
        <div style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "16px 24px"
        }} className="sm:px-6">
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px"
          }}>
            <div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "4px"
              }}>
                <div style={{
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center"
                }}>
                  <img 
                    src="/percepta-logo.png" 
                    alt="Check-in Express by Percepta" 
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <h1 style={{fontSize: "24px", fontWeight: "bold", color: "white", margin: 0}}>
                  Admin — Check-in Express
                </h1>
              </div>
              <p style={{color: "white", fontSize: "14px", margin: 0}}>
                Gestion des utilisateurs et KPIs
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "transparent",
                color: "white",
                border: "1px solid white",
                cursor: "pointer"
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main style={{padding: "24px"}}>
        {/* Alert Banner */}
        {expiringTrials.length > 0 && (
          <div style={{
            marginBottom: "24px",
            background: "rgba(254,226,226,0.9)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(239,68,68,0.5)",
            borderRadius: "12px",
            padding: "12px 16px"
          }}>
            <p style={{color: "#991b1b", fontWeight: "500", margin: 0}}>
              ⚠️ {expiringTrials.length} compte(s) expirent dans moins de 2 jours
            </p>
          </div>
        )}

        {/* KPI Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
          marginBottom: "32px"
        }} className="lg:grid-cols-4 lg:gap-24">
          <div style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(191,219,254,0.5)",
            borderRadius: "16px",
            boxShadow: "0 4px 16px rgba(30,58,138,0.08)",
            padding: "24px",
            textAlign: "center"
          }}>
            <div style={{color: "#1e3a8a", fontWeight: "800", fontSize: "36px", marginBottom: "8px"}}>
              {stats.total}
            </div>
            <div style={{color: "#64748b", fontSize: "14px"}}>
              Total inscrits
            </div>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(191,219,254,0.5)",
            borderRadius: "16px",
            boxShadow: "0 4px 16px rgba(30,58,138,0.08)",
            padding: "24px",
            textAlign: "center"
          }}>
            <div style={{color: "#1e3a8a", fontWeight: "800", fontSize: "36px", marginBottom: "8px"}}>
              {stats.trial}
            </div>
            <div style={{color: "#64748b", fontSize: "14px"}}>
              En essai (live)
            </div>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(191,219,254,0.5)",
            borderRadius: "16px",
            boxShadow: "0 4px 16px rgba(30,58,138,0.08)",
            padding: "24px",
            textAlign: "center"
          }}>
            <div style={{color: "#1e3a8a", fontWeight: "800", fontSize: "36px", marginBottom: "8px"}}>
              {stats.active}
            </div>
            <div style={{color: "#64748b", fontSize: "14px"}}>
              Actifs (payants)
            </div>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(191,219,254,0.5)",
            borderRadius: "16px",
            boxShadow: "0 4px 16px rgba(30,58,138,0.08)",
            padding: "24px",
            textAlign: "center"
          }}>
            <div style={{color: "#1e3a8a", fontWeight: "800", fontSize: "36px", marginBottom: "8px"}}>
              {stats.expired}
            </div>
            <div style={{color: "#64748b", fontSize: "14px"}}>
              Expirés
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(191,219,254,0.5)",
          borderRadius: "16px",
          overflow: "hidden"
        }}>
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e2e8f0]">
            <h2 className="text-base sm:text-lg font-bold text-[#1e3a8a]">Utilisateurs</h2>
          </div>
          
          {/* Mobile: Cards View */}
          <div className="sm:hidden divide-y divide-[#e2e8f0]">
            {profiles.map((profile) => {
              const status = getStatus(profile)
              return (
                <div key={profile.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#1e293b] text-sm truncate">
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
                      <span className="ml-1 text-[#1e293b]">{profile.country || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Inscription:</span>
                      <span className="ml-1 text-[#1e293b]">
                        {new Date(profile.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748b]">Fin essai:</span>
                      <span className="ml-1 text-[#1e293b]">
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
                      <span className="ml-1 text-[#1e293b]">{profile.total_scans || 0}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button className="text-[#1e3a8a] hover:underline text-xs">👁</button>
                    {status === 'Essai' && (
                      <button 
                        onClick={() => handleExtendTrial(profile.id)}
                        className="text-[#1e3a8a] hover:underline text-xs"
                      >
                        ⏱ +7j
                      </button>
                    )}
                    {(status === 'Actif' || status === 'Essai') && (
                      <button 
                        onClick={() => handleSuspendUser(profile.id)}
                        className="text-[#1e3a8a] hover:underline text-xs"
                      >
                        🚫
                      </button>
                    )}
                    {(status === 'Suspendu' || status === 'Expiré') && (
                      <button 
                        onClick={() => handleReactivateUser(profile.id)}
                        className="text-[#1e3a8a] hover:underline text-xs"
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
              <thead className="bg-[#f8fafc]">
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
                    <tr key={profile.id} className="hover:bg-[#f8fafc]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1e293b]">
                        {profile.hotel_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1e293b]">
                        {profile.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1e293b]">
                        {profile.country || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1e293b]">
                        {new Date(profile.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1e293b]">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1e293b]">
                        {profile.total_scans || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button className="text-[#1e3a8a] hover:underline text-xs">👁 Voir</button>
                        {status === 'Essai' && (
                          <button 
                            onClick={() => handleExtendTrial(profile.id)}
                            className="text-[#1e3a8a] hover:underline text-xs"
                          >
                            ⏱ +7j
                          </button>
                        )}
                        {(status === 'Actif' || status === 'Essai') && (
                          <button 
                            onClick={() => handleSuspendUser(profile.id)}
                            className="text-[#1e3a8a] hover:underline text-xs"
                          >
                            🚫 Suspendre
                          </button>
                        )}
                        {(status === 'Suspendu' || status === 'Expiré') && (
                          <button 
                            onClick={() => handleReactivateUser(profile.id)}
                            className="text-[#1e3a8a] hover:underline text-xs"
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
