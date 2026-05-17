import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type TouchEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import { getDB, initDB } from '../lib/db'
import { generateFicheA6, type FicheParams } from '../utils/generateFicheControle'

const mockData = {
  documentType: 'passport',
  issuingCountry: 'FRA',
  surname: 'DUPONT',
  givenNames: 'JEAN',
  dateOfBirth: '1985-06-15',
  lieuNaissance: 'Paris',
  documentNumber: '12AB34567',
  nationality: 'FRANÇAISE',
  sex: 'M',
  expiryDate: '2030-06-14',
  dateDelivrance: '2020-06-14',
  address: '123 Rue de la Paix, 75001 Paris',
  profession: 'Ingénieur',
  nomPere: 'PIERRE DUPONT',
  nomMere: 'MARIE DURAND',
  venantDe: 'Paris',
  allantA: 'Dakar',
  dateDepart: '',
  confidence: 0.97,
}

type OCRData = {
  documentType: string | null
  needsVerso: boolean | null
  nom: string | null
  prenoms: string | null
  dateNaissance: string | null
  lieuNaissance: string | null
  nationalite: string | null
  numeroDocument: string | null
  dateDelivrance: string | null
  dateExpiration: string | null
  confidence: number | null
  adresse: string | null
  profession: string | null
  nomPere: string | null
  nomMere: string | null
}

type EditableKey = Exclude<keyof typeof mockData, 'confidence'>

type FormData = Record<EditableKey, string>

const fieldLabels: Record<string, string> = {
  documentType: 'Type de document',
  issuingCountry: "Pays d'émission",
  surname: 'Nom',
  givenNames: 'Prénom(s)',
  dateOfBirth: 'Date de naissance',
  lieuNaissance: 'Lieu de naissance',
  documentNumber: 'Numéro du document',
  nationality: 'Nationalité',
  sex: 'Sexe',
  expiryDate: "Date d'expiration",
  dateDelivrance: 'Date de délivrance',
  address: 'Adresse',
  profession: 'Profession',
  nomPere: 'Nom du père',
  nomMere: 'Nom de la mère',
  venantDe: 'Venant de',
  allantA: 'Allant à',
  dateDepart: 'Date de départ prévue',
}

const initialData: FormData = {
  documentType: mockData.documentType,
  issuingCountry: mockData.issuingCountry,
  surname: mockData.surname,
  givenNames: mockData.givenNames,
  dateOfBirth: mockData.dateOfBirth,
  lieuNaissance: mockData.lieuNaissance,
  documentNumber: mockData.documentNumber,
  nationality: mockData.nationality,
  sex: mockData.sex,
  expiryDate: mockData.expiryDate,
  dateDelivrance: mockData.dateDelivrance,
  address: mockData.address ?? '',
  profession: mockData.profession,
  nomPere: mockData.nomPere,
  nomMere: mockData.nomMere,
  venantDe: mockData.venantDe,
  allantA: mockData.allantA,
  dateDepart: mockData.dateDepart,
}

type ConfirmProps = {
  data: OCRData | null
  onRestart: () => void
  onConfirm: () => void
}

const buildFormDataFromOCR = (ocr: OCRData): FormData => {
  console.log('OCR Result:', JSON.stringify(ocr))
  
  return {
    documentType: ocr.documentType ?? '',
    issuingCountry: ocr.nationalite ?? '',
    surname: ocr.nom ?? '',
    givenNames: ocr.prenoms ?? '',
    dateOfBirth: ocr.dateNaissance ?? '',
    lieuNaissance: ocr.lieuNaissance ?? '',
    documentNumber: ocr.numeroDocument ?? '',
    nationality: ocr.nationalite ?? '',
    sex: '',
    expiryDate: ocr.dateExpiration ?? '',
    dateDelivrance: ocr.dateDelivrance ?? '',
    address: ocr.adresse ?? '',
    profession: ocr.profession ?? '',
    nomPere: ocr.nomPere ?? '',
    nomMere: ocr.nomMere ?? '',
    venantDe: '',
    allantA: '',
    dateDepart: '',
  }
}

export default function Confirm({ data, onRestart, onConfirm }: ConfirmProps) {
  const effectiveFormData = data ? buildFormDataFromOCR(data) : initialData
  const [formData, setFormData] = useState<FormData>(effectiveFormData)
  const [roomNumber, setRoomNumber] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)

  // Garantit que la DB est initialisée même après un rechargement de page (window.location.href).
  // La DB est un singleton module : elle est null si la page a été rechargée sans passer par Dashboard.
  useEffect(() => {
    const ensureDB = async () => {
      try {
        getDB()
      } catch {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          initDB(sessionData.session.user.id)
        }
      }
    }
    void ensureDB()
  }, [])

  const confidenceValue = data && typeof data.confidence === 'number' ? data.confidence : mockData.confidence
  const confidencePercent = useMemo(() => Math.round(confidenceValue * 100), [confidenceValue])

  const handleFieldChange = (key: EditableKey) => (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }))
  }

  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getPointFromClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) * (canvas.width / rect.width)
    const y = (clientY - rect.top) * (canvas.height / rect.height)
    return { x, y }
  }

  const startDrawing = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    isDrawingRef.current = true
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (x: number, y: number) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(x, y)
    ctx.stroke()
    setSignatureEmpty(false)
  }

  const stopDrawing = () => {
    isDrawingRef.current = false
  }

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const point = getPointFromClient(e.clientX, e.clientY)
    if (!point) return
    startDrawing(point.x, point.y)
  }

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const point = getPointFromClient(e.clientX, e.clientY)
    if (!point) return
    draw(point.x, point.y)
  }

  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    if (!touch) return
    const point = getPointFromClient(touch.clientX, touch.clientY)
    if (!point) return
    startDrawing(point.x, point.y)
  }

  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    if (!touch) return
    const point = getPointFromClient(touch.clientX, touch.clientY)
    if (!point) return
    draw(point.x, point.y)
  }

  const handleClearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setSignatureEmpty(true)
  }

  const handleReset = () => {
    setFormData(effectiveFormData)
    setRoomNumber('')
    setSubmitted(false)
    setSuccessMessage('')
    handleClearSignature()
    onRestart()
  }

  const generateRegistrationNumber = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0')
    const yyyy = date.getFullYear()
    const mm = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    const hh = pad(date.getHours())
    const min = pad(date.getMinutes())
    const ss = pad(date.getSeconds())
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `${yyyy}${mm}${dd}-${hh}${min}${ss}-${rand}`
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
    if (!roomNumber.trim()) return
    if (signatureEmpty) return

    setIsGenerating(true)
    setSuccessMessage('')

    const now = new Date()
    const registrationNumber = generateRegistrationNumber(now)
    const canvas = canvasRef.current
    const signatureDataUrl = canvas?.toDataURL('image/png')

    if (!signatureDataUrl) {
      setIsGenerating(false)
      setSuccessMessage('')
      return
    }

    const db = getDB()
    const scanDate = now.toISOString()
    const printed = false

    // 1) Sauvegarder le client + 2) Sauvegarder la fiche de police
    const clientId = await db.clients.add({
      surname: formData.surname,
      givenNames: formData.givenNames,
      dateOfBirth: formData.dateOfBirth,
      documentType: formData.documentType,
      documentNumber: formData.documentNumber,
      nationality: formData.nationality,
      sex: formData.sex,
      expiryDate: formData.expiryDate,
      roomNumber,
      scanDate,
      printed,
    })

    const fichePoliceId = await db.fichesPolice.add({
      clientId,
      generatedAt: scanDate,
      roomNumber,
      printed,
    })

    // Sync vers Supabase pour que le check-in apparaisse dans l'historique.
    // Non-bloquant : si le réseau est coupé, les données restent dans IndexedDB.
    setSyncError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      console.log('[Confirm] user_id:', sessionData.session?.user.id ?? 'PAS DE SESSION')

      if (!sessionData.session) {
        setSyncError('Session expirée — check-in sauvegardé localement uniquement.')
      } else {
        const { data: hotelData, error: hotelError } = await supabase
          .from('hotels')
          .select('id')
          .eq('user_id', sessionData.session.user.id)
          .single()

        console.log('[Confirm] hotel lookup →', { hotel_id: hotelData?.id ?? null, hotelError })

        if (hotelError || !hotelData) {
          const msg = hotelError?.message ?? 'hôtel introuvable'
          console.error('[Confirm] Impossible de récupérer l\'hôtel:', hotelError)
          setSyncError(`Hôtel introuvable (${msg}) — check-in sauvegardé localement.`)
        } else {
          console.log('[Confirm] INSERT clients → hotel_id:', hotelData.id)
          const { error: insertError } = await supabase.from('clients').insert({
            hotel_id: hotelData.id,
            nom: formData.surname,
            prenoms: formData.givenNames,
            date_naissance: formData.dateOfBirth,
            lieu_naissance: '',
            nationalite: formData.nationality,
            document_type: formData.documentType,
            numero_document: formData.documentNumber,
            date_delivrance: formData.dateDelivrance,
            date_expiration: formData.expiryDate,
            chambre: roomNumber,
            profession: formData.profession,
            domicile: formData.address,
            venant_de: formData.venantDe,
            allant_a: formData.allantA,
            objet_voyage: '',
            nb_enfants: '',
            immatriculation: '',
          })

          if (insertError) {
            // Log complet : message + code (ex. 42501 = RLS violation, 23503 = FK violation)
            console.error('[Confirm] Supabase insert error:', insertError)
            console.error('[Confirm] code:', insertError.code, '| hint:', insertError.hint, '| details:', insertError.details)
            setSyncError(`Erreur enregistrement Supabase (code ${insertError.code}) : ${insertError.message}`)
          } else {
            console.log('[Confirm] ✓ Check-in synchronisé dans Supabase')
          }
        }
      }
    } catch (err) {
      console.error('[Confirm] Supabase sync exception:', err)
      setSyncError('Erreur réseau — check-in sauvegardé localement uniquement.')
    }

    // 3) Récupérer le nom de l'hôtel pour l'en-tête de la fiche
    let hotelName = 'Hôtel'
    try {
      const { data: sessionData2 } = await supabase.auth.getSession()
      if (sessionData2.session) {
        const { data: hotelRow } = await supabase
          .from('hotels')
          .select('hotel_name')
          .eq('user_id', sessionData2.session.user.id)
          .single()
        if (hotelRow?.hotel_name) hotelName = hotelRow.hotel_name
      }
    } catch { /* fallback silencieux */ }

    // 4) Construire les paramètres de la fiche et générer le PDF A6
    const dateArrivee = now.toLocaleDateString('fr-FR', {
      timeZone: 'Africa/Dakar',
      day: '2-digit', month: '2-digit', year: 'numeric',
    })

    const ficheParamsObj: FicheParams = {
      hotelName,
      nom: formData.surname,
      prenoms: formData.givenNames,
      dateNaissance: formData.dateOfBirth,
      lieuNaissance: (formData as any).lieuNaissance ?? '',
      nationalite: formData.nationality,
      numeroPiece: formData.documentNumber,
      typePiece: formData.documentType,
      dateExpiration: formData.expiryDate,
      adresse: formData.address,
      profession: formData.profession,
      venantDe: formData.venantDe,
      allantA: formData.allantA,
      numeroChambre: roomNumber,
      dateArrivee,
      dateDepart: (formData as any).dateDepart ?? '',
      signatureDataUrl: signatureDataUrl ?? undefined,
      registrationNumber,
    }

    generateFicheA6(ficheParamsObj) // génère sans télécharger — juste pour valider

    // 5) Sauvegarder les paramètres dans IndexedDB (pour impression groupée à 20h)
    await db.fichesPolice.update(fichePoliceId, {
      ficheParams: JSON.stringify(ficheParamsObj),
    })

    setSuccessMessage('✅ Fiche sauvegardée — impression prévue à 20h')
    setIsGenerating(false)
    setTimeout(() => onConfirm(), 800)
  }

  return (
    <div className="min-h-screen py-4 sm:py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-xl p-4 sm:p-6 lg:p-8 border border-[#e2e8f0]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1e3a8a]">Confirmation des données</h1>
          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ${
            confidencePercent >= 80 
              ? 'bg-[#dcfce7] text-[#166534]' 
              : 'bg-[#fef3c7] text-[#92400e]'
          }`}>
            Confiance : {confidencePercent}%
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          {/* Mobile: Cards view - Desktop: Table view */}
          <div className="sm:hidden space-y-3">
            {(Object.keys(fieldLabels) as EditableKey[]).map((key) => (
              <div key={key} className="bg-[#f8fafc] rounded-lg p-3">
                <label className="block text-xs font-semibold text-[#64748b] mb-1">
                  {fieldLabels[key]}
                </label>
                <input
                  type="text"
                  value={formData[key]}
                  onChange={handleFieldChange(key)}
                  className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-base bg-white focus:border-[#1e3a8a] min-h-[48px] text-[#1e293b]"
                />
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-[#e2e8f0]">
            <table className="w-full text-sm">
              <tbody>
                {(Object.keys(fieldLabels) as EditableKey[]).map((key) => (
                  <tr key={key} className="border-b border-[#e2e8f0] last:border-b-0">
                    <th className="w-1/3 text-left font-semibold text-[#64748b] bg-[#f8fafc] px-4 py-3">
                      {fieldLabels[key]}
                    </th>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData[key]}
                        onChange={handleFieldChange(key)}
                        className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 bg-white focus:border-[#1e3a8a] text-[#1e293b]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label htmlFor="roomNumber" className="block text-sm font-semibold text-[#1e293b] mb-2">
              Numéro de chambre <span className="text-red-600">*</span>
            </label>
            <input
              id="roomNumber"
              type="text"
              required
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full border border-[#e2e8f0] rounded-lg px-4 py-3 text-base bg-white focus:border-[#1e3a8a] min-h-[48px] text-[#1e293b]"
              placeholder="Ex: 204"
            />
            {submitted && !roomNumber.trim() && (
              <p className="mt-2 text-sm text-red-600">Le numéro de chambre est obligatoire.</p>
            )}
            {submitted && signatureEmpty && (
              <p className="mt-2 text-sm text-red-600">La signature du client est obligatoire.</p>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-[#64748b] mb-2">Signature du client</p>
            <canvas
              ref={canvasRef}
              width={800}
              height={300}
              className="w-full h-[120px] sm:h-[150px] bg-white border-2 border-[#e2e8f0] rounded-lg touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={stopDrawing}
            />
            <button
              type="button"
              onClick={handleClearSignature}
              className="mt-2 text-xs text-[#64748b] hover:underline"
            >
              Effacer la signature
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isGenerating}
              className="h-12 w-full sm:w-auto px-6 rounded-xl bg-[#1e3a8a] text-white font-bold hover:bg-[#1e40af] transition-colors text-base sm:text-sm"
            >
              {isGenerating ? 'Generation...' : '✓ CONFIRMER'}
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleReset}
              className="h-12 w-full sm:w-auto px-6 rounded-xl bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0] font-semibold transition-colors text-base sm:text-sm"
            >
              ↻ RECOMMENCER
            </button>
          </div>

          {successMessage && <p className="text-sm text-green-600 font-medium">{successMessage}</p>}
          {syncError && (
            <p className="text-sm text-orange-600 font-medium bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              ⚠️ {syncError}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
