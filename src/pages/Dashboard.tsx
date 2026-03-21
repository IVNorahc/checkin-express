import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getDB, initDB, type Client } from '../lib/db'

type DashboardProps = {
  onRequireLogin: () => void
  onScanComplete: () => void
  onAdminClick?: () => void
  onSubscribeClick?: () => void
}

const DAY_MS = 24 * 60 * 60 * 1000

export default function Dashboard({ onRequireLogin, onScanComplete, onAdminClick, onSubscribeClick }: DashboardProps) {
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
  const isAdmin = session?.user?.user_metadata?.is_admin === true

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

  const handleSubscribe = () => {
    window.open('https://checkin-express.lemonsqueezy.com/checkout/buy/00847c55-3cff-475c-8c02-0c31c2b3cb02', '_blank')
  }

  const handleSubscribeClick = () => {
    if (onSubscribeClick) {
      onSubscribeClick()
    } else {
      handleSubscribe()
    }
  }

  // If trial is expired, show blocking page
  if (daysRemaining === 0) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Votre essai est terminé 🔒
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Merci d'avoir testé Check-in Express. Pour continuer à utiliser l'application et 
            accéder à toutes vos fiches de police, souscrivez un abonnement.
          </p>
          
          <button
            onClick={handleSubscribe}
            className="w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#162f6b] transition-colors mb-4"
          >
            🚀 Souscrire maintenant — 89,99€/mois
          </button>
          
          <button
            onClick={handleSignOut}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors mb-6"
          >
            Déconnexion
          </button>
          
          <p className="text-sm text-gray-500">
            Vous avez déjà souscrit ? Contactez-nous :{' '}
            <a href="mailto:contact@percepta.io" className="text-[#1e3a8a] hover:underline">
              contact@percepta.io
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#1e3a8a] z-20">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between text-white flex-wrap gap-2">
          <p className="font-semibold text-base sm:text-lg truncate flex-1 min-w-0">🏨 Check-in Express</p>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {isAdmin && onAdminClick && (
              <button
                type="button"
                onClick={onAdminClick}
                className="px-3 py-1 sm:px-4 sm:py-2 rounded-md bg-white text-[#1e3a8a] border border-[#1e3a8a] text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors"
                style={{ borderRadius: '6px', padding: '8px 12px' }}
              >
                ⚙️ Admin
              </button>
            )}
            <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{hotelName}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-2 py-1 sm:px-3 sm:py-1 rounded-md border border-white text-white text-xs sm:text-sm hover:bg-white hover:text-[#1e3a8a] transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-10">
        <div className={`rounded-md px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base font-medium ${trialBanner.className}`}>
          {trialBanner.text}
        </div>

        <div className="mt-4 text-sm sm:text-base font-medium">
          {isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
        </div>

        <section className="mt-6 sm:mt-8 flex justify-center">
          <button
            type="button"
            onClick={onScanComplete}
            className="w-full max-w-sm mx-4 sm:mx-auto sm:w-[300px] h-14 sm:h-16 rounded-xl bg-[#1e3a8a] text-white text-base sm:text-[18px] font-semibold shadow-lg hover:bg-[#162f6b] transition-colors"
          >
            📸 SCANNER UN DOCUMENT
          </button>
        </section>

        <section className="mt-4 sm:mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleSubscribeClick}
            className="w-full max-w-sm mx-4 sm:mx-auto sm:w-[300px] h-12 rounded-lg border-2 border-[#1e3a8a] text-[#1e3a8a] text-sm sm:text-[16px] font-medium hover:bg-[#1e3a8a] hover:text-white transition-colors"
          >
            💳 Passer à l'abonnement
          </button>
        </section>

        <section className="mt-6 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 text-center font-medium text-sm sm:text-base">
            Scans aujourd&apos;hui : {scansToday}
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 text-center font-medium text-sm sm:text-base">
            Scans ce mois : {scansThisMonth}
          </div>
        </section>

        <section className="mt-6 sm:mt-8 bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-[#1e3a8a]">Derniers clients scannés</h2>
          {lastClients.length === 0 ? (
            <p className="mt-4 sm:mt-6 text-center text-gray-500 text-sm sm:text-base">Aucun scan pour le moment</p>
          ) : (
            <div className="mt-4 sm:mt-6 space-y-3">
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
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                        {client.surname} {client.givenNames}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        {dd}/{mm}/{yyyy} {hh}:{min} · Chambre {client.roomNumber}
                      </div>
                    </div>
                    <div
                      className={`text-xs sm:text-sm font-semibold rounded-full px-2 sm:px-3 py-1 flex-shrink-0 ${
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

        <div className="mt-4 sm:mt-6 text-center">
          <a href="#" className="text-[#1e3a8a] font-medium hover:underline text-sm sm:text-base">
            Voir l&apos;historique complet
          </a>
        </div>
      </main>
    </div>
  )
}
