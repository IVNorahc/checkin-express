import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BackButton from '../components/BackButton'

interface User {
  id: string
  email: string
  hotelPhone?: string
}

interface FAQ {
  id: number
  question: string
  reponse: string
}

export default function Support() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  // Formulaire de contact
  const [formData, setFormData] = useState({
    sujet: '',
    message: ''
  })

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.replace(window.location.origin + '/login')
  }

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: userData } } = await supabase.auth.getUser()
        if (!userData) return

        const { data: hotelData } = await supabase
          .from('hotels')
          .select('phone')
          .eq('user_id', userData.id)
          .single()

        setUser({
          id: userData.id,
          email: userData.email || '',
          hotelPhone: hotelData?.phone || '',
        })

      } catch (err) {
        console.error('Erreur:', err)
        setError('Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmitContact = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      if (!user?.email) {
        setError('Utilisateur non connecté')
        return
      }

      const { error: insertError } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          email: user.email,
          sujet: formData.sujet,
          message: formData.message.trim(),
        })

      if (insertError) throw insertError

      setSuccess('Message envoyé avec succès. Notre équipe vous répondra sous 24h.')
      setFormData({ sujet: '', message: '' })

    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur lors de l\'envoi du message')
    } finally {
      setSending(false)
    }
  }

  const toggleFAQ = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id)
  }

  const faqData: FAQ[] = [
    {
      id: 1,
      question: "Comment scanner une pièce d'identité ?",
      reponse: "Allez sur la page Scanner, pointez la caméra de votre téléphone sur le document d'identité. L'OCR (reconnaissance optique de caractères) remplira automatiquement les champs du formulaire avec les informations détectées."
    },
    {
      id: 2,
      question: "Comment générer une fiche de police ?",
      reponse: "Allez sur la page Fiches, cliquez sur 'Nouvelle fiche' pour créer une nouvelle fiche manuellement, ou cliquez sur 'Imprimer' sur un client existant dans la liste pour générer automatiquement une fiche de police au format A6."
    },
    {
      id: 3,
      question: "Comment ajouter un autre utilisateur ?",
      reponse: "La fonctionnalité multi-utilisateurs est disponible uniquement sur le plan Business. Si vous êtes sur le plan Starter, veuillez contacter le support pour mettre à niveau votre abonnement."
    },
    {
      id: 4,
      question: "Comment changer mon abonnement ?",
      reponse: "Allez dans Paramètres > Abonnement > Gérer mon abonnement. Vous serez redirigé vers Lemon Squeezy où vous pourrez mettre à niveau, modifier ou annuler votre abonnement."
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du support...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
        
        <div className="flex items-center gap-3">
          <div className="bg-white/90 rounded-xl p-2">
            <img src="/percepta-logo.png" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Check-in Express</h1>
            <p className="text-blue-200 text-xs">Support</p>
          </div>
        </div>

        <button 
          onClick={signOut}
          className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Déconnexion
        </button>
      </header>

      {/* CONTENU */}
      <div className="px-4 py-6 sm:px-6">
        <BackButton />

        {/* Messages d'erreur/succès */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Section 1 - Formulaire de contact */}
          <div className="bg-white/90 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Formulaire de contact</h2>
            
            <form onSubmit={handleSubmitContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sujet *
                </label>
                <select
                  name="sujet"
                  value={formData.sujet}
                  onChange={handleFormChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un sujet</option>
                  <option value="Bug">Bug</option>
                  <option value="Question">Question</option>
                  <option value="Demande de fonctionnalité">Demande de fonctionnalité</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de l'utilisateur
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                  />
                  <span className="text-sm text-gray-500">Non éditable</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleFormChange}
                  required
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Décrivez votre question, votre problème ou votre demande..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sending || !formData.sujet || !formData.message}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {sending ? 'Envoi en cours...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2 - FAQ rapide */}
          <div className="bg-white/90 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">FAQ rapide</h2>
            
            <div className="space-y-3">
              {faqData.map((faq) => (
                <div key={faq.id} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleFAQ(faq.id)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{faq.question}</span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedFAQ === faq.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {expandedFAQ === faq.id && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <p className="text-gray-700">{faq.reponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3 - Contact direct */}
          <div className="bg-white/90 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Contact direct</h2>

            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Email</h3>
                  <a
                    href="mailto:perceptasn@gmail.com"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    perceptasn@gmail.com
                  </a>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.555 4.118 1.529 5.845L0 24l6.335-1.502A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.88 9.88 0 01-5.031-1.374l-.36-.214-3.762.892.948-3.663-.235-.374A9.86 9.86 0 012.118 12C2.118 6.533 6.533 2.118 12 2.118S21.882 6.533 21.882 12 17.467 21.882 12 21.882z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">WhatsApp</h3>
                  <a
                    href="https://wa.me/221711279503?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20avec%20Check-in%20Express"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Contacter via WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
