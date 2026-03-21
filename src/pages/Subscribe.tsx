export default function Subscribe({ onBack }: { onBack: () => void }) {
  const handleSubscribe = () => {
    window.open('https://checkin-express.lemonsqueezy.com/checkout/buy/00847c55-3cff-475c-8c02-0c31c2b3cb02', '_blank')
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1e3a8a] rounded-full mb-4">
            <span className="text-2xl">🏨</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Check-in Express</h1>
          <p className="text-gray-600 mt-2">Choisissez votre formule d'abonnement</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Monthly Plan */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#1e3a8a]">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Mensuel</h3>
              <div className="text-3xl font-bold text-[#1e3a8a] mb-4">
                89,99€
                <span className="text-lg font-normal text-gray-600">/mois</span>
              </div>
              <ul className="text-left text-gray-600 mb-6 space-y-2">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Accès illimité aux scans
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Fiches de police personnalisées
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Support prioritaire
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Mises à jour automatiques
                </li>
              </ul>
              <button
                onClick={handleSubscribe}
                className="w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#162f6b] transition-colors"
              >
                🚀 Choisir le mensuel
              </button>
            </div>
          </div>

          {/* Annual Plan */}
          <div className="bg-[#1e3a8a] rounded-xl shadow-lg p-6 text-white relative">
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-[#1e3a8a] px-3 py-1 rounded-full text-sm font-bold">
                2 mois offerts !
              </span>
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Annuel</h3>
              <div className="text-3xl font-bold mb-4">
                899,90€
                <span className="text-lg font-normal opacity-90">/an</span>
              </div>
              <div className="text-sm opacity-90 mb-4">
                Économisez 179,98€ par an
              </div>
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="text-yellow-300 mr-2">✓</span>
                  Accès illimité aux scans
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-300 mr-2">✓</span>
                  Fiches de police personnalisées
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-300 mr-2">✓</span>
                  Support prioritaire 24/7
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-300 mr-2">✓</span>
                  Mises à jour automatiques
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-300 mr-2">✓</span>
                  Export avancé des données
                </li>
              </ul>
              <button
                onClick={handleSubscribe}
                className="w-full bg-white text-[#1e3a8a] py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                🏆 Choisir l'annuel
              </button>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={onBack}
            className="inline-flex items-center text-[#1e3a8a] hover:text-[#162f6b] font-medium transition-colors"
          >
            ← Retour au dashboard
          </button>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p className="mb-2">🔒 Paiement sécurisé via Lemon Squeezy</p>
          <p>Annulation à tout moment • Sans engagement</p>
        </div>
      </div>
    </div>
  )
}
