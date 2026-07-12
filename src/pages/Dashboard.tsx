import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getDB, initDB, type Client } from '../lib/db'
import { generateFichesGroupees, type FicheParams } from '../utils/generateFicheControle'
import LogoutConfirmModal from '../components/LogoutConfirmModal'
type DashboardProps = {
  onRequireLogin: () => void
}

export default function Dashboard({ onRequireLogin }: DashboardProps) {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<{ status: string; trial_end: string | null; subscription_id: string | null } | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [now, setNow] = useState(Date.now())
  const [lastClients, setLastClients] = useState<Client[]>([])
  const [scansToday, setScansToday] = useState(0)
  const [scansThisMonth, setScansThisMonth] = useState(0)
  const [clientsPresents, setClientsPresents] = useState(0)
  const [hotelInfo, setHotelInfo] = useState<any>(null)
  const [daysLeft, setDaysLeft] = useState(0)
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem('checkin_welcome_v1') === 'dismissed'
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showLogout, setShowLogout] = useState(false)

  const dismissWelcome = () => {
    localStorage.setItem('checkin_welcome_v1', 'dismissed')
    setWelcomeDismissed(true)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setRefreshKey(k => k + 1)
    setTimeout(() => setIsRefreshing(false), 1500)
  }

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
        navigate('/admin', { replace: true })
        return
      }
      
      setSession(data.session)

      // Initialiser la DB avec l'ID utilisateur Supabase
      initDB(data.session.user.id)
      
      // RÃ©cupÃ©rer le profil hÃ´tel depuis Supabase
      const { data: hotelData, error } = await supabase
        .from('hotels')
        .select('subscription_status, trial_end, hotel_name, phone')
        .eq('user_id', data.session.user.id)
        .single()
      
      // GÃ©rer l'erreur PGRST116 (not found) et autres erreurs
      if (error && error.code !== 'PGRST116') {
        console.error('Erreur rÃ©cupÃ©ration hÃ´tel:', error)
        setNeedsOnboarding(true)
        return
      }
      
      if (hotelData) {
        // Convertir les donnÃ©es pour compatibilitÃ© avec le reste du code
        setProfile({
          status: hotelData.subscription_status,
          trial_end: hotelData.trial_end,
          subscription_id: null,
        })
        setHotelInfo(hotelData)
        setNow(Date.now())
        // VÃ©rifier si les informations de base sont manquantes
        if (!hotelData.hotel_name || !hotelData.phone) {
          setNeedsOnboarding(true)
        }
      } else {
        // HÃ´tel non trouvÃ©, besoin d'onboarding
        setNeedsOnboarding(true)
      }
    }

    void loadSession()
  }, [onRequireLogin, navigate])

  useEffect(() => {
    const loadClients = async () => {
      if (!session) return

      const { data: hotelData } = await supabase
        .from('hotels')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!hotelData?.id) return

      const { data: supabaseClients } = await supabase
        .from('clients')
        .select('*')
        .eq('hotel_id', hotelData.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (supabaseClients) {
        const mapped = supabaseClients.map(c => ({
          id: c.id,
          surname: c.nom ?? '',
          givenNames: c.prenoms ?? '',
          dateOfBirth: c.date_naissance ?? '',
          documentType: c.document_type ?? '',
          documentNumber: c.numero_document ?? '',
          nationality: c.nationalite ?? '',
          sex: '',
          expiryDate: c.date_expiration ?? '',
          roomNumber: c.chambre ?? '',
          scanDate: c.created_at ?? '',
          printed: false,
          syncStatus: 'synced' as const,
        }))
        setLastClients(mapped)
      }

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: todayC } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelData.id)
        .gte('created_at', startOfToday.toISOString())

      const { count: monthC } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelData.id)
        .gte('created_at', startOfMonth.toISOString())

      const { count: presentsC } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelData.id)
        .eq('checkout_status', 'present')

      setScansToday(todayC ?? 0)
      setScansThisMonth(monthC ?? 0)
      setClientsPresents(presentsC ?? 0)
    }

    void loadClients()
  }, [session, refreshKey])


  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  // Demander la permission de notification au premier chargement
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])


  // Correction 1: Real-time trial countdown update
  useEffect(() => {
    const updateCountdown = () => {
      const trialEnd = profile?.trial_end ? new Date(profile.trial_end) : null
      const daysLeftCalc = trialEnd
        ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0

      setDaysLeft(daysLeftCalc)
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 3600000) // toutes les heures
    return () => clearInterval(interval)
  }, [profile])


  const email = session?.user.email ?? ''
  const hotelName = hotelInfo?.hotel_name || email || 'Mon hÃ´tel'
  const isAdmin = session?.user?.user_metadata?.is_admin === true

  const trialBanner = useMemo(() => {
    if (profile?.status !== 'trial' || daysLeft <= 0) return null

    const text = `Il vous reste ${daysLeft} jour${daysLeft > 1 ? 's' : ''} Â· 10 scans Â· Fiches PDF incluses`

    let className: string
    if (daysLeft > 3) {
      className = 'border rounded-lg px-4 py-3 text-center text-sm font-medium mb-4 bg-green-50 border-green-200 text-green-700'
    } else if (daysLeft >= 2) {
      className = 'border rounded-lg px-4 py-3 text-center text-sm font-medium mb-4 bg-orange-50 border-orange-200 text-orange-700'
    } else {
      className = 'border rounded-lg px-4 py-3 text-center text-sm font-medium mb-4 bg-red-50 border-red-200 text-red-700'
    }

    return { className, text }
  }, [profile, daysLeft])

  // Handle different subscription statuses
  if (profile?.status === 'expired') {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        {showLogout && <LogoutConfirmModal onConfirm={handleSignOut} onCancel={() => setShowLogout(false)} />}
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Compte dÃ©sactivÃ© ðŸ”’
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Votre accÃ¨s a expirÃ©. Contactez l'administrateur pour rÃ©activer votre compte.
          </p>

          <a
            href="mailto:contact@percepta.io"
            className="block w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#162f6b] transition-colors mb-4"
          >
            ðŸ“§ Contacter l'administrateur
          </a>

          <button
            onClick={() => setShowLogout(true)}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            DÃ©connexion
          </button>
        </div>
      </div>
    )
  }

  if (profile?.status === 'suspended') {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        {showLogout && <LogoutConfirmModal onConfirm={handleSignOut} onCancel={() => setShowLogout(false)} />}
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Votre compte a Ã©tÃ© suspendu âš ï¸
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Votre compte a Ã©tÃ© suspendu. Contactez-nous pour rÃ©activer votre accÃ¨s.
          </p>
          
          <div className="mb-8">
            <a 
              href="mailto:contact@percepta.io" 
              className="inline-flex items-center justify-center w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#162f6b] transition-colors"
            >
              ðŸ“§ Contactez-nous : contact@percepta.io
            </a>
          </div>
          
          <button
            onClick={() => setShowLogout(true)}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            DÃ©connexion
          </button>
        </div>
      </div>
    )
  }

  // If trial is expired, show blocking page â€” calcul direct pour Ã©viter la race condition avec daysLeft
  if (profile?.status === 'trial' && (!profile.trial_end || new Date(profile.trial_end) <= new Date())) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        {showLogout && <LogoutConfirmModal onConfirm={handleSignOut} onCancel={() => setShowLogout(false)} />}
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            AccÃ¨s expirÃ© ðŸ”’
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Votre accÃ¨s a expirÃ©. Contactez l'administrateur pour renouveler votre compte.
          </p>

          <a
            href="mailto:contact@percepta.io"
            className="block w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#162f6b] transition-colors mb-4"
          >
            ðŸ“§ Contacter l'administrateur
          </a>

          <button
            onClick={() => setShowLogout(true)}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            DÃ©connexion
          </button>
        </div>
      </div>
    )
  }

  // Si onboarding est nÃ©cessaire, afficher le formulaire
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
              ComplÃ©tez vos informations pour commencer
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
              const { data: existingHotel, error: checkError } = await supabase
                .from('hotels')
                .select('phone')
                .eq('phone', phone)
                .single()

              if (checkError && checkError.code !== 'PGRST116') {
                console.error('Erreur vÃ©rification tÃ©lÃ©phone:', checkError)
                alert('Erreur lors de la vÃ©rification du tÃ©lÃ©phone')
                return
              }

              if (existingHotel) {
                alert('Ce numÃ©ro de tÃ©lÃ©phone est dÃ©jÃ  associÃ© Ã  un compte.')
                return
              }

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

              window.location.replace(window.location.origin + '/dashboard')
            } catch (error) {
              console.error('Erreur:', error)
              alert('Erreur lors de la mise Ã  jour')
            }
          }}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'hÃ´tel *
              </label>
              <input
                type="text"
                name="hotelName"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: HÃ´tel de la Plage"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                TÃ©lÃ©phone *
              </label>
              <input
                type="tel"
                name="phone"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    <div className="min-h-screen bg-slate-50">
      {showLogout && <LogoutConfirmModal onConfirm={handleSignOut} onCancel={() => setShowLogout(false)} />}
      <header className="flex items-center justify-between px-4 md:px-8 py-2 bg-white shadow-sm">
            <div className="flex items-center gap-2">
              <img
                src="/percepta-logo.png"
                alt="Check-in Express by Percepta"
                className="h-8 w-auto object-contain"
              />
              <span className="font-bold text-blue-800 text-sm hidden sm:block">
                Check-in Express
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Indicateur rÃ©seau */}
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                isOnline
                  ? 'text-green-700 bg-green-50 border border-green-200'
                  : 'text-red-700 bg-red-50 border border-red-200'
              }`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-xs">{isOnline ? 'En ligne' : 'Hors ligne'}</span>
              </span>
              {/* Actualiser */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Actualiser"
                className="text-slate-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className={isRefreshing ? 'animate-spin inline-block' : 'inline-block'}>â†»</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Admin
                </button>
              )}
              {/* ParamÃ¨tres */}
              <button
                type="button"
                onClick={() => navigate('/parametres')}
                title="ParamÃ¨tres"
                className="text-slate-600 hover:text-blue-700 px-2 py-1.5 rounded-lg text-sm hover:bg-slate-100 transition-colors"
              >
                âš™ï¸
              </button>
              <button
                onClick={() => setShowLogout(true)}
                type="button"
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
              >
                DÃ©connexion
              </button>
            </div>
          </header>

      <main style={{maxWidth: "1280px", margin: "0 auto", padding: "80px 16px 40px"}} className="md:px-8">
        {/* Hero Section */}
        <div style={{
          height: "180px",
          backgroundImage: "url('/hotel-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: "16px",
          marginBottom: "24px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.55))",
            borderRadius: "16px"
          }} />
          <div style={{
            position: "absolute",
            bottom: "20px",
            left: 0,
            right: 0,
            textAlign: "center"
          }}>
            <h1 style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "white",
              textShadow: "0 2px 12px rgba(0,0,0,0.7)",
              margin: 0,
              padding: "0 16px"
            }}>
              {hotelName}
            </h1>
          </div>
        </div>

        {trialBanner && (
          <div className={trialBanner.className}>
            {trialBanner.text}
          </div>
        )}

        {/* Carte de bienvenue â€” visible au premier login, disparaÃ®t aprÃ¨s dismiss */}
        {!welcomeDismissed && lastClients.length === 0 && profile !== null && (
          <div className="bg-white border border-blue-100 rounded-xl shadow-sm p-5 mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-blue-900">
                  Bienvenue sur Check-in Express ! ðŸ‘‹
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  3 Ã©tapes pour faire votre premier check-in en 30 secondes
                </p>
              </div>
              <button
                type="button"
                onClick={dismissWelcome}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none flex-shrink-0"
                aria-label="Fermer"
              >
                âœ•
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {[
                { step: '1', icon: 'ðŸ“¸', title: 'Scannez le document', desc: "Photographiez la piÃ¨ce d'identitÃ© du client avec la camÃ©ra arriÃ¨re" },
                { step: '2', icon: 'âœï¸', title: 'VÃ©rifiez les donnÃ©es', desc: "L'OCR remplit le formulaire automatiquement â€” corrigez si besoin" },
                { step: '3', icon: 'ðŸ–Šï¸', title: 'Faites signer & gÃ©nÃ©rez', desc: 'Le client signe sur l\'Ã©cran, la fiche PDF est crÃ©Ã©e instantanÃ©ment' },
              ].map(({ step, icon, title, desc }) => (
                <div key={step} className="flex gap-3 bg-slate-50 rounded-lg p-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-800 text-white text-xs font-bold flex items-center justify-center">
                    {step}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{icon} {title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                ðŸ’¡ Besoin d'aide ? <a href="mailto:contact@percepta.io" className="text-blue-600 hover:underline">contact@percepta.io</a>
              </p>
              <button
                type="button"
                onClick={() => { dismissWelcome(); navigate('/scanner') }}
                className="w-full sm:w-auto bg-blue-800 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-blue-900 transition-colors"
              >
                ðŸ“¸ Faire mon premier scan
              </button>
            </div>
          </div>
        )}

        <section style={{display: "flex", justifyContent: "center", marginBottom: "24px"}} className="sm:mb-8 gap-3 md:gap-6">
          <button
            type="button"
            onClick={() => navigate('/scanner')}
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
            ðŸ“¸ SCANNER UN DOCUMENT
          </button>
        </section>

        <section className="flex gap-3 mb-6 max-w-sm mx-auto w-full">
          <button
            type="button"
            onClick={() => navigate('/fiches')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold text-sm"
          >
            Fiche de contrÃ´le
          </button>
        </section>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-xl px-3 py-5 text-center shadow-sm border border-blue-100 flex flex-col items-center">
            <span className="text-2xl mb-1">ðŸ“…</span>
            <p className="text-3xl font-bold text-blue-700">{scansToday}</p>
            <p className="text-xs text-gray-500 mt-1">Scans aujourd'hui</p>
          </div>
          <div className="bg-white rounded-xl px-3 py-5 text-center shadow-sm border border-green-100 flex flex-col items-center">
            <span className="text-2xl mb-1">ðŸ›Ž</span>
            <p className="text-3xl font-bold text-green-700">{clientsPresents}</p>
            <p className="text-xs text-gray-500 mt-1">PrÃ©sents ce soir</p>
          </div>
          <div className="bg-white rounded-xl px-3 py-5 text-center shadow-sm border border-blue-100 flex flex-col items-center">
            <span className="text-2xl mb-1">ðŸ“Š</span>
            <p className="text-3xl font-bold text-blue-700">{scansThisMonth}</p>
            <p className="text-xs text-gray-500 mt-1">Scans ce mois</p>
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
            Derniers clients scannÃ©s
          </h2>
          {lastClients.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <div className="text-5xl mb-3">ðŸ¨</div>
              <h3 className="text-base font-bold text-blue-900 mb-1">
                Aucun check-in pour l'instant
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Votre historique apparaÃ®tra ici aprÃ¨s votre premier scan
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-2 text-left max-w-md mx-auto mb-6">
                {[
                  { n: '1', label: 'Scannez la piÃ¨ce d\'identitÃ©' },
                  { n: '2', label: 'VÃ©rifiez et faites signer' },
                  { n: '3', label: 'La fiche PDF est gÃ©nÃ©rÃ©e' },
                ].map(({ n, label }) => (
                  <div key={n} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 flex-1">
                    <span className="w-6 h-6 rounded-full bg-blue-800 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {n}
                    </span>
                    <span className="text-xs text-slate-700 font-medium">{label}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate('/scanner')}
                className="bg-gradient-to-br from-blue-800 to-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md hover:shadow-lg transition-shadow"
              >
                ðŸ“¸ DÃ©marrer mon premier scan
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
                const badgeText = client.printed ? 'âœ… ImprimÃ©' : 'â³ En attente'

                return (
                  <div
                    key={client.id}
                    className="border border-[#e2e8f0] rounded-lg p-3 sm:p-4 flex flex-row items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#1e293b] text-sm sm:text-base truncate">
                        {client.surname} {client.givenNames}
                      </div>
                      <div className="text-xs sm:text-sm text-[#64748b]">
                        {dd}/{mm}/{yyyy} {hh}:{min} Â· Chambre {client.roomNumber}
                      </div>
                    </div>
                    <div
                      className={`text-xs font-semibold rounded-full px-2 py-1 flex-shrink-0 whitespace-nowrap ${
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

        <footer className="mt-6 pb-6 px-2">
          {/* Mobile : grille 2 colonnes, 3 rangÃ©es */}
          <div className="grid grid-cols-2 gap-y-2 sm:hidden">
            {[
              { label: 'Fiches de contrÃ´le', path: '/fiches' },
              { label: 'Historique', path: '/historique' },
              { label: 'ðŸ“Š Statistiques', path: '/stats' },
              { label: 'â“ Aide', path: '/aide' },
              { label: 'Support', path: '/support' },
              { label: 'CGU', path: '/cgu' },
            ].map(({ label, path }) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className="text-blue-600 hover:text-blue-800 text-sm text-center py-1 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Desktop : ligne horizontale avec tous les liens */}
          <div className="hidden sm:flex flex-row flex-wrap justify-center items-center gap-x-1 gap-y-1">
            {[
              { label: 'Fiches de contrÃ´le', path: '/fiches' },
              { label: 'Historique', path: '/historique' },
              { label: 'ðŸ“Š Statistiques', path: '/stats' },
              { label: 'â“ Aide', path: '/aide' },
              { label: 'Support', path: '/support' },
              { label: 'CGU', path: '/cgu' },
              { label: 'ConfidentialitÃ©', path: '/confidentialite' },
              { label: 'Mentions lÃ©gales', path: '/mentions-legales' },
            ].map(({ label, path }, i, arr) => (
              <span key={path} className="flex items-center">
                <button
                  type="button"
                  onClick={() => navigate(path)}
                  className="text-blue-600 hover:text-blue-800 hover:underline text-sm px-1 py-0.5 transition-colors"
                >
                  {label}
                </button>
                {i < arr.length - 1 && (
                  <span className="text-gray-300 select-none ml-1">Â·</span>
                )}
              </span>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-3">
            Â© 2026 Percepta SUARL Â· Tous droits rÃ©servÃ©s
          </p>
        </footer>
      </main>
    </div>
  )
}

