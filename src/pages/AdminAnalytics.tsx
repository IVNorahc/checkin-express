import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'

async function callAdminApi(action: string, params?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, ...params },
  })
  if (error) throw error
  return data
}

// Retourne la date ISO du lundi de la semaine (en UTC) — clé stable pour le regroupement
function mondayKey(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDay()
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
  return monday.toISOString().split('T')[0]
}

function isoDateToLabel(dateKey: string): string {
  // "2026-05-04" → "4 mai"
  const [y, m, dd] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, dd))
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

interface WeeklyPoint { week: string; inscriptions: number }
interface DailyPoint  { date: string; scans: number }

const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate()
  const [weeklyData, setWeeklyData]  = useState<WeeklyPoint[]>([])
  const [dailyScans, setDailyScans]  = useState<DailyPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]    = useState<string | null>(null)
  const [hotelFilter, setHotelFilter] = useState('all')
  const [hotels, setHotels] = useState<{ id: string; hotel_name: string }[]>([])

  const [totals, setTotals] = useState({ inscriptions: 0, scansMonth: 0, scansToday: 0 })

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [signupRes, scanRes, hotelRes, kpiRes] = await Promise.all([
        callAdminApi('getWeeklySignups'),
        callAdminApi('getDailyScans', { hotelId: hotelFilter }),
        callAdminApi('listHotels'),
        callAdminApi('getDetailedKPIs'),
      ])

      // ── Inscriptions par semaine (clé ISO lundi → tri → label) ──────────────
      const weekMap: Record<string, number> = {}
      for (const row of (signupRes?.data ?? []) as { created_at: string }[]) {
        const key = mondayKey(row.created_at)
        weekMap[key] = (weekMap[key] ?? 0) + 1
      }
      setWeeklyData(
        Object.entries(weekMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, inscriptions]) => ({ week: isoDateToLabel(key), inscriptions }))
      )
      setTotals({
        inscriptions: (signupRes?.data ?? []).length,
        scansMonth:  kpiRes?.monthScans  ?? 0,
        scansToday:  kpiRes?.todayScans  ?? 0,
      })

      // ── Scans journaliers 30 jours avec 0 pour les jours manquants ──────────
      const scanByDate: Record<string, number> = {}
      for (const row of (scanRes?.data ?? []) as { created_at: string }[]) {
        const key = new Date(row.created_at).toISOString().split('T')[0]
        scanByDate[key] = (scanByDate[key] ?? 0) + 1
      }
      const daily: DailyPoint[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setUTCDate(d.getUTCDate() - i)
        const key = d.toISOString().split('T')[0]
        daily.push({ date: isoDateToLabel(key), scans: scanByDate[key] ?? 0 })
      }
      setDailyScans(daily)

      setHotels(hotelRes?.hotels ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchAll() }, [hotelFilter])

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6]">
        <div className="flex items-center gap-3">
          <div className="bg-white/90 rounded-xl p-1.5">
            <img src="/percepta-logo.png" className="h-8 w-auto object-contain" alt="Percepta" />
          </div>
          <h1 className="text-white font-bold text-lg">Analytics</h1>
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
            { label: 'Tableau de bord', path: '/admin' },
            { label: 'Utilisateurs',    path: '/admin/users' },
            { label: 'Analytics',       path: '/admin/analytics', active: true },
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

        <BackButton />

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Analyses de la plateforme</h2>
            <p className="text-sm text-gray-500 mt-0.5">Données des 3 derniers mois</p>
          </div>
          <div className="flex gap-2">
            <select
              value={hotelFilter}
              onChange={e => setHotelFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Tous les hôtels</option>
              {hotels.map(h => <option key={h.id} value={h.id}>{h.hotel_name}</option>)}
            </select>
            <button onClick={fetchAll} className="px-4 py-2 bg-[#1e3a8a] text-white text-sm rounded-lg hover:bg-blue-800">
              ↻ Actualiser
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        {/* Résumé */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Inscriptions (3 mois)', value: totals.inscriptions, color: 'text-blue-600' },
            { label: 'Scans ce mois',         value: totals.scansMonth,   color: 'text-purple-600' },
            { label: 'Scans aujourd\'hui',    value: totals.scansToday,   color: 'text-orange-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              {loading
                ? <div className="h-8 bg-gray-200 rounded w-16 mx-auto animate-pulse" />
                : <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              }
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a]" />
            <p className="text-sm text-gray-500 mt-3">Chargement des données…</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Inscriptions par semaine */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Inscriptions par semaine</h3>
              <p className="text-xs text-gray-400 mb-4">Nouveaux hôtels inscrits sur les 3 derniers mois</p>
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v) => [v, 'Inscriptions']}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="inscriptions" fill="#1e3a8a" radius={[4, 4, 0, 0]} name="Inscriptions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                  Aucune inscription dans les 3 derniers mois
                </div>
              )}
            </div>

            {/* Évolution des scans */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Évolution des scans (30 derniers jours)</h3>
              <p className="text-xs text-gray-400 mb-4">
                {hotelFilter === 'all' ? 'Tous les hôtels' : (hotels.find(h => h.id === hotelFilter)?.hotel_name ?? hotelFilter)}
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailyScans} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [v, 'Scans']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Line
                    type="monotone" dataKey="scans" stroke="#7c3aed"
                    strokeWidth={2}
                    dot={{ r: 2, fill: '#7c3aed' }}
                    activeDot={{ r: 5 }}
                    name="Scans"
                  />
                </LineChart>
              </ResponsiveContainer>
              {dailyScans.every(d => d.scans === 0) && (
                <p className="text-center text-gray-400 text-sm -mt-10 mb-4">Aucun scan enregistré sur cette période</p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAnalytics
