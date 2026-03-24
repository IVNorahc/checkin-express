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
    <div className="min-h-screen bg-[#f1f5f9] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1e3a8a] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            🏨
          </div>
          <h1 className="text-[#1e3a8a] font-bold text-3xl mb-4">
            Choisissez votre formule
          </h1>
          <p className="text-[#64748b]">
            Sans engagement • Annulation à tout moment
          </p>
        </div>

        {/* Bannière de bienvenue */}
        {showWelcome && (
          <div className="mb-8 bg-[#dcfce7] border border-green-300 text-[#166534] px-4 py-3 rounded-lg text-center max-w-2xl mx-auto">
            <p className="font-medium">
              ✅ Votre compte a été créé avec succès ! Complétez votre inscription.
            </p>
          </div>
        )}

        {/* Message de paiement */}
        {showRefresh && (
          <div className="mb-8 bg-blue-50 border border-blue-300 text-[#1e3a8a] px-4 py-3 rounded-lg text-center max-w-2xl mx-auto">
            <p className="font-medium mb-3">
              ✅ Une fois votre paiement effectué, cliquez ci-dessous.
            </p>
            <button
              onClick={handleRefresh}
              className="bg-[#1e3a8a] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#1e40af] transition-colors"
            >
              ✅ Actualiser mon accès
            </button>
          </div>
        )}

        {/* Cartes de tarification */}
        <div className="flex flex-col lg:flex-row gap-6 mb-12 justify-center">
          
          {/* STARTER */}
          <div className="flex-1 bg-white border-2 border-[#e2e8f0] rounded-2xl p-8 shadow-md max-w-sm">
            <div className="text-center">
              <h3 className="text-xl font-bold text-[#1e3a8a] mb-2">Starter</h3>
              <p className="text-[#64748b] mb-6">Idéal pour les petits hôtels</p>
              
              <div className="text-3xl font-bold text-[#1e3a8a] mb-6">
                49,99€
                <span className="text-base font-normal">/mois</span>
              </div>
              
              <ul className="text-left space-y-3 mb-6">
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>200 scans inclus/mois</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Fiches de police PDF</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Signature électronique</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Historique clients</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Support email</span>
                </li>
                <li className="flex items-center text-sm text-gray-400">
                  <span className="text-gray-400 mr-2">✗</span>
                  <span>Support prioritaire</span>
                </li>
                <li className="flex items-center text-sm text-gray-400">
                  <span className="text-gray-400 mr-2">✗</span>
                  <span>Multi-utilisateurs</span>
                </li>
              </ul>
              
              <button
                onClick={() => handlePlan("starter")}
                disabled={loading === "starter"}
                className="w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#1e40af] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading === "starter" ? "Redirection..." : "Choisir Starter"}
              </button>
              
              <p className="text-sm text-[#94a3b8] mt-4 text-center">
                0,25€/scan au-delà de 200
              </p>
            </div>
          </div>

          {/* BUSINESS */}
          <div className="flex-1 bg-[#1e3a8a] border-2 border-[#1e3a8a] rounded-2xl p-8 shadow-xl transform lg:scale-105 max-w-sm relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-[#1e3a8a] px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap">
              ⭐ Plus populaire
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">Business</h3>
              <p className="text-blue-200 mb-6">Pour les hôtels actifs</p>
              
              <div className="text-3xl font-bold text-white mb-6">
                89,99€
                <span className="text-base font-normal">/mois</span>
              </div>
              
              <ul className="text-left space-y-3 mb-6 text-blue-100">
                <li className="flex items-center text-sm">
                  <span className="text-yellow-400 mr-2">✓</span>
                  <span>500 scans inclus/mois</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-yellow-400 mr-2">✓</span>
                  <span>Fiches de police PDF</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-yellow-400 mr-2">✓</span>
                  <span>Signature électronique</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-yellow-400 mr-2">✓</span>
                  <span>Historique clients</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-yellow-400 mr-2">✓</span>
                  <span>Support prioritaire</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-yellow-400 mr-2">✓</span>
                  <span>0,25€/scan supplémentaire</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-yellow-400 mr-2">✓</span>
                  <span>Dashboard statistiques</span>
                </li>
              </ul>
              
              <button
                onClick={() => handlePlan("business")}
                disabled={loading === "business"}
                className="w-full bg-white text-[#1e3a8a] py-3 px-6 rounded-xl font-bold hover:bg-blue-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading === "business" ? "Redirection..." : "Choisir Business"}
              </button>
              
              <p className="text-sm text-blue-200 mt-4 text-center">
                0,25€/scan au-delà de 500
              </p>
            </div>
          </div>

          {/* ENTERPRISE */}
          <div className="flex-1 bg-white border-2 border-[#e2e8f0] rounded-2xl p-8 shadow-md max-w-sm relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-100 text-purple-700 px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap">
              🏆 Tout illimité
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-bold text-[#1e3a8a] mb-2">Enterprise</h3>
              <p className="text-[#64748b] mb-6">Pour les grandes structures</p>
              
              <div className="text-3xl font-bold text-[#1e3a8a] mb-6">
                149,99€
                <span className="text-base font-normal">/mois</span>
              </div>
              
              <ul className="text-left space-y-3 mb-6">
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Scans ILLIMITÉS</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Fiches de police PDF</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Signature électronique</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Historique illimité</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Support 24/7 prioritaire</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Onboarding personnalisé</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Multi-utilisateurs</span>
                </li>
                <li className="flex items-center text-sm">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Accès API</span>
                </li>
              </ul>
              
              <button
                onClick={() => handlePlan("enterprise")}
                disabled={loading === "enterprise"}
                className="w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#1e40af] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading === "enterprise" ? "Redirection..." : "Choisir Enterprise"}
              </button>
              
              <p className="text-sm text-[#94a3b8] mt-4 text-center">
                Aucun frais supplémentaire
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-[#64748b] space-y-2">
          <p>🔒 Paiement sécurisé via Lemon Squeezy</p>
          <p>Annulation à tout moment • Sans engagement</p>
          <p>
            Des questions ?{" "}
            <a href="mailto:contact@percepta.io" className="text-[#1e3a8a] hover:underline">
              contact@percepta.io
            </a>
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="block mx-auto mt-2 bg-none border-none text-[#1e3a8a] cursor-pointer underline hover:text-[#1e40af] transition-colors"
            >
              Essayer gratuitement 7 jours →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
