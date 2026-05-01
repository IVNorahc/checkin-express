import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface HotelProfile {
  hotel_name: string
  phone: string
  email: string
  country: string
  subscription_status: string
}

interface ParametresProps {
  onBack?: () => void
}

export default function Parametres({ onBack }: ParametresProps) {
  const [profile, setProfile] = useState<HotelProfile>({
    hotel_name: '',
    phone: '',
    email: '',
    country: '',
    subscription_status: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUser(user)

      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      setProfile({
        hotel_name: data?.hotel_name || '',
        phone: data?.phone || '',
        email: user.email || '',
        country: data?.country || '',
        subscription_status: data?.subscription_status || 'trial'
      })
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('hotels')
        .update({
          hotel_name: profile.hotel_name,
          phone: profile.phone,
          country: profile.country
        })
        .eq('user_id', user.id)

      if (error) throw error

      alert('Informations sauvegardées avec succès!')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde des informations')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Les mots de passe ne correspondent pas')
      return
    }

    if (newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      alert('Mot de passe modifié avec succès!')
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error)
      alert('Erreur lors du changement de mot de passe')
    } finally {
      setSaving(false)
    }
  }

  const countries = [
    'Sénégal', 'France', 'Belgique', 'Suisse', 'Canada', 'Maroc', 
    'Tunisie', 'Algérie', 'Côte d\'Ivoire', 'Mali', 'Burkina Faso',
    'Niger', 'Guinée', 'Togo', 'Bénin', 'Mauritanie'
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des paramètres...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
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
          {/* Informations de l'hôtel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Informations de l'hôtel
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'hôtel
                  </label>
                  <input
                    type="text"
                    value={profile.hotel_name}
                    onChange={(e) => setProfile({...profile, hotel_name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom de votre hôtel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+221 33 000 00 00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    placeholder="email@exemple.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    L'email ne peut pas être modifié ici
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pays
                  </label>
                  <select
                    value={profile.country}
                    onChange={(e) => setProfile({...profile, country: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un pays</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Abonnement */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Abonnement
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Plan actuel</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    profile.subscription_status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                    profile.subscription_status === 'starter' ? 'bg-green-100 text-green-800' :
                    profile.subscription_status === 'business' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.subscription_status === 'trial' ? 'Trial' :
                     profile.subscription_status === 'starter' ? 'Starter' :
                     profile.subscription_status === 'business' ? 'Business' :
                     'Expiré'}
                  </span>
                </div>
                <button
                  onClick={() => window.location.href = '/pricing'}
                  className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
                >
                  Mettre à niveau
                </button>
              </div>
            </div>

            {/* Sécurité */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Sécurité
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700"
                >
                  🔒 Changer le mot de passe
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                      await supabase.auth.signOut()
                      window.location.href = '/'
                    }
                  }}
                  className="w-full px-4 py-2 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50"
                >
                  Déconnexion
                </button>
              </div>
            </div>

            {/* Support */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Support
              </h3>
              <div className="space-y-3">
                <a
                  href="/support"
                  className="block w-full px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 text-center"
                >
                  💬 Contacter le support
                </a>
                <a
                  href="mailto:support@percepta.io"
                  className="block w-full px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-center"
                >
                  📧 support@percepta.io
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal changement de mot de passe */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Changer le mot de passe
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nouveau mot de passe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirmer le mot de passe"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleChangePassword}
                disabled={saving || !newPassword || !confirmPassword}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Changement...' : 'Changer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
