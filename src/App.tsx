import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Scan from './pages/Scan'
import ScanDocument from './components/ScanDocument'
import Confirm from './pages/Confirm'
import Admin from './pages/Admin'
import Subscribe from './pages/Subscribe'

export default function App() {
  const [currentPage, setCurrentPage] = useState('loading')
  const [session, setSession] = useState<Session | null>(null)
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

  // Charger la session
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }
    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error || !data.session) {
          setCurrentPage('login')
          setIsCheckingSession(false)
          return
        }
        
        const isAdmin = data.session.user?.user_metadata?.is_admin === true
        
        if (isAdmin) {
          setCurrentPage('admin')
          setIsCheckingSession(false)
          return  // STOP - ne pas vérifier le profil
        }
        
        // Seulement si pas admin, vérifier le profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('status, trial_end')
          .eq('id', data.session.user.id)
          .single()
        
        if (profile?.status === 'active') {
          setCurrentPage('dashboard')
        } else if (profile?.status === 'trial') {
          const trialEnd = new Date(profile.trial_end)
          if (trialEnd > new Date()) {
            setCurrentPage('dashboard')
          } else {
            setCurrentPage('subscribe')
          }
        } else {
          setCurrentPage('login')
        }
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
          
          // Seulement si pas admin, vérifier le profil
          const { data: profile } = await supabase
            .from('profiles')
            .select('status, trial_end')
            .eq('id', session.user.id)
            .single()
          
          if (profile?.status === 'active') {
            setCurrentPage('dashboard')
          } else if (profile?.status === 'trial') {
            const trialEnd = new Date(profile.trial_end)
            if (trialEnd > new Date()) {
              setCurrentPage('dashboard')
            } else {
              setCurrentPage('subscribe')
            }
          } else {
            setCurrentPage('login')
          }
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
          onLoginSuccess={(isAdmin) => {
            if (isAdmin) {
              setCurrentPage('admin')
              return  // STOP immédiatement
            }
            setCurrentPage('dashboard')
          }}
        />
      </div>
    )
  }

  if (currentPage === 'register') {
    return (
      <div className="page-transition">
        <Register 
          onLoginClick={() => setCurrentPage('login')} 
          onSubscribe={() => setCurrentPage('subscribe')} 
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
        <ScanDocument
          userId={session?.user?.id || ''}
          onBack={() => setCurrentPage('dashboard')}
          onScanComplete={(data) => {
            // Convert OCRResult to existing format
            const convertedData = {
              documentType: data.documentType,
              issuingCountry: null,
              surname: data.nom,
              givenNames: data.prenoms,
              dateOfBirth: data.dateNaissance,
              documentNumber: data.numeroDocument,
              nationality: data.nationalite,
              sex: null,
              expiryDate: data.dateExpiration,
              address: null,
              needsBackSide: data.needsVerso,
              confidence: data.confidence
            }
            setOcrData(convertedData)
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

  return null
}
