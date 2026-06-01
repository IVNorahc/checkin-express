import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BackButton from '../components/BackButton'

const ConfirmEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const confirmEmail = async () => {
      // Vérifie le hash URL (Supabase utilise souvent #access_token=...)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      // Ou les query params
      const token = searchParams.get('token')
      const tokenHash = searchParams.get('token_hash')
      const queryType = searchParams.get('type')

      try {
        // Cas 1 : access_token dans le hash
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          if (error) throw error
          setStatus('success')
          setTimeout(() => navigate('/setup-hotel'), 1500)
          return
        }

        // Cas 2 : token_hash dans la query
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email'
          })
          if (error) throw error
          setStatus('success')
          setTimeout(() => navigate('/setup-hotel'), 1500)
          return
        }

        // Cas 3 : token classique dans query params
        if (token) {
          const { error } = await supabase.auth.verifyOtp({
            token,
            type: (queryType as any) || 'signup',
            email: searchParams.get('email') || ''
          })
          if (error) throw error
          setStatus('success')
          setTimeout(() => navigate('/setup-hotel'), 1500)
          return
        }

        // Aucun token trouvé dans l'URL — Supabase PKCE a peut-être déjà échangé
        // le code automatiquement (detectSessionInUrl: true). Vérifier la session.
        const { data: { session: existingSession } } = await supabase.auth.getSession()
        if (existingSession?.user?.email_confirmed_at) {
          setStatus('success')
          setTimeout(() => navigate('/setup-hotel'), 1500)
          return
        }

        setStatus('error')
        setErrorMsg('Lien de confirmation invalide ou expiré')

      } catch (err: any) {
        console.error('Erreur confirmation:', err)
        setStatus('error')
        setErrorMsg(err?.message || 'Erreur lors de la confirmation')
      }
    }

    confirmEmail()
  }, [])

  return (
    <div className="bg-hotel" style={{minHeight:"100vh"}}>
      <div className="bg-overlay" style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>
        
        <div style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(1px)",
          borderRadius: "20px",
          padding: "32px",
          width: "100%",
          maxWidth: "400px",
          margin: "16px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(30,58,138,0.15)"
        }}>
          <div style={{ textAlign: 'left' }}>
            <BackButton />
          </div>
          {status === 'loading' && (
            <>
              <div style={{
                width: "60px",
                height: "60px",
                border: "4px solid #bfdbfe",
                borderTop: "4px solid #1e3a8a",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 24px"
              }}></div>
              <h2 style={{
                color: "#1e3a8a",
                fontWeight: "800",
                margin: "0 0 8px"
              }}>Confirmation en cours...</h2>
              <p style={{
                color: "#64748b",
                margin: "0"
              }}>Veuillez patienter pendant que nous confirmons votre email.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{
                fontSize: "60px",
                marginBottom: "24px"
              }}>✅</div>
              <h2 style={{
                color: "#16a34a",
                fontWeight: "800",
                margin: "0 0 8px"
              }}>Email confirmé !</h2>
              <p style={{
                color: "#16a34a",
                margin: "0"
              }}>Redirection vers la configuration de votre hôtel...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{
                fontSize: "60px",
                marginBottom: "24px"
              }}>❌</div>
              <h2 style={{
                color: "#dc2626",
                fontWeight: "800",
                margin: "0 0 8px"
              }}>Erreur de confirmation</h2>
              <p style={{
                color: "#dc2626",
                margin: "0 0 24px"
              }}>{errorMsg}</p>
              <button
                onClick={() => window.location.href = '/login'}
                style={{
                  background: "linear-gradient(135deg, #1e3a8a, #4a90d9)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 16px rgba(30,58,138,0.3)"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)"
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(30,58,138,0.4)"
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(30,58,138,0.3)"
                }}
              >
                Retour à la connexion
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default ConfirmEmail
