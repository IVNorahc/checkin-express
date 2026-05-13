import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BackButton from '../components/BackButton'

interface Client {
  id: string
  hotel_id: string
  nom: string
  prenoms: string
  date_naissance: string
  lieu_naissance: string
  nationalite: string
  document_type: string
  numero_document: string
  date_delivrance: string
  date_expiration: string
  chambre: string
  profession: string
  domicile: string
  venant_de: string
  allant_a: string
  objet_voyage: string
  nb_enfants: string
  immatriculation: string
  signature: string
  created_at: string
}

interface Hotel {
  hotel_name: string
}

export default function Historique() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [hotel, setHotel] = useState<Hotel | null>(null)

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.replace(window.location.origin + '/login')
  }

  useEffect(() => {
    const loadClients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Récupérer les informations de l'hôtel
        const { data: hotelData } = await supabase
          .from('hotels')
          .select('hotel_name')
          .eq('user_id', user.id)
          .single()

        setHotel(hotelData)

        // Récupérer les clients depuis la table clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false })

        if (clientsError) {
          console.error('Erreur chargement clients:', clientsError)
          setError('Erreur lors du chargement des clients')
          return
        }

        setClients(clientsData || [])
      } catch (err) {
        console.log('Erreur complète:', JSON.stringify(err))
        console.error('Erreur:', err)
        setError('Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }

    loadClients()
  }, [])

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.nom.toLowerCase().includes(search.toLowerCase()) ||
                         client.prenoms.toLowerCase().includes(search.toLowerCase())
    const matchesDate = dateFilter ? 
      new Date(client.created_at).toISOString().slice(0, 10) === dateFilter : true
    return matchesSearch && matchesDate
  })

  const handleExportCSV = () => {
    const headers = ['Nom', 'Prénoms', 'Type pièce', 'N° document', 'Chambre', 'Date check-in', 'Nationalité', 'Profession']
    const csvData = filteredClients.map(client => [
      client.nom,
      client.prenoms,
      client.document_type,
      client.numero_document,
      client.chambre || '',
      new Date(client.created_at).toLocaleDateString('fr-FR'),
      client.nationalite,
      client.profession || ''
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `historique-clients-${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de l'historique...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Erreur</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 md:px-8 py-3"
        style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
        
        <div className="flex items-center gap-3">
          <div className="bg-white/90 rounded-xl p-2">
            <img src="/percepta-logo.png" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Check-in Express</h1>
            <p className="text-blue-200 text-xs">Historique des clients</p>
          </div>
        </div>

        <button 
          onClick={signOut}
          className="w-full md:w-auto bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Déconnexion
        </button>
      </header>

      {/* CONTENU */}
      <div className="p-4 md:p-8 gap-3 md:gap-6">
        <BackButton />

        {/* Titre */}
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Historique des clients</h1>
          <p className="mt-2 text-gray-600">Tous les check-ins effectués dans votre établissement</p>
        </div>

        {/* Barre de recherche + filtres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {/* Recherche par nom */}
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
          
          {/* Filtre par date */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
          
          {/* Bouton export CSV */}
          <button
            onClick={handleExportCSV}
            className="w-full md:w-auto bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Exporter CSV
          </button>
        </div>

        {/* Version Desktop - Tableau */}
        <div className="hidden md:block">
          {filteredClients.length > 0 ? (
            <table className="w-full bg-white/90 rounded-xl shadow-sm">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom complet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type pièce
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N° document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chambre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date check-in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nationalité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.nom} {client.prenoms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.document_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.numero_document}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.chambre || 'Non spécifiée'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(client.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.nationalite}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => window.location.href = `/fiches/${client.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Voir fiche
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">📋</p>
              <p className="font-bold text-blue-900 text-xl">
                Aucun check-in effectué
              </p>
              <p className="text-gray-500 mb-6">
                Commencez à scanner des documents pour voir l'historique
              </p>
              <button
                onClick={() => window.location.href = '/scanner'}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Scanner un document
              </button>
            </div>
          )}
        </div>

        {/* Version Mobile - Cartes */}
        <div className="block md:hidden">
          {filteredClients.length > 0 ? (
            <div className="space-y-4">
              {filteredClients.map(client => (
                <div key={client.id} className="bg-white/90 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {client.nom} {client.prenoms}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Type pièce:</span>
                      <span className="text-sm text-gray-900">{client.document_type}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">N° document:</span>
                      <span className="text-sm text-gray-900">{client.numero_document}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Chambre:</span>
                      <span className="text-sm text-gray-900">{client.chambre || 'Non spécifiée'}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Date check-in:</span>
                      <span className="text-sm text-gray-900">
                        {new Date(client.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Nationalité:</span>
                      <span className="text-sm text-gray-900">{client.nationalite}</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <button 
                      onClick={() => window.location.href = `/fiches/${client.id}`}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Voir fiche
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">📋</p>
              <p className="font-bold text-blue-900 text-xl">
                Aucun check-in effectué
              </p>
              <p className="text-gray-500 mb-6">
                Commencez à scanner des documents pour voir l'historique
              </p>
              <button
                onClick={() => window.location.href = '/scanner'}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Scanner un document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
