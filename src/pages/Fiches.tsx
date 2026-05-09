import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import jsPDF from 'jspdf'

interface Fiche {
  id: string
  nom: string
  prenom: string
  date_naissance: string
  nationalite: string
  numero_piece: string
  type_piece: 'CIN' | 'Passeport' | 'Titre de séjour'
  date_arrivee: string
  date_depart: string
  numero_chambre: string
  created_at: string
  statut: 'En attente' | 'Imprimé'
}

interface Hotel {
  hotel_name: string
}

export default function Fiches() {
  const [fiches, setFiches] = useState<Fiche[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    date_naissance: '',
    nationalite: '',
    numero_piece: '',
    type_piece: 'CIN' as 'CIN' | 'Passeport' | 'Titre de séjour',
    date_arrivee: '',
    date_depart: '',
    numero_chambre: ''
  })

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.replace(window.location.origin + '/login')
  }

  useEffect(() => {
    const loadFiches = async () => {
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

        // Récupérer les fiches depuis scan_history
        const { data: fichesData, error: fichesError } = await supabase
          .from('scan_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (fichesError) {
          console.error('Erreur chargement fiches:', fichesError)
          setError('Erreur lors du chargement des fiches')
          return
        }

        // Transformer les données en format Fiche
        const transformedFiches = (fichesData || []).map(item => ({
          id: item.id,
          nom: item.nom || '',
          prenom: item.prenoms || '',
          date_naissance: item.dateNaissance || '',
          nationalite: item.nationalite || '',
          numero_piece: item.numeroDocument || '',
          type_piece: item.documentType as 'CIN' | 'Passeport' | 'Titre de séjour' || 'CIN',
          date_arrivee: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : '',
          date_depart: '', // À calculer selon la logique métier
          numero_chambre: item.roomNumber || '',
          created_at: item.created_at,
          statut: (item.printed ? 'Imprimé' : 'En attente') as 'Imprimé' | 'En attente'
        }))

        setFiches(transformedFiches)
      } catch (err) {
        console.error('Erreur:', err)
        setError('Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }

    loadFiches()
  }, [])

  const filteredFiches = fiches.filter(fiche => 
    fiche.nom.toLowerCase().includes(search.toLowerCase()) ||
    fiche.prenom.toLowerCase().includes(search.toLowerCase())
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

      // Sauvegarder dans Supabase
      const { data, error } = await supabase
        .from('scan_history')
        .insert({
          user_id: user.id,
          nom: formData.nom,
          prenoms: formData.prenom,
          dateNaissance: formData.date_naissance,
          nationalite: formData.nationalite,
          numeroDocument: formData.numero_piece,
          documentType: formData.type_piece,
          roomNumber: formData.numero_chambre,
          printed: false
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
        ...formData,
        created_at: new Date().toISOString(),
        statut: 'En attente'
      })

      // Mettre à jour la liste
      const newFiche: Fiche = {
        id: data.id,
        ...formData,
        created_at: new Date().toISOString(),
        statut: 'En attente'
      }
      setFiches(prev => [newFiche, ...prev])

      // Fermer la modale et réinitialiser
      setShowModal(false)
      setFormData({
        nom: '',
        prenom: '',
        date_naissance: '',
        nationalite: '',
        numero_piece: '',
        type_piece: 'CIN',
        date_arrivee: '',
        date_depart: '',
        numero_chambre: ''
      })

    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur lors de la création de la fiche')
    }
  }

  const generatePDF = async (fiche: Fiche) => {
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
    
    pdf.text(`Nom: ${fiche.nom}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Prénom: ${fiche.prenom}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Date de naissance: ${fiche.date_naissance}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Nationalité: ${fiche.nationalite}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Type pièce: ${fiche.type_piece}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Numéro pièce: ${fiche.numero_piece}`, 8, yPosition)

    // PAGE 2 - VERSO
    pdf.addPage()
    pdf.setFontSize(16)
    pdf.text('FICHE DE POLICE', 52.5, 15, { align: 'center' })
    
    pdf.setFontSize(10)
    yPosition = 40
    
    pdf.text(`Date d'arrivée: ${fiche.date_arrivee}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Date de départ: ${fiche.date_depart}`, 8, yPosition)
    yPosition += 8
    pdf.text(`Numéro de chambre: ${fiche.numero_chambre}`, 8, yPosition)
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

    // Mettre à jour le statut
    await supabase
      .from('scan_history')
      .update({ printed: true })
      .eq('id', fiche.id)
  }

  const handlePrintFiche = async (fiche: Fiche) => {
    await generatePDF(fiche)
    // Mettre à jour le statut localement
    setFiches(prev => 
      prev.map(f => f.id === fiche.id ? { ...f, statut: 'Imprimé' } : f)
    )
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
        {filteredFiches.length > 0 ? (
          <div className="bg-white/90 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prénom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date d'arrivée
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de départ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chambre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFiches.map(fiche => (
                  <tr key={fiche.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {fiche.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fiche.prenom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fiche.date_arrivee}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fiche.date_depart || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fiche.numero_chambre || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        fiche.statut === 'Imprimé' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {fiche.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handlePrintFiche(fiche)}
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
                      Prénom *
                    </label>
                    <input
                      type="text"
                      name="prenom"
                      value={formData.prenom}
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type pièce *
                    </label>
                    <select
                      name="type_piece"
                      value={formData.type_piece}
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
                      name="numero_piece"
                      value={formData.numero_piece}
                      onChange={handleInputChange}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date d'arrivée *
                    </label>
                    <input
                      type="date"
                      name="date_arrivee"
                      value={formData.date_arrivee}
                      onChange={handleInputChange}
                      required
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de départ *
                    </label>
                    <input
                      type="date"
                      name="date_depart"
                      value={formData.date_depart}
                      onChange={handleInputChange}
                      required
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
                    name="numero_chambre"
                    value={formData.numero_chambre}
                    onChange={handleInputChange}
                    required
                    className="w-full border rounded-lg px-3 py-2"
                  />
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
