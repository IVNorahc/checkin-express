import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useHotel } from '../contexts/HotelContext'

type ClientRow = {
  nom: string | null
  prenoms: string | null
  chambre: string | null
  created_at: string | null
}

export default function Stats() {
  const navigate = useNavigate()
  const { hotelId } = useHotel()

  const [loading, setLoading] = useState(true)
  const [scansToday, setScansToday] = useState(0)
  const [scansThisMonth, setScansThisMonth] = useState(0)
  const [scansTotal, setScansTotal] = useState(0)
  const [lastClients, setLastClients] = useState<ClientRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hotelId) return

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const now = new Date()
        const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
        const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

        const [todayRes, monthRes, totalRes, clientsRes] = await Promise.all([
          supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', hotelId)
            .gte('created_at', startOfToday.toISOString())
            .lte('created_at', endOfToday.toISOString()),
          supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', hotelId)
            .gte('created_at', startOfMonth.toISOString())
            .lte('created_at', endOfMonth.toISOString()),
          supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('hotel_id', hotelId),
          supabase
            .from('clients')
            .select('nom, prenoms, chambre, created_at')
            .eq('hotel_id', hotelId)
            .order('created_at', { ascending: false })
            .limit(10),
        ])

        if (!todayRes.error && todayRes.count !== null) setScansToday(todayRes.count)
        if (!monthRes.error && monthRes.count !== null) setScansThisMonth(monthRes.count)
        if (!totalRes.error && totalRes.count !== null) setScansTotal(totalRes.count)
        if (!clientsRes.error && clientsRes.data) setLastClients(clientsRes.data)

        const firstError = todayRes.error ?? monthRes.error ?? totalRes.error ?? clientsRes.error
        if (firstError) {
          setError(`Erreur Supabase : ${firstError.message}`)
        }
      } catch {
        setError('Réseau indisponible — impossible de charger les statistiques.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [hotelId])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center gap-3 px-4 md:px-8 py-3 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-blue-700 font-semibold text-sm hover:underline"
        >
          ← Retour
        </button>
        <h1 className="text-lg font-bold text-blue-900">Statistiques</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {!hotelId && (
          <p className="text-sm text-slate-500 text-center py-12">Chargement du profil hôtel…</p>
        )}

        {hotelId && loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
          </div>
        )}

        {hotelId && !loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        {hotelId && !loading && !error && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-white rounded-xl px-4 py-5 text-center shadow-sm">
                <p className="text-3xl font-bold text-blue-700">{scansToday}</p>
                <p className="text-xs text-gray-500 mt-1">Aujourd'hui</p>
              </div>
              <div className="bg-white rounded-xl px-4 py-5 text-center shadow-sm">
                <p className="text-3xl font-bold text-blue-700">{scansThisMonth}</p>
                <p className="text-xs text-gray-500 mt-1">Ce mois</p>
              </div>
              <div className="bg-white rounded-xl px-4 py-5 text-center shadow-sm">
                <p className="text-3xl font-bold text-blue-700">{scansTotal}</p>
                <p className="text-xs text-gray-500 mt-1">Total</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-base font-bold text-blue-900 mb-4">Derniers check-ins</h2>
              {lastClients.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Aucun check-in enregistré.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {lastClients.map((c, i) => {
                    const d = c.created_at ? new Date(c.created_at) : null
                    const dateStr = d
                      ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                      : '—'

                    return (
                      <div key={i} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">
                            {c.nom ?? '—'} {c.prenoms ?? ''}
                          </p>
                          <p className="text-xs text-slate-500">{dateStr} · Chambre {c.chambre ?? '—'}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
