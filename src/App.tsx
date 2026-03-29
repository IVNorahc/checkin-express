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
  const [currentPage, setCurrentPage] = useState('dashboard')
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

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        const isAdmin = data.session.user?.user_metadata?.is_admin === true
        
        if (isAdmin) {
          setCurrentPage('admin')
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
          setCurrentPage('subscribe')
        }
      } else {
        setCurrentPage('login')
      }
      setIsCheckingSession(false)
    }

    void checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
          setCurrentPage('subscribe')
        }
      } else {
        setCurrentPage('login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans text-[#1e3a8a]">
        Chargement...
      </div>
    )
  }

  if (currentPage === 'login') {
    return (
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
    )
  }

  if (currentPage === 'register') {
    return (
      <Register 
        onLoginClick={() => setCurrentPage('login')} 
        onSubscribe={() => setCurrentPage('subscribe')} 
      />
    )
  }

  if (currentPage === 'dashboard') {
    return (
      <Dashboard
        onRequireLogin={() => setCurrentPage('login')}
        onScanComplete={() => {
          setOcrData(null)
          setCurrentPage('scan')
        }}
        onAdminClick={() => setCurrentPage('admin')}
        onSubscribeClick={() => setCurrentPage('subscribe')}
      />
    )
  }

  if (currentPage === 'scan') {
    return (
      <Scan
        onBack={() => setCurrentPage('dashboard')}
        onCapture={(data) => {
          setOcrData(data)
          setCurrentPage('confirm')
        }}
      />
    )
  }

  if (currentPage === 'confirm') {
    return (
      <Confirm
        data={ocrData}
        onRestart={() => {
          setOcrData(null)
          setCurrentPage('scan')
        }}
        onConfirm={() => setCurrentPage('dashboard')}
      />
    )
  }

  if (currentPage === 'admin') {
    return <Admin />
  }

  if (currentPage === 'subscribe') {
    return (
      <Subscribe 
        onBack={() => setCurrentPage('dashboard')} 
      />
    )
  }

  return null
}
