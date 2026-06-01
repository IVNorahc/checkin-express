import { Component, useEffect, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { HotelContext, type HotelContextValue } from './contexts/HotelContext'
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
import AdminUsers from './pages/AdminUsers'
import Subscribe from './pages/Subscribe'
import Historique from './pages/Historique'
import FichesControle from './pages/FichesControle'
import Parametres from './pages/Parametres'
import Support from './pages/Support'
import Stats from './pages/Stats'
import CGU from './pages/CGU'
import Confidentialite from './pages/Confidentialite'
import MentionsLegales from './pages/MentionsLegales'
import LandingPage from './pages/LandingPage'
import Layout from './components/Layout'
import { useRegisterSW } from 'virtual:pwa-register/react'

type OcrData = {
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
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#f8fafc', padding: '24px',
        }}>
          <div style={{
            maxWidth: '480px', width: '100%', background: '#fff',
            borderRadius: '16px', padding: '40px', textAlign: 'center',
            boxShadow: '0 4px 24px rgba(30,58,138,0.10)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: '#1e3a8a', fontWeight: 800, marginBottom: '12px' }}>
              Une erreur est survenue
            </h2>
            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>
              L'application a rencontré un problème inattendu. Rechargez la page pour continuer.
            </p>
            {this.state.message && (
              <p style={{
                color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace',
                background: '#f1f5f9', borderRadius: '8px', padding: '8px 12px',
                marginBottom: '24px', wordBreak: 'break-word',
              }}>
                {this.state.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#1e3a8a', color: '#fff', border: 'none',
                borderRadius: '10px', padding: '12px 28px',
                fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const OCR_SESSION_KEY = 'pending_ocr_data'

// Loading spinner shared by route guards
function RouteLoadingSpinner() {
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
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏨</div>
        <h2 style={{ color: "#1e3a8a", fontWeight: "800", margin: "0 0 8px" }}>Check-in Express</h2>
        <p style={{ color: "#64748b", margin: "0 0 24px" }}>by Percepta</p>
        <div style={{
          width: "40px", height: "40px",
          border: "4px solid #bfdbfe",
          borderTop: "4px solid #1e3a8a",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto"
        }} />
      </div>
    </div>
  )
}

function BackButton() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(-1)}
      style={{
        position: 'fixed',
        top: '12px',
        left: '12px',
        zIndex: 9999,
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '8px 14px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e3a8a',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      ← Retour
    </button>
  )
}

// ── SetupHotel guard ──────────────────────────────────────────────────────────
// Defined at module level so React never remounts it on parent re-renders.

function SetupHotelRoute({ children }: { children: React.ReactNode }) {
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

        const { data: hotel } = await supabase
          .from('hotels')
          .select('id')
          .eq('user_id', sessionData.session.user.id)
          .single()

        if (hotel) {
          window.location.href = '/dashboard'
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
        minHeight: "100vh", background: "#e8f4fd",
        backgroundImage: "url('/hotel-bg.png')",
        backgroundSize: "cover", backgroundPosition: "center",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{
          background: "rgba(255,255,255,0.95)", borderRadius: "20px",
          padding: "48px", textAlign: "center",
          boxShadow: "0 20px 60px rgba(30,58,138,0.15)"
        }}>
          <div style={{
            width: "40px", height: "40px",
            border: "4px solid #bfdbfe", borderTop: "4px solid #1e3a8a",
            borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto"
          }} />
          <p style={{ color: "#1e3a8a", marginTop: "16px" }}>Vérification...</p>
        </div>
      </div>
    )
  }

  if (!session?.user || hasHotel === null) return null
  return <>{children}</>
}

// ── Main protected-route guard ────────────────────────────────────────────────
// Defined at module level to keep a stable component identity across re-renders.
// Calling setHotelCtx (parent state) inside a component defined *inside* the
// parent would cause that parent to re-render, produce a new component reference,
// and trigger an infinite unmount/remount loop. This fixes that.

function ProtectedRouteWrapper({
  children,
  employeeRestricted = false,
  setHotelCtx,
}: {
  children: React.ReactNode
  employeeRestricted?: boolean
  setHotelCtx: (ctx: HotelContextValue) => void
}) {
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

        const user = sessionData.session.user
        const isAdmin = user?.user_metadata?.is_admin === true

        if (isAdmin) {
          setRedirect('/admin')
          setIsLoading(false)
          return
        }

        if (!user.email_confirmed_at) {
          setRedirect('/confirm-email-pending')
          setIsLoading(false)
          return
        }

        console.log('[Auth] user.id:', user.id, '| email:', user.email)

        // ── 1. Try owner path ────────────────────────────────────────────────
        const { data: hotel, error: hotelError } = await supabase
          .from('hotels')
          .select('id, hotel_name')
          .eq('user_id', user.id)
          .single()

        console.log('[Auth] owner hotel lookup → id:', hotel?.id ?? null, '| error:', hotelError?.code ?? 'none')

        if (hotel) {
          setHotelCtx({ hotelId: hotel.id, hotelName: hotel.hotel_name, isEmployee: false })
          console.log('[Auth] resolved as OWNER — hotel_id:', hotel.id)
          setIsLoading(false)
          return
        }

        // ── 2. Try employee path (already linked) ────────────────────────────
        const { data: empRow } = await supabase
          .from('hotel_employees')
          .select('hotel_id, status, hotels(id, hotel_name)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

        if (empRow?.hotel_id) {
          const empHotel = empRow.hotels as any
          setHotelCtx({
            hotelId: empRow.hotel_id,
            hotelName: empHotel?.hotel_name ?? null,
            isEmployee: true,
          })
          console.log('[Auth] resolved as EMPLOYEE (active) — hotel_id:', empRow.hotel_id)
          if (employeeRestricted) {
            setRedirect('/dashboard')
          }
          setIsLoading(false)
          return
        }

        // ── 3. Try pending employee (first login after invite) ───────────────
        const { data: pendingRow } = await supabase
          .from('hotel_employees')
          .select('hotel_id, hotels(id, hotel_name)')
          .eq('user_id', user.id)   // ← filtre user_id ajouté (était absent)
          .eq('status', 'pending')
          .maybeSingle()

        if (pendingRow?.hotel_id) {
          await supabase.rpc('link_employee_account')

          const pendingHotel = pendingRow.hotels as any
          setHotelCtx({
            hotelId: pendingRow.hotel_id,
            hotelName: pendingHotel?.hotel_name ?? null,
            isEmployee: true,
          })
          console.log('[Auth] resolved as EMPLOYEE (pending→active) — hotel_id:', pendingRow.hotel_id)
          if (employeeRestricted) {
            setRedirect('/dashboard')
          }
          setIsLoading(false)
          return
        }

        // ── 4. New user with no hotel and no invite → setup ──────────────────
        console.log('[Auth] no hotel found → redirecting to /setup-hotel')
        setRedirect('/setup-hotel')

      } catch (error) {
        console.error('Session error:', error)
        setRedirect('/login')
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [employeeRestricted, setHotelCtx])

  if (isLoading) return <RouteLoadingSpinner />
  if (redirect) return <Navigate to={redirect} replace />
  return <>{children}</>
}

function AppContent() {
  const [ocrData, setOcrData] = useState<OcrData | null>(() => {
    try {
      const stored = sessionStorage.getItem(OCR_SESSION_KEY)
      return stored ? (JSON.parse(stored) as OcrData) : null
    } catch {
      return null
    }
  })

  const [hotelCtx, setHotelCtx] = useState<HotelContextValue>({
    hotelId: null,
    hotelName: null,
    isEmployee: false,
  })

  return (
    <HotelContext.Provider value={hotelCtx}>
      <Routes>
        {/* ── Public routes ──────────────────────────────────────────────────── */}
        <Route path="/login" element={<Login onRegisterClick={() => window.location.href = '/register'} />} />
        <Route path="/register" element={<Register onLoginClick={() => window.location.href = '/login'} />} />
        <Route path="/confirm-email" element={<><BackButton /><ConfirmEmail /></>} />
        <Route path="/confirm-email-pending" element={<><BackButton /><ConfirmEmail /></>} />
        <Route path="/cgu" element={<><BackButton /><CGU /></>} />
        <Route path="/confidentialite" element={<><BackButton /><Confidentialite /></>} />
        <Route path="/mentions-legales" element={<><BackButton /><MentionsLegales /></>} />
        <Route path="/subscribe" element={<><BackButton /><Subscribe /></>} />
        <Route path="/pricing" element={<><BackButton /><Subscribe /></>} />
        <Route path="/" element={<LandingPage />} />

        {/* ── Setup hotel (owner-only, before first hotel) ────────────────────── */}
        <Route path="/setup-hotel" element={
          <>
            <BackButton />
            <SetupHotelRoute>
              <SetupHotel />
            </SetupHotelRoute>
          </>
        } />

        {/* ── Admin routes ────────────────────────────────────────────────────── */}
        <Route path="/admin" element={<><BackButton /><AdminDashboard /></>} />
        <Route path="/admin/analytics" element={<><BackButton /><AdminAnalytics /></>} />
        <Route path="/admin/parametres" element={<><BackButton /><AdminParametres /></>} />
        <Route path="/admin/users" element={<><BackButton /><AdminUsers /></>} />

        {/* ── Protected routes (owners + employees) ──────────────────────────── */}
        <Route path="/dashboard" element={
          <ProtectedRouteWrapper setHotelCtx={setHotelCtx}>
            <Layout currentPage="dashboard">
              <Dashboard
                onRequireLogin={() => window.location.href = '/login'}
                onSubscribeClick={() => window.location.href = '/pricing'}
              />
            </Layout>
          </ProtectedRouteWrapper>
        } />

        <Route path="/scan" element={
          <>
            <BackButton />
            <ProtectedRouteWrapper setHotelCtx={setHotelCtx}>
              <Layout currentPage="scan">
                <Scan
                  onBack={() => window.location.href = '/dashboard'}
                  onCapture={(data) => {
                    try { sessionStorage.setItem(OCR_SESSION_KEY, JSON.stringify(data)) } catch { /* quota */ }
                    setOcrData(data)
                    window.location.href = '/confirm'
                  }}
                />
              </Layout>
            </ProtectedRouteWrapper>
          </>
        } />
        <Route path="/scanner" element={
          <>
            <BackButton />
            <ProtectedRouteWrapper setHotelCtx={setHotelCtx}>
              <Layout currentPage="scan">
                <Scan
                  onBack={() => window.location.href = '/dashboard'}
                  onCapture={(data) => {
                    try { sessionStorage.setItem(OCR_SESSION_KEY, JSON.stringify(data)) } catch { /* quota */ }
                    setOcrData(data)
                    window.location.href = '/confirm'
                  }}
                />
              </Layout>
            </ProtectedRouteWrapper>
          </>
        } />

        <Route path="/confirm" element={
          <>
            <BackButton />
            <ProtectedRouteWrapper setHotelCtx={setHotelCtx}>
              <Layout currentPage="scan">
                <Confirm
                  data={ocrData}
                  onRestart={() => {
                    sessionStorage.removeItem(OCR_SESSION_KEY)
                    setOcrData(null)
                    window.location.href = '/scan'
                  }}
                  onConfirm={() => {
                    sessionStorage.removeItem(OCR_SESSION_KEY)
                    window.location.href = '/dashboard'
                  }}
                />
              </Layout>
            </ProtectedRouteWrapper>
          </>
        } />

        <Route path="/historique" element={
          <>
            <BackButton />
            <ProtectedRouteWrapper setHotelCtx={setHotelCtx}>
              <Layout currentPage="historique">
                <Historique />
              </Layout>
            </ProtectedRouteWrapper>
          </>
        } />

        <Route path="/fiches" element={
          <>
            <BackButton />
            <ProtectedRouteWrapper setHotelCtx={setHotelCtx}>
              <Layout currentPage="fiches">
                <FichesControle />
              </Layout>
            </ProtectedRouteWrapper>
          </>
        } />

        {/* Paramètres: employees are redirected back to dashboard */}
        <Route path="/parametres" element={
          <>
            <BackButton />
            <ProtectedRouteWrapper employeeRestricted setHotelCtx={setHotelCtx}>
              <Layout currentPage="parametres">
                <Parametres />
              </Layout>
            </ProtectedRouteWrapper>
          </>
        } />

        <Route path="/support" element={
          <>
            <BackButton />
            <ProtectedRouteWrapper setHotelCtx={setHotelCtx}>
              <Layout currentPage="support">
                <Support />
              </Layout>
            </ProtectedRouteWrapper>
          </>
        } />

        <Route path="/stats" element={
          <>
            <BackButton />
            <ProtectedRouteWrapper setHotelCtx={setHotelCtx}>
              <Stats />
            </ProtectedRouteWrapper>
          </>
        } />

        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HotelContext.Provider>
  )
}

export default function App() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {needRefresh && (
          <div style={{
            position: 'fixed',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e3a8a',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '12px',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
          }}>
            🔄 Mise à jour disponible
            <button
              onClick={() => updateServiceWorker(true)}
              style={{
                background: 'white',
                color: '#1e3a8a',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Mettre à jour
            </button>
          </div>
        )}
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
    </ErrorBoundary>
  )
}
