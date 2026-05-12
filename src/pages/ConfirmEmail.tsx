import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token')
      
      if (!token) {
        setStatus('error')
        setMessage('Token de confirmation manquant.')
        return
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token,
          type: 'signup',
          email: searchParams.get('email') || ''
        })

        if (error) {
          setStatus('error')
          setMessage('Lien de confirmation invalide ou expiré.')
          console.error('Email confirmation error:', error)
        } else {
          setStatus('success')
          setMessage('Email confirmé avec succès ! Redirection...')
          
          // Rediriger vers setup-hotel après 2 secondes
          setTimeout(() => {
            navigate('/setup-hotel')
          }, 2000)
        }
      } catch (err) {
        setStatus('error')
        setMessage('Une erreur est survenue lors de la confirmation.')
        console.error('Confirmation error:', err)
      }
    }

    confirmEmail()
  }, [searchParams, navigate])

  return (
    <div className="bg-hotel" style={{minHeight:"100vh"}}>
      <div className="bg-overlay" style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>
        
        <div style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(1px)",
          borderRadius: "20px",
          padding: "32px",
          width: "100%",
          margin: "16px",
          maxWidth: "420px",
          boxShadow: "0 20px 60px rgba(30,58,138,0.15)",
          border: "1px solid rgba(191,219,254,0.5)"
        }} className="sm:p-8 sm:mx-auto sm:max-w-md">
          
          {/* Logo centré */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/percepta-logo.png"
              alt="Check-in Express by Percepta"
              className="h-24 w-auto object-contain mx-auto mb-2"
            />
          </div>

          <div style={{textAlign: "center"}}>
            {status === 'loading' && (
              <>
                <div style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: "rgba(30,58,138,0.1)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px"
                }}>
                  <svg style={{width: "30px", height: "30px", color: "#1e3a8a"}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9.416a8.001 8.001 0 00-7.416 5m0 0V9a8 8 0 008 8h4.416a8 8 0 008-8V4.416m0 0L4 4m0 0l5.586 5.586a2 2 0 002.828 0L4 16m0 0l5.586-5.586a2 2 0 002.828 0L4 4" />
                  </svg>
                </div>
                <h2 style={{color: "#1e3a8a", fontSize: "20px", fontWeight: "700", marginBottom: "16px"}}>
                  Confirmation de votre email
                </h2>
                <p style={{color: "#64748b", fontSize: "16px", marginBottom: "24px"}}>
                  Veuillez patienter pendant que nous confirmons votre adresse email...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "rgba(34,197,94,0.1)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px"
                }}>
                  <svg style={{width: "40px", height: "40px", color: "#22c55e"}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 style={{color: "#16a34a", fontSize: "24px", fontWeight: "700", marginBottom: "16px"}}>
                  Email confirmé ! 🎉
                </h2>
                <p style={{color: "#64748b", fontSize: "16px", marginBottom: "24px"}}>
                  {message}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "rgba(239,68,68,0.1)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px"
                }}>
                  <svg style={{width: "40px", height: "40px", color: "#dc2626"}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l-2 2m2-2H8a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2v-8a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <h2 style={{color: "#dc2626", fontSize: "24px", fontWeight: "700", marginBottom: "16px"}}>
                  Erreur de confirmation
                </h2>
                <p style={{color: "#64748b", fontSize: "16px", marginBottom: "24px"}}>
                  {message}
                </p>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    background: "linear-gradient(135deg, #1e3a8a, #4a90d9)",
                    color: "white",
                    borderRadius: "10px",
                    padding: "14px 24px",
                    fontWeight: "700",
                    boxShadow: "0 4px 16px rgba(30,58,138,0.3)",
                    border: "none",
                    fontSize: "15px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    width: "100%"
                  }}
                >
                  Retour à l'accueil
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
