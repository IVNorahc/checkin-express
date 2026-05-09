import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
  id: string
  subscription_status: string
}

export default function Historique() {
  const [clients, setClients] = useState<Client[]>([])
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    fetchHotelAndClients()
  }, [])

  const fetchHotelAndClients = async () => {
    try {
      // Récupérer l'utilisateur courant
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Récupérer les informations de l'hôtel
      const { data: hotelData } = await supabase
        .from('hotels')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (hotelData) {
        setHotel(hotelData)
        await fetchClients(hotelData.id)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async (hotelId: string) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
    
    if (!error) {
      setClients(data || [])
    }
  }

  const filteredClients = clients.filter(client => {
    const matchSearch = search === '' || 
      `${client.nom} ${client.prenoms}` 
        .toLowerCase()
        .includes(search.toLowerCase())
    
    const matchDate = dateFilter === '' || 
      client.created_at.startsWith(dateFilter)
    
    return matchSearch && matchDate
  })

  const handleExportCSV = () => {
    const headers = ['Nom', 'Prénoms', 'Type pièce', 
                     'N° document', 'Chambre', 'Date check-in']
    const rows = filteredClients.map(c => [
      c.nom, c.prenoms, c.document_type,
      c.numero_document, c.chambre,
      new Date(c.created_at).toLocaleDateString('fr-FR')
    ])
    
    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historique-${new Date().toISOString().split('T')[0]}.csv` 
    a.click()
  }

  const navigate = (path: string) => {
    window.location.href = path
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
            <p className="text-blue-200 text-xs">Historique des clients</p>
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
      <div className="min-h-screen bg-white/80">

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.replace(window.location.origin + '/login')
            }}
            className="bg-white/20 hover:bg-white/30 text-white 
                       border border-white/30 px-4 py-2 rounded-lg text-sm"
        </div>

        {/* Barre de recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
            className="w-full sm:w-auto border rounded-lg px-4 py-2"
          />
          
          {/* Bouton export CSV - Plan Business uniquement */}
          {hotel?.subscription_status === 'business' && (
            <button
              onClick={handleExportCSV}
              className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg"
            >
              Exporter CSV
            </button>
          )}
        </div>

        {/* Table des clients */}
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
                    <button 
                      onClick={() => navigate(`/fiches/${client.id}`)}
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
          /* État vide */
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📋</p>
            <p className="font-bold text-blue-900 text-xl">
              Aucun check-in effectué
            </p>
            <p className="text-gray-500 mb-6">
              Les clients apparaîtront ici après leur check-in
            </p>
            <button
              onClick={() => navigate('/scan')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Scanner un premier client
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
