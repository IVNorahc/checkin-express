import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Users, Camera, TrendingUp, Clock, AlertCircle, BarChart2, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── API helper ─────────────────────────────────────────────────────────────────

async function callAdminApi(action: string, params?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, ...params },
  })
  if (error) throw error
  return data
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

type KPIColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'orange' | 'emerald'

const COLOR_MAP: Record<KPIColor, { bg: string; border: string; text: string; icon: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    icon: 'bg-blue-500' },
  green:   { bg: 'bg-green-50',   border: 'border-green-200',   text: 'text-green-700',   icon: 'bg-green-500' },
  yellow:  { bg: 'bg-yellow-50',  border: 'border-yellow-200',  text: 'text-yellow-700',  icon: 'bg-yellow-500' },
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     icon: 'bg-red-500' },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-700',  icon: 'bg-purple-500' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  icon: 'bg-indigo-500' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  icon: 'bg-orange-500' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'bg-emerald-500' },
}

interface KPICardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: KPIColor
  sub?: string
  loading?: boolean
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, color, sub, loading = false }) => {
  const c = COLOR_MAP[color]
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-7 bg-gray-200 rounded w-2/3" />
      </div>
    )
  }
  return (
    <div className={`bg-white rounded-xl border ${c.border} p-5 flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${c.text}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`shrink-0 ${c.icon} rounded-xl p-2.5 text-white`}>{icon}</div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface HotelRow {
  id: string
  hotel_name: string
  email: string
  subscription_status: string
  trial_end: string
  created_at: string
  last_sign_in_at?: string
  ocr_scans_used: number
  monthly_scans: number
  status: string
  user_id: string
}

interface DetailedKPIs {
  totalHotels: number
  trialActive: number
  trialExpired: number
  starter: number
  business: number
  todayScans: number
  monthScans: number
  monthlyRevenue: string
}

// ── Component ─────────────────────────────────────────────────────────────────

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()

  const [kpis, setKpis]             = useState<DetailedKPIs | null>(null)
  const [kpisLoading, setKpisLoading] = useState(true)
  const [kpisError, setKpisError]   = useState<string | null>(null)

  const [hotels, setHotels]               = useState<HotelRow[]>([])
  const [hotelsLoading, setHotelsLoading] = useState(true)
  const [hotelsError, setHotelsError]     = useState<string | null>(null)

  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')

  // ── Fetches (indépendants) ──────────────────────────────────────────────────

  const fetchKPIs = useCallback(async () => {
    setKpisLoading(true)
    setKpisError(null)
    try {
      const data = await callAdminApi('getDetailedKPIs')
      setKpis(data)
    } catch (err) {
      setKpisError(err instanceof Error ? err.message : 'Erreur KPIs')
    } finally {
      setKpisLoading(false)
    }
  }, [])

  const fetchHotels = useCallback(async () => {
    setHotelsLoading(true)
    setHotelsError(null)
    try {
      const { hotels: list } = await callAdminApi('listHotels')
      setHotels(list ?? [])
    } catch (err) {
      setHotelsError(err instanceof Error ? err.message : 'Erreur liste hôtels')
    } finally {
      setHotelsLoading(false)
    }
  }, [])

  const fetchAll = useCallback(() => {
    void fetchKPIs()
    void fetchHotels()
  }, [fetchKPIs, fetchHotels])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Supabase Realtime ───────────────────────────────────────────────────────
  // Nécessite la migration 20240604_fix_admin_functions.sql pour que
  // is_admin_user() soit actif et que l'admin puisse voir les changements.

  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hotels' },
        () => {
          void fetchHotels()
          void fetchKPIs()
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'clients' },
        () => { void fetchKPIs() },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED')   setRealtimeStatus('connected')
        if (status === 'CHANNEL_ERROR') setRealtimeStatus('error')
      })

    return () => { void supabase.removeChannel(channel) }
  }, [fetchHotels, fetchKPIs])

  // Polling 60 s en fallback si le realtime ne reçoit pas d'évènements
  useEffect(() => {
    const timer = window.setInterval(fetchAll, 60_000)
    return () => window.clearInterval(timer)
  }, [fetchAll])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAction = async (hotelId: string, newStatus: string) => {
    const msg: Record<string, string> = {
      suspended: 'Suspendre ce compte ?',
      inactive:  'Désactiver définitivement ce compte ?',
      active:    'Réactiver ce compte ?',
    }
    if (!confirm(msg[newStatus] ?? 'Confirmer ?')) return
    const updateData: Record<string, unknown> = { subscription_status: newStatus }
    if (newStatus === 'active') {
      const end = new Date(); end.setDate(end.getDate() + 7)
      updateData.subscription_status = 'trial'
      updateData.trial_end = end.toISOString()
    }
    try {
      await callAdminApi('updateHotel', { hotelId, updateData })
      void fetchAll()
    } catch (err) {
      alert('Erreur : ' + String(err))
    }
  }

  const handleExtendTrial = async (hotelId: string, days: number) => {
    if (!confirm(`Prolonger le trial de ${days} jours ?`)) return
    const end = new Date(); end.setDate(end.getDate() + days)
    try {
      await callAdminApi('updateHotel', {
        hotelId,
        updateData: { subscription_status: 'trial', trial_end: end.toISOString() },
      })
      void fetchAll()
    } catch (err) {
      alert('Erreur : ' + String(err))
    }
  }

  const handleDelete = async (hotel: HotelRow) => {
    if (!confirm(`⚠️ Supprimer DÉFINITIVEMENT le compte de ${hotel.hotel_name} (${hotel.email}) ?\n\nAction irréversible.`)) return
    try {
      await callAdminApi('deleteHotel', { hotelId: hotel.id, userId: hotel.user_id })
      void fetchAll()
    } catch (err) {
      alert('Erreur suppression : ' + String(err))
    }
  }

  const exportCSV = () => {
    const headers = ['Hôtel', 'Email', 'Abonnement', 'Statut', 'Créé le', 'Fin essai', 'Scans mois', 'Scans total']
    const rows = hotels.map(h => [
      h.hotel_name, h.email, h.subscription_status,
      h.status, h.created_at, h.trial_end, h.monthly_scans, h.ocr_scans_used,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `hotels-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Badges ────────────────────────────────────────────────────────────────

  const subBadge = (status: string) => {
    const map: Record<string, string> = {
      trial:    'bg-yellow-100 text-yellow-800',
      starter:  'bg-green-100 text-green-800',
      business: 'bg-blue-100 text-blue-800',
    }
    const labels: Record<string, string> = { trial: 'Trial', starter: 'Starter', business: 'Business' }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-red-100 text-red-800'}`}>
        {labels[status] ?? 'Expiré'}
      </span>
    )
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active:    'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      disabled:  'bg-red-100 text-red-800',
    }
    const labels: Record<string, string> = { active: 'Actif', suspended: 'Suspendu', disabled: 'Désactivé' }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-800'}`}>
        {labels[status] ?? 'Inconnu'}
      </span>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]">
        <div className="flex items-center gap-3">
          <div className="bg-white/90 rounded-xl p-1.5">
            <img src="/percepta-logo.png" className="h-8 w-auto object-contain" alt="Percepta" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">Admin — Check-in Express</h1>
            <p className="text-blue-200 text-xs mt-0.5 flex items-center gap-1">
              Tableau de bord
              <span className={`w-1.5 h-1.5 rounded-full inline-block ml-1 ${
                realtimeStatus === 'connected' ? 'bg-green-400' :
                realtimeStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400'
              }`} title={`Realtime : ${realtimeStatus}`} />
            </p>
          </div>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.replace('/login') }}
          className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-4 py-2 rounded-lg text-sm"
        >
          Déconnexion
        </button>
      </header>

      {/* Sub-nav */}
      <nav className="bg-white border-b border-gray-200 px-4">
        <div className="flex gap-1 max-w-7xl mx-auto">
          {[
            { label: 'Tableau de bord', path: '/admin',           active: true },
            { label: 'Utilisateurs',    path: '/admin/users',      active: false },
            { label: 'Analytics',       path: '/admin/analytics',  active: false },
            { label: 'Paramètres',      path: '/admin/parametres', active: false },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                item.active
                  ? 'border-[#1e3a8a] text-[#1e3a8a]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* KPIs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Métriques en temps réel</h2>
            <button
              onClick={fetchAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              ↻ Actualiser
            </button>
          </div>

          {kpisError && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>KPIs : {kpisError}</span>
              <button onClick={fetchKPIs} className="ml-auto underline text-xs">Réessayer</button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard
              title="Total hôtels"
              value={kpis?.totalHotels ?? hotels.length}
              icon={<Building2 className="w-5 h-5" />}
              color="blue"
              loading={kpisLoading && hotels.length === 0}
            />
            <KPICard
              title="Trial actif"
              value={kpis?.trialActive ?? 0}
              icon={<Clock className="w-5 h-5" />}
              color="yellow"
              loading={kpisLoading}
            />
            <KPICard
              title="Trial expiré"
              value={kpis?.trialExpired ?? 0}
              icon={<AlertCircle className="w-5 h-5" />}
              color="red"
              loading={kpisLoading}
            />
            <KPICard
              title="Starter"
              value={kpis?.starter ?? 0}
              icon={<Users className="w-5 h-5" />}
              color="green"
              loading={kpisLoading}
            />
            <KPICard
              title="Business"
              value={kpis?.business ?? 0}
              icon={<Users className="w-5 h-5" />}
              color="indigo"
              loading={kpisLoading}
            />
            <KPICard
              title="Scans auj."
              value={kpis?.todayScans ?? 0}
              icon={<Camera className="w-5 h-5" />}
              color="orange"
              sub="depuis table clients"
              loading={kpisLoading}
            />
            <KPICard
              title="Scans ce mois"
              value={kpis?.monthScans ?? 0}
              icon={<BarChart2 className="w-5 h-5" />}
              color="purple"
              loading={kpisLoading}
            />
            <KPICard
              title="Revenus/mois"
              value={kpis ? `${kpis.monthlyRevenue} €` : '— €'}
              icon={<TrendingUp className="w-5 h-5" />}
              color="emerald"
              sub="Starter 49,99 € · Business 89,99 €"
              loading={kpisLoading}
            />
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Actions rapides</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCSV}                         className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">Exporter CSV</button>
            <button onClick={() => navigate('/admin/users')}    className="px-4 py-2 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg hover:bg-blue-800">Gérer utilisateurs</button>
            <button onClick={() => navigate('/admin/analytics')} className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700">Analytics</button>
            <button onClick={() => setShowSettingsModal(true)}  className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 flex items-center gap-1">
              <Settings className="w-4 h-4" />Paramètres
            </button>
          </div>
        </div>

        {/* Tableau utilisateurs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-gray-900">
              Hôtels inscrits ({hotelsLoading ? '…' : hotels.length})
            </h3>
            <div className="flex gap-3 text-sm">
              <span className="text-green-600">{kpis?.starter   ?? '…'} Starter</span>
              <span className="text-indigo-600">{kpis?.business ?? '…'} Business</span>
              <span className="text-yellow-600">{kpis?.trialActive ?? '…'} Trial</span>
              <span className="text-red-600">{kpis?.trialExpired ?? '…'} Expirés</span>
            </div>
          </div>

          {hotelsError && (
            <div className="m-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {hotelsError}
              <button onClick={fetchHotels} className="ml-auto underline text-xs">Réessayer</button>
            </div>
          )}

          {hotelsLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#1e3a8a]" />
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Hôtel', 'Email', 'Abonnement', 'Statut', 'Créé le', 'Fin essai', 'Scans mois', 'Actions'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {hotels.map((hotel) => {
                      const isExpiredTrial = hotel.subscription_status === 'trial' && new Date(hotel.trial_end) < new Date()
                      const canSuspend = hotel.status === 'active' && !isExpiredTrial
                      return (
                        <tr key={hotel.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-sm font-medium text-gray-900 max-w-[140px] truncate">{hotel.hotel_name || '—'}</td>
                          <td className="px-5 py-3 text-sm text-gray-600">{hotel.email}</td>
                          <td className="px-5 py-3">{subBadge(hotel.subscription_status)}</td>
                          <td className="px-5 py-3">{statusBadge(hotel.status)}</td>
                          <td className="px-5 py-3 text-sm text-gray-500">{new Date(hotel.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="px-5 py-3 text-sm text-gray-500">
                            {hotel.trial_end ? new Date(hotel.trial_end).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-sm font-semibold text-gray-800">{hotel.monthly_scans}</span>
                            {hotel.ocr_scans_used > 0 && (
                              <span className="text-xs text-gray-400 ml-1">/ {hotel.ocr_scans_used} total</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {canSuspend && (
                                <button onClick={() => handleAction(hotel.id, 'suspended')} className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600">Suspendre</button>
                              )}
                              {(hotel.status === 'suspended' || isExpiredTrial) && (
                                <button onClick={() => handleAction(hotel.id, 'active')} className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Réactiver</button>
                              )}
                              <button onClick={() => handleExtendTrial(hotel.id, 7)}  className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">+7j</button>
                              <button onClick={() => handleExtendTrial(hotel.id, 30)} className="px-2 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-800">+30j</button>
                              <button onClick={() => handleDelete(hotel)}             className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">Suppr.</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {hotels.length === 0 && !hotelsLoading && (
                  <p className="text-center py-10 text-gray-400 text-sm">Aucun hôtel inscrit</p>
                )}
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {hotels.map((hotel) => {
                  const isExpiredTrial = hotel.subscription_status === 'trial' && new Date(hotel.trial_end) < new Date()
                  return (
                    <div key={hotel.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{hotel.hotel_name || '—'}</p>
                          <p className="text-xs text-gray-500">{hotel.email}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{hotel.monthly_scans} scans ce mois</p>
                        </div>
                        <div className="flex gap-1 flex-col items-end">
                          {subBadge(hotel.subscription_status)}
                          {statusBadge(hotel.status)}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {hotel.status === 'active' && !isExpiredTrial && (
                          <button onClick={() => handleAction(hotel.id, 'suspended')} className="px-3 py-1.5 bg-yellow-500 text-white text-xs rounded">Suspendre</button>
                        )}
                        {(hotel.status === 'suspended' || isExpiredTrial) && (
                          <button onClick={() => handleAction(hotel.id, 'active')} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded">Réactiver</button>
                        )}
                        <button onClick={() => handleExtendTrial(hotel.id, 7)}  className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded">+7j trial</button>
                        <button onClick={() => handleExtendTrial(hotel.id, 30)} className="px-3 py-1.5 bg-blue-700 text-white text-xs rounded">+30j trial</button>
                        <button onClick={() => handleDelete(hotel)}             className="px-3 py-1.5 bg-red-600 text-white text-xs rounded">Supprimer</button>
                      </div>
                    </div>
                  )
                })}
                {hotels.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">Aucun hôtel</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modale Paramètres */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Paramètres système</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Les paramètres globaux sont gérés dans la page dédiée.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowSettingsModal(false); navigate('/admin/parametres') }}
                className="flex-1 bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm font-medium">
                Ouvrir les paramètres
              </button>
              <button onClick={() => setShowSettingsModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
