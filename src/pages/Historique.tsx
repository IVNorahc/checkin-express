import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Client {
  id: string
  nom: string
  prenoms: string
  type_piece: string
  date_checkin: string
  chambre: string
  hotel_id: string
}

interface HistoriqueProps {
  onBack?: () => void
}

export default function Historique({ onBack }: HistoriqueProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [user, setUser] = useState<any>(null)
  const [userPlan, setUserPlan] = useState<string>('')

  useEffect(() => {
    fetchUserAndData()
  }, [])

  const fetchUserAndData = async () => {
    try {
      // Récupérer l'utilisateur courant
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

      // Récupérer l'historique des check-ins
      const { data: scanData, error } = await supabase
        .from('scan_history')
        .select('*')
        .eq('hotel_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transformer les données pour le tableau
      const formattedData = scanData?.map(item => ({
        id: item.id,
        nom: item.nom || 'Non spécifié',
        prenoms: item.prenoms || 'Non spécifié',
        type_piece: item.document_type || 'CNI',
        date_checkin: item.created_at,
        chambre: item.chambre || 'Non spécifiée',
        hotel_id: item.hotel_id
      })) || []

      setClients(formattedData)
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.prenoms.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDate = dateFilter 
      ? new Date(client.date_checkin).toISOString().split('T')[0] === dateFilter
      : true

    return matchesSearch && matchesDate
  })

  const exportToCSV = () => {
    if (userPlan !== 'business') {
      alert('L\'export CSV est disponible uniquement pour le plan Business')
      return
    }

    const headers = ['Nom', 'Prénoms', 'Type pièce', 'Date check-in', 'Chambre']
    const csvData = filteredClients.map(client => [
      client.nom,
      client.prenoms,
      client.type_piece,
      new Date(client.date_checkin).toLocaleString('fr-FR'),
      client.chambre
    ])

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `historique-clients-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const viewFiche = (client: Client) => {
    // Rediriger vers la page de fiche avec les données du client
    alert(`Fiche pour ${client.nom} ${client.prenoms} - Fonctionnalité à implémenter`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de l'historique...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Historique des clients</h1>
            <div className="flex gap-3">
              <button
                onClick={exportToCSV}
                className={`px-4 py-2 rounded-lg font-medium ${
                  userPlan === 'business'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={userPlan !== 'business'}
              >
                📊 Export CSV {userPlan !== 'business' && '(Business)'}
              </button>
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

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recherche par nom
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un client..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtre par date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Tableau des clients */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prénom(s)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type pièce
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date check-in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chambre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {client.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.prenoms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {client.type_piece}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(client.date_checkin).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {client.chambre}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => viewFiche(client)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        👁 Voir fiche
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {clients.length === 0 
                  ? 'Aucun client enregistré' 
                  : 'Aucun client trouvé avec ces filtres'
                }
              </div>
            </div>
          )}
        </div>

        {/* Statistiques */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-2xl font-bold text-blue-600">{clients.length}</div>
            <div className="text-sm text-gray-600">Total check-ins</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-2xl font-bold text-green-600">{filteredClients.length}</div>
            <div className="text-sm text-gray-600">Résultats filtrés</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-2xl font-bold text-purple-600">
              {clients.filter(c => 
                new Date(c.date_checkin).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <div className="text-sm text-gray-600">Check-ins aujourd'hui</div>
          </div>
        </div>
      </div>
    </div>
  )
}
