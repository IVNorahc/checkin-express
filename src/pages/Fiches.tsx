import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import jsPDF from 'jspdf'

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

export default function Fiches() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    nom: '',
    prenoms: '',
    date_naissance: '',
    lieu_naissance: '',
    nationalite: '',
    document_type: 'CIN' as 'CIN' | 'Passeport' | 'Titre de séjour',
    numero_document: '',
    date_delivrance: '',
    date_expiration: '',
    chambre: '',
    profession: '',
    domicile: '',
    venant_de: '',
    allant_a: '',
    objet_voyage: '',
    nb_enfants: '',
    immatriculation: ''
  })

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

  const filteredClients = clients.filter(client => 
    client.nom.toLowerCase().includes(search.toLowerCase()) ||
    client.prenoms.toLowerCase().includes(search.toLowerCase())
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Récupérer l'ID de l'hôtel
      const { data: hotelData } = await supabase
        .from('hotels')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!hotelData?.id) {
        alert('Erreur: hôtel non trouvé')
        return
      }

      // Sauvegarder dans la table clients
      const { data, error } = await supabase
        .from('clients')
        .insert({
          hotel_id: hotelData.id,
          nom: formData.nom,
          prenoms: formData.prenoms,
          date_naissance: formData.date_naissance,
          lieu_naissance: formData.lieu_naissance,
          nationalite: formData.nationalite,
          document_type: formData.document_type,
          numero_document: formData.numero_document,
          date_delivrance: formData.date_delivrance,
          date_expiration: formData.date_expiration,
          chambre: formData.chambre,
          profession: formData.profession,
          domicile: formData.domicile,
          venant_de: formData.venant_de,
          allant_a: formData.allant_a,
          objet_voyage: formData.objet_voyage,
          nb_enfants: formData.nb_enfants,
          immatriculation: formData.immatriculation
        })
        .select()
        .single()

      if (error) {
        console.error('Erreur sauvegarde:', error)
        alert('Erreur lors de la sauvegarde')
        return
      }

      // Générer le PDF
      await generatePDF({
        id: data.id,
        hotel_id: hotelData.id,
        ...formData,
        signature: '',
        created_at: new Date().toISOString()
      })

      // Mettre à jour la liste
      const newClient: Client = {
        id: data.id,
        hotel_id: hotelData.id,
        ...formData,
        signature: '',
        created_at: new Date().toISOString()
      }
      setClients(prev => [newClient, ...prev])

      // Fermer la modale et réinitialiser
      setShowModal(false)
      setFormData({
        nom: '',
        prenoms: '',
        date_naissance: '',
        lieu_naissance: '',
        nationalite: '',
        document_type: 'CIN',
        numero_document: '',
        date_delivrance: '',
        date_expiration: '',
        chambre: '',
        profession: '',
        domicile: '',
        venant_de: '',
        allant_a: '',
        objet_voyage: '',
        nb_enfants: '',
        immatriculation: ''
      })

    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur lors de la création de la fiche')
    }
  }

  const generatePDF = async (client: Client) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a6'
    })

    // PAGE 1 - RECTO
    pdf.setFontSize(16)
    pdf.text('FICHE DE POLICE', 52.5, 15, { align: 'center' })
    
    pdf.setFontSize(12)
    pdf.text(`Hôtel: ${hotel?.hotel_name || ''}`, 52.5, 25, { align: 'center' })
    
    pdf.setFontSize(10)
    let yPosition = 40
    
    pdf.text(`Nom: ${client.nom}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Prénoms: ${client.prenoms}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Date de naissance: ${client.date_naissance}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Lieu de naissance: ${client.lieu_naissance}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Nationalité: ${client.nationalite}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Type pièce: ${client.document_type}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Numéro pièce: ${client.numero_document}`, 8, yPosition)

    // PAGE 2 - VERSO
    pdf.addPage()
    pdf.setFontSize(16)
    pdf.text('FICHE DE POLICE', 52.5, 15, { align: 'center' })
    
    pdf.setFontSize(10)
    yPosition = 40
    
    pdf.text(`Profession: ${client.profession}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Domicile: ${client.domicile}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Venant de: ${client.venant_de}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Allant à: ${client.allant_a}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Objet du voyage: ${client.objet_voyage}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Chambre: ${client.chambre}`, 8, yPosition)
    yPosition += 20
    
    // Zone signature client
    pdf.text('Signature client:', 8, yPosition)
    pdf.line(8, yPosition + 5, 52.5, yPosition + 5)
    yPosition += 15
    
    // Zone cachet hôtel
    pdf.text('Cachet hôtel:', 8, yPosition)
    pdf.line(8, yPosition + 5, 52.5, yPosition + 5)

    // Sauvegarder et imprimer
    const pdfBlob = pdf.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    const printWindow = window.open(pdfUrl)
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
        setTimeout(() => {
          printWindow.close()
          URL.revokeObjectURL(pdfUrl)
        }, 1000)
      }
    }
  }

  const handlePrintFiche = async (client: Client) => {
    await generatePDF(client)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des fiches...</p>
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
      <header className="flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
        
        <div className="flex items-center gap-3">
          <div className="bg-white/90 rounded-xl p-2">
            <img src="/percepta-logo.png" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Check-in Express</h1>
            <p className="text-blue-200 text-xs">Gestion des fiches</p>
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
        {/* Bouton retour */}
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>

        {/* En-tête avec bouton nouvelle fiche */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fiches de police</h1>
            <p className="mt-2 text-gray-600">Gérez les fiches de police de vos clients</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <span className="text-xl">＋</span>
            Nouvelle fiche
          </button>
        </div>

        {/* Champ de recherche */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher par nom ou prénom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        {/* Tableau des fiches */}
        {filteredClients.length > 0 ? (
          <div className="bg-white/90 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prénoms
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nationalité
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
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map(client => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {client.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.prenoms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.nationalite}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.chambre || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(client.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handlePrintFiche(client)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Imprimer fiche
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📋</p>
            <p className="font-bold text-blue-900 text-xl">
              Aucune fiche trouvée
            </p>
            <p className="text-gray-500 mb-6">
              Créez votre première fiche de police
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Créer une fiche
            </button>
          </div>
        )}
      </div>

      {/* MODALE NOUVELLE FICHE */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Nouvelle fiche de police</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom *
                    </label>
                    <input
                      type="text"
                      name="nom"
                      value={formData.nom}
                      onChange={handleInputChange}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénoms *
                    </label>
                    <input
                      type="text"
                      name="prenoms"
                      value={formData.prenoms}
                      onChange={handleInputChange}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de naissance *
                    </label>
                    <input
                      type="date"
                      name="date_naissance"
                      value={formData.date_naissance}
                      onChange={handleInputChange}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lieu de naissance
                    </label>
                    <input
                      type="text"
                      name="lieu_naissance"
                      value={formData.lieu_naissance}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nationalité *
                  </label>
                  <input
                    type="text"
                    name="nationalite"
                    value={formData.nationalite}
                    onChange={handleInputChange}
                    required
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type pièce *
                    </label>
                    <select
                      name="document_type"
                      value={formData.document_type}
                      onChange={handleInputChange}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="CIN">CIN</option>
                      <option value="Passeport">Passeport</option>
                      <option value="Titre de séjour">Titre de séjour</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro pièce *
                    </label>
                    <input
                      type="text"
                      name="numero_document"
                      value={formData.numero_document}
                      onChange={handleInputChange}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de délivrance
                    </label>
                    <input
                      type="date"
                      name="date_delivrance"
                      value={formData.date_delivrance}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date d'expiration
                    </label>
                    <input
                      type="date"
                      name="date_expiration"
                      value={formData.date_expiration}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de chambre *
                  </label>
                  <input
                    type="text"
                    name="chambre"
                    value={formData.chambre}
                    onChange={handleInputChange}
                    required
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profession
                  </label>
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domicile
                  </label>
                  <input
                    type="text"
                    name="domicile"
                    value={formData.domicile}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Venant de
                    </label>
                    <input
                      type="text"
                      name="venant_de"
                      value={formData.venant_de}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allant à
                    </label>
                    <input
                      type="text"
                      name="allant_a"
                      value={formData.allant_a}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objet du voyage
                  </label>
                  <input
                    type="text"
                    name="objet_voyage"
                    value={formData.objet_voyage}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre d'enfants
                    </label>
                    <input
                      type="text"
                      name="nb_enfants"
                      value={formData.nb_enfants}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    Immatriculation véhicule
                    </label>
                    <input
                      type="text"
                      name="immatriculation"
                      value={formData.immatriculation}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Générer et imprimer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
