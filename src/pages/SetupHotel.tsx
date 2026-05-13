import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BackButton from '../components/BackButton'

export default function SetupHotel() {
  const navigate = useNavigate()
  const [hotelName, setHotelName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('Sénégal')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    // Vérifier si l'utilisateur est bien connecté et son email est confirmé
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !user.email_confirmed_at) {
        navigate('/')
        return
      }

      // Vérifier si l'hôtel existe déjà
      const { data: hotel } = await supabase
        .from('hotels')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (hotel) {
        navigate('/dashboard')
      }
    }

    checkAuth()
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFeedback(null)

    if (!hotelName.trim()) {
      setFeedback({ type: 'error', text: 'Le nom de l\'hôtel est obligatoire.' })
      return
    }

    if (!phone.trim()) {
      setFeedback({ type: 'error', text: 'Le numéro de téléphone est obligatoire.' })
      return
    }

    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Utilisateur non connecté')
      }

      // Créer l'hôtel avec essai de 7 jours
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const { error } = await supabase
        .from('hotels')
        .insert({
          user_id: user.id,
          hotel_name: hotelName.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
          city: city.trim() || null,
          country: country,
          trial_end: trialEnd.toISOString(),
          subscription_status: 'trial',
          created_at: new Date().toISOString()
        })
        .select()

      if (error) {
        throw error
      }

      setFeedback({ type: 'success', text: '✅ Hôtel enregistré avec succès ! Redirection vers le tableau de bord...' })
      
      // Rediriger vers le dashboard après 2 secondes
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)

    } catch (error: any) {
      setFeedback({ type: 'error', text: error.message || 'Une erreur est survenue lors de l\'enregistrement.' })
    } finally {
      setIsLoading(false)
    }
  }

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
          maxWidth: "480px",
          boxShadow: "0 20px 60px rgba(30,58,138,0.15)",
          border: "1px solid rgba(191,219,254,0.5)"
        }} className="sm:p-8 sm:mx-auto sm:max-w-md">
          <BackButton />

          {/* Logo centré */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/percepta-logo.png"
              alt="Check-in Express by Percepta"
              className="h-24 w-auto object-contain mx-auto mb-2"
            />
          </div>

          <div style={{textAlign:"center", marginBottom:"32px"}}>
            <h1 style={{color:"#1e3a8a", fontSize:"26px", fontWeight:"800", margin:"0 0 4px"}}>
              Configurez votre hôtel
            </h1>
            <p style={{color:"#4a90d9", fontSize:"16px", margin:0, fontWeight:"500"}}>
              Complétez vos informations pour commencer
            </p>
            <p style={{
              color: "#64748b",
              fontSize: "14px",
              margin: "8px 0 0"
            }}>
              🎁 7 jours d'essai gratuit • Sans engagement
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:"20px"}}>
              <label style={{
                display: "block",
                color: "#1e293b",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px"
              }}>
                Nom de l'hôtel *
              </label>
              <input
                type="text"
                placeholder="Nom de votre hôtel"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
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
              <label style={{
                display: "block",
                color: "#1e293b",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px"
              }}>
                Téléphone *
              </label>
              <input
                type="tel"
                placeholder="+221 33 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
              <label style={{
                display: "block",
                color: "#1e293b",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px"
              }}>
                Adresse
              </label>
              <input
                type="text"
                placeholder="123 Rue de la République"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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
              <label style={{
                display: "block",
                color: "#1e293b",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px"
              }}>
                Ville
              </label>
              <input
                type="text"
                placeholder="Dakar"
                value={city}
                onChange={(e) => setCity(e.target.value)}
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
              <label style={{
                display: "block",
                color: "#1e293b",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px"
              }}>
                Pays
              </label>
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
                <option value="Sénégal">Sénégal</option>
                <option value="France">France</option>
                <option value="Belgique">Belgique</option>
                <option value="Suisse">Suisse</option>
                <option value="Maroc">Maroc</option>
                <option value="Tunisie">Tunisie</option>
                <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                <option value="Mali">Mali</option>
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
                  Enregistrement...
                </span>
              ) : (
                'Enregistrer mon hôtel'
              )}
            </button>
          </form>

          {feedback && (
            <p
              style={{
                marginTop: "20px",
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
            padding: "12px 16px",
            marginTop: "24px",
            textAlign: "center"
          }}>
            <p style={{
              color: "#166534",
              fontSize: "13px",
              margin: 0
            }}>
              ✅ 7 jours d'essai gratuit<br />
              ✅ Accès complet à toutes les fonctionnalités<br />
              ✅ Annulation à tout moment<br />
              ✅ Support technique 7j/7
            </p>
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
