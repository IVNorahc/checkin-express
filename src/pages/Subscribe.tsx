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
          
          {/* CARTE 1 - STARTER */}
          <div className="flex-1 bg-white border-2 border-[#e2e8f0] rounded-2xl p-6 shadow-md">
            <div className="text-center">
              <h3 className="text-xl font-bold text-[#1e3a8a] mb-2">Starter</h3>
              <p className="text-[#64748b] mb-6">Idéal pour les petits hôtels</p>
              
              <div className="text-3xl font-bold text-[#1e3a8a] mb-6">
                49,99€
                <span className="text-base font-normal">/mois</span>
              </div>
              
              <ul className="text-left space-y-3 mb-6">
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>200 scans inclus/mois</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Fiches de police PDF</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Signature électronique</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Historique clients</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Support email</span>
                </li>
                <li className="flex items-center">
                  <span className="text-red-500 mr-2">❌</span>
                  <span>Scans supplémentaires</span>
                </li>
                <li className="flex items-center">
                  <span className="text-red-500 mr-2">❌</span>
                  <span>Support prioritaire</span>
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
                  'Choisir Starter'
                )}
              </button>
              
              <p className="text-sm text-[#64748b] mt-4 text-center">
                0,25€/scan au-delà
              </p>
            </div>
          </div>

          {/* CARTE 2 - BUSINESS */}
          <div className="flex-1 bg-[#1e3a8a] border-2 border-[#1e3a8a] rounded-2xl p-6 shadow-xl transform lg:scale-105">
            <div className="text-center">
              {/* Badge */}
              <div className="inline-block bg-yellow-400 text-[#1e3a8a] font-bold rounded-full px-4 py-1 mb-4">
                ⭐ Plus populaire
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Business</h3>
              <p className="text-blue-200 mb-6">Pour les hôtels actifs</p>
              
              <div className="text-3xl font-bold text-white mb-6">
                89,99€
                <span className="text-base font-normal">/mois</span>
              </div>
              
              <ul className="text-left space-y-3 mb-6 text-blue-100">
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✅</span>
                  <span>500 scans inclus/mois</span>
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✅</span>
                  <span>Fiches de police PDF</span>
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✅</span>
                  <span>Signature électronique</span>
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✅</span>
                  <span>Historique clients</span>
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✅</span>
                  <span>Support prioritaire</span>
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✅</span>
                  <span>0,25€/scan supplémentaire</span>
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-2">✅</span>
                  <span>Dashboard statistiques avancé</span>
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
                  'Choisir Business'
                )}
              </button>
              
              <p className="text-sm text-blue-200 mt-4 text-center">
                0,25€/scan au-delà
              </p>
            </div>
          </div>

          {/* CARTE 3 - ENTERPRISE */}
          <div className="flex-1 bg-white border-2 border-[#e2e8f0] rounded-2xl p-6 shadow-md">
            <div className="text-center">
              {/* Badge */}
              <div className="inline-block bg-purple-100 text-purple-700 rounded-full px-4 py-1 mb-4">
                🏆 Tout illimité
              </div>
              
              <h3 className="text-xl font-bold text-[#1e3a8a] mb-2">Enterprise</h3>
              <p className="text-[#64748b] mb-6">Pour les grandes structures</p>
              
              <div className="text-3xl font-bold text-[#1e3a8a] mb-6">
                149,99€
                <span className="text-base font-normal">/mois</span>
              </div>
              
              <ul className="text-left space-y-3 mb-6">
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span className="font-bold">Scans ILLIMITÉS</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Fiches de police PDF</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Signature électronique</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Historique clients illimité</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Support 24/7 prioritaire</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Onboarding personnalisé</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>Multi-utilisateurs</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-2">✅</span>
                  <span>API accès</span>
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
                  'Choisir Enterprise'
                )}
              </button>
              
              <p className="text-sm text-[#64748b] mt-4 text-center">
                Aucun frais supplémentaire
              </p>
            </div>
          </div>
        </div>

        {/* Section comparaison */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-md">
          <h3 className="text-xl font-bold text-[#1e3a8a] mb-4">Comparaison des formules</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Fonctionnalité</th>
                  <th className="text-center py-2 px-4">Starter</th>
                  <th className="text-center py-2 px-4">Business</th>
                  <th className="text-center py-2 px-4">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4">Scans inclus</td>
                  <td className="text-center py-2 px-4">200</td>
                  <td className="text-center py-2 px-4">500</td>
                  <td className="text-center py-2 px-4 font-bold">Illimité</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Scans supp.</td>
                  <td className="text-center py-2 px-4">0,25€</td>
                  <td className="text-center py-2 px-4">0,25€</td>
                  <td className="text-center py-2 px-4 font-bold">Inclus</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Fiches PDF</td>
                  <td className="text-center py-2 px-4">✅</td>
                  <td className="text-center py-2 px-4">✅</td>
                  <td className="text-center py-2 px-4">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Support</td>
                  <td className="text-center py-2 px-4">Email</td>
                  <td className="text-center py-2 px-4">Prioritaire</td>
                  <td className="text-center py-2 px-4 font-bold">24/7</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Multi-users</td>
                  <td className="text-center py-2 px-4">❌</td>
                  <td className="text-center py-2 px-4">❌</td>
                  <td className="text-center py-2 px-4">✅</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-bold">Prix/mois</td>
                  <td className="text-center py-2 px-4 font-bold">49,99€</td>
                  <td className="text-center py-2 px-4 font-bold">89,99€</td>
                  <td className="text-center py-2 px-4 font-bold">149,99€</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section FAQ */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-md">
          <h3 className="text-xl font-bold text-[#1e3a8a] mb-4">Questions fréquentes</h3>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-[#1e3a8a] mb-2">
                Q: Puis-je changer de plan ?
              </p>
              <p className="text-[#64748b]">
                R: Oui, à tout moment depuis votre dashboard.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#1e3a8a] mb-2">
                Q: Que se passe-t-il après les scans inclus ?
              </p>
              <p className="text-[#64748b]">
                R: 0,25€ par scan supplémentaire, automatiquement facturé.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#1e3a8a] mb-2">
                Q: Y a-t-il un engagement ?
              </p>
              <p className="text-[#64748b]">
                R: Non, annulation possible à tout moment.
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#1e3a8a] mb-2">
                Q: Les données sont-elles sécurisées ?
              </p>
              <p className="text-[#64748b]">
                R: Oui, conformité RGPD totale. Les données clients restent sur votre appareil.
              </p>
            </div>
          </div>
        </div>

        {/* Message de paiement */}
        {showRefreshMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-[#1e3a8a] font-medium mb-3">
              ✅ Une fois votre paiement effectué, cliquez sur 'Actualiser mon accès'
            </p>
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
