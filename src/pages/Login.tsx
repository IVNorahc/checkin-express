import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

type LoginProps = {
  onRegisterClick: () => void
}

export default function Login({ onRegisterClick }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFeedback(null)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      // Vérifier si l'erreur est due à une email non confirmé
      if (error.message.includes('Email not confirmed') || error.message.includes('Invalid login')) {
        setFeedback({ type: 'error', text: 'Veuillez confirmer votre email avant de vous connecter.' })
      } else {
        setFeedback({ type: 'error', text: 'Email ou mot de passe incorrect' })
      }
      setIsLoading(false)
      return
    }
    
    if (data.session) {
      window.location.href = '/dashboard'
    }
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
                onFocus={(e) => {
                  e.target.style.borderColor = "#1e3a8a"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#bfdbfe"
                }}
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

          {feedback && (
            <p
              style={{
                marginTop: "16px",
                fontSize: "14px",
                textAlign: "center",
                color: feedback.type === 'success' ? '#16a34a' : '#dc2626'
              }}
            >
              {feedback.text}
            </p>
          )}

          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid #e2e8f0"
          }}>
            <span style={{color:"#64748b", fontSize:"12px"}}>
              🔒 Sécurisé
            </span>
            <span style={{color:"#64748b", fontSize:"12px"}}>
              🇪🇺 RGPD
            </span>
            <span style={{color:"#64748b", fontSize:"12px"}}>
              ⚡ Rapide
            </span>
          </div>

          <div style={{textAlign: "center", marginTop: "16px"}}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                onRegisterClick()
              }}
              style={{
                color: "#4a90d9",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none"
              }}
            >
              Pas encore de compte ? S'inscrire
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
