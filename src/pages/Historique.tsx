import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useHotel } from '../contexts/HotelContext'
import { getDB } from '../lib/db'
import LogoutConfirmModal from '../components/LogoutConfirmModal'

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
  numero_registre?: string
  checkout_status?: 'present' | 'departed'
  checkout_date?: string | null
}

interface Hotel {
  id: string
  hotel_name: string
}

function EditModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client
  onClose: () => void
  onSaved: (updated: Client) => void
}) {
  const [form, setForm] = useState({
    nom: client.nom ?? '',
    prenoms: client.prenoms ?? '',
    date_naissance: client.date_naissance ? client.date_naissance.slice(0, 10) : '',
    nationalite: client.nationalite ?? '',
    numero_document: client.numero_document ?? '',
    chambre: client.chambre ?? '',
    venant_de: client.venant_de ?? '',
    allant_a: client.allant_a ?? '',
    objet_voyage: client.objet_voyage ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const setField = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          nom: form.nom,
          prenoms: form.prenoms,
          date_naissance: form.date_naissance || null,
          nationalite: form.nationalite,
          numero_document: form.numero_document,
          chambre: form.chambre,
          venant_de: form.venant_de,
          allant_a: form.allant_a,
          objet_voyage: form.objet_voyage,
        })
        .eq('id', client.id)

      if (updateError) throw updateError

      // Best-effort IndexedDB sync (match par documentNumber original)
      try {
        const db = getDB()
        const existing = await db.clients
          .where('documentNumber')
          .equals(client.numero_document)
          .first()
        if (existing?.id !== undefined) {
          await db.clients.update(existing.id, {
            surname: form.nom,
            givenNames: form.prenoms,
            dateOfBirth: form.date_naissance,
            nationality: form.nationalite,
            documentNumber: form.numero_document,
            roomNumber: form.chambre,
          })
        }
      } catch {
        // DB non initialisÃ©e ou enregistrement absent â€” non bloquant
      }

      const updated: Client = {
        ...client,
        nom: form.nom,
        prenoms: form.prenoms,
        date_naissance: form.date_naissance,
        nationalite: form.nationalite,
        numero_document: form.numero_document,
        chambre: form.chambre,
        venant_de: form.venant_de,
        allant_a: form.allant_a,
        objet_voyage: form.objet_voyage,
      }
      setSuccess(true)
      setTimeout(() => {
        onSaved(updated)
        onClose()
      }, 1200)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setSaveError(`Erreur lors de la sauvegarde : ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const FIELDS: { label: string; field: keyof typeof form; type: string }[] = [
    { label: 'Nom', field: 'nom', type: 'text' },
    { label: 'PrÃ©noms', field: 'prenoms', type: 'text' },
    { label: 'Date de naissance', field: 'date_naissance', type: 'date' },
    { label: 'NationalitÃ©', field: 'nationalite', type: 'text' },
    { label: 'NÂ° document', field: 'numero_document', type: 'text' },
    { label: 'Chambre', field: 'chambre', type: 'text' },
    { label: 'Venant de', field: 'venant_de', type: 'text' },
    { label: 'Allant Ã ', field: 'allant_a', type: 'text' },
    { label: 'Objet du voyage', field: 'objet_voyage', type: 'text' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-bold text-[#1e3a8a] text-base">âœï¸ Modifier la fiche</h2>
            <p className="text-xs text-gray-500 mt-0.5">{client.nom} {client.prenoms}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            âœ•
          </button>
        </div>

        {/* Bandeau succÃ¨s */}
        {success && (
          <div className="mx-5 mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-green-600 text-base">âœ“</span>
            <p className="text-sm text-green-700 font-medium">Fiche mise Ã  jour avec succÃ¨s !</p>
          </div>
        )}

        {/* Bandeau erreur */}
        {saveError && (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700">{saveError}</p>
          </div>
        )}

        {/* Formulaire */}
        <div className="px-5 py-4 space-y-4">
          {FIELDS.map(({ label, field, type }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-[#64748b] mb-1">{label}</label>
              <input
                type={type}
                value={form[field]}
                onChange={setField(field)}
                disabled={saving || success}
                className="w-full border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-sm text-[#1e293b] bg-white focus:outline-none focus:border-[#1e3a8a] transition-colors disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          ))}
        </div>

        {/* Boutons */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 border border-[#e2e8f0] text-[#475569] py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || success}
            className="flex-1 bg-[#1e3a8a] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#162f6b] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrementâ€¦
              </>
            ) : success ? 'âœ“ EnregistrÃ©' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ClientModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const fmt = (v: string | undefined | null) => v || 'â€”'
  const fmtDate = (v: string | undefined | null) => {
    if (!v) return 'â€”'
    try { return new Date(v).toLocaleDateString('fr-FR') } catch { return v }
  }

  const fields: { label: string; value: string }[] = [
    { label: 'NÂ° Registre', value: fmt(client.numero_registre) },
    { label: 'Nom', value: fmt(client.nom) },
    { label: 'PrÃ©noms', value: fmt(client.prenoms) },
    { label: 'Date de naissance', value: fmtDate(client.date_naissance) },
    { label: 'Lieu de naissance', value: fmt(client.lieu_naissance) },
    { label: 'NationalitÃ©', value: fmt(client.nationalite) },
    { label: 'Type de document', value: fmt(client.document_type) },
    { label: 'NÂ° document', value: fmt(client.numero_document) },
    { label: 'Date de dÃ©livrance', value: fmtDate(client.date_delivrance) },
    { label: "Date d'expiration", value: fmtDate(client.date_expiration) },
    { label: 'Chambre', value: fmt(client.chambre) },
    { label: 'Profession', value: fmt(client.profession) },
    { label: 'Domicile habituel', value: fmt(client.domicile) },
    { label: 'Venant de', value: fmt(client.venant_de) },
    { label: 'Allant Ã ', value: fmt(client.allant_a) },
    { label: 'Objet du voyage', value: fmt(client.objet_voyage) },
    { label: "Date d'arrivÃ©e", value: fmtDate(client.created_at) },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header modale */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-blue-900 text-base">
              {client.nom} {client.prenoms}
            </h2>
            {client.numero_registre && (
              <p className="text-xs font-mono text-blue-600 mt-0.5">NÂ° {client.numero_registre}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            âœ•
          </button>
        </div>

        {/* Champs */}
        <div className="px-5 py-4 space-y-3">
          {fields.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-start gap-3">
              <span className="text-xs text-gray-500 flex-shrink-0 pt-0.5">{label}</span>
              <span className="text-sm text-gray-900 font-medium text-right">{value}</span>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Historique() {
  const navigate = useNavigate()
  const { hotelId: ctxHotelId } = useHotel()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [nationaliteFilter, setNationaliteFilter] = useState('')
  const [chambreFilter, setChambreFilter] = useState('')
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [checkingOut, setCheckingOut] = useState<Set<string>>(new Set())

  const handleClientSaved = (updated: Client) => {
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  const handleCheckout = async (clientId: string) => {
    if (checkingOut.has(clientId)) return
    setCheckingOut(prev => new Set(prev).add(clientId))
    try {
      const ts = new Date().toISOString()
      const { error } = await supabase
        .from('clients')
        .update({ checkout_status: 'departed', checkout_date: ts })
        .eq('id', clientId)
      if (!error) {
        setClients(prev =>
          prev.map(c => c.id === clientId ? { ...c, checkout_status: 'departed' as const, checkout_date: ts } : c)
        )
      }
    } finally {
      setCheckingOut(prev => { const s = new Set(prev); s.delete(clientId); return s })
    }
  }

  const [showLogout, setShowLogout] = useState(false)

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.replace(window.location.origin + '/login')
  }

  useEffect(() => {
    const loadClients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Use hotel_id from context (employee or owner), fall back to owner lookup
        let hotelId: string | null = ctxHotelId
        let hotelName: string | null = null

        if (!hotelId) {
          const { data: hotelData } = await supabase
            .from('hotels')
            .select('id, hotel_name')
            .eq('user_id', user.id)
            .single()
          hotelId = hotelData?.id ?? null
          hotelName = hotelData?.hotel_name ?? null
        } else {
          const { data: hotelData } = await supabase
            .from('hotels')
            .select('hotel_name')
            .eq('id', hotelId)
            .single()
          hotelName = hotelData?.hotel_name ?? null
        }

        if (hotelId) setHotel({ id: hotelId, hotel_name: hotelName ?? '' })

        if (!hotelId) {
          setClients([])
          return
        }

        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .eq('hotel_id', hotelId)
          .order('created_at', { ascending: false })

        if (clientsError) {
          console.error('Erreur chargement clients:', clientsError)
          setError('Erreur lors du chargement des clients')
          return
        }

        setClients(clientsData || [])
      } catch (err) {
        console.error('Erreur:', err)
        setError('Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }

    loadClients()
  }, [ctxHotelId])

  const nationalites = useMemo(() => {
    const set = new Set(clients.map(c => c.nationalite).filter(Boolean))
    return Array.from(set).sort()
  }, [clients])

  const chambres = useMemo(() => {
    const set = new Set(clients.map(c => c.chambre).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [clients])

  const hasActiveFilters = search !== '' || dateFilter !== 'all' || nationaliteFilter !== '' || chambreFilter !== ''

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim()
    const now = new Date()

    return clients.filter(client => {
      // Recherche texte : nom, prÃ©nom, chambre, nÂ° document
      if (q) {
        const inNom = (client.nom ?? '').toLowerCase().includes(q)
        const inPrenoms = (client.prenoms ?? '').toLowerCase().includes(q)
        const inChambre = (client.chambre ?? '').toLowerCase().includes(q)
        const inDoc = (client.numero_document ?? '').toLowerCase().includes(q)
        if (!inNom && !inPrenoms && !inChambre && !inDoc) return false
      }

      // Filtre date
      if (dateFilter !== 'all') {
        const d = new Date(client.created_at)
        if (dateFilter === 'today') {
          if (d.toDateString() !== now.toDateString()) return false
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
          if (d < weekAgo) return false
        } else if (dateFilter === 'month') {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false
        }
      }

      // Filtre nationalitÃ©
      if (nationaliteFilter && client.nationalite !== nationaliteFilter) return false

      // Filtre chambre
      if (chambreFilter && client.chambre !== chambreFilter) return false

      return true
    })
  }, [clients, search, dateFilter, nationaliteFilter, chambreFilter])

  const handleExportCSV = () => {
    const headers = ['NÂ° Registre', 'Nom', 'PrÃ©noms', 'Type piÃ¨ce', 'NÂ° document', 'Chambre', 'Date check-in', 'NationalitÃ©', 'Profession', 'Objet du voyage']
    const csvData = filteredClients.map(client => [
      client.numero_registre || '',
      client.nom,
      client.prenoms,
      client.document_type,
      client.numero_document,
      client.chambre || '',
      new Date(client.created_at).toLocaleDateString('fr-FR'),
      client.nationalite,
      client.profession || '',
      client.objet_voyage || ''
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
            RÃ©essayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {showLogout && (
        <LogoutConfirmModal onConfirm={() => void signOut()} onCancel={() => setShowLogout(false)} />
      )}
      {selectedClient && (
        <ClientModal client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
      {editingClient && (
        <EditModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={handleClientSaved}
        />
      )}

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
          onClick={() => setShowLogout(true)}
          className="shrink-0 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          DÃ©connexion
        </button>
      </header>

      {/* CONTENU */}
      <div className="p-4 md:p-8 gap-3 md:gap-6">

        {/* Titre */}
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Historique des clients</h1>
          <p className="mt-2 text-gray-600">Tous les check-ins effectuÃ©s dans votre Ã©tablissement</p>
        </div>

        {/* Barre de recherche + filtres */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-4 mb-5 space-y-3">
          {/* Recherche texte */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-base pointer-events-none">ðŸ”</span>
            <input
              type="text"
              placeholder="Nom, prÃ©nom, chambre, nÂ° documentâ€¦"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-[#e2e8f0] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1e293b] bg-white placeholder-[#94a3b8] focus:outline-none focus:border-[#1e3a8a] transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569] text-sm"
              >
                âœ•
              </button>
            )}
          </div>

          {/* Ligne de filtres */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
              className="border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-sm text-[#1e293b] bg-white focus:outline-none focus:border-[#1e3a8a] transition-colors"
            >
              <option value="all">ðŸ“… Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>

            <select
              value={nationaliteFilter}
              onChange={(e) => setNationaliteFilter(e.target.value)}
              className="border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-sm text-[#1e293b] bg-white focus:outline-none focus:border-[#1e3a8a] transition-colors"
            >
              <option value="">ðŸŒ Toutes nationalitÃ©s</option>
              {nationalites.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <select
              value={chambreFilter}
              onChange={(e) => setChambreFilter(e.target.value)}
              className="border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-sm text-[#1e293b] bg-white focus:outline-none focus:border-[#1e3a8a] transition-colors"
            >
              <option value="">ðŸ› Toutes chambres</option>
              {chambres.map(c => (
                <option key={c} value={c}>Chambre {c}</option>
              ))}
            </select>
          </div>

          {/* Barre de rÃ©sultats */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#64748b]">
              {filteredClients.length === clients.length
                ? `${clients.length} client${clients.length !== 1 ? 's' : ''} au total`
                : `${filteredClients.length} rÃ©sultat${filteredClients.length !== 1 ? 's' : ''} sur ${clients.length}`}
            </span>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={() => { setSearch(''); setDateFilter('all'); setNationaliteFilter(''); setChambreFilter('') }}
                  className="text-xs text-[#1e3a8a] hover:underline font-medium"
                >
                  RÃ©initialiser les filtres
                </button>
              )}
              <button
                onClick={handleExportCSV}
                className="text-xs font-semibold bg-[#1e3a8a] text-white px-3 py-1.5 rounded-lg hover:bg-[#162f6b] transition-colors"
              >
                â†“ CSV
              </button>
            </div>
          </div>
        </div>

        {/* Version Desktop - Tableau */}
        <div className="hidden md:block">
          {filteredClients.length > 0 ? (
            <table className="w-full bg-white rounded-xl shadow-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NÂ° Registre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom complet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type piÃ¨ce
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NÂ° document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chambre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date check-in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NationalitÃ©
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-700">
                      {client.numero_registre || 'â€”'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {client.nom} {client.prenoms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.document_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.numero_document}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.chambre || 'Non spÃ©cifiÃ©e'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(client.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.nationalite}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(client.checkout_status ?? 'present') === 'present' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                          ðŸŸ¢ PrÃ©sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
                          âš« Parti
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                        >
                          Voir fiche
                        </button>
                        <button
                          onClick={() => setEditingClient(client)}
                          className="text-[#64748b] hover:text-[#1e3a8a] font-medium text-sm"
                        >
                          âœï¸ Modifier
                        </button>
                        {(client.checkout_status ?? 'present') === 'present' && (
                          <button
                            onClick={() => handleCheckout(client.id)}
                            disabled={checkingOut.has(client.id)}
                            className="text-amber-600 hover:text-amber-800 font-medium text-sm disabled:opacity-50"
                          >
                            {checkingOut.has(client.id) ? 'â€¦' : 'ðŸšª DÃ©part'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#e2e8f0]">
              <p className="text-4xl mb-4">{hasActiveFilters ? 'ðŸ”' : 'ðŸ“‹'}</p>
              <p className="font-bold text-[#1e3a8a] text-lg mb-2">
                {hasActiveFilters ? 'Aucun rÃ©sultat' : 'Aucun check-in effectuÃ©'}
              </p>
              <p className="text-[#64748b] text-sm mb-6">
                {hasActiveFilters
                  ? 'Aucun client ne correspond aux filtres sÃ©lectionnÃ©s.'
                  : 'Commencez Ã  scanner des documents pour voir l\'historique.'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={() => { setSearch(''); setDateFilter('all'); setNationaliteFilter(''); setChambreFilter('') }}
                  className="bg-[#1e3a8a] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#162f6b]"
                >
                  RÃ©initialiser les filtres
                </button>
              ) : (
                <button
                  onClick={() => navigate('/scanner')}
                  className="bg-[#1e3a8a] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#162f6b]"
                >
                  Scanner un document
                </button>
              )}
            </div>
          )}
        </div>

        {/* Version Mobile - Cartes */}
        <div className="block md:hidden">
          {filteredClients.length > 0 ? (
            <div className="space-y-4">
              {filteredClients.map(client => (
                <div key={client.id} className="bg-white rounded-xl p-4 shadow-sm border border-transparent">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {client.nom} {client.prenoms}
                    </h3>
                    {(client.checkout_status ?? 'present') === 'present' ? (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                        ðŸŸ¢ PrÃ©sent
                      </span>
                    ) : (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                        âš« Parti
                      </span>
                    )}
                  </div>
                  {client.numero_registre && (
                    <p className="text-xs font-mono text-blue-700 font-medium mb-3">NÂ° {client.numero_registre}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Type piÃ¨ce:</span>
                      <span className="text-sm text-gray-900">{client.document_type}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">NÂ° document:</span>
                      <span className="text-sm text-gray-900">{client.numero_document}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Chambre:</span>
                      <span className="text-sm text-gray-900">{client.chambre || 'Non spÃ©cifiÃ©e'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Date check-in:</span>
                      <span className="text-sm text-gray-900">
                        {new Date(client.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">NationalitÃ©:</span>
                      <span className="text-sm text-gray-900">{client.nationalite}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="flex-1 bg-[#1e3a8a] text-white px-4 py-2 rounded-lg hover:bg-[#162f6b] text-sm font-medium"
                      >
                        Voir fiche
                      </button>
                      <button
                        onClick={() => setEditingClient(client)}
                        className="flex-1 border border-[#e2e8f0] text-[#1e293b] px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
                      >
                        âœï¸ Modifier
                      </button>
                    </div>
                    {(client.checkout_status ?? 'present') === 'present' && (
                      <button
                        onClick={() => handleCheckout(client.id)}
                        disabled={checkingOut.has(client.id)}
                        className="w-full bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-100 text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        {checkingOut.has(client.id) ? 'â³ Enregistrementâ€¦' : 'ðŸšª Enregistrer le dÃ©part'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#e2e8f0]">
              <p className="text-4xl mb-4">{hasActiveFilters ? 'ðŸ”' : 'ðŸ“‹'}</p>
              <p className="font-bold text-[#1e3a8a] text-lg mb-2">
                {hasActiveFilters ? 'Aucun rÃ©sultat' : 'Aucun check-in effectuÃ©'}
              </p>
              <p className="text-[#64748b] text-sm mb-6">
                {hasActiveFilters
                  ? 'Aucun client ne correspond aux filtres sÃ©lectionnÃ©s.'
                  : 'Commencez Ã  scanner des documents pour voir l\'historique.'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={() => { setSearch(''); setDateFilter('all'); setNationaliteFilter(''); setChambreFilter('') }}
                  className="bg-[#1e3a8a] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#162f6b]"
                >
                  RÃ©initialiser les filtres
                </button>
              ) : (
                <button
                  onClick={() => navigate('/scanner')}
                  className="bg-[#1e3a8a] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#162f6b]"
                >
                  Scanner un document
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

