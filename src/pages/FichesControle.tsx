import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { generateFicheControle, saveFicheToSupabase } from '../utils/generateFicheControle'

type FicheControle = {
  id: string
  hotel_id: string
  guest_name: string
  created_at: string
  file_path: string
  file_url: string
}

type FichesControleProps = {
  session?: Session
  onBack: () => void
}

export default function FichesControle({ session, onBack }: FichesControleProps) {
  const [fiches, setFiches] = useState<FicheControle[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadFiches()
  }, [])

  const loadFiches = async () => {
    try {
      if (!session) return
      
      const { data, error } = await supabase
        .from('fiches_controle')
        .select('*')
        .eq('hotel_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur chargement fiches:', error)
        return
      }

      setFiches(data || [])
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleGenerateFiche = async () => {
    if (!guestName.trim()) {
      alert('Veuillez entrer le nom du client')
      return
    }

    if (!session) {
      alert('Session non trouvée')
      return
    }

    setGenerating(true)
    try {
      // Get hotel info
      const hotelName = (session.user.user_metadata?.hotel_name as string | undefined) || session.user.email || 'Mon hôtel'
      const hotelPhone = (session.user.user_metadata?.phone as string | undefined) || '+221 33 000 00 00'

      // Generate PDF blob
      const blob = await generateFicheControle(hotelName, hotelPhone, guestName.trim())

      // Save to Supabase
      const signedUrl = await saveFicheToSupabase(blob, guestName.trim(), session.user.id)

      // Refresh list
      await loadFiches()

      // Close modal and reset
      setShowModal(false)
      setGuestName('')

      alert('Fiche de contrôle générée avec succès!')
    } catch (error) {
      console.error('Erreur génération fiche:', error)
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleView = (signedUrl: string) => {
    // Generate fresh signed URL
    supabase.storage
      .from('fiches-controle')
      .createSignedUrl(signedUrl.split('/').pop() || '', 3600)
      .then(({ data }) => {
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank')
        }
      })
      .catch(console.error)
  }

  const handleDownload = (fiche: FicheControle) => {
    // Generate fresh signed URL
    supabase.storage
      .from('fiches-controle')
      .createSignedUrl(fiche.file_path.split('/').pop() || '', 3600)
      .then(({ data }) => {
        if (data?.signedUrl) {
          const link = document.createElement('a')
          link.href = data.signedUrl
          link.download = `fiche-controle-${fiche.guest_name}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      })
      .catch(console.error)
  }

  const handlePrint = (fiche: FicheControle) => {
    // Generate fresh signed URL
    supabase.storage
      .from('fiches-controle')
      .createSignedUrl(fiche.file_path.split('/').pop() || '', 3600)
      .then(({ data }) => {
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank')
          setTimeout(() => {
            window.print()
          }, 1000)
        }
      })
      .catch(console.error)
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] py-4 sm:py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1e3a8a] mb-2">
              📋 Mes Fiches de Contrôle
            </h1>
            <p className="text-[#64748b]">
              Gérez vos fiches de contrôle hôtelière
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 text-[#1e3a8a] hover:text-[#1e40af] font-medium"
          >
            ← Retour
          </button>
        </div>

        {/* Add new fiche button */}
        <div className="mb-8">
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#16a34a] to-[#22c55e] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
          >
            ➕ Nouvelle fiche
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a]"></div>
            <p className="mt-4 text-[#64748b]">Chargement des fiches...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && fiches.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-[#e2e8f0]">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-[#1e3a8a] mb-2">
              Aucune fiche générée pour le moment
            </h3>
            <p className="text-[#64748b] mb-6">
              Commencez par créer votre première fiche de contrôle
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#16a34a] to-[#22c55e] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
            >
              Créer ma première fiche
            </button>
          </div>
        )}

        {/* Fiches list */}
        {!loading && fiches.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fiches.map((fiche) => (
              <div
                key={fiche.id}
                className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] p-6 hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-[#1e3a8a] text-lg mb-1">
                      {fiche.guest_name}
                    </h3>
                    <p className="text-sm text-[#64748b]">
                      {formatDate(fiche.created_at)}
                    </p>
                  </div>
                  <div className="text-2xl">📋</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(fiche.file_url)}
                    className="flex-1 px-3 py-2 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg hover:bg-[#1e40af] transition-colors duration-200 flex items-center justify-center gap-1"
                  >
                    👁 Visualiser
                  </button>
                  <button
                    onClick={() => handleDownload(fiche)}
                    className="flex-1 px-3 py-2 bg-[#16a34a] text-white text-sm font-medium rounded-lg hover:bg-[#15803d] transition-colors duration-200 flex items-center justify-center gap-1"
                  >
                    ⬇ Télécharger
                  </button>
                  <button
                    onClick={() => handlePrint(fiche)}
                    className="flex-1 px-3 py-2 bg-[#64748b] text-white text-sm font-medium rounded-lg hover:bg-[#475569] transition-colors duration-200 flex items-center justify-center gap-1"
                  >
                    🖨 Imprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-[#1e3a8a] mb-4">
              Nouvelle fiche de contrôle
            </h2>
            
            <div className="mb-6">
              <label htmlFor="guestName" className="block text-sm font-medium text-[#1e3a8a] mb-2">
                Nom du client
              </label>
              <input
                id="guestName"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Entrez le nom complet du client"
                className="w-full px-4 py-3 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setGuestName('')
                }}
                className="flex-1 px-4 py-3 border border-[#e2e8f0] text-[#64748b] font-medium rounded-lg hover:bg-[#f1f5f9] transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateFiche}
                disabled={generating || !guestName.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#16a34a] to-[#22c55e] text-white font-medium rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Génération...
                  </>
                ) : (
                  'Générer la fiche'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
