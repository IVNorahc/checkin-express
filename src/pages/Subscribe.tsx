import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface SubscribeProps {
  onBack?: () => void;
  showWelcome?: boolean;
}

export default function Subscribe({ onBack, showWelcome }: SubscribeProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showRefresh, setShowRefresh] = useState(false);

  const LEMON_URL = "https://checkin-express.lemonsqueezy.com/checkout/buy/00847c55-3cff-475c-8c02-0c31c2b3cb02";

  const handlePlan = (plan: string) => {
    setLoading(plan);
    setTimeout(() => {
      window.open(LEMON_URL, "_blank");
      setLoading(null);
      setShowRefresh(true);
    }, 1000);
  };

  const handleRefresh = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", data.session.user.id)
        .single();
      if (profile?.status === "active" && onBack) {
        onBack();
      } else {
        alert("Paiement non détecté. Réessayez dans quelques secondes.");
      }
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: "url('/hotel-bg.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed"
    }}>
      <div style={{
        minHeight: "100vh",
        background: "rgba(232,244,253,0.60)",
        backdropFilter: "blur(1px)",
        padding: "16px 16px"
      }} className="min-h-screen w-full px-4 py-4 overflow-x-hidden">
        <div style={{maxWidth: "1200px", margin: "0 auto"}}>
          {/* En-tête */}
          <div style={{textAlign: "center", marginBottom: "24px"}}>
            <div className="flex justify-center mb-4">
              <img 
                src="/percepta-logo.png" 
                alt="Percepta"
                className="h-12 w-auto object-contain"
              />
            </div>
            <h1 style={{color: "#1e3a8a", fontSize: "32px", fontWeight: "800", margin: "0 0 16px"}}>
              Choisissez votre formule
            </h1>
            <p style={{color: "#64748b", fontSize: "16px", margin: 0}}>
              Sans engagement - Annulation à tout moment
            </p>
          </div>

          {/* Bannière de bienvenue */}
          {showWelcome && (
            <div style={{
              marginBottom: "16px",
              background: "rgba(30,58,138,0.15)",
              backdropFilter: "blur(1px)",
              border: "1px solid rgba(134,239,172,0.5)",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
              maxWidth: "600px",
              margin: "0 auto 16px"
            }}>
              <p style={{color: "#166534", fontWeight: "600", margin: 0}}>
                Votre compte a été créé avec succès ! Complétez votre inscription.
              </p>
            </div>
          )}

          {/* Message de paiement */}
          {showRefresh && (
            <div style={{
              marginBottom: "16px",
              background: "rgba(219,234,254,0.9)",
              backdropFilter: "blur(1px)",
              border: "1px solid rgba(147,197,253,0.5)",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
              maxWidth: "600px",
              margin: "0 auto 16px"
            }}>
              <p style={{color: "#1e3a8a", fontWeight: "600", marginBottom: "16px"}}>
                Une fois votre paiement effectué, cliquez ci-dessous.
              </p>
              <button
                onClick={handleRefresh}
                style={{
                  background: "linear-gradient(135deg, #1e3a8a, #4a90d9)",
                  color: "white",
                  borderRadius: "10px",
                  padding: "12px 24px",
                  fontWeight: "600",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Actualiser mon accès
              </button>
            </div>
          )}

          {/* Social Proof */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "32px",
            marginBottom: "16px",
            flexWrap: "wrap"
          }}>
            <div style={{textAlign: "center"}}>
              <p style={{
                color: "#1e3a8a",
                fontSize: "28px",
                fontWeight: "800",
                margin: "0 0 4px"
              }}>30s</p>
              <p style={{
                color: "#64748b",
                fontSize: "13px",
                margin: 0
              }}>Temps de check-in</p>
            </div>
            <div style={{textAlign: "center"}}>
              <p style={{
                color: "#1e3a8a",
                fontSize: "28px",
                fontWeight: "800",
                margin: "0 0 4px"
              }}>100%</p>
              <p style={{
                color: "#64748b",
                fontSize: "13px",
                margin: 0
              }}>Conforme RGPD</p>
            </div>
            <div style={{textAlign: "center"}}>
              <p style={{
                color: "#1e3a8a",
                fontSize: "28px",
                fontWeight: "800",
                margin: "0 0 4px"
              }}>7j</p>
              <p style={{
                color: "#64748b",
                fontSize: "13px",
                margin: 0
              }}>Essai gratuit</p>
            </div>
            <div style={{textAlign: "center"}}>
              <p style={{
                color: "#1e3a8a",
                fontSize: "28px",
                fontWeight: "800",
                margin: "0 0 4px"
              }}>0€</p>
              <p style={{
                color: "#64748b",
                fontSize: "13px",
                margin: 0
              }}>Sans engagement</p>
            </div>
          </div>

          {/* Cartes de tarification */}
          <div className="flex flex-col md:flex-row gap-8 justify-center items-center max-w-5xl mx-auto px-4 w-full mt-8">
            
            {/* STARTER */}
            <div style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(1px)",
              border: "2px solid rgba(191,219,254,0.5)",
              borderRadius: "20px",
              boxShadow: "0 8px 32px rgba(30,58,138,0.1)",
              padding: "24px",
              display: "flex",
              flexDirection: "column"
            }} className="w-full max-w-sm mx-auto flex-1">
              <div style={{textAlign: "center", flex: 1}}>
                <h3 style={{color: "#1e3a8a", fontSize: "24px", fontWeight: "bold", marginBottom: "8px"}}>
                  Starter
                </h3>
                <p style={{color: "#64748b", marginBottom: "16px"}}>
                  Idéal pour les petits hôtels
                </p>
                
                <div style={{fontSize: "32px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "16px"}}>
                  49,99?
                  <span style={{fontSize: "14px", fontWeight: "normal"}}>/mois</span>
                </div>
                
                <ul style={{listStyle: "none", padding: 0, margin: "0 0 16px", textAlign: "left"}}>
                  {[
                    "200 scans inclus/mois",
                    "Fiches de police PDF", 
                    "Signature électronique",
                    "Historique clients",
                    "Support email"
                  ].map((feature) => (
                    <li key={feature} style={{
                      color: "#1e293b", 
                      fontSize: "14px", 
                      padding: "6px 0",
                      borderBottom: "1px solid rgba(191,219,254,0.3)",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <span style={{color: "#16a34a", marginRight: "8px", fontSize: "16px"}}>?</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handlePlan("starter")}
                  disabled={loading === "starter"}
                  style={{
                    background: "linear-gradient(135deg, #1e3a8a, #4a90d9)",
                    color: "white",
                    borderRadius: "12px",
                    padding: "16px",
                    fontWeight: "700",
                    boxShadow: "0 4px 16px rgba(30,58,138,0.3)",
                    border: "none",
                    fontSize: "16px",
                    cursor: "pointer",
                    width: "100%",
                    opacity: loading === "starter" ? 0.7 : 1
                  }}
                >
                  {loading === "starter" ? "Redirection..." : "Choisir Starter"}
                </button>
                
                <p style={{fontSize: "12px", color: "#94a3b8", marginTop: "12px", textAlign: "center"}}>
                  0,25€/scan au-delà de 200
                </p>
              </div>
            </div>

            {/* BUSINESS */}
            <div style={{
              background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
              border: "2px solid #4a90d9",
              borderRadius: "20px",
              boxShadow: "0 16px 48px rgba(30,58,138,0.4)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              transform: "scale(1.05)",
              maxHeight: "75vh",
              overflowY: "auto"
            }} className="w-full max-w-sm mx-auto flex-1">
              <div className="flex justify-center w-full mb-3">
                <span className="bg-yellow-400 text-blue-900 font-bold px-4 py-2 rounded-full text-sm">
                  ? Plus populaire
                </span>
              </div>
              
              <div style={{textAlign: "center", flex: 1}}>
                <h3 style={{color: "white", fontSize: "24px", fontWeight: "bold", marginBottom: "8px"}}>
                  Business
                </h3>
                <p style={{color: "#bfdbfe", marginBottom: "16px"}}>
                  Pour les hôtels actifs
                </p>
                
                <div style={{fontSize: "32px", fontWeight: "bold", color: "white", marginBottom: "16px"}}>
                  89,99€
                  <span style={{fontSize: "14px", fontWeight: "normal"}}>/mois</span>
                </div>
                
                <ul style={{listStyle: "none", padding: 0, margin: "0 0 16px", textAlign: "left"}}>
                  {[
                    "500 scans inclus/mois",
                    "Fiches de police PDF", 
                    "Signature électronique",
                    "Historique clients",
                    "Support prioritaire",
                    "0,25€/scan supplémentaire",
                    "Dashboard statistiques"
                  ].map((feature) => (
                    <li key={feature} style={{
                      color: "#bfdbfe", 
                      fontSize: "14px", 
                      padding: "6px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <span style={{color: "#facc15", marginRight: "8px", fontSize: "16px"}}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handlePlan("business")}
                  disabled={loading === "business"}
                  style={{
                    background: "white",
                    color: "#1e3a8a",
                    borderRadius: "12px",
                    padding: "16px",
                    fontWeight: "700",
                    border: "none",
                    fontSize: "16px",
                    cursor: "pointer",
                    width: "100%",
                    opacity: loading === "business" ? 0.7 : 1
                  }}
                >
                  {loading === "business" ? "Redirection..." : "Choisir Business"}
                </button>
                
                <p style={{fontSize: "12px", color: "#bfdbfe", marginTop: "12px", textAlign: "center"}}>
                  0,25€/scan au-delà de 500
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{textAlign: "center", fontSize: "14px", color: "#64748b", lineHeight: "1.6"}}>
            <p>🔒 Paiement sécurisé via Lemon Squeezy</p>
            <p>Annulation à tout moment • Sans engagement</p>
            <p>
              Des questions ?{" "}
              <a href="mailto:contact@percepta.io" style={{color: "#4a90d9", textDecoration: "none"}}>
                contact@percepta.io
              </a>
            </p>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4a90d9",
                  cursor: "pointer",
                  textDecoration: "underline",
                  marginTop: "8px",
                  fontSize: "14px",
                  fontWeight: "600"
                }}
              >
                Essayer gratuitement 7 jours →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
