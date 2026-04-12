import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type RegisterProps = {
  onLoginClick: () => void
  onSubscribe?: () => void
}

export default function Register({ onLoginClick, onSubscribe: _onSubscribe }: RegisterProps) {
  const [hotelName, setHotelName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [country, setCountry] = useState('France')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

    setIsLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          hotel_name: hotelName,
          country,
        },
      },
    })
    setIsLoading(false)

    if (error) {
      setFeedback({ type: 'error', text: error.message })
      return
    }

    setFeedback({ type: 'success', text: 'Compte créé avec succès ! 🎉\nRedirection vers votre tableau de bord...' })
    
    // Rediriger vers Dashboard après 2 secondes
    setTimeout(() => {
      onLoginClick() // Simule une connexion réussie
    }, 2000)
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

          <div style={{textAlign:"center", marginBottom:"32px"}}>
            <h1 style={{color:"#1e3a8a", fontSize:"26px", fontWeight:"800", margin:"0 0 4px"}}>
              Check-in Express
            </h1>
            <p style={{color:"#4a90d9", fontSize:"14px", margin:0, fontWeight:"500"}}>
              Créer votre compte hôtel
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
                type="text"
                placeholder="Nom de votre hôtel"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
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
                type="email"
                placeholder="Email professionnel"
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
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

            <div style={{marginBottom:"24px"}}>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
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
              >
                <option value="France">France</option>
                <option value="Allemagne">Allemagne</option>
                <option value="Italie">Italie</option>
                <option value="Espagne">Espagne</option>
                <option value="Belgique">Belgique</option>
                <option value="Suisse">Suisse</option>
                <option value="Maroc">Maroc</option>
                <option value="Sénégal">Sénégal</option>
                <option value="Tunisie">Tunisie</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

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
