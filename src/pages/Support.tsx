import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface SupportProps {
  onBack?: () => void
}

interface FAQ {
  question: string
  reponse: string
  categorie: string
}

export default function Support({ onBack }: SupportProps) {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)
  const [userPlan, setUserPlan] = useState<string>('')
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    message: ''
  })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUser(user)

      // Récupérer le plan de l'utilisateur
      const { data: profile } = await supabase
        .from('hotels')
        .select('subscription_status')
        .eq('user_id', user.id)
        .single()

      setUserPlan(profile?.subscription_status || 'trial')
      
      setFormData(prev => ({
        ...prev,
        email: user.email || ''
      }))
    } catch (error) {
      console.error('Erreur lors du chargement utilisateur:', error)
    }
  }

  const faqs: FAQ[] = [
    {
      categorie: 'Scanner',
      question: 'Comment scanner une pièce d\'identité ?',
      reponse: 'Utilisez votre smartphone pour prendre une photo claire de la pièce d\'identité (CNI, passeport ou titre de séjour). Assurez-vous que l\'éclairage est bon et que tous les textes sont lisibles. L\'application détectera automatiquement le type de document et extraira les informations.'
    },
    {
      categorie: 'Fiches',
      question: 'Comment générer une fiche de police ?',
      reponse: 'Après avoir scanné un client, allez dans la section "Fiches de contrôle" et cliquez sur "Générer nouvelle fiche". Entrez le nom du client et la fiche PDF sera générée automatiquement avec toutes les informations requises pour les autorités.'
    },
    {
      categorie: 'Abonnement',
      question: 'Comment changer mon abonnement ?',
      reponse: 'Allez dans "Paramètres" puis "Abonnement" et cliquez sur "Mettre à niveau". Vous pouvez choisir entre les plans Starter (49,99€/mois) et Business (89,99€/mois) selon vos besoins.'
    },
    {
      categorie: 'Export',
      question: 'Comment exporter mes données ?',
      reponse: 'Dans la section "Historique", les utilisateurs du plan Business peuvent exporter toutes leurs données au format CSV en cliquant sur le bouton "Export CSV". Le fichier contiendra toutes les informations des clients check-in.'
    },
    {
      categorie: 'Scanner',
      question: 'Quels types de documents sont acceptés ?',
      reponse: 'L\'application accepte les cartes nationales d\'identité (CNI), les passeports et les titres de séjour. Le verso est automatiquement demandé pour les CNI et titres de séjour.'
    },
    {
      categorie: 'Fiches',
      question: 'Puis-je modifier une fiche générée ?',
      reponse: 'Une fois générée, la fiche ne peut pas être modifiée pour des raisons de conformité légale. Cependant, vous pouvez générer une nouvelle fiche si des informations ont changé.'
    }
  ]

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nom.trim() || !formData.email.trim() || !formData.message.trim()) {
      alert('Veuillez remplir tous les champs')
      return
    }

    setSending(true)
    try {
      // Envoyer l'email via une fonction Supabase Edge Function ou API
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: formData.nom,
          email: formData.email,
          message: formData.message,
          plan: userPlan,
          hotel_id: user?.id
        })
      })

      if (response.ok) {
        alert('Message envoyé avec succès! Nous vous répondrons dans les plus brefs délais.')
        setFormData({ nom: '', email: user?.email || '', message: '' })
      } else {
        throw new Error('Erreur lors de l\'envoi')
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error)
      alert('Erreur lors de l\'envoi du message. Veuillez réessayer ou nous contacter directement à support@percepta.io')
    } finally {
      setSending(false)
    }
  }

  const categories = [...new Set(faqs.map(faq => faq.categorie))]

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Support</h1>
              <p className="text-gray-600 mt-1">
                Nous sommes là pour vous aider
              </p>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                ← Retour
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact rapide */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Contact rapide
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    📧
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Email</div>
                    <div className="text-sm text-gray-600">support@percepta.io</div>
                  </div>
                </div>
                
                {userPlan === 'business' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-600">⭐</span>
                      <span className="font-medium text-yellow-800">Support prioritaire</span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      En tant que client Business, vous bénéficiez d'un support prioritaire avec réponse sous 2h.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Statut du plan */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Votre plan
              </h3>
              <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${
                userPlan === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                userPlan === 'starter' ? 'bg-green-100 text-green-800' :
                userPlan === 'business' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {userPlan === 'trial' ? '🔶 Trial' :
                 userPlan === 'starter' ? '🟢 Starter' :
                 userPlan === 'business' ? '🔵 Business' :
                 '❌ Expiré'}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {userPlan === 'trial' && 'Accès limité aux fonctionnalités de base'}
                {userPlan === 'starter' && 'Accès complet aux fonctionnalités standards'}
                {userPlan === 'business' && 'Accès premium avec support prioritaire'}
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Questions fréquentes
              </h2>
              
              <div className="space-y-4">
                {categories.map(categorie => (
                  <div key={categorie} className="border-b border-gray-200 pb-4 last:border-0">
                    <h3 className="font-medium text-gray-900 mb-3">
                      {categorie}
                    </h3>
                    <div className="space-y-2">
                      {faqs
                        .filter(faq => faq.categorie === categorie)
                        .map((faq) => {
                          const globalIndex = faqs.indexOf(faq)
                          return (
                            <div key={globalIndex} className="border border-gray-200 rounded-lg">
                              <button
                                onClick={() => toggleFAQ(globalIndex)}
                                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                              >
                                <span className="text-sm font-medium text-gray-900">
                                  {faq.question}
                                </span>
                                <span className="text-gray-400">
                                  {expandedFAQ === globalIndex ? '−' : '+'}
                                </span>
                              </button>
                              {expandedFAQ === globalIndex && (
                                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                  <p className="text-sm text-gray-700">
                                    {faq.reponse}
                                  </p>
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulaire de contact */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Envoyer un message
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Votre nom"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="votre@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Décrivez votre problème ou votre question..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Envoi en cours...' : 'Envoyer le message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
