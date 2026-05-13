import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BackButton from '../components/BackButton'

interface User {
  id: string
  email: string
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

        setUser({ id: userData.id, email: userData.email || '' })

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

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      if (!user?.email) {
        setError('Utilisateur non connecté')
        return
      }

      // Préparer le contenu de l'email
      const emailSubject = `[Check-in Express] ${formData.sujet} - ${user.email}`
      const emailBody = `
De: ${user.email}
Sujet: ${formData.sujet}
Date: ${new Date().toLocaleString('fr-FR')}

Message:
${formData.message}
      `.trim()

      // Créer un mailto: link comme fallback
      const mailtoLink = `mailto:support@percepta.app?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      
      // Ouvrir le client email par défaut
      window.open(mailtoLink, '_blank')
      
      setSuccess('Client email ouvert. Veuillez envoyer votre message.')

      // Réinitialiser le formulaire
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
      <div className="p-6">
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
                    href="mailto:support@percepta.app"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    support@percepta.app
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">WhatsApp</h3>
                  <a
                    href="https://wa.me/221770000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 underline"
                  >
                    +221 77 000 00 00
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
