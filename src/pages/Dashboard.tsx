import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getDB, initDB, type Client } from '../lib/db'
import { generateFichesGroupees, type FicheParams } from '../utils/generateFicheControle'

type DashboardProps = {
  onRequireLogin: () => void
  onSubscribeClick?: () => void
}

export default function Dashboard({ onRequireLogin, onSubscribeClick }: DashboardProps) {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<{ status: string; trial_end: string | null; subscription_id: string | null } | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [now, setNow] = useState(Date.now())
  const [lastClients, setLastClients] = useState<Client[]>([])
  const [scansToday, setScansToday] = useState(0)
  const [scansThisMonth, setScansThisMonth] = useState(0)
  const [hotelInfo, setHotelInfo] = useState<any>(null)
  const [daysLeft, setDaysLeft] = useState(0)
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem('checkin_welcome_v1') === 'dismissed'
  )
  const [pendingFichesCount, setPendingFichesCount] = useState(0)
  const [printReady, setPrintReady] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [syncCount, setSyncCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const dismissWelcome = () => {
    localStorage.setItem('checkin_welcome_v1', 'dismissed')
    setWelcomeDismissed(true)
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setRefreshKey(k => k + 1)
    setTimeout(() => setIsRefreshing(false), 1500)
  }

  const syncOfflineData = async () => {
    if (isSyncing || !session) return
    setIsSyncing(true)
    try {
      const db = getDB()
      const pending = await db.clients.where('syncStatus').equals('pending_sync').toArray()
      let synced = 0
      for (const client of pending) {
        if (!client.pendingSyncData) continue
        const payload = JSON.parse(client.pendingSyncData)
        const { error } = await supabase.from('clients').insert(payload)
        if (!error) {
          await db.clients.update(client.id!, { syncStatus: 'synced' })
          synced++
        }
      }
      if (synced > 0) setRefreshKey(k => k + 1)
    } catch (e) {
      console.error('[Dashboard] sync error:', e)
    } finally {
      setIsSyncing(false)
    }
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
          subscription_id: null,
        })
        setHotelInfo(hotelData)
        setNow(Date.now())
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
  }, [onRequireLogin, navigate])

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

      // Fiches non encore imprimées du jour (pour le badge et l'impression groupée)
      const pendingCount = await db.fichesPolice
        .where('generatedAt')
        .between(startOfToday.toISOString(), endOfToday.toISOString())
        .filter(f => !f.printed)
        .count()

      setScansToday(todayCount)
      setScansThisMonth(monthCount)
      setPendingFichesCount(pendingCount)

      const pendingSyncs = await db.clients.where('syncStatus').equals('pending_sync').count()
      setSyncCount(pendingSyncs)
    }

    void loadClients()
  }, [session, refreshKey])

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

  // Demander la permission de notification au premier chargement
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Déclencheur 20h00 Dakar (Africa/Dakar = UTC+0, pas de DST)
  useEffect(() => {
    const dakarHour = new Date().getUTCHours()
    const today = new Date().toISOString().split('T')[0]
    const lastTriggered = localStorage.getItem('checkin_print_trigger_date')

    if (dakarHour === 20 && lastTriggered !== today && pendingFichesCount > 0) {
      setPrintReady(true)
      localStorage.setItem('checkin_print_trigger_date', today)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Check-in Express', {
          body: `Vos ${pendingFichesCount} fiche(s) du jour sont prêtes à imprimer`,
        })
      }
    }
  }, [now, pendingFichesCount])

  // Correction 1: Real-time trial countdown update
  useEffect(() => {
    const updateCountdown = () => {
      const trialEnd = profile?.trial_end ? new Date(profile.trial_end) : null
      const daysLeftCalc = trialEnd
        ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0

      console.log('[Dashboard] DEBUG trial countdown:', {
        subscription_status: profile?.status,
        trial_end_raw: profile?.trial_end,
        trial_end_parsed: trialEnd ? trialEnd.toISOString() : null,
        now: new Date().toISOString(),
        daysLeft: daysLeftCalc,
        willRedirect: daysLeftCalc <= 0 && profile?.status === 'trial',
      })

      setDaysLeft(daysLeftCalc)
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 3600000) // toutes les heures
    return () => clearInterval(interval)
  }, [profile])

  // Redirect check — calcul direct depuis trial_end pour éviter la race condition avec daysLeft
  useEffect(() => {
    if (profile?.status !== 'trial') return
    const trialEnd = profile.trial_end ? new Date(profile.trial_end) : null
    const expired = !trialEnd || trialEnd <= new Date()
    console.log('[Dashboard] REDIRECT check:', {
      trial_end: profile.trial_end,
      expired,
      status: profile.status,
    })
    if (expired) {
      navigate('/subscribe')
    }
  }, [profile, navigate])

  const email = session?.user.email ?? ''
  const hotelName = hotelInfo?.hotel_name || email || 'Mon hôtel'
  const isAdmin = session?.user?.user_metadata?.is_admin === true

  const trialBanner = useMemo(() => {
    if (profile?.status !== 'trial' || daysLeft <= 0) return null

    const text = `Il vous reste ${daysLeft} jour${daysLeft > 1 ? 's' : ''} d'essai gratuit · 10 scans · Fiches PDF incluses`

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

  const handlePrintNow = async () => {
    setIsPrinting(true)
    try {
      const db = getDB()
      const nowDate = new Date()
      const startOfToday = new Date(nowDate)
      startOfToday.setUTCHours(0, 0, 0, 0)
      const endOfToday = new Date(nowDate)
      endOfToday.setUTCHours(23, 59, 59, 999)

      const unprintedFiches = await db.fichesPolice
        .where('generatedAt')
        .between(startOfToday.toISOString(), endOfToday.toISOString())
        .filter(f => !f.printed && !!f.ficheParams)
        .toArray()

      if (unprintedFiches.length === 0) {
        alert('Aucune fiche à imprimer pour aujourd\'hui.')
        setIsPrinting(false)
        return
      }

      const fichesList: FicheParams[] = unprintedFiches.map(f => JSON.parse(f.ficheParams!))
      const blob = generateFichesGroupees(fichesList)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 15_000)

      // Marquer comme imprimées
      const ficheIds = unprintedFiches.map(f => f.id!)
      const clientIds = unprintedFiches.map(f => f.clientId)
      await Promise.all([
        ...ficheIds.map(id => db.fichesPolice.update(id, { printed: true })),
        ...clientIds.map(id => db.clients.update(id, { printed: true })),
      ])

      // Recharger l'état local
      const updatedClients = await db.clients.orderBy('scanDate').reverse().limit(10).toArray()
      setLastClients(updatedClients)
      setPendingFichesCount(0)
      setPrintReady(false)
    } catch (err) {
      console.error('Erreur impression:', err)
      alert('Erreur lors de la génération du PDF.')
    } finally {
      setIsPrinting(false)
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
  if (profile?.status === 'trial' && daysLeft === 0) {
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
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between px-4 md:px-8 py-2 bg-white shadow-sm">
            {/* Logo + titre sur fond blanc arrondi */}
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
              {/* Indicateur réseau */}
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
                <span className={isRefreshing ? 'animate-spin inline-block' : 'inline-block'}>↻</span>
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
              {/* Paramètres */}
              <button
                type="button"
                onClick={() => navigate('/parametres')}
                title="Paramètres"
                className="text-slate-600 hover:text-blue-700 px-2 py-1.5 rounded-lg text-sm hover:bg-slate-100 transition-colors"
              >
                ⚙️
              </button>
              <button
                onClick={handleSignOut}
                type="button"
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
              >
                Déconnexion
              </button>
            </div>
          </header>

      <main style={{maxWidth: "1280px", margin: "0 auto", padding: "80px 16px 40px"}} className="md:px-8">
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
          <h1 className="text-xl md:text-2xl font-bold text-blue-900 drop-shadow-sm text-center">
            {hotelName}
          </h1>
        </div>

        {trialBanner && (
          <div className={trialBanner.className}>
            {trialBanner.text}
          </div>
        )}

        {!isOnline && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800 font-medium mb-4 flex items-center gap-2">
            <span>📵</span>
            <span>Mode hors ligne — vos check-ins sont sauvegardés localement.</span>
          </div>
        )}

        {/* Carte de bienvenue — visible au premier login, disparaît après dismiss */}
        {!welcomeDismissed && lastClients.length === 0 && profile !== null && (
          <div className="bg-white border border-blue-100 rounded-xl shadow-sm p-5 mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-blue-900">
                  Bienvenue sur Check-in Express ! 👋
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  3 étapes pour faire votre premier check-in en 30 secondes
                </p>
              </div>
              <button
                type="button"
                onClick={dismissWelcome}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none flex-shrink-0"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {[
                { step: '1', icon: '📸', title: 'Scannez le document', desc: "Photographiez la pièce d'identité du client avec la caméra arrière" },
                { step: '2', icon: '✏️', title: 'Vérifiez les données', desc: "L'OCR remplit le formulaire automatiquement — corrigez si besoin" },
                { step: '3', icon: '🖊️', title: 'Faites signer & générez', desc: 'Le client signe sur l\'écran, la fiche PDF est créée instantanément' },
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
                💡 Besoin d'aide ? <a href="mailto:contact@percepta.io" className="text-blue-600 hover:underline">contact@percepta.io</a>
              </p>
              <button
                type="button"
                onClick={() => { dismissWelcome(); navigate('/scanner') }}
                className="w-full sm:w-auto bg-blue-800 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-blue-900 transition-colors"
              >
                📸 Faire mon premier scan
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
            📸 SCANNER UN DOCUMENT
          </button>
        </section>

        {/* Badge fiches en attente + bouton impression */}
        {pendingFichesCount > 0 && (
          <section style={{display: "flex", justifyContent: "center", marginBottom: "16px"}}>
            <div className={`w-full sm:max-w-sm rounded-xl p-4 flex items-center justify-between gap-3 ${
              printReady
                ? 'bg-green-50 border-2 border-green-400'
                : 'bg-amber-50 border border-amber-300'
            }`}>
              <div>
                <p className={`font-bold text-sm ${printReady ? 'text-green-800' : 'text-amber-800'}`}>
                  {printReady ? '🖨️ Prêtes à imprimer !' : '⏳ Fiches en attente'}
                </p>
                <p className={`text-xs mt-0.5 ${printReady ? 'text-green-700' : 'text-amber-700'}`}>
                  {pendingFichesCount} fiche{pendingFichesCount > 1 ? 's' : ''} du jour
                  {!printReady && ' · impression prévue à 20h'}
                </p>
              </div>
              <button
                type="button"
                onClick={handlePrintNow}
                disabled={isPrinting}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                  printReady
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {isPrinting ? '...' : 'Imprimer maintenant'}
              </button>
            </div>
          </section>
        )}

        {syncCount > 0 && (
          <section style={{display: "flex", justifyContent: "center", marginBottom: "16px"}}>
            <div className="w-full sm:max-w-sm bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-amber-800">⏳ Données en attente</p>
                <p className="text-xs mt-0.5 text-amber-700">
                  {syncCount} fiche{syncCount > 1 ? 's' : ''} en attente de synchronisation
                </p>
              </div>
              <button
                type="button"
                onClick={syncOfflineData}
                disabled={isSyncing || !isOnline}
                className="flex-shrink-0 px-4 py-2 rounded-lg font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors"
              >
                {isSyncing ? '...' : 'Synchroniser'}
              </button>
            </div>
          </section>
        )}

        <section style={{display: "flex", justifyContent: "center", marginBottom: "24px"}} className="sm:mb-8 gap-3 md:gap-6">
          <button
            type="button"
            onClick={handleSubscribeClick}
            className="w-full md:w-auto border-2 border-blue-600 text-blue-600 hover:bg-blue-50 bg-white/80 py-3 px-6 rounded-lg font-semibold transition-colors sm:max-w-sm"
          >
            {profile?.status === 'active' ? 'Gérer mon abonnement' : 'Passer à l\'abonnement'}
          </button>
        </section>

        <section style={{display: "flex", justifyContent: "center", marginBottom: "24px"}} className="sm:mb-8 gap-3 md:gap-6">
          <button
            type="button"
            onClick={() => navigate('/fiches')}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold"
          >
            Fiche de contrôle
          </button>
        </section>

        <div className="grid grid-cols-2 gap-4 mb-8">
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
            <div className="py-8 px-4 text-center">
              <div className="text-5xl mb-3">🏨</div>
              <h3 className="text-base font-bold text-blue-900 mb-1">
                Aucun check-in pour l'instant
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Votre historique apparaîtra ici après votre premier scan
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-2 text-left max-w-md mx-auto mb-6">
                {[
                  { n: '1', label: 'Scannez la pièce d\'identité' },
                  { n: '2', label: 'Vérifiez et faites signer' },
                  { n: '3', label: 'La fiche PDF est générée' },
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
                    className="border border-[#e2e8f0] rounded-lg p-3 sm:p-4 flex flex-row items-center justify-between gap-2"
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

        <div className="flex gap-4 justify-center mt-4 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/fiches')}
            className="text-blue-600 hover:underline text-sm"
          >
            Fiches de contrôle
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => navigate('/historique')}
            className="text-blue-600 hover:underline text-sm"
          >
            Voir l'historique complet
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => navigate('/stats')}
            className="text-blue-600 hover:underline text-sm"
          >
            📊 Statistiques
          </button>
        </div>
      </main>
    </div>
  )
}
