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
  const [profile, setProfile] = useState<{ status: string; trial_end: string | null; subscription_id: string | null } | null>(null)
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
      
      // Récupérer le profil depuis Supabase
      const { data: profileData } = await supabase
        .from('profiles')
        .select('status, trial_end, subscription_id')
        .eq('id', data.session.user.id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
      }
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
  const isAdmin = session?.user?.user_metadata?.is_admin === true

  const daysRemaining = useMemo(() => {
    if (!profile?.trial_end) return 0
    const trialEnd = new Date(profile.trial_end).getTime()
    const diff = trialEnd - now
    return Math.max(0, Math.ceil(diff / DAY_MS))
  }, [profile, now])

  const trialBanner = useMemo(() => {
    if (profile?.status === 'active') {
      return null // Cacher le bandeau d'essai pour les abonnés
    }
    
    if (profile?.status === 'trial') {
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
      if (daysRemaining === 0) {
        return {
          className: 'bg-[#fee2e2] text-[#991b1b]',
          text: 'Votre essai est terminé.',
        }
      }
    }
    
    return null
  }, [profile, daysRemaining])

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

  // Handle different subscription statuses
  if (profile?.status === 'expired') {
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
            onClick={handleSubscribeClick}
            className="w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#162f6b] transition-colors mb-4"
          >
            💳 Passer à l'abonnement
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

  if (profile?.status === 'suspended') {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Votre compte a été suspendu ⚠️
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Votre compte a été suspendu. Contactez-nous pour réactiver votre accès.
          </p>
          
          <div className="mb-8">
            <a 
              href="mailto:contact@percepta.io" 
              className="inline-flex items-center justify-center w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#162f6b] transition-colors"
            >
              📧 Contactez-nous : contact@percepta.io
            </a>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    )
  }

  // If trial is expired, show blocking page
  if (profile?.status === 'trial' && daysRemaining === 0) {
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
            onClick={handleSubscribeClick}
            className="w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#162f6b] transition-colors mb-4"
          >
            💳 Passer à l'abonnement
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
    <div style={{minHeight: "100vh", background: "#e8f4fd"}}>
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "64px",
        background: "linear-gradient(135deg, #1e3a8a, #4a90d9)",
        zIndex: 20,
        boxShadow: "0 4px 16px rgba(30,58,138,0.2)"
      }}>
        <div style={{
          maxWidth: "1280px",
          margin: "0 auto",
          height: "100%",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "white",
          flexWrap: "wrap",
          gap: "8px"
        }}>
          <p style={{fontWeight: "bold", fontSize: "18px", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
            🏨 Check-in Express
          </p>
          <div style={{display: "flex", alignItems: "center", gap: "12px", flexShrink: 0}}>
            {isAdmin && onAdminClick && (
              <button
                type="button"
                onClick={onAdminClick}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "white",
                  color: "#1e3a8a",
                  fontSize: "14px",
                  fontWeight: "600",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                ⚙️ Admin
              </button>
            )}
            {profile?.status === 'active' && (
              <span style={{
                padding: "4px 8px",
                borderRadius: "12px",
                background: "#dcfce7",
                color: "#166534",
                fontSize: "12px",
                fontWeight: "500"
              }}>
                ✅ Abonné
              </span>
            )}
            <span style={{fontSize: "14px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
              {hotelName}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid white",
                color: "white",
                fontSize: "14px",
                background: "transparent",
                cursor: "pointer"
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main style={{maxWidth: "1280px", margin: "0 auto", padding: "80px 24px 40px"}}>
        {/* Hero Section */}
        <div style={{
          height: "200px",
          backgroundImage: "url('/hotel-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          borderRadius: "16px",
          position: "relative",
          marginBottom: "32px",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(30,58,138,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <h1 style={{
              color: "white",
              fontSize: "36px",
              fontWeight: "800",
              textAlign: "center",
              margin: 0,
              textShadow: "0 2px 4px rgba(0,0,0,0.3)"
            }}>
              {hotelName}
            </h1>
          </div>
        </div>

        {trialBanner && (
        <div style={{
          borderRadius: "8px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: "500",
          border: "1px solid",
          marginBottom: "16px",
          textAlign: "center",
          ...(trialBanner.className === 'bg-[#fef3c7] text-[#92400e]' 
            ? {background: "#fef3c7", color: "#92400e", borderColor: "#f59e0b"}
            : trialBanner.className === 'bg-[#dcfce7] text-[#166534]'
            ? {background: "#dcfce7", color: "#166534", borderColor: "#22c55e"}
            : {background: "#fee2e2", color: "#991b1b", borderColor: "#ef4444"})
        }}>
          {trialBanner.text}
        </div>
      )}

        <div style={{fontSize: "14px", fontWeight: "500", color: "#16a34a", textAlign: "center", marginBottom: "24px"}}>
          {isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
        </div>

        <section style={{display: "flex", justifyContent: "center", marginBottom: "32px"}}>
          <button
            type="button"
            onClick={onScanComplete}
            style={{
              background: "linear-gradient(135deg, #1e3a8a, #4a90d9)",
              borderRadius: "16px",
              padding: "18px 40px",
              fontSize: "18px",
              fontWeight: "800",
              boxShadow: "0 8px 24px rgba(30,58,138,0.35)",
              color: "white",
              border: "none",
              cursor: "pointer",
              minWidth: "300px"
            }}
          >
            📸 SCANNER UN DOCUMENT
          </button>
        </section>

        <section style={{display: "flex", justifyContent: "center", marginBottom: "32px"}}>
          <button
            type="button"
            onClick={handleSubscribeClick}
            style={{
              background: "transparent",
              borderRadius: "16px",
              padding: "14px 24px",
              fontSize: "16px",
              fontWeight: "600",
              color: "#1e3a8a",
              border: "2px solid #1e3a8a",
              cursor: "pointer",
              minWidth: "300px"
            }}
          >
            💳 Passer à l'abonnement
          </button>
        </section>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "32px"
        }}>
          <div style={{
            background: "rgba(232,244,253,0.60)",
            backdropFilter: "blur(1px)",
            border: "1px solid rgba(191,219,254,0.5)",
            borderRadius: "16px",
            boxShadow: "0 4px 16px rgba(30,58,138,0.08)",
            padding: "20px",
            textAlign: "center"
          }}>
            <div style={{color: "#1e3a8a", fontWeight: "800", fontSize: "36px", marginBottom: "8px"}}>
              {scansToday}
            </div>
            <div style={{color: "#64748b", fontSize: "14px"}}>
              Scans aujourd'hui
            </div>
          </div>
          <div style={{
            background: "rgba(232,244,253,0.60)",
            backdropFilter: "blur(1px)",
            border: "1px solid rgba(191,219,254,0.5)",
            borderRadius: "16px",
            boxShadow: "0 4px 16px rgba(30,58,138,0.08)",
            padding: "20px",
            textAlign: "center"
          }}>
            <div style={{color: "#1e3a8a", fontWeight: "800", fontSize: "36px", marginBottom: "8px"}}>
              {scansThisMonth}
            </div>
            <div style={{color: "#64748b", fontSize: "14px"}}>
              Scans ce mois
            </div>
          </div>
        </div>

        <section style={{
          background: "rgba(232,244,253,0.60)",
          backdropFilter: "blur(1px)",
          border: "1px solid rgba(191,219,254,0.5)",
          borderRadius: "16px",
          padding: "24px"
        }}>
          <h2 style={{fontSize: "18px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "16px"}}>
            Derniers clients scannés
          </h2>
          {lastClients.length === 0 ? (
            <p style={{marginTop: "24px", textAlign: "center", color: "#64748b", fontSize: "14px"}}>
              Aucun scan pour le moment
            </p>
          ) : (
            <div style={{marginTop: "24px"}}>
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
                    className="border border-[#e2e8f0] rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#1e293b] text-sm sm:text-base truncate">
                        {client.surname} {client.givenNames}
                      </div>
                      <div className="text-xs sm:text-sm text-[#64748b]">
                        {dd}/{mm}/{yyyy} {hh}:{min} · Chambre {client.roomNumber}
                      </div>
                    </div>
                    <div
                      className={`text-xs sm:text-sm font-semibold rounded-full px-2 sm:px-3 py-1 flex-shrink-0 ${
                        client.printed ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef3c7] text-[#92400e]'
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
          <a href="#" className="text-[#1e3a8a] font-medium hover:text-[#1e40af] text-sm sm:text-base">
            Voir l&apos;historique complet
          </a>
        </div>
      </main>
    </div>
  )
}
