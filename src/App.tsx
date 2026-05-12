import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Scan from './pages/Scan'
import Confirm from './pages/Confirm'
import ConfirmEmail from './pages/ConfirmEmail'
import SetupHotel from './pages/SetupHotel'
import AdminDashboard from './pages/AdminDashboard'
import AdminAnalytics from './pages/AdminAnalytics'
import AdminParametres from './pages/AdminParametres'
import Subscribe from './pages/Subscribe'
import Historique from './pages/Historique'
import Fiches from './pages/Fiches'
import FichesControle from './pages/FichesControle'
import Parametres from './pages/Parametres'
import Support from './pages/Support'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const [currentPage, setCurrentPage] = useState('loading')
  const [ocrData, setOcrData] = useState<{
    documentType: string | null
    needsVerso: boolean | null
    nom: string | null
    prenoms: string | null
    dateNaissance: string | null
    lieuNaissance: string | null
    nationalite: string | null
    numeroDocument: string | null
    dateDelivrance: string | null
    dateExpiration: string | null
    confidence: number | null
    adresse: string | null
    profession: string | null
    nomPere: string | null
    nomMere: string | null
  } | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  // Timeout de sécurité
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentPage === 'loading') {
        setCurrentPage('login')
      }
    }, 3000)
    return () => clearTimeout(timeout)
  }, [currentPage])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !sessionData.session) {
          setCurrentPage('login')
          setIsCheckingSession(false)
          return
        }
        
        const isAdmin = sessionData.session.user?.user_metadata?.is_admin === true
        
        if (isAdmin) {
          setCurrentPage('admin')
          setIsCheckingSession(false)
          return  // STOP - ne pas vérifier le profil
        }
        
        // Vérifier si l'email est confirmé
        if (!sessionData.session.user.email_confirmed_at) {
          setCurrentPage('confirm-email-pending')
          setIsCheckingSession(false)
          return
        }
        
        // Vérifier si l'hôtel existe
        const { data: hotel } = await supabase
          .from('hotels')
          .select('*')
          .eq('user_id', sessionData.session.user.id)
          .single()
        
        if (!hotel) {
          setCurrentPage('setup-hotel')
          setIsCheckingSession(false)
          return
        }
        
        // Rediriger vers dashboard si tout est OK
        setCurrentPage('dashboard')
        setIsCheckingSession(false)
        
      } catch (error) {
        console.error('Session error:', error)
        setCurrentPage('login')
      }
      setIsCheckingSession(false)
    }

    void checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session) {
          const isAdmin = session.user?.user_metadata?.is_admin === true
          
          if (isAdmin) {
            setCurrentPage('admin')
            return  // STOP - ne pas vérifier le profil
          }
          
          // Rediriger immédiatement vers dashboard sans attendre le profil
          setCurrentPage('dashboard')
          
          // Le profil sera récupéré dans le composant Dashboard lui-même
        } else {
          setCurrentPage('login')
        }
      } catch (error) {
        console.error('Auth state change error:', error)
        setCurrentPage('login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Gérer les URLs
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname
      
      if (path === '/admin') {
        setCurrentPage('admin')
      } else if (path === '/admin/analytics') {
        setCurrentPage('admin-analytics')
      } else if (path === '/admin/parametres') {
        setCurrentPage('admin-parametres')
      } else if (path === '/dashboard') {
        setCurrentPage('dashboard')
      } else if (path === '/scan') {
        setCurrentPage('scan')
      } else if (path === '/historique') {
        setCurrentPage('historique')
      } else if (path === '/fiches') {
        setCurrentPage('fiches')
      } else if (path === '/parametres') {
        setCurrentPage('parametres')
      } else if (path === '/support') {
        setCurrentPage('support')
      } else if (path === '/login') {
        setCurrentPage('login')
      } else if (path === '/register') {
        setCurrentPage('register')
      } else if (path === '/confirm-email') {
        setCurrentPage('confirm-email')
      } else if (path === '/confirm-email-pending') {
        setCurrentPage('confirm-email-pending')
      } else if (path === '/setup-hotel') {
        setCurrentPage('setup-hotel')
      } else if (path === '/subscribe') {
        setCurrentPage('subscribe')
      } else if (path === '/pricing') {
        setCurrentPage('pricing')
      } else if (path === '/') {
        setCurrentPage('loading')
      }
    }

    // Écouter les changements d'URL
    window.addEventListener('popstate', handleUrlChange)
    
    // Gérer l'URL initiale
    handleUrlChange()

    return () => {
      window.removeEventListener('popstate', handleUrlChange)
    }
  }, [])

  // Mettre à jour l'URL quand la page change
  useEffect(() => {
    const urlMap: Record<string, string> = {
      'admin': '/admin',
      'admin-analytics': '/admin/analytics',
      'admin-parametres': '/admin/parametres',
      'dashboard': '/dashboard',
      'scan': '/scan',
      'historique': '/historique',
      'fiches': '/fiches',
      'parametres': '/parametres',
      'support': '/support',
      'login': '/login',
      'register': '/register',
      'subscribe': '/subscribe',
      'pricing': '/pricing',
      'confirm-email': '/confirm-email',
      'confirm-email-pending': '/confirm-email-pending',
      'setup-hotel': '/setup-hotel'
    }

    if (urlMap[currentPage] && window.location.pathname !== urlMap[currentPage]) {
      window.history.pushState({}, '', urlMap[currentPage])
    }
  }, [currentPage])

  if (currentPage === 'loading') {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#e8f4fd",
        backgroundImage: "url('/hotel-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: "20px",
          padding: "48px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(30,58,138,0.15)"
        }}>
          <div style={{
            fontSize: "48px",
            marginBottom: "16px"
          }}>🏨</div>
          <h2 style={{
            color: "#1e3a8a",
            fontWeight: "800",
            margin: "0 0 8px"
          }}>Check-in Express</h2>
          <p style={{
            color: "#64748b",
            margin: "0 0 24px"
          }}>by Percepta</p>
          <div style={{
            width: "40px",
            height: "40px",
            border: "4px solid #bfdbfe",
            borderTop: "4px solid #1e3a8a",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto"
          }}></div>
        </div>
      </div>
    )
  }

  if (currentPage === 'login') {
    return (
      <Layout>
        <div className="page-transition">
          <Login
            onRegisterClick={() => setCurrentPage('register')}
          />
        </div>
      </Layout>
    )
  }

  if (currentPage === 'register') {
    return (
      <Layout>
        <div className="page-transition">
          <Register 
            onLoginClick={() => setCurrentPage('login')} 
          />
        </div>
      </Layout>
    )
  }

  if (currentPage === 'dashboard') {
    return (
      <Layout currentPage="dashboard" onNavigate={setCurrentPage} showNavigation={true}>
        <div className="page-transition">
          <Dashboard
            onRequireLogin={() => setCurrentPage('login')}
            onScanComplete={() => {
              setOcrData(null)
              setCurrentPage('scan')
            }}
            onAdminClick={() => setCurrentPage('admin')}
            onSubscribeClick={() => setCurrentPage('pricing')}
          />
        </div>
      </Layout>
    )
  }

  if (currentPage === 'scan') {
    return (
      <ProtectedRoute>
        <Layout currentPage="scan" onNavigate={setCurrentPage} showNavigation={true}>
          <div className="page-transition">
            <Scan
              onBack={() => setCurrentPage('dashboard')}
              onCapture={(data) => {
                setOcrData(data)
                setCurrentPage('confirm')
              }}
            />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  if (currentPage === 'confirm') {
    return (
      <Layout currentPage="scan" onNavigate={setCurrentPage} showNavigation={true}>
        <div className="page-transition">
          <Confirm
            data={ocrData}
            onRestart={() => {
              setOcrData(null)
              setCurrentPage('scan')
            }}
            onConfirm={() => setCurrentPage('dashboard')}
          />
        </div>
      </Layout>
    )
  }

  if (currentPage === 'confirm-email') {
    return (
      <Layout currentPage="confirm-email" onNavigate={setCurrentPage} showNavigation={true}>
        <div className="page-transition">
          <ConfirmEmail />
        </div>
      </Layout>
    )
  }

  if (currentPage === 'confirm-email-pending') {
    return (
      <Layout currentPage="confirm-email-pending" onNavigate={setCurrentPage} showNavigation={true}>
        <div className="page-transition">
          <ConfirmEmail />
        </div>
      </Layout>
    )
  }

  if (currentPage === 'setup-hotel') {
    return (
      <Layout currentPage="setup-hotel" onNavigate={setCurrentPage} showNavigation={true}>
        <div className="page-transition">
          <SetupHotel />
        </div>
      </Layout>
    )
  }

  if (currentPage === 'historique') {
    return (
      <ProtectedRoute>
        <Layout currentPage="historique" onNavigate={setCurrentPage} showNavigation={true}>
          <div className="page-transition">
            <Historique />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  if (currentPage === 'fiches') {
    return (
      <ProtectedRoute>
        <Layout currentPage="fiches" onNavigate={setCurrentPage} showNavigation={true}>
          <div className="page-transition">
            <Fiches />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  if (currentPage === 'parametres') {
    return (
      <ProtectedRoute>
        <Layout currentPage="parametres" onNavigate={setCurrentPage} showNavigation={true}>
          <div className="page-transition">
            <Parametres 
              onBack={() => setCurrentPage('dashboard')} 
            />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  if (currentPage === 'support') {
    return (
      <ProtectedRoute>
        <Layout currentPage="support" onNavigate={setCurrentPage} showNavigation={true}>
          <div className="page-transition">
            <Support 
              onBack={() => setCurrentPage('dashboard')} 
            />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  if (currentPage === 'admin') {
    return (
      <Layout>
        <div className="page-transition">
          <AdminDashboard />
        </div>
      </Layout>
    )
  }

  if (currentPage === 'admin-analytics') {
    return (
      <Layout>
        <div className="page-transition">
          <AdminAnalytics />
        </div>
      </Layout>
    )
  }

  if (currentPage === 'admin-parametres') {
    return (
      <Layout>
        <div className="page-transition">
          <AdminParametres />
        </div>
      </Layout>
    )
  }

  if (currentPage === 'subscribe') {
    return (
      <Layout>
        <div className="page-transition">
          <Subscribe 
            onBack={() => setCurrentPage('dashboard')} 
          />
        </div>
      </Layout>
    )
  }

  if (currentPage === 'pricing') {
    return (
      <Layout>
        <div className="page-transition">
          <Subscribe 
            onBack={() => setCurrentPage('dashboard')} 
          />
        </div>
      </Layout>
    )
  }

  return null
}
