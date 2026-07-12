import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LogoutConfirmModal from '../components/LogoutConfirmModal'
async function callAdminApi(action: string, params?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, ...params },
  })
  if (error) throw error
  return data
}

interface Hotel {
  id: string
  hotel_name: string
  email: string
  subscription_status: string
  status: string
  trial_end: string
  created_at: string
  last_sign_in_at?: string
  ocr_scans_used?: number
  user_id: string
}

const AdminUsers: React.FC = () => {
  const navigate = useNavigate()
  const [showLogout, setShowLogout] = useState(false)
  const doSignOut = async () => { await supabase.auth.signOut(); window.location.replace('/login') }

  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'trial' | 'starter' | 'business' | 'expired'>('all')

  const fetchHotels = async () => {
    setLoading(true)
    setError(null)
    try {
      const { hotels: data } = await callAdminApi('listHotels')
      setHotels(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchHotels() }, [])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSuspend = async (hotel: Hotel) => {
    if (!confirm(`Suspendre le compte de ${hotel.hotel_name} ?`)) return
    try {
      await callAdminApi('updateHotel', { hotelId: hotel.id, updateData: { status: 'suspended' } })
      void fetchHotels()
    } catch (err) { alert('Erreur : ' + String(err)) }
  }

  const handleDeactivate = async (hotel: Hotel) => {
    if (!confirm(`Désactiver définitivement ${hotel.hotel_name} ?`)) return
    try {
      await callAdminApi('updateHotel', { hotelId: hotel.id, updateData: { status: 'disabled' } })
      void fetchHotels()
    } catch (err) { alert('Erreur : ' + String(err)) }
  }

  const handleReactivate = async (hotel: Hotel) => {
    if (!confirm(`Réactiver ${hotel.hotel_name} ?`)) return
    try {
      await callAdminApi('updateHotel', { hotelId: hotel.id, updateData: { status: 'active' } })
      void fetchHotels()
    } catch (err) { alert('Erreur : ' + String(err)) }
  }

  const handleExtendTrial = async (hotel: Hotel, days: number) => {
    if (!confirm(`Prolonger le trial de ${hotel.hotel_name} de ${days} jours ?`)) return
    const end = new Date(); end.setDate(end.getDate() + days)
    try {
      await callAdminApi('updateHotel', {
        hotelId: hotel.id,
        updateData: { subscription_status: 'trial', trial_end: end.toISOString(), status: 'active' },
      })
      void fetchHotels()
    } catch (err) { alert('Erreur : ' + String(err)) }
  }

  const handleDelete = async (hotel: Hotel) => {
    if (!confirm(`⚠️ Supprimer DÉFINITIVEMENT le compte de ${hotel.hotel_name} (${hotel.email}) ?\n\nAction irréversible.`)) return
    try {
      await callAdminApi('deleteHotel', { hotelId: hotel.id, userId: hotel.user_id })
      void fetchHotels()
    } catch (err) { alert('Erreur suppression : ' + String(err)) }
  }

  // ── Badges ─────────────────────────────────────────────────────────────────

  const subBadge = (hotel: Hotel) => {
    const isExpired = hotel.subscription_status === 'trial' && new Date(hotel.trial_end) < new Date()
    if (isExpired) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Expiré</span>
    }
    const map: Record<string, string> = {
      trial:    'bg-yellow-100 text-yellow-800',
      starter:  'bg-green-100 text-green-800',
      business: 'bg-blue-100 text-blue-800',
    }
    const labels: Record<string, string> = { trial: 'Trial', starter: 'Starter', business: 'Business' }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[hotel.subscription_status] ?? 'bg-gray-100 text-gray-800'}`}>
        {labels[hotel.subscription_status] ?? hotel.subscription_status}
        {hotel.subscription_status === 'trial' && hotel.trial_end && (
          <span className="ml-1 opacity-70">
            ({Math.max(0, Math.ceil((new Date(hotel.trial_end).getTime() - Date.now()) / 86_400_000))}j)
          </span>
        )}
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
        {labels[status] ?? status}
      </span>
    )
  }

  // ── Filtres ───────────────────────────────────────────────────────────────

  const now = new Date()
  const filtered = hotels
    .filter(h => {
      const q = search.toLowerCase()
      if (q && !h.hotel_name?.toLowerCase().includes(q) && !h.email?.toLowerCase().includes(q)) return false
      if (filter === 'all') return true
      if (filter === 'expired') return h.subscription_status === 'trial' && new Date(h.trial_end) < now
      return h.subscription_status === filter
    })

  const counts = {
    all:      hotels.length,
    trial:    hotels.filter(h => h.subscription_status === 'trial' && new Date(h.trial_end) >= now).length,
    expired:  hotels.filter(h => h.subscription_status === 'trial' && new Date(h.trial_end) < now).length,
    starter:  hotels.filter(h => h.subscription_status === 'starter').length,
    business: hotels.filter(h => h.subscription_status === 'business').length,
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {showLogout && (
        <LogoutConfirmModal onConfirm={() => void doSignOut()} onCancel={() => setShowLogout(false)} />
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]">
        <div className="flex items-center gap-3">
          <div className="bg-white/90 rounded-xl p-1.5">
            <img src="/percepta-logo.png" className="h-8 w-auto object-contain" alt="Percepta" />
          </div>
          <h1 className="text-white font-bold text-lg">Gestion des utilisateurs</h1>
        </div>
        <button
          onClick={() => setShowLogout(true)}
          className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-4 py-2 rounded-lg text-sm"
        >
          Déconnexion
        </button>
      </header>

      {/* Sub-nav */}
      <nav className="bg-white border-b border-gray-200 px-4">
        <div className="flex gap-1 max-w-7xl mx-auto">
          {[
            { label: 'Tableau de bord', path: '/admin' },
            { label: 'Utilisateurs',    path: '/admin/users',      active: true },
            { label: 'Analytics',       path: '/admin/analytics' },
            { label: 'Paramètres',      path: '/admin/parametres' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                item.active
                  ? 'border-[#1e3a8a] text-[#1e3a8a]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">


        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Rechercher hôtel ou email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <div className="flex gap-1 flex-wrap">
            {(['all', 'trial', 'expired', 'starter', 'business'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'Tous' : f === 'expired' ? 'Expirés' : f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-1 opacity-70">({counts[f]})</span>
              </button>
            ))}
          </div>
          <button onClick={fetchHotels} className="px-4 py-2 bg-[#1e3a8a] text-white text-sm rounded-lg hover:bg-blue-800 shrink-0">
            ↻ Actualiser
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a]" />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 text-sm text-gray-500">
                {filtered.length} hôtel{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Hôtel', 'Email', 'Plan', 'Statut', 'Créé le', 'Fin essai', 'Dernière connexion', 'Scans', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(hotel => {
                      const isExpiredTrial = hotel.subscription_status === 'trial' && new Date(hotel.trial_end) < now
                      return (
                        <tr key={hotel.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[140px] truncate">{hotel.hotel_name || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{hotel.email}</td>
                          <td className="px-4 py-3">{subBadge(hotel)}</td>
                          <td className="px-4 py-3">{statusBadge(hotel.status)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(hotel.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {hotel.trial_end ? new Date(hotel.trial_end).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {hotel.last_sign_in_at
                              ? new Date(hotel.last_sign_in_at).toLocaleDateString('fr-FR')
                              : 'Jamais'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{hotel.ocr_scans_used ?? 0}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {hotel.status === 'active' && !isExpiredTrial && (
                                <button onClick={() => handleSuspend(hotel)}    className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600">Suspendre</button>
                              )}
                              {hotel.status === 'active' && !isExpiredTrial && (
                                <button onClick={() => handleDeactivate(hotel)} className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600">Désactiver</button>
                              )}
                              {(hotel.status === 'suspended' || hotel.status === 'disabled' || isExpiredTrial) && (
                                <button onClick={() => handleReactivate(hotel)} className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Réactiver</button>
                              )}
                              <button onClick={() => handleExtendTrial(hotel, 7)}  className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">+7j</button>
                              <button onClick={() => handleExtendTrial(hotel, 30)} className="px-2 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-800">+30j</button>
                              <button onClick={() => handleDelete(hotel)}          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">Suppr.</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">Aucun résultat</p>}
              </div>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-3">
              {filtered.map(hotel => {
                const isExpiredTrial = hotel.subscription_status === 'trial' && new Date(hotel.trial_end) < now
                return (
                  <div key={hotel.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{hotel.hotel_name || '—'}</p>
                        <p className="text-xs text-gray-500">{hotel.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Inscrit le {new Date(hotel.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {subBadge(hotel)}
                        {statusBadge(hotel.status)}
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500 mb-3">
                      <span>{hotel.ocr_scans_used ?? 0} scans</span>
                      {hotel.trial_end && <span>· Fin essai {new Date(hotel.trial_end).toLocaleDateString('fr-FR')}</span>}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {hotel.status === 'active' && !isExpiredTrial && (
                        <button onClick={() => handleSuspend(hotel)}    className="px-3 py-1.5 bg-yellow-500 text-white text-xs rounded">Suspendre</button>
                      )}
                      {(hotel.status === 'suspended' || hotel.status === 'disabled' || isExpiredTrial) && (
                        <button onClick={() => handleReactivate(hotel)} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded">Réactiver</button>
                      )}
                      <button onClick={() => handleExtendTrial(hotel, 7)}  className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded">+7j trial</button>
                      <button onClick={() => handleExtendTrial(hotel, 30)} className="px-3 py-1.5 bg-blue-700 text-white text-xs rounded">+30j trial</button>
                      <button onClick={() => handleDelete(hotel)}          className="px-3 py-1.5 bg-red-600 text-white text-xs rounded">Supprimer</button>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">Aucun résultat</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AdminUsers
