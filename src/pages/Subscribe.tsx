import { useState } from 'react'
import { supabase } from '../lib/supabase'

type SubscribeProps = {
  onSubscribeSuccess: () => void
}

export default function Subscribe({ onSubscribeSuccess }: SubscribeProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showRefreshMessage, setShowRefreshMessage] = useState(false)
  
  const handleSubscribe = async (planType: 'starter' | 'business' | 'enterprise') => {
    setIsLoading(true)
    setShowRefreshMessage(true)
    
    // URLs pour chaque plan
    const urls = {
      starter: 'https://checkin-express.lemonsqueezy.com/checkout/buy/00847c55-3cff-475c-8c02-0c31c2b3cb02',
      business: 'https://checkin-express.lemonsqueezy.com/checkout/buy/00847c55-3cff-475c-8c02-0c31c2b3cb02',
      enterprise: 'https://checkin-express.lemonsqueezy.com/checkout/buy/00847c55-3cff-475c-8c02-0c31c2b3cb02'
    }
    
    window.open(urls[planType], '_blank')
  }
  
  const handleRefreshAccess = async () => {
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
    <div className="min-h-screen bg-[#f1f5f9] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-[#1e3a8a] font-bold text-3xl mb-4">
            Choisissez votre formule
          </h1>
          <p className="text-[#64748b]">
            Sans engagement • Annulation à tout moment
          </p>
        </div>

        {/* Bannière de succès */}
        <div className="mb-8 bg-[#dcfce7] border border-green-200 text-[#166534] px-4 py-3 rounded-lg text-center">
          <p className="font-medium">
            ✅ Compte créé ! Choisissez votre abonnement.
          </p>
        </div>

        {/* Cartes de tarification */}
        <div className="flex flex-col lg:flex-row gap-6 mb-12">
          
          {/* Plan 1 - STARTER */}
          <div className="flex-1 bg-white border-2 border-[#e2e8f0] rounded-2xl p-6 shadow-md">
            <div className="text-center">
              <h3 className="text-xl font-bold text-[#1e3a8a] mb-2">STARTER</h3>
              <p className="text-[#64748b] mb-6">Idéal pour les petits hôtels</p>
              
              <div className="text-3xl font-bold text-[#1e3a8a] mb-6">
                49,99€
                <span className="text-base font-normal">/mois</span>
              </div>
              
              <ul className="text-left space-y-3 mb-6">
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>200 scans inclus</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Fiches PDF</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Signature</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Historique</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Support email</span>
                </li>
                <li className="flex items-center">
                  <span className="text-[#64748b] mr-2">•</span>
                  <span>0,25€/scan supplémentaire</span>
                </li>
              </ul>
              
              <button
                onClick={() => handleSubscribe('starter')}
                disabled={isLoading}
                className="w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#1e40af] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Redirection vers le paiement sécurisé...</span>
                  </>
                ) : (
                  'Choisir STARTER'
                )}
              </button>
            </div>
          </div>

          {/* Plan 2 - BUSINESS (mis en avant) */}
          <div className="flex-1 bg-[#1e3a8a] border-2 border-[#1e3a8a] rounded-2xl p-6 shadow-xl transform lg:scale-105">
            <div className="text-center">
              {/* Badge */}
              <div className="inline-block bg-yellow-400 text-[#1e3a8a] font-bold rounded-full px-4 py-1 mb-4">
                ⭐ Plus populaire
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">BUSINESS</h3>
              <p className="text-blue-200 mb-6">Pour les hôtels actifs</p>
              
              <div className="text-3xl font-bold text-white mb-6">
                89,99€
                <span className="text-base font-normal">/mois</span>
              </div>
              
              <ul className="text-left space-y-3 mb-6 text-blue-100">
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✅</span>
                  <span>500 scans inclus</span>
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✅</span>
                  <span>Tout Starter +</span>
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✅</span>
                  <span>Support prioritaire</span>
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✅</span>
                  <span>Dashboard statistiques</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-200 mr-2">•</span>
                  <span>0,25€/scan supplémentaire</span>
                </li>
              </ul>
              
              <button
                onClick={() => handleSubscribe('business')}
                disabled={isLoading}
                className="w-full bg-white text-[#1e3a8a] py-3 px-6 rounded-xl font-bold hover:bg-blue-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-[#1e3a8a] border-t-transparent animate-spin" />
                    <span>Redirection vers le paiement sécurisé...</span>
                  </>
                ) : (
                  'Choisir BUSINESS'
                )}
              </button>
            </div>
          </div>

          {/* Plan 3 - ENTERPRISE */}
          <div className="flex-1 bg-white border-2 border-[#e2e8f0] rounded-2xl p-6 shadow-md">
            <div className="text-center">
              {/* Badge */}
              <div className="inline-block bg-purple-100 text-purple-700 rounded-full px-4 py-1 mb-4">
                🏆 Tout illimité
              </div>
              
              <h3 className="text-xl font-bold text-[#1e3a8a] mb-2">ENTERPRISE</h3>
              <p className="text-[#64748b] mb-6">Pour les grandes structures</p>
              
              <div className="text-3xl font-bold text-[#1e3a8a] mb-6">
                149,99€
                <span className="text-base font-normal">/mois</span>
              </div>
              
              <ul className="text-left space-y-3 mb-6">
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Scans illimités</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Tout Business +</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Support 24/7</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Multi-utilisateurs</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Onboarding personnalisé</span>
                </li>
              </ul>
              
              <button
                onClick={() => handleSubscribe('enterprise')}
                disabled={isLoading}
                className="w-full bg-[#1e3a8a] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#1e40af] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Redirection vers le paiement sécurisé...</span>
                  </>
                ) : (
                  'Choisir ENTERPRISE'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Message de paiement */}
        {showRefreshMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-[#1e3a8a] font-medium mb-3">
              ✅ Une fois votre paiement effectué, cliquez sur 'Actualiser mon accès'
            </p>
            <button
              onClick={handleRefreshAccess}
              disabled={isLoading}
              className="bg-[#1e3a8a] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#1e40af] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
            >
              {isLoading ? (
                <>
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Vérification...</span>
                </>
              ) : (
                '✅ Actualiser mon accès'
              )}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-[#64748b] space-y-2">
          <p>🔒 Paiement sécurisé via Lemon Squeezy</p>
          <p>Annulation à tout moment • Sans engagement</p>
          <p>Des questions ? <a href="mailto:contact@percepta.io" className="text-[#1e3a8a] hover:underline">contact@percepta.io</a></p>
        </div>

        {/* Lien d'essai gratuit */}
        <div className="text-center mt-6">
          <button
            onClick={onSubscribeSuccess}
            className="text-[#1e3a8a] hover:text-[#1e40af] font-medium transition-colors"
          >
            Essayer gratuitement 7 jours →
          </button>
        </div>
      </div>
    </div>
  )
}
