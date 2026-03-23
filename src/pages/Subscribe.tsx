import { useState } from "react";
import { supabase } from "../lib/supabase";

interface SubscribeProps {
  onBack?: () => void;
  showWelcome?: boolean;
}

export default function Subscribe({ onBack, showWelcome }: SubscribeProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showRefresh, setShowRefresh] = useState(false);

  const LEMON_URL = "VOTRE_LIEN_LEMON_SQUEEZY";

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

  const starterFeatures = [
    { text: "200 scans inclus/mois", ok: true },
    { text: "Fiches de police PDF", ok: true },
    { text: "Signature électronique", ok: true },
    { text: "Historique clients", ok: true },
    { text: "Support email", ok: true },
    { text: "Support prioritaire", ok: false },
    { text: "Multi-utilisateurs", ok: false },
  ];

  const businessFeatures = [
    { text: "500 scans inclus/mois", ok: true },
    { text: "Fiches de police PDF", ok: true },
    { text: "Signature électronique", ok: true },
    { text: "Historique clients", ok: true },
    { text: "Support prioritaire", ok: true },
    { text: "0,25€/scan supplémentaire", ok: true },
    { text: "Dashboard statistiques", ok: true },
  ];

  const enterpriseFeatures = [
    { text: "Scans ILLIMITÉS", ok: true },
    { text: "Fiches de police PDF", ok: true },
    { text: "Signature électronique", ok: true },
    { text: "Historique illimité", ok: true },
    { text: "Support 24/7 prioritaire", ok: true },
    { text: "Onboarding personnalisé", ok: true },
    { text: "Multi-utilisateurs", ok: true },
    { text: "Accès API", ok: true },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "24px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ width: "64px", height: "64px", background: "#1e3a8a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "28px" }}>
          🏨
        </div>
        <h1 style={{ color: "#1e3a8a", fontSize: "28px", fontWeight: "bold", margin: "0 0 8px" }}>
          Choisissez votre formule
        </h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Sans engagement • Annulation à tout moment
        </p>
      </div>

      {showWelcome && (
        <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", padding: "12px 16px", marginBottom: "24px", maxWidth: "900px", margin: "0 auto 24px" }}>
          <p style={{ color: "#166534", fontWeight: "bold", margin: 0 }}>
            ✅ Votre compte a été créé avec succès ! Complétez votre inscription.
          </p>
        </div>
      )}

      {showRefresh && (
        <div style={{ background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: "8px", padding: "16px", marginBottom: "24px", maxWidth: "900px", margin: "0 auto 24px", textAlign: "center" }}>
          <p style={{ color: "#1e3a8a", margin: "0 0 12px" }}>
            ✅ Une fois votre paiement effectué, cliquez ci-dessous.
          </p>
          <button
            onClick={handleRefresh}
            style={{ background: "#1e3a8a", color: "white", border: "none", borderRadius: "8px", padding: "10px 24px", cursor: "pointer", fontWeight: "bold" }}
          >
            ✅ Actualiser mon accès
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", justifyContent: "center", maxWidth: "1100px", margin: "0 auto 40px" }}>

        {/* STARTER */}
        <div style={{ background: "white", border: "2px solid #e2e8f0", borderRadius: "16px", padding: "32px 24px", width: "300px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h2 style={{ color: "#1e3a8a", fontSize: "22px", fontWeight: "bold", margin: "0 0 4px" }}>Starter</h2>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 20px" }}>Idéal pour les petits hôtels</p>
          <div style={{ marginBottom: "24px" }}>
            <span style={{ color: "#1e3a8a", fontSize: "36px", fontWeight: "bold" }}>49,99€</span>
            <span style={{ color: "#64748b" }}>/mois</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
            {starterFeatures.map((f) => (
              <li key={f.text} style={{ color: f.ok ? "#475569" : "#94a3b8", fontSize: "14px", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: f.ok ? "#16a34a" : "#cbd5e1", marginRight: "8px" }}>
                  {f.ok ? "✓" : "✗"}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handlePlan("starter")}
            disabled={loading === "starter"}
            style={{ width: "100%", background: "#1e3a8a", color: "white", border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: "bold", cursor: "pointer" }}
          >
            {loading === "starter" ? "Redirection..." : "Choisir Starter"}
          </button>
          <p style={{ color: "#94a3b8", fontSize: "12px", textAlign: "center", margin: "12px 0 0" }}>
            0,25€/scan au-delà de 200
          </p>
        </div>

        {/* BUSINESS */}
        <div style={{ background: "#1e3a8a", border: "2px solid #1e3a8a", borderRadius: "16px", padding: "32px 24px", width: "300px", boxShadow: "0 8px 24px rgba(30,58,138,0.3)", position: "relative" }}>
          <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#facc15", color: "#1e3a8a", padding: "4px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap" }}>
            ⭐ Plus populaire
          </div>
          <h2 style={{ color: "white", fontSize: "22px", fontWeight: "bold", margin: "0 0 4px" }}>Business</h2>
          <p style={{ color: "#93c5fd", fontSize: "14px", margin: "0 0 20px" }}>Pour les hôtels actifs</p>
          <div style={{ marginBottom: "24px" }}>
            <span style={{ color: "white", fontSize: "36px", fontWeight: "bold" }}>89,99€</span>
            <span style={{ color: "#93c5fd" }}>/mois</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
            {businessFeatures.map((f) => (
              <li key={f.text} style={{ color: "#bfdbfe", fontSize: "14px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ color: "#facc15", marginRight: "8px" }}>✓</span>
                {f.text}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handlePlan("business")}
            disabled={loading === "business"}
            style={{ width: "100%", background: "white", color: "#1e3a8a", border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: "bold", cursor: "pointer" }}
          >
            {loading === "business" ? "Redirection..." : "Choisir Business"}
          </button>
          <p style={{ color: "#93c5fd", fontSize: "12px", textAlign: "center", margin: "12px 0 0" }}>
            0,25€/scan au-delà de 500
          </p>
        </div>

        {/* ENTERPRISE */}
        <div style={{ background: "white", border: "2px solid #e2e8f0", borderRadius: "16px", padding: "32px 24px", width: "300px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "relative" }}>
          <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#ede9fe", color: "#7c3aed", padding: "4px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap" }}>
            🏆 Tout illimité
          </div>
          <h2 style={{ color: "#1e3a8a", fontSize: "22px", fontWeight: "bold", margin: "0 0 4px" }}>Enterprise</h2>
          <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 20px" }}>Pour les grandes structures</p>
          <div style={{ marginBottom: "24px" }}>
            <span style={{ color: "#1e3a8a", fontSize: "36px", fontWeight: "bold" }}>149,99€</span>
            <span style={{ color: "#64748b" }}>/mois</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
            {enterpriseFeatures.map((f) => (
              <li key={f.text} style={{ color: "#475569", fontSize: "14px", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#16a34a", marginRight: "8px" }}>✓</span>
                {f.text}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handlePlan("enterprise")}
            disabled={loading === "enterprise"}
            style={{ width: "100%", background: "#1e3a8a", color: "white", border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: "bold", cursor: "pointer" }}
          >
            {loading === "enterprise" ? "Redirection..." : "Choisir Enterprise"}
          </button>
          <p style={{ color: "#94a3b8", fontSize: "12px", textAlign: "center", margin: "12px 0 0" }}>
            Aucun frais supplémentaire
          </p>
        </div>

      </div>

      <div style={{ textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        <p>🔒 Paiement sécurisé via Lemon Squeezy</p>
        <p>Annulation à tout moment • Sans engagement</p>
        <p>
          Des questions ?{" "}
          <a href="mailto:contact@percepta.io" style={{ color: "#1e3a8a" }}>
            contact@percepta.io
          </a>
        </p>
        {onBack && (
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", color: "#1e3a8a", cursor: "pointer", textDecoration: "underline", marginTop: "8px" }}
          >
            Essayer gratuitement 7 jours →
          </button>
        )}
      </div>
    </div>
  );
}