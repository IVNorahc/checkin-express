export default function Subscribe({ onBack }: { onBack: () => void }) {
  const handleSubscribe = () => {
    window.open('https://checkin-express.lemonsqueezy.com/checkout/buy/00847c55-3cff-475c-8c02-0c31c2b3cb02', '_blank')
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-4xl w-full">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full mb-3 sm:mb-4">
            <span className="text-xl sm:text-2xl">🏨</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Check-in Express</h1>
          <p className="text-gray-400 mt-2 text-sm sm:text-base">Choisissez votre formule d'abonnement</p>
        </div>

        {/* Pricing Cards */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Monthly Plan */}
          <div className="bg-dark-card rounded-xl shadow-lg p-4 sm:p-6 border-2 border-dark-border w-full">
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Mensuel</h3>
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-4">
                89,99€
                <span className="text-sm sm:text-lg font-normal text-gray-400">/mois</span>
              </div>
              <ul className="text-left text-gray-300 mb-4 sm:mb-6 space-y-2 text-sm sm:text-base">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>
                  Accès illimité aux scans
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>
                  Fiches de police personnalisées
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>
                  Support prioritaire
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>
                  Mises à jour automatiques
                </li>
              </ul>
              <button
                onClick={handleSubscribe}
                className="w-full bg-primary text-white py-3 px-4 sm:py-3 sm:px-6 rounded-lg font-semibold hover:bg-primary-hover transition-colors text-base sm:text-sm"
              >
                🚀 Choisir le mensuel
              </button>
            </div>
          </div>

          {/* Annual Plan */}
          <div className="bg-dark-blue rounded-xl shadow-lg p-4 sm:p-6 border-2 border-primary text-white relative w-full">
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                2 mois offerts !
              </span>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-bold mb-2">Annuel</h3>
              <div className="text-2xl sm:text-3xl font-bold mb-4">
                899,90€
                <span className="text-sm sm:text-lg font-normal opacity-90">/an</span>
              </div>
              <div className="text-xs sm:text-sm opacity-90 mb-4">
                Économisez 179,98€ par an
              </div>
              <ul className="text-left space-y-2 mb-4 sm:mb-6 text-sm sm:text-base">
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>
                  Accès illimité aux scans
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>
                  Fiches de police personnalisées
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>
                  Support prioritaire 24/7
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>
                  Mises à jour automatiques
                </li>
                <li className="flex items-center">
                  <span className="text-green-400 mr-2">✓</span>
                  Export avancé des données
                </li>
              </ul>
              <button
                onClick={handleSubscribe}
                className="w-full bg-white text-dark font-bold py-3 px-4 sm:py-3 sm:px-6 rounded-lg hover:bg-gray-100 transition-colors text-base sm:text-sm"
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
            className="inline-flex items-center text-primary hover:text-primary-hover font-medium transition-colors text-sm sm:text-base"
          >
            ← Retour au dashboard
          </button>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 sm:mt-12 text-center text-gray-500 text-xs sm:text-sm">
          <p className="mb-2">🔒 Paiement sécurisé via Lemon Squeezy</p>
          <p>Annulation à tout moment • Sans engagement</p>
        </div>
      </div>
    </div>
  )
}
