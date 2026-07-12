import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [mfaStep, setMfaStep]         = useState<'none' | 'verify'>('none')
  const [mfaCode, setMfaCode]         = useState('')
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaChallengeId, setMfaChallengeId] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFeedback(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      let errorMessage = 'Email ou mot de passe incorrect'

      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email ou mot de passe incorrect'
      } else if (error.message?.includes('User not found')) {
        errorMessage = 'Ce compte n\'existe pas ou a été supprimé'
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Veuillez d\'abord confirmer votre email avant de vous connecter'
      } else if (error.status === 400) {
        errorMessage = 'Identifiants invalides. Vérifiez votre email et mot de passe.'
      } else if (error.status === 422) {
        errorMessage = 'Ce compte a été désactivé ou supprimé. Contactez le support.'
      }

      setFeedback({ type: 'error', text: errorMessage })
      setIsLoading(false)
      return
    }

    if (data.session && !data.session.user.email_confirmed_at) {
      setFeedback({
        type: 'error',
        text: 'Veuillez d\'abord confirmer votre email avant de vous connecter.'
      })
      setIsLoading(false)
      return
    }

    if (data.session && data.session.user.email_confirmed_at) {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totpFactor = factors?.totp?.find(f => f.status === 'verified')
        if (totpFactor) {
          const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id })
          if (!challengeErr && challenge) {
            setMfaFactorId(totpFactor.id)
            setMfaChallengeId(challenge.id)
            setMfaStep('verify')
            setIsLoading(false)
            return
          }
        }
      }

      const isAdmin = data.session.user.user_metadata?.is_admin === true
      if (isAdmin) {
        navigate('/admin', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
      setIsLoading(false)
      return
    }

    setIsLoading(false)
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setFeedback({ type: 'error', text: 'Veuillez d\'abord entrer votre adresse email.' })
      return
    }

    setIsLoading(true)
    setFeedback(null)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      })

      if (error) {
        setFeedback({ type: 'error', text: 'Impossible d\'envoyer l\'email de confirmation.' })
      } else {
        setFeedback({
          type: 'success',
          text: `Email de confirmation renvoyé à ${email}. Vérifiez votre boîte de réception.`
        })
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Une erreur est survenue.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mfaCode.length !== 6) {
      setFeedback({ type: 'error', text: 'Le code doit contenir 6 chiffres.' })
      return
    }
    setIsLoading(true)
    setFeedback(null)

    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: mfaCode,
    })

    if (error) {
      setFeedback({ type: 'error', text: 'Code incorrect ou expiré. Réessayez.' })
      const { data: newChallenge } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (newChallenge) setMfaChallengeId(newChallenge.id)
      setMfaCode('')
      setIsLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const isAdmin = user?.user_metadata?.is_admin === true
    navigate(isAdmin ? '/admin' : '/dashboard', { replace: true })
    setIsLoading(false)
  }

  return (
    <div className="bg-hotel" style={{minHeight:"100vh"}}>
      <div className="bg-overlay" style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center"}}>

        <div style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(1px)",
          borderRadius: "20px",
          padding: "24px",
          width: "100%",
          margin: "16px",
          maxWidth: "420px",
          boxShadow: "0 20px 60px rgba(30,58,138,0.15)",
          border: "1px solid rgba(191,219,254,0.5)"
        }} className="sm:p-8 sm:mx-auto sm:max-w-md">

          <div className="flex flex-col items-center mb-4">
            <img
              src="/percepta-logo.png"
              alt="Check-in Express by Percepta"
              className="h-24 w-auto object-contain mx-auto mb-2"
            />
          </div>

          <div style={{textAlign:"center", marginBottom:"32px"}}>
            <h1 style={{color: "#1e3a8a", fontSize:"26px", fontWeight:"800", margin:"0 0 4px"}}>
              Check-in Express
            </h1>
            <p style={{color:"#4a90d9", fontSize:"14px", margin:0, fontWeight:"500"}}>
              by Percepta
            </p>
            <p style={{
              color: "#64748b",
              fontSize: "13px",
              margin: "8px 0 0",
              padding: "8px 16px",
              background: "rgba(30,58,138,0.06)",
              borderRadius: "20px",
              display: "inline-block"
            }}>
              ⚡ Check-in en 30 secondes chrono
            </p>
          </div>

          {mfaStep === 'none' ? (
            <form onSubmit={handleLogin}>
              <div style={{marginBottom:"16px"}}>
                <input
                  type="email"
                  placeholder="Email de l'hôtel"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    background: "rgba(232,244,253,0.60)",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    fontSize: "15px",
                    color: "#1e293b",
                    width: "100%",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#1e3a8a" }}
                  onBlur={(e) => { e.target.style.borderColor = "#bfdbfe" }}
                />
              </div>

              <div style={{marginBottom:"16px"}}>
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    background: "rgba(232,244,253,0.60)",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    fontSize: "15px",
                    color: "#1e293b",
                    width: "100%",
                    boxSizing: "border-box",
                    outline: "none"
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#1e3a8a" }}
                  onBlur={(e) => { e.target.style.borderColor = "#bfdbfe" }}
                />
              </div>

              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                color: "#64748b",
                cursor: "pointer",
                marginBottom: "24px"
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    border: "1px solid #bfdbfe",
                    backgroundColor: "white"
                  }}
                />
                Se souvenir de moi
              </label>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  background: "linear-gradient(135deg, #1e3a8a, #4a90d9)",
                  color: "white",
                  borderRadius: "10px",
                  padding: "14px",
                  fontWeight: "700",
                  boxShadow: "0 4px 16px rgba(30,58,138,0.3)",
                  width: "100%",
                  border: "none",
                  fontSize: "15px",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
              >
                {isLoading ? (
                  <span style={{display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}>
                    <span style={{
                      display: "inline-block",
                      width: "16px",
                      height: "16px",
                      border: "2px solid white",
                      borderTop: "2px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }}></span>
                    Connexion...
                  </span>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>
          ) : (
            <>
              <p style={{
                textAlign: "center",
                color: "#64748b",
                fontSize: "14px",
                marginBottom: "20px",
                lineHeight: "1.6"
              }}>
                🔐 Entrez le code à 6 chiffres généré par <strong>Google Authenticator</strong> ou <strong>Authy</strong>.
              </p>
              <form onSubmit={handleMfaVerify}>
                <div style={{marginBottom: "16px"}}>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    style={{
                      background: "rgba(232,244,253,0.60)",
                      border: "1.5px solid #bfdbfe",
                      borderRadius: "10px",
                      padding: "16px",
                      fontSize: "28px",
                      letterSpacing: "0.4em",
                      color: "#1e293b",
                      width: "100%",
                      boxSizing: "border-box",
                      outline: "none",
                      textAlign: "center"
                    }}
                    onFocus={e => { e.target.style.borderColor = "#1e3a8a" }}
                    onBlur={e => { e.target.style.borderColor = "#bfdbfe" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || mfaCode.length !== 6}
                  style={{
                    background: isLoading || mfaCode.length !== 6
                      ? "#94a3b8"
                      : "linear-gradient(135deg, #1e3a8a, #4a90d9)",
                    color: "white",
                    borderRadius: "10px",
                    padding: "14px",
                    fontWeight: "700",
                    width: "100%",
                    border: "none",
                    fontSize: "15px",
                    cursor: isLoading || mfaCode.length !== 6 ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease"
                  }}
                >
                  {isLoading ? 'Vérification...' : 'Vérifier le code'}
                </button>
              </form>
            </>
          )}

          {feedback && (
            <p
              style={{
                marginTop: "16px",
                fontSize: "14px",
                textAlign: "center",
                color: feedback.type === 'success' ? '#16a34a' : '#dc2626',
                marginBottom: "12px"
              }}
            >
              {feedback.text}
            </p>
          )}

          {mfaStep === 'none' && feedback && feedback.type === 'error' && feedback.text.includes('confirmer votre email') && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={isLoading}
              style={{
                background: "transparent",
                color: "#1e3a8a",
                border: "1px solid #1e3a8a",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                width: "100%",
                marginTop: "8px"
              }}
              className="hover:bg-blue-800 hover:text-white"
            >
              {isLoading ? 'Envoi en cours...' : 'Renvoyer l\'email de confirmation'}
            </button>
          )}

          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid #e2e8f0"
          }}>
            <span style={{color: "#64748b", fontSize:"12px"}}>🔒 Sécurisé</span>
            <span style={{color: "#64748b", fontSize:"12px"}}>🇪🇺 RGPD</span>
            <span style={{color: "#64748b", fontSize:"12px"}}>⚡ Rapide</span>
          </div>

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
