import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getDB, initDB, type Client } from '../lib/db'

type DashboardProps = {
  onRequireLogin: () => void
  onScanComplete: () => void
}

const DAY_MS = 24 * 60 * 60 * 1000

export default function Dashboard({ onRequireLogin, onScanComplete }: DashboardProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [now, setNow] = useState(Date.now())
  const [lastClients, setLastClients] = useState<Client[]>([])
  const [scansToday, setScansToday] = useState(0)
  const [scansThisMonth, setScansThisMonth] = useState(0)

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        onRequireLogin()
        return
      }
      setSession(data.session)

      // Initialiser la DB avec l'ID utilisateur Supabase
      initDB(data.session.user.id)
    }

    void loadSession()
  }, [onRequireLogin])

  useEffect(() => {
    const loadClients = async () => {
      if (!session) return
      const db = getDB()

      const clients = await db.clients.orderBy('scanDate').reverse().limit(10).toArray()
      setLastClients(clients)

      const nowDate = new Date()
      const startOfToday = new Date(nowDate)
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date(nowDate)
      endOfToday.setHours(23, 59, 59, 999)

      const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0, 0)
      const endOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0, 23, 59, 59, 999)

      const todayCount = await db.clients
        .where('scanDate')
        .between(startOfToday.toISOString(), endOfToday.toISOString())
        .count()

      const monthCount = await db.clients
        .where('scanDate')
        .between(startOfMonth.toISOString(), endOfMonth.toISOString())
        .count()

      setScansToday(todayCount)
      setScansThisMonth(monthCount)
    }

    void loadClients()
  }, [session])

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  const email = session?.user.email ?? ''
  const hotelName = (session?.user.user_metadata?.hotel_name as string | undefined) || email || 'Mon hôtel'
  const createdAt = session?.user.created_at

  const daysRemaining = useMemo(() => {
    if (!createdAt) return 0
    const trialEnd = new Date(new Date(createdAt).getTime() + 7 * DAY_MS).getTime()
    const diff = trialEnd - now
    return Math.max(0, Math.ceil(diff / DAY_MS))
  }, [createdAt, now])

  const trialBanner = useMemo(() => {
    if (daysRemaining >= 3) {
      return {
        className: 'bg-[#dcfce7] text-[#166534]',
        text: `Il vous reste ${daysRemaining} jours d'essai`,
      }
    }
    if (daysRemaining === 2) {
      return {
        className: 'bg-[#fef3c7] text-[#92400e]',
        text: 'Votre essai se termine bientôt !',
      }
    }
    if (daysRemaining === 1) {
      return {
        className: 'bg-[#fee2e2] text-[#991b1b]',
        text: "Dernier jour d'essai !",
      }
    }
    return {
      className: 'bg-[#1e293b] text-white',
      text: 'Votre essai est terminé.',
    }
  }, [daysRemaining])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onRequireLogin()
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#1e3a8a] z-20">
        <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between text-white">
          <p className="font-semibold">🏨 Check-in Express</p>
          <div className="flex items-center gap-3">
            <span className="text-sm">{hotelName}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1 rounded-md border border-white text-white text-sm hover:bg-white hover:text-[#1e3a8a] transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-20 pb-10">
        <div className={`rounded-md px-4 py-3 text-sm font-medium ${trialBanner.className}`}>
          {trialBanner.text}
        </div>

        <div className="mt-4 text-sm font-medium">
          {isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
        </div>

        <section className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onScanComplete}
            className="w-[300px] h-16 rounded-xl bg-[#1e3a8a] text-white text-[18px] font-semibold shadow-lg hover:bg-[#162f6b] transition-colors"
          >
            📸 SCANNER UN DOCUMENT
          </button>
        </section>

        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-5 text-center font-medium">
            Scans aujourd&apos;hui : {scansToday}
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5 text-center font-medium">
            Scans ce mois : {scansThisMonth}
          </div>
        </section>

        <section className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#1e3a8a]">Derniers clients scannés</h2>
          {lastClients.length === 0 ? (
            <p className="mt-6 text-center text-gray-500">Aucun scan pour le moment</p>
          ) : (
            <div className="mt-6 space-y-3">
              {lastClients.map((client) => {
                const d = new Date(client.scanDate)
                const dd = String(d.getDate()).padStart(2, '0')
                const mm = String(d.getMonth() + 1).padStart(2, '0')
                const yyyy = d.getFullYear()
                const hh = String(d.getHours()).padStart(2, '0')
                const min = String(d.getMinutes()).padStart(2, '0')
                const badgeText = client.printed ? '✅ Imprimé' : '⏳ En attente'

                return (
                  <div
                    key={client.id}
                    className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">
                        {client.surname} {client.givenNames}
                      </div>
                      <div className="text-sm text-gray-600">
                        {dd}/{mm}/{yyyy} {hh}:{min} · Chambre {client.roomNumber}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-semibold rounded-full px-3 py-1 ${
                        client.printed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {badgeText}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div className="mt-6 text-center">
          <a href="#" className="text-[#1e3a8a] font-medium hover:underline">
            Voir l&apos;historique complet
          </a>
        </div>
      </main>
    </div>
  )
}
