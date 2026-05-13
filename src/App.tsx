import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import Parametres from './pages/Parametres'
import Support from './pages/Support'
import Layout from './components/Layout'

function AppContent() {
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

  // Guard spécifique pour /setup-hotel
  const SetupHotelRoute = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<any>(null)
    const [hasHotel, setHasHotel] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const checkAuthAndHotel = async () => {
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError || !sessionData.session) {
            window.location.href = '/login'
            return
          }
          
          setSession(sessionData.session)
          
          if (!sessionData.session.user.email_confirmed_at) {
            window.location.href = '/confirm-email-pending'
            return
          }
          
          // Vérifie si l'utilisateur a déjà un hôtel
          const { data: hotel } = await supabase
            .from('hotels')
            .select('id')
            .eq('user_id', sessionData.session.user.id)
            .single()
          
          if (hotel) {
            window.location.href = '/dashboard' // Déjà un hôtel, va au dashboard
          } else {
            setHasHotel(false)
          }
          
        } catch (error) {
          console.error('SetupHotelRoute error:', error)
          window.location.href = '/login'
        } finally {
          setLoading(false)
        }
      }

      checkAuthAndHotel()
    }, [])

    if (loading) {
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
              width: "40px",
              height: "40px",
              border: "4px solid #bfdbfe",
              borderTop: "4px solid #1e3a8a",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto"
            }}></div>
            <p style={{ color: "#1e3a8a", marginTop: "16px" }}>Vérification...</p>
          </div>
        </div>
      )
    }

    if (!session?.user || hasHotel === null) return null
    return <>{children}</>
  }

  // Middleware de protection - vérification session
  const ProtectedRouteWrapper = ({ children }: { children: React.ReactNode }) => {
    const [isLoading, setIsLoading] = useState(true)
    const [redirect, setRedirect] = useState<string | null>(null)

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError || !sessionData.session) {
            setRedirect('/login')
            setIsLoading(false)
            return
          }
          
          const isAdmin = sessionData.session.user?.user_metadata?.is_admin === true
          
          if (isAdmin) {
            setRedirect('/admin')
            setIsLoading(false)
            return
          }
          
          // Vérifier si l'email est confirmé
          if (!sessionData.session.user.email_confirmed_at) {
            setRedirect('/confirm-email-pending')
            setIsLoading(false)
            return
          }
          
          // Vérifier si l'hôtel existe
          const { data: hotel } = await supabase
            .from('hotels')
            .select('*')
            .eq('user_id', sessionData.session.user.id)
            .single()
          
          if (!hotel) {
            setRedirect('/setup-hotel')
            setIsLoading(false)
            return
          }
          
          setIsLoading(false)
          
        } catch (error) {
          console.error('Session error:', error)
          setRedirect('/login')
        }
        setIsLoading(false)
      }

      checkAuth()
    }, [])

    if (isLoading) {
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

    if (redirect) {
      return <Navigate to={redirect} replace />
    }

    return <>{children}</>
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onRegisterClick={() => window.location.href = '/register'} />} />
      <Route path="/register" element={<Register onLoginClick={() => window.location.href = '/login'} />} />
      <Route path="/confirm-email" element={<ConfirmEmail />} />
      <Route path="/confirm-email-pending" element={<ConfirmEmail />} />
      <Route path="/setup-hotel" element={
        <SetupHotelRoute>
          <SetupHotel />
        </SetupHotelRoute>
      } />
      
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/analytics" element={<AdminAnalytics />} />
      <Route path="/admin/parametres" element={<AdminParametres />} />
      
      <Route path="/subscribe" element={<Subscribe />} />
      <Route path="/pricing" element={<Subscribe />} />
      
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      <Route path="/dashboard" element={
        <ProtectedRouteWrapper>
          <Layout currentPage="dashboard">
            <Dashboard
              onRequireLogin={() => window.location.href = '/login'}
              onSubscribeClick={() => window.location.href = '/pricing'}
            />
          </Layout>
        </ProtectedRouteWrapper>
      } />
      
      <Route path="/scan" element={
        <ProtectedRouteWrapper>
          <Layout currentPage="scan">
            <Scan
              onBack={() => window.location.href = '/dashboard'}
              onCapture={(data) => {
                setOcrData(data)
                window.location.href = '/confirm'
              }}
            />
          </Layout>
        </ProtectedRouteWrapper>
      } />
      <Route path="/scanner" element={
        <ProtectedRouteWrapper>
          <Layout currentPage="scan">
            <Scan
              onBack={() => window.location.href = '/dashboard'}
              onCapture={(data) => {
                setOcrData(data)
                window.location.href = '/confirm'
              }}
            />
          </Layout>
        </ProtectedRouteWrapper>
      } />
      
      <Route path="/confirm" element={
        <ProtectedRouteWrapper>
          <Layout currentPage="scan">
            <Confirm
              data={ocrData}
              onRestart={() => {
                setOcrData(null)
                window.location.href = '/scan'
              }}
              onConfirm={() => window.location.href = '/dashboard'}
            />
          </Layout>
        </ProtectedRouteWrapper>
      } />
      
      <Route path="/historique" element={
        <ProtectedRouteWrapper>
          <Layout currentPage="historique">
            <Historique />
          </Layout>
        </ProtectedRouteWrapper>
      } />
      
      <Route path="/fiches" element={
        <ProtectedRouteWrapper>
          <Layout currentPage="fiches">
            <Fiches />
          </Layout>
        </ProtectedRouteWrapper>
      } />
      
      <Route path="/parametres" element={
        <ProtectedRouteWrapper>
          <Layout currentPage="parametres">
            <Parametres />
          </Layout>
        </ProtectedRouteWrapper>
      } />
      
      <Route path="/support" element={
        <ProtectedRouteWrapper>
          <Layout currentPage="support">
            <Support />
          </Layout>
        </ProtectedRouteWrapper>
      } />
      
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh' }}>
        <AppContent />
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .page-transition {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </BrowserRouter>
  )
}
