import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getDB, initDB, type Client } from '../lib/db'
import { generateFicheControle, saveFicheToSupabase } from '../utils/generateFicheControle'
import FichesControle from './FichesControle'

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
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [now, setNow] = useState(Date.now())
  const [lastClients, setLastClients] = useState<Client[]>([])
  const [scansToday, setScansToday] = useState(0)
  const [scansThisMonth, setScansThisMonth] = useState(0)
  const [showFiches, setShowFiches] = useState(false)

  const handleSignOut = async () => {
  await supabase.auth.signOut()
  window.location.replace(window.location.origin + '/login')
}

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
      
      // Récupérer le profil hôtel depuis Supabase
      const { data: hotelData, error } = await supabase
        .from('hotels')
        .select('subscription_status, trial_end, hotel_name, phone')
        .eq('user_id', data.session.user.id)
        .single()
      
      // Gérer l'erreur PGRST116 (not found) et autres erreurs
      if (error && error.code !== 'PGRST116') {
        console.error('Erreur récupération hôtel:', error)
        setNeedsOnboarding(true)
        return
      }
      
      if (hotelData) {
        // Convertir les données pour compatibilité avec le reste du code
        setProfile({
          status: hotelData.subscription_status,
          trial_end: hotelData.trial_end,
          subscription_id: null
        })
        // Vérifier si les informations de base sont manquantes
        if (!hotelData.hotel_name || !hotelData.phone) {
          setNeedsOnboarding(true)
        }
      } else {
        // Hôtel non trouvé, besoin d'onboarding
        setNeedsOnboarding(true)
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
          className: 'bg-blue-50/90 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-center font-medium',
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

  // Si onboarding est nécessaire, afficher le formulaire
  if (needsOnboarding && session) {
    return (
      <div className="min-h-screen bg-[#e8f4fd] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <img 
              src="/percepta-logo.png" 
              alt="Check-in Express by Percepta" 
              className="h-16 w-auto object-contain mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Bienvenue dans Check-in Express ! 
            </h1>
            <p className="text-gray-600">
              Complétez vos informations pour commencer
            </p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const hotelName = formData.get('hotelName') as string
            const phone = formData.get('phone') as string

            if (!hotelName || !phone) {
              alert('Veuillez remplir tous les champs')
              return
            }

            try {
              // Vérifier si le téléphone est déjà utilisé
              const { data: existingHotel, error: checkError } = await supabase
                .from('hotels')
                .select('phone')
                .eq('phone', phone)
                .single()

              if (checkError && checkError.code !== 'PGRST116') {
                console.error('Erreur vérification téléphone:', checkError)
                alert('Erreur lors de la vérification du téléphone')
                return
              }

              if (existingHotel) {
                alert('Ce numéro de téléphone est déjà associé à un compte.')
                return
              }

              // Enregistrer le profil hôtel
              const { error } = await supabase
                .from('hotels')
                .upsert({
                  user_id: session.user.id,
                  hotel_name: hotelName,
                  phone: phone
                }, { onConflict: 'user_id' })

              if (error) {
                console.error('Erreur:', error)
                alert('Erreur: ' + error.message)
                return
              }

              // Rediriger vers le dashboard
              window.location.replace(window.location.origin + '/dashboard')
            } catch (error) {
              console.error('Erreur:', error)
              alert('Erreur lors de la mise à jour')
            }
          }}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'hôtel *
              </label>
              <input
                type="text"
                name="hotelName"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Hôtel de la Plage"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone *
              </label>
              <input
                type="tel"
                name="phone"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: +221 33 123 45 67"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#162f6b] transition-colors"
            >
              Commencer avec Check-in Express
            </button>
          </form>
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
        <div style={{minHeight: "100vh"}}>
      <header className="flex items-center justify-between px-4 py-3 w-full">
            {/* Logo + titre sur fond blanc arrondi */}
            <div className="flex items-center gap-2 bg-white/90 rounded-xl px-3 py-2 shadow-sm">
              <img 
                src="/percepta-logo.png" 
                alt="Check-in Express by Percepta" 
                className="h-9 w-auto object-contain"
              />
              <span className="font-bold text-blue-800 text-sm">
                Check-in Express
              </span>
            </div>

            {/* Navigation au centre si nécessaire */}
            <nav>
              {/* Options de navigation peuvent être ajoutées ici */}
            </nav>

            {/* Bouton déconnexion sans fond blanc */}
            <div className="flex items-center gap-3">
              {isAdmin && onAdminClick && (
                <button
                  type="button"
                  onClick={onAdminClick}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Admin
                </button>
              )}
              <button
                onClick={handleSignOut}
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </header>

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
            <h1 className="text-3xl font-bold text-blue-900 drop-shadow-sm text-center">
              {hotelName}
            </h1>
          </div>
        </div>

        {trialBanner && (
        <div className={trialBanner.className}>
          {trialBanner.text}
        </div>
      )}

        <section style={{display: "flex", justifyContent: "center", marginBottom: "24px"}} className="sm:mb-8">
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
            className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 bg-white/80 py-3 px-6 rounded-lg font-semibold transition-colors sm:max-w-sm"
          >
            {profile?.status === 'active' ? 'Gérer mon abonnement' : 'Passer à l\'abonnement'}
          </button>
        </section>

        <section style={{display: "flex", justifyContent: "center", marginBottom: "24px"}} className="sm:mb-8">
          <button
            type="button"
            onClick={handleGenerateFiche}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors sm:max-w-sm"
          >
            ? Fiche de contrôle
          </button>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white/80 rounded-xl px-6 py-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-blue-700">{scansToday}</p>
            <p className="text-sm text-gray-500">Scans aujourd'hui</p>
          </div>
          <div className="bg-white/80 rounded-xl px-6 py-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-blue-700">{scansThisMonth}</p>
            <p className="text-sm text-gray-500">Scans ce mois</p>
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
                onClick={onScanComplete}
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
