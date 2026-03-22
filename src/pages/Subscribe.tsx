type SubscribeProps = {
  onSubscribeSuccess: () => void
}

import { useState } from 'react'
import { supabase } from '../lib/supabase'
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubscribe = (planType: 'monthly' | 'annual') => {
    setIsLoading(true)
    const url = planType === 'monthly' 
      ? 'https://checkin-express.lemonsqueezy.com/checkout/buy/00847c55-3cff-475c-8c02-0c31c2b3cb02'
      : 'https://checkin-express.lemonsqueezy.com/checkout/buy/00847c55-3cff-475c-8c02-0c31c2b3cb02'
    window.open(url, '_blank')
    
    // Rediriger vers le dashboard après clic sur un plan
    setTimeout(() => {
      onSubscribeSuccess()
    }, 1000)
  }
  
  const handleRefreshAccess = async () => {
    // Recharger le profil depuis Supabase et rediriger si status = 'active'
    setIsLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', session.user.id)
          .single()
        
        if (profileData?.status === 'active') {
          onSubscribeSuccess()
        } else {
          alert('Votre paiement n\'est pas encore confirmé. Veuillez réessayer dans quelques instants.')
        }
      }
    } catch (error) {
      console.error('Error refreshing access:', error)
      alert('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-4xl w-full">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-[#1e3a8a] rounded-full mb-3 sm:mb-4">
            <span className="text-xl sm:text-2xl">🏨</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e3a8a]">Bienvenue sur Check-in Express ! 🎉</h1>
          <p className="text-[#64748b] mt-2 text-sm sm:text-base">Choisissez votre formule pour commencer</p>
        </div>

        {/* Success Banner */}
        <div className="mb-6 sm:mb-8 bg-[#dcfce7] border border-green-200 text-[#166534] px-4 py-3 rounded-lg">
          <p className="font-medium text-sm sm:text-base">
            ✅ Votre compte a été créé avec succès !<br />
            Complétez votre inscription en choisissant un abonnement.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Monthly Plan */}
          <div className="bg-white border-2 border-[#e2e8f0] rounded-2xl shadow-md p-4 sm:p-6 w-full">
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-bold text-[#1e3a8a] mb-2">Mensuel</h3>
              <div className="text-2xl sm:text-3xl font-bold text-[#1e3a8a] mb-4">
                89,99€
                <span className="text-sm sm:text-lg font-normal text-[#64748b]">/mois</span>
              </div>
              <ul className="text-left text-[#64748b] mb-4 sm:mb-6 space-y-2 text-sm sm:text-base">
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Accès illimité aux scans
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Fiches de police personnalisées
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Support prioritaire
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Mises à jour automatiques
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe('monthly')}
                disabled={isLoading}
                className="w-full bg-[#1e3a8a] text-white py-3 px-4 sm:py-3 sm:px-6 rounded-xl font-semibold hover:bg-[#1e40af] transition-colors text-base sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Redirection vers le paiement sécurisé...</span>
                  </>
                ) : (
                  '🚀 Choisir le mensuel'
                )}
              </button>
            </div>
          </div>

          {/* Annual Plan */}
          <div className="bg-[#1e3a8a] border-2 border-[#1e3a8a] rounded-2xl shadow-xl p-4 sm:p-6 text-white relative w-full">
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-[#1e3a8a] px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                2 mois offerts !
              </span>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-bold mb-2">Annuel</h3>
              <div className="text-2xl sm:text-3xl font-bold mb-4">
                899,90€
                <span className="text-sm sm:text-lg font-normal text-blue-200">/an</span>
              </div>
              <div className="text-xs sm:text-sm text-blue-200 mb-4">
                Économisez 179,98€ par an
              </div>
              <ul className="text-left space-y-2 mb-4 sm:mb-6 text-sm sm:text-base">
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✓</span>
                  Accès illimité aux scans
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✓</span>
                  Fiches de police personnalisées
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✓</span>
                  Support prioritaire 24/7
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✓</span>
                  Mises à jour automatiques
                </li>
                <li className="flex items-center">
        </div>

        {/* Annual Plan */}
        <div className="bg-[#1e3a8a] border-2 border-[#1e3a8a] rounded-2xl shadow-xl p-4 sm:p-6 text-white relative w-full">
          {/* Badge */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-yellow-400 text-[#1e3a8a] px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
              2 mois offerts !
            </span>
          </div>
          
          <div className="text-center">
            <h3 className="text-lg sm:text-xl font-bold mb-2">Annuel</h3>
            <div className="text-2xl sm:text-3xl font-bold mb-4">
              899,90€
              <span className="text-sm sm:text-lg font-normal text-blue-200">/an</span>
            </div>
            <div className="text-xs sm:text-sm text-blue-200 mb-4">
              Économisez 179,98€ par an
            </div>
            <ul className="text-left space-y-2 mb-4 sm:mb-6 text-sm sm:text-base">
              <li className="flex items-center">
                <span className="text-yellow-400 mr-2">✓</span>
                Accès illimité aux scans
              </li>
              <li className="flex items-center">
                <span className="text-yellow-400 mr-2">✓</span>
                Fiches de police personnalisées
              </li>
              <li className="flex items-center">
                <span className="text-yellow-400 mr-2">✓</span>
                Support prioritaire 24/7
              </li>
              <li className="flex items-center">
                <span className="text-yellow-400 mr-2">✓</span>
                Mises à jour automatiques
              </li>
              <li className="flex items-center">
                <span className="text-yellow-400 mr-2">✓</span>
                Export avancé des données
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe('annual')}
              disabled={isLoading}
              className="w-full bg-white text-[#1e3a8a] py-3 px-4 sm:py-3 sm:px-6 rounded-xl font-bold hover:bg-blue-50 transition-colors text-base sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Redirection vers le paiement sécurisé...</span>
                </>
              ) : (
                '🏆 Choisir l\'annuel'
              )}
            </button>
          </div>
        <div className="mt-8 sm:mt-12 text-center text-[#64748b] text-xs sm:text-sm">
          <p className="mb-2">🔒 Paiement 100% sécurisé via Lemon Squeezy • Annulation à tout moment</p>
        </div>

        {/* Payment message */}
        <div className="mt-4 sm:mt-6 text-center text-[#64748b] text-xs sm:text-sm">
          <p className="mb-2">
            Une fois votre paiement effectué, revenez sur cette page et 
            actualisez pour accéder à votre compte.
          </p>
        </div>

        {/* Free trial link */}
        <div className="mt-6 text-center">
          <button
            onClick={handleRefreshAccess}
            disabled={isLoading}
            className="text-[#1e3a8a] hover:text-[#1e40af] font-medium transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="inline-block h-4 w-4 rounded-full border-2 border-[#1e3a8a] border-t-transparent animate-spin" />
                <span>Vérification...</span>
              </>
            ) : (
              '✅ J\'ai payé, actualiser mon accès'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
