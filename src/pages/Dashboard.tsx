import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getDB, initDB, type Client } from '../lib/db'
import { generateFicheControle, saveFicheToSupabase } from '../utils/generateFicheControle'
import FichesControle from './FichesControle'
import { getHotelProfile, getTrialInfo, canUseOCR, incrementOCRScans } from '../utils/ocrLimitService'

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
  const [hotelProfile, setHotelProfile] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [now, setNow] = useState(Date.now())
  const [lastClients, setLastClients] = useState<Client[]>([])
  const [scansToday, setScansToday] = useState(0)
  const [scansThisMonth, setScansThisMonth] = useState(0)
  const [showFiches, setShowFiches] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        onRequireLogin()
        return
      }
      
      // Check if user is admin FIRST
      const isAdmin = data.session.user?.user_metadata?.is_admin === true
      if (isAdmin) {
        onAdminClick?.()
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

      // Récupérer le profil hôtel pour les scans OCR
      const hotelData = await getHotelProfile(data.session.user.id)
      setHotelProfile(hotelData)
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
  const hotelPhone = (session?.user.user_metadata?.phone as string | undefined) || '+221 33 000 00 00'
  const isAdmin = session?.user?.user_metadata?.is_admin === true

  const handleGenerateFiche = async () => {
    const guestName = prompt('Entrez le nom du client:')
    if (!guestName?.trim()) return
    
    try {
      // Generate PDF blob
      const blob = await generateFicheControle(hotelName, hotelPhone, guestName.trim())

      // Save to Supabase
      const signedUrl = await saveFicheToSupabase(blob, guestName.trim(), session!.user.id)

      alert('Fiche de contrôle générée et sauvegardée!')
    } catch (error) {
      console.error('Erreur génération fiche:', error)
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }

  const handleScanWithLimit = async () => {
    if (!session) return
    
    const ocrCheck = await canUseOCR(session.user.id)
    
    if (!ocrCheck.canUse) {
      alert(ocrCheck.reason || 'Accès OCR non autorisé')
      if (ocrCheck.reason?.includes('souscrivez')) {
        onSubscribeClick?.()
      }
      return
    }
    
    // Incrémenter le compteur de scans
    await incrementOCRScans(session.user.id)
    
    // Recharger le profil pour mettre à jour l'affichage
    const updatedProfile = await getHotelProfile(session.user.id)
    setHotelProfile(updatedProfile)
    
    // Continuer vers le scan
    onScanComplete()
  }

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
    <>
      {showFiches && session && (
        <FichesControle 
          session={session} 
          onBack={() => setShowFiches(false)} 
        />
      )}
      {!showFiches && (
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
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "white",
          flexWrap: "wrap",
          gap: "8px"
        }} className="sm:px-6 sm:gap-3">
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
            minWidth: 0,
            overflow: "hidden"
          }} className="sm:text-lg">
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
                className="h-24 w-auto object-contain"
              />
            </div>
            <p style={{
              fontWeight: "bold", 
              fontSize: "16px", 
              margin: 0,
              overflow: "hidden", 
              textOverflow: "ellipsis", 
              whiteSpace: "nowrap"
            }}>
              Check-in Express
            </p>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: "8px", flexShrink: 0}} className="sm:gap-3">
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

      {/* Trial Banner */}
      {hotelProfile && (() => {
        const trialInfo = getTrialInfo(hotelProfile)
        if (trialInfo.isActive) {
          return (
            <div style={{
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              color: "#78350f",
              padding: "12px 24px",
              margin: "16px 24px 0",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 12px rgba(251,191,36,0.3)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>🎁</span>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "14px" }}>
                    Essai gratuit — {trialInfo.daysRemaining} jours restants
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>
                    Scans OCR : {trialInfo.scansUsed}/{trialInfo.scansLimit} utilisés
                  </div>
                </div>
              </div>
              <button
                onClick={onSubscribeClick}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "#78350f",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Mettre à niveau
              </button>
            </div>
          )
        } else if (!hotelProfile.subscription_status || hotelProfile.subscription_status !== 'active') {
          return (
            <div style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "white",
              padding: "12px 24px",
              margin: "16px 24px 0",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 12px rgba(239,68,68,0.3)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "20px" }}>⏰</span>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "14px" }}>
                    Votre essai gratuit est terminé
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>
                    Souscrivez pour continuer
                  </div>
                </div>
              </div>
              <button
                onClick={onSubscribeClick}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Choisir un forfait
              </button>
            </div>
          )
        }
        return null
      })()}

      <main style={{maxWidth: "1280px", margin: "0 auto", padding: "80px 24px 40px"}}>
        {/* Hero Section */}
        <div style={{
          height: "150px",
          backgroundImage: "url('/hotel-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          borderRadius: "16px",
          position: "relative",
          marginBottom: "24px",
          overflow: "hidden"
        }} className="sm:h-48 sm:mb-8">
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

        <section style={{display: "flex", justifyContent: "center", marginBottom: "24px"}} className="sm:mb-8">
          <button
            type="button"
            onClick={handleScanWithLimit}
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
              minWidth: "280px"
            }} className="w-full sm:max-w-sm"
          >
            📸 SCANNER UN DOCUMENT
          </button>
        </section>

        <section style={{display: "flex", justifyContent: "center", marginBottom: "24px"}} className="sm:mb-8">
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
              minWidth: "280px"
            }} className="w-full sm:max-w-sm"
          >
            {profile?.status === 'active' ? 'Gérer mon abonnement' : 'Passer à l\'abonnement'}
          </button>
        </section>

        <section style={{display: "flex", justifyContent: "center", marginBottom: "24px"}} className="sm:mb-8">
          <button
            type="button"
            onClick={handleGenerateFiche}
            style={{
              background: "linear-gradient(135deg, #16a34a, #22c55e)",
              borderRadius: "16px",
              padding: "14px 24px",
              fontSize: "16px",
              fontWeight: "600",
              color: "white",
              border: "none",
              cursor: "pointer",
              minWidth: "280px",
              boxShadow: "0 4px 16px rgba(22,163,74,0.3)"
            }} className="w-full sm:max-w-sm"
          >
            ? Fiche de contrôle
          </button>
        </section>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "16px",
          marginBottom: "24px"
        }} className="sm:grid-cols-2 sm:mb-8">
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
              📅 Scans aujourd'hui
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
              📊 Scans ce mois
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
            <div style={{
              textAlign: "center",
              padding: "40px 20px"
            }}>
              <div style={{fontSize: "48px", marginBottom: "12px"}}>
                📋
              </div>
              <h3 style={{
                color: "#1e3a8a",
                fontWeight: "700",
                margin: "0 0 8px"
              }}>
                Prêt pour votre premier check-in !
              </h3>
              <p style={{
                color: "#64748b",
                fontSize: "14px",
                margin: "0 0 20px"
              }}>
                Scannez votre première pièce d'identité 
                pour commencer
              </p>
              <button
                onClick={handleScanWithLimit}
                style={{
                  background: "linear-gradient(135deg, #1e3a8a, #4a90d9)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                📸 Démarrer mon premier scan
              </button>
            </div>
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

        <div className="mt-4 sm:mt-6 text-center space-y-2">
          <button
            onClick={() => setShowFiches(true)}
            className="text-[#1e3a8a] font-medium hover:text-[#1e40af] text-sm sm:text-base"
          >
            📋 Fiches de contrôle
          </button>
          <a href="#" className="text-[#1e3a8a] font-medium hover:text-[#1e40af] text-sm sm:text-base">
            Voir l&apos;historique complet
          </a>
        </div>
      </main>
    </div>
      )}
    </>
  )
}
