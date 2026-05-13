import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BackButton from '../components/BackButton'

interface Hotel {
  id: string
  hotel_name: string
  address?: string
  phone: string
  email?: string
  city?: string
  country?: string
  subscription_status: string
  trial_end?: string
  created_at: string
}

interface User {
  id: string
  email: string
}

export default function Parametres() {
  const [user, setUser] = useState<User | null>(null)
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Formulaire informations hôtel
  const [hotelForm, setHotelForm] = useState({
    hotel_name: '',
    address: '',
    phone: '',
    email: '',
    city: '',
    country: 'Sénégal'
  })

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.replace(window.location.origin + '/login')
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: userData } } = await supabase.auth.getUser()
        if (!userData) return

        setUser({ id: userData.id, email: userData.email || '' })

        // Récupérer les informations de l'hôtel
        const { data: hotelData, error: hotelError } = await supabase
          .from('hotels')
          .select('*')
          .eq('user_id', userData.id)
          .single()

        if (hotelError) {
          console.error('Erreur chargement hôtel:', hotelError)
          setError('Erreur lors du chargement des informations')
          return
        }

        setHotel(hotelData)
        setHotelForm({
          hotel_name: hotelData.hotel_name || '',
          address: hotelData.address || '',
          phone: hotelData.phone || '',
          email: hotelData.email || '',
          city: hotelData.city || '',
          country: hotelData.country || 'Sénégal'
        })

      } catch (err) {
        console.error('Erreur:', err)
        setError('Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleHotelFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setHotelForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!hotel?.id) {
        setError('Hôtel non trouvé')
        return
      }

      const { error } = await supabase
        .from('hotels')
        .update({
          hotel_name: hotelForm.hotel_name,
          address: hotelForm.address,
          phone: hotelForm.phone,
          email: hotelForm.email,
          city: hotelForm.city,
          country: hotelForm.country
        })
        .eq('id', hotel.id)

      if (error) {
        setError('Erreur lors de la mise à jour')
        return
      }

      setSuccess('Informations mises à jour avec succès')
      
      // Mettre à jour l'état local
      setHotel(prev => prev ? { ...prev, ...hotelForm } : null)

    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!user?.email) return

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        setError('Erreur lors de l\'envoi de l\'email de réinitialisation')
        return
      }

      setSuccess('Email de réinitialisation envoyé avec succès')
    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur lors de l\'envoi de l\'email')
    }
  }

  const getSubscriptionStatus = () => {
    if (!hotel) return { text: 'Chargement...', color: 'gray' }

    switch (hotel.subscription_status) {
      case 'trial':
        const trialEnd = hotel.trial_end ? new Date(hotel.trial_end) : null
        const isExpired = trialEnd && trialEnd < new Date()
        return {
          text: isExpired ? 'Expiré' : 'Essai gratuit',
          color: isExpired ? 'red' : 'yellow',
          expiry: trialEnd ? trialEnd.toLocaleDateString('fr-FR') : null
        }
      case 'starter':
        return { text: 'Starter', color: 'blue' }
      case 'business':
        return { text: 'Business', color: 'green' }
      default:
        return { text: 'Inconnu', color: 'gray' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des paramètres...</p>
        </div>
      </div>
    )
  }

  const subscriptionStatus = getSubscriptionStatus()

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
            <p className="text-blue-200 text-xs">Paramètres</p>
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
          {/* Section 1 - Informations de l'hôtel */}
          <div className="bg-white/90 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Informations de l'hôtel</h2>
            
            <form onSubmit={handleSaveHotel} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'hôtel *
                  </label>
                  <input
                    type="text"
                    name="hotel_name"
                    value={hotelForm.hotel_name}
                    onChange={handleHotelFormChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={hotelForm.phone}
                    onChange={handleHotelFormChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  name="address"
                  value={hotelForm.address}
                  onChange={handleHotelFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={hotelForm.email}
                    onChange={handleHotelFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={hotelForm.city}
                    onChange={handleHotelFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pays
                </label>
                <input
                  type="text"
                  name="country"
                  value={hotelForm.country}
                  onChange={handleHotelFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2 - Compte utilisateur */}
          <div className="bg-white/90 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Compte utilisateur</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email connecté
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

              <button
                onClick={handleChangePassword}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Changer le mot de passe
              </button>
            </div>
          </div>

          {/* Section 3 - Abonnement */}
          <div className="bg-white/90 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Abonnement</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan actuel
                </label>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    subscriptionStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    subscriptionStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                    subscriptionStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                    subscriptionStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {subscriptionStatus.text}
                  </span>
                  {subscriptionStatus.expiry && (
                    <span className="text-sm text-gray-600">
                      Expire le {subscriptionStatus.expiry}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => window.open('https://lemonsqueezy.com/billing', '_blank')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Gérer mon abonnement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
