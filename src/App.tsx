import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Scan from './pages/Scan'
import Confirm from './pages/Confirm'

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setCurrentPage(data.session ? 'dashboard' : 'login')
      setIsCheckingSession(false)
    }

    void checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentPage(session ? 'dashboard' : 'login')
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
        onLoginSuccess={() => setCurrentPage('dashboard')}
      />
    )
  }

  if (currentPage === 'register') {
    return <Register onLoginClick={() => setCurrentPage('login')} />
  }

  if (currentPage === 'dashboard') {
    return (
      <Dashboard
        onRequireLogin={() => setCurrentPage('login')}
        onScanComplete={() => setCurrentPage('confirm')}
      />
    )
  }

  if (currentPage === 'scan') {
    return (
      <Scan
        onBack={() => setCurrentPage('dashboard')}
        onCapture={() => setCurrentPage('confirm')}
      />
    )
  }

  if (currentPage === 'confirm') {
    return (
      <Confirm
        onRestart={() => setCurrentPage('scan')}
        onConfirm={() => setCurrentPage('dashboard')}
      />
    )
  }

  return null
}
