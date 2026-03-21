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
import { jsPDF } from 'jspdf'
import { supabase } from '../lib/supabase'
import { getDB } from '../lib/db'

const mockData = {
  documentType: 'passport',
  issuingCountry: 'FRA',
  surname: 'DUPONT',
  givenNames: 'JEAN',
  dateOfBirth: '1985-06-15',
  documentNumber: '12AB34567',
  nationality: 'FRANÇAISE',
  sex: 'M',
  expiryDate: '2030-06-14',
  address: null,
  confidence: 0.97,
}

type OCRData = {
  documentType: string | null
  issuingCountry: string | null
  surname: string | null
  givenNames: string | null
  dateOfBirth: string | null
  documentNumber: string | null
  nationality: string | null
  sex: string | null
  expiryDate: string | null
  address: string | null
  needsBackSide: boolean | null
  confidence: number | null
}

type EditableKey = Exclude<keyof typeof mockData, 'confidence'>

type FormData = Record<EditableKey, string>

const fieldLabels: Record<EditableKey, string> = {
  documentType: 'Type de document',
  issuingCountry: "Pays d'émission",
  surname: 'Nom',
  givenNames: 'Prénom(s)',
  dateOfBirth: 'Date de naissance',
  documentNumber: 'Numéro du document',
  nationality: 'Nationalité',
  sex: 'Sexe',
  expiryDate: "Date d'expiration",
  address: 'Adresse',
}

const initialData: FormData = {
  documentType: mockData.documentType,
  issuingCountry: mockData.issuingCountry,
  surname: mockData.surname,
  givenNames: mockData.givenNames,
  dateOfBirth: mockData.dateOfBirth,
  documentNumber: mockData.documentNumber,
  nationality: mockData.nationality,
  sex: mockData.sex,
  expiryDate: mockData.expiryDate,
  address: mockData.address ?? '',
}

type ConfirmProps = {
  data: OCRData | null
  onRestart: () => void
  onConfirm: () => void
}

const buildFormDataFromOCR = (ocr: OCRData): FormData => ({
  documentType: ocr.documentType ?? '',
  issuingCountry: ocr.issuingCountry ?? '',
  surname: ocr.surname ?? '',
  givenNames: ocr.givenNames ?? '',
  dateOfBirth: ocr.dateOfBirth ?? '',
  documentNumber: ocr.documentNumber ?? '',
  nationality: ocr.nationality ?? '',
  sex: ocr.sex ?? '',
  expiryDate: ocr.expiryDate ?? '',
  address: ocr.address ?? '',
})

export default function Confirm({ data, onRestart, onConfirm }: ConfirmProps) {
  const effectiveFormData = data ? buildFormDataFromOCR(data) : initialData
  const [formData, setFormData] = useState<FormData>(effectiveFormData)
  const [roomNumber, setRoomNumber] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [hotelName, setHotelName] = useState('Hotel inconnu')
  const [isGenerating, setIsGenerating] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)

  const confidenceValue = data && typeof data.confidence === 'number' ? data.confidence : mockData.confidence
  const confidencePercent = useMemo(() => Math.round(confidenceValue * 100), [confidenceValue])

  const handleFieldChange = (key: EditableKey) => (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }))
  }

  useEffect(() => {
    const loadHotelName = async () => {
      const { data } = await supabase.auth.getSession()
      const name = data.session?.user.user_metadata?.hotel_name as string | undefined
      setHotelName(name || 'Hotel inconnu')
    }

    void loadHotelName()
  }, [])

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

    const pdf = new jsPDF()
    let y = 18

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.text('FICHE DE POLICE', 105, y, { align: 'center' })
    y += 6
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text('(conforme decret 2013-981)', 105, y, { align: 'center' })
    y += 8
    pdf.text(`Date: ${now.toLocaleDateString('fr-FR')}`, 14, y)
    y += 6
    pdf.text(`N° enregistrement: ${registrationNumber}`, 14, y)

    y += 10
    pdf.setFont('helvetica', 'bold')
    pdf.text('ETABLISSEMENT', 14, y)
    y += 6
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Nom: ${hotelName}`, 14, y)

    y += 10
    pdf.setFont('helvetica', 'bold')
    pdf.text('IDENTITE DU CLIENT', 14, y)
    y += 6
    pdf.setFont('helvetica', 'normal')
    const identityLines = [
      `Type de document: ${formData.documentType}`,
      `Pays d'emission: ${formData.issuingCountry}`,
      `Nom: ${formData.surname}`,
      `Prenom(s): ${formData.givenNames}`,
      `Date de naissance: ${formData.dateOfBirth}`,
      `Numero du document: ${formData.documentNumber}`,
      `Nationalite: ${formData.nationality}`,
      `Sexe: ${formData.sex}`,
      `Date d'expiration: ${formData.expiryDate}`,
      `Adresse: ${formData.address || '-'}`,
      `Numero de chambre: ${roomNumber}`,
    ]
    identityLines.forEach((line) => {
      pdf.text(line, 14, y)
      y += 6
    })

    y += 2
    pdf.setFont('helvetica', 'bold')
    pdf.text("DOCUMENT D'IDENTITE", 14, y)
    y += 6
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Type: ${formData.documentType}`, 14, y)
    y += 6
    pdf.text(`Numero: ${formData.documentNumber}`, 14, y)
    y += 6
    pdf.text(`Expiration: ${formData.expiryDate}`, 14, y)
    y += 10
    pdf.text('Signature :', 14, y)

    if (signatureDataUrl) {
      pdf.addImage(signatureDataUrl, 'PNG', 40, y - 7, 80, 28)
    }

    pdf.setFontSize(9)
    pdf.text('Document genere par Check-in Express by Percepta', 105, 285, { align: 'center' })

    // 3) Générer et télécharger le PDF
    const pdfData = pdf.output('datauristring')
    await db.fichesPolice.update(fichePoliceId, { pdfData })
    pdf.save(`fiche-police-${registrationNumber}.pdf`)

    setSuccessMessage('Fiche générée !')
    setIsGenerating(false)
    // 4) Revenir au dashboard après affichage du message
    setTimeout(() => onConfirm(), 600)
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] py-4 sm:py-8 px-4">
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
        </form>
      </div>
    </div>
  )
}
