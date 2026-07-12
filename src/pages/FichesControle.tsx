import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { generateFicheA6, generateFichesGroupees, type FicheParams } from '../utils/generateFicheControle'

type ClientRow = {
  id: string
  nom: string | null
  prenoms: string | null
  date_naissance: string | null
  nationalite: string | null
  document_type: string | null
  numero_document: string | null
  date_delivrance: string | null
  chambre: string | null
  domicile: string | null
  venant_de: string | null
  allant_a: string | null
  objet_voyage: string | null
  profession: string | null
  created_at: string
  checkout_status?: string | null
  lieu_naissance: string | null
  signature: string | null
}

function toFicheParams(c: ClientRow, hotelName: string, hotelPhone?: string, logoUrl?: string): FicheParams {
  const dateArrivee = new Date(c.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  return {
    hotelName,
    hotelPhone,
    nom: c.nom ?? '',
    prenoms: c.prenoms ?? '',
    dateNaissance: c.date_naissance ?? '',
    lieuNaissance: c.lieu_naissance ?? '',
    nationalite: c.nationalite ?? '',
    typePiece: c.document_type ?? '',
    numeroPiece: c.numero_document ?? '',
    dateDelivrance: c.date_delivrance ?? '',
    paysEmission: '',
    adresse: c.domicile ?? '',
    profession: c.profession ?? '',
    venantDe: c.venant_de ?? '',
    allantA: c.allant_a ?? '',
    objetVoyage: c.objet_voyage ?? '',
    numeroChambre: c.chambre ?? '',
    dateArrivee,
    dateDepart: '',
    logoUrl,
    signatureDataUrl: c.signature ?? undefined,
  }
}

async function fetchLogoDataUrl(logoUrl: string): Promise<string | undefined> {
  try {
    const resp = await fetch(logoUrl)
    const blob = await resp.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="block text-[10px] text-[#94a3b8] uppercase tracking-wide leading-none mb-0.5">{label}</span>
      <span className="text-[#1e3a8a] font-medium text-sm truncate block">{value || '—'}</span>
    </div>
  )
}

export default function FichesControle() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [hotelName, setHotelName] = useState('')
  const [hotelPhone, setHotelPhone] = useState<string | undefined>(undefined)
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined)
  const [minutesUntilAutoPrint, setMinutesUntilAutoPrint] = useState<number | null>(null)

  const loadClients = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const { data: hotelData } = await supabase
      .from('hotels')
      .select('id, hotel_name, phone, logo_url')
      .eq('user_id', session.user.id)
      .single()

    if (!hotelData?.id) { setLoading(false); return }

    setHotelName(hotelData.hotel_name ?? '')
    setHotelPhone(hotelData.phone ?? undefined)

    if (hotelData.logo_url) {
      const dataUrl = await fetchLogoDataUrl(hotelData.logo_url)
      setLogoDataUrl(dataUrl)
    }

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('clients')
      .select('id, nom, prenoms, date_naissance, lieu_naissance, nationalite, document_type, numero_document, date_delivrance, chambre, domicile, venant_de, allant_a, objet_voyage, profession, created_at, checkout_status, signature')
      .eq('hotel_id', hotelData.id)
      .gte('created_at', startOfToday.toISOString())
      .order('created_at', { ascending: false })

    setClients(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadClients()
  }, [loadClients])

  const displayedClients = useMemo(
    () => showAll ? clients : clients.filter(c => (c.checkout_status ?? 'present') !== 'departed'),
    [showAll, clients]
  )

  const handlePrintAll = useCallback(async () => {
    if (printing || displayedClients.length === 0) return
    setPrinting(true)

    const pdfWin = window.open('', '_blank')
    if (pdfWin) {
      pdfWin.document.write(
        '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial;color:#1e3a8a">' +
        '<p>⏳ Génération du PDF en cours…</p></body></html>'
      )
    }

    try {
      const fiches = displayedClients.map(c => toFicheParams(c, hotelName, hotelPhone, logoDataUrl))
      const blob = generateFichesGroupees(fiches)
      const url = URL.createObjectURL(blob)
      if (pdfWin) {
        pdfWin.location.href = url
      }
      setTimeout(() => URL.revokeObjectURL(url), 15_000)
    } catch (err) {
      console.error('Erreur impression groupée:', err)
      pdfWin?.close()
      alert('Erreur lors de la génération du PDF.')
    } finally {
      setPrinting(false)
    }
  }, [printing, displayedClients, hotelName, hotelPhone, logoDataUrl])

  const handleViewSingle = useCallback((client: ClientRow) => {
    try {
      const params = toFicheParams(client, hotelName, hotelPhone, logoDataUrl)
      const blob = generateFicheA6(params)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 15_000)
    } catch (err) {
      console.error('Erreur affichage fiche:', err)
      alert('Erreur lors de la génération du PDF.')
    }
  }, [hotelName, logoDataUrl])

  const handlePrintAllRef = useRef(handlePrintAll)
  useEffect(() => { handlePrintAllRef.current = handlePrintAll }, [handlePrintAll])

  useEffect(() => {
    const check = () => {
      const now = new Date()
      const parts = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Africa/Dakar',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false,
      }).formatToParts(now)
      const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0')
      const hour = get('hour')
      const minute = get('minute')
      const day = parts.find(p => p.type === 'day')?.value ?? '01'
      const month = parts.find(p => p.type === 'month')?.value ?? '01'
      const year = parts.find(p => p.type === 'year')?.value ?? '2000'
      const dateKey = `${year}-${month}-${day}`

      const totalMin = hour * 60 + minute
      if (totalMin >= 19 * 60 + 30 && totalMin < 20 * 60) {
        setMinutesUntilAutoPrint(20 * 60 - totalMin)
      } else if (hour === 20 && minute === 0) {
        setMinutesUntilAutoPrint(0)
        if (localStorage.getItem('checkin_autoPrint_date') !== dateKey) {
          localStorage.setItem('checkin_autoPrint_date', dateKey)
          void handlePrintAllRef.current()
        }
      } else {
        setMinutesUntilAutoPrint(null)
      }
    }

    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [])

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-8 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1e3a8a]">Fiches du jour</h1>
          <p className="text-[#64748b] mt-1 capitalize">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void handlePrintAll()}
            disabled={printing || displayedClients.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white font-semibold rounded-xl shadow hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {printing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Génération en cours…
              </>
            ) : (
              <>🖨 Imprimer toutes les fiches du jour</>
            )}
          </button>
          <button
            onClick={() => setShowAll(v => !v)}
            className="flex items-center gap-2 px-4 py-3 border border-[#e2e8f0] bg-white text-[#475569] font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            {showAll ? '🟢 Voir uniquement les présents' : '👁 Voir tous les clients'}
          </button>
        </div>

        {minutesUntilAutoPrint !== null && minutesUntilAutoPrint > 0 && (
          <div className="mb-4 rounded-xl bg-orange-50 border border-orange-300 px-4 py-3 text-orange-700 font-medium text-sm">
            ⏰ Impression automatique dans {minutesUntilAutoPrint} minute{minutesUntilAutoPrint > 1 ? 's' : ''}
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a]" />
          </div>
        )}

        {!loading && displayedClients.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-[#e2e8f0]">
            <p className="text-5xl mb-3">📋</p>
            <h3 className="text-lg font-semibold text-[#1e3a8a] mb-1">
              {clients.length > 0 ? 'Tous les clients sont partis' : 'Aucune fiche pour aujourd\'hui'}
            </h3>
            <p className="text-[#64748b] text-sm">
              {clients.length > 0
                ? 'Cliquez sur "Voir tous les clients" pour voir l\'historique complet du jour.'
                : 'Scannez des documents via l\'onglet Scanner'}
            </p>
          </div>
        )}

        {!loading && displayedClients.length > 0 && (
          <div className="space-y-3">
            {displayedClients.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-[#e2e8f0] px-5 py-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-[#1e3a8a] text-base leading-tight">
                      {c.nom} {c.prenoms}
                    </h3>
                    <p className="text-xs text-[#94a3b8] mt-0.5">
                      Enregistré à {formatTime(c.created_at)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2.5">
                  <Field label="Nationalité" value={c.nationalite} />
                  <Field label="Chambre" value={c.chambre} />
                  <Field label="Type pièce" value={c.document_type} />
                  <Field label="N° document" value={c.numero_document} />
                  <Field label="Venant de" value={c.venant_de} />
                  <Field label="Allant à" value={c.allant_a} />
                </div>

                <button
                  onClick={() => handleViewSingle(c)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1e3a8a] border border-[#1e3a8a]/40 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  📄 Voir la fiche PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

