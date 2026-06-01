import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type RegisterProps = {
  onLoginClick: () => void
}

export default function Register({ onLoginClick }: RegisterProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFeedback(null)

    if (password !== confirmPassword) {
      setFeedback({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }

    if (password.length < 8) {
      setFeedback({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' })
      return
    }

    if (!/[A-Z]/.test(password)) {
      setFeedback({ type: 'error', text: 'Le mot de passe doit contenir au moins une lettre majuscule.' })
      return
    }

    if (!/[0-9]/.test(password)) {
      setFeedback({ type: 'error', text: 'Le mot de passe doit contenir au moins un chiffre.' })
      return
    }

    if (!acceptedTerms) {
      setFeedback({ type: 'error', text: 'Vous devez accepter les CGU et la politique de confidentialité pour continuer.' })
      return
    }

    setIsLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: 'https://checkinexpress.app/confirm-email'
      }
    })
    setIsLoading(false)

    if (error) {
      setFeedback({ type: 'error', text: error.message })
      return
    }

    // Afficher l'écran de confirmation
    setShowConfirmation(true)
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
          
          {/* Logo centré */}
          <div className="flex flex-col items-center mb-4">
            <img
              src="/percepta-logo.png"
              alt="Check-in Express by Percepta"
              className="h-24 w-auto object-contain mx-auto mb-2"
            />
          </div>

          {showConfirmation ? (
            // Écran de confirmation
            <div style={{textAlign: "center"}}>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 style={{color: "#1e3a8a", fontSize: "24px", fontWeight: "700", marginBottom: "16px"}}>
                Email de confirmation envoyé !
              </h2>
              <p style={{color: "#64748b", fontSize: "16px", marginBottom: "24px", lineHeight: "1.5"}}>
                Un email de confirmation vous a été envoyé à <strong>{email}</strong>.<br />
                Cliquez sur le lien dans l'email pour activer votre compte.
              </p>
              <div style={{
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "24px"
              }}>
                <p style={{color: "#1e40af", fontSize: "14px", margin: 0, textAlign: "left"}}>
                  📧 Vérifiez votre boîte de réception<br />
                  ⏰ Le lien est valable 24 heures<br />
                  🔄 Pensez à vérifier vos spams
                </p>
              </div>
              <button
                onClick={onLoginClick}
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
                Retour à la connexion
              </button>
            </div>
          ) : (
            // Formulaire d'inscription
            <>
              <div style={{textAlign:"center", marginBottom:"32px"}}>
                <h1 style={{color:"#1e3a8a", fontSize:"26px", fontWeight:"800", margin:"0 0 4px"}}>
                  Check-in Express
                </h1>
                <p style={{color:"#4a90d9", fontSize:"14px", margin:0, fontWeight:"500"}}>
                  Créer votre compte
                </p>
                <p style={{
                  color: "#64748b",
                  fontSize: "13px",
                  margin: "8px 0 0"
                }}>
                  Essai gratuit 7 jours - Sans carte bancaire
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{marginBottom:"16px"}}>
                  <input
                    type="email"
                    placeholder="Email professionnel"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
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
                    onFocus={(e) => {
                      e.target.style.borderColor = "#1e3a8a"
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#bfdbfe"
                    }}
                  />
                </div>

                <div style={{marginBottom:"16px"}}>
                  <input
                    type="password"
                    placeholder="Mot de passe (min. 8 caractères)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                    onFocus={(e) => {
                      e.target.style.borderColor = "#1e3a8a"
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#bfdbfe"
                    }}
                  />
                </div>

                <div style={{marginBottom:"20px"}}>
                  <input
                    type="password"
                    placeholder="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
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
                    onFocus={(e) => {
                      e.target.style.borderColor = "#1e3a8a"
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#bfdbfe"
                    }}
                  />
                </div>

                {/* Case à cocher CGU obligatoire */}
                <div style={{
                  marginBottom: "16px",
                  padding: "12px 14px",
                  background: acceptedTerms ? "rgba(22,163,74,0.06)" : "rgba(232,244,253,0.60)",
                  border: `1.5px solid ${acceptedTerms ? "rgba(22,163,74,0.3)" : "#bfdbfe"}`,
                  borderRadius: "10px",
                }}>
                  <label style={{display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer"}}>
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      style={{
                        marginTop: "2px",
                        width: "16px",
                        height: "16px",
                        accentColor: "#1e3a8a",
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                    />
                    <span style={{fontSize: "13px", color: "#334155", lineHeight: "1.4"}}>
                      J'ai lu et j'accepte les{' '}
                      <a
                        href="/cgu"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{color: "#1e3a8a", fontWeight: "600", textDecoration: "underline"}}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Conditions Générales d'Utilisation
                      </a>
                      {' '}et la{' '}
                      <a
                        href="/confidentialite"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{color: "#1e3a8a", fontWeight: "600", textDecoration: "underline"}}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Politique de Confidentialité
                      </a>
                      , y compris le traitement de données à caractère personnel.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !acceptedTerms}
                  style={{
                    background: (!acceptedTerms || isLoading) ? "#94a3b8" : "linear-gradient(135deg, #1e3a8a, #4a90d9)",
                    color: "white",
                    borderRadius: "10px",
                    padding: "14px",
                    fontWeight: "700",
                    boxShadow: (!acceptedTerms || isLoading) ? "none" : "0 4px 16px rgba(30,58,138,0.3)",
                    width: "100%",
                    border: "none",
                    fontSize: "15px",
                    cursor: (!acceptedTerms || isLoading) ? "not-allowed" : "pointer",
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
                      Création...
                    </span>
                  ) : (
                    'Créer mon compte'
                  )}
                </button>
              </form>

              {feedback && (
                <p
                  style={{
                    marginTop: "16px",
                    fontSize: "14px",
                    textAlign: "center",
                    color: feedback.type === 'success' ? '#16a34a' : '#dc2626',
                    whiteSpace: "pre-line"
                  }}
                >
                  {feedback.text}
                </p>
              )}

              <div style={{
                background: "rgba(22,163,74,0.08)",
                border: "1px solid rgba(22,163,74,0.2)",
                borderRadius: "10px",
                padding: "10px 16px",
                marginTop: "16px",
                textAlign: "center"
              }}>
                <p style={{
                  color: "#166534",
                  fontSize: "12px",
                  margin: 0
                }}>
                  ✅ 7 jours d'essai gratuit
                  ✅ Aucune carte requise
                  ✅ Annulation à tout moment
                </p>
              </div>
            </>
          )}

          <div style={{textAlign: "center", marginTop: "16px"}}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                onLoginClick()
              }}
              style={{
                color: "#4a90d9",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none"
              }}
            >
              Déjà un compte ? Se connecter
            </a>
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
