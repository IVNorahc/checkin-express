import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Scan from './pages/Scan'
import Confirm from './pages/Confirm'
import Admin from './pages/Admin'
import Subscribe from './pages/Subscribe'

export default function App() {
  const [currentPage, setCurrentPage] = useState('loading')
  const [ocrData, setOcrData] = useState<{
    documentType: string | null
    issuingCountry: string | null
    surname: string | null
    givenNames: string | null
    dateOfBirth: string | null
    documentNumber: string | null
    nationality: string | null
    sex: string | null
    expiryDate: string | null
    address: string | null
    needsBackSide: boolean | null
    confidence: number | null
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
        
        // Rediriger immédiatement vers dashboard sans attendre le profil
        setCurrentPage('dashboard')
        setIsCheckingSession(false)
        
        // Le profil sera récupéré dans le composant Dashboard lui-même
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
      <div className="page-transition">
        <Login
          onRegisterClick={() => setCurrentPage('register')}
        />
      </div>
    )
  }

  if (currentPage === 'register') {
    return (
      <div className="page-transition">
        <Register 
          onLoginClick={() => setCurrentPage('login')} 
        />
      </div>
    )
  }

  if (currentPage === 'dashboard') {
    return (
      <div className="page-transition">
        <Dashboard
          onRequireLogin={() => setCurrentPage('login')}
          onScanComplete={() => {
            setOcrData(null)
            setCurrentPage('scan')
          }}
          onAdminClick={() => setCurrentPage('admin')}
          onSubscribeClick={() => setCurrentPage('subscribe')}
        />
      </div>
    )
  }

  if (currentPage === 'scan') {
    return (
      <div className="page-transition">
        <Scan
          onBack={() => setCurrentPage('dashboard')}
          onCapture={(data) => {
            setOcrData(data)
            setCurrentPage('confirm')
          }}
        />
      </div>
    )
  }

  if (currentPage === 'confirm') {
    return (
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
    )
  }

  if (currentPage === 'admin') {
    return (
      <div className="page-transition">
        <Admin />
      </div>
    )
  }

  if (currentPage === 'subscribe') {
    return (
      <div className="page-transition">
        <Subscribe 
          onBack={() => setCurrentPage('dashboard')} 
        />
      </div>
    )
  }

  if (currentPage === 'pricing') {
    return (
      <div className="page-transition">
        <Subscribe 
          onBack={() => setCurrentPage('dashboard')} 
        />
      </div>
    )
  }

  return null
}
