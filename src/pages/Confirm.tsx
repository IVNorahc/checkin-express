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
  onRestart: () => void
  onConfirm: () => void
}

export default function Confirm({ onRestart, onConfirm }: ConfirmProps) {
  const [formData, setFormData] = useState<FormData>(initialData)
  const [roomNumber, setRoomNumber] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [hotelName, setHotelName] = useState('Hotel inconnu')
  const [isGenerating, setIsGenerating] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)

  const confidencePercent = useMemo(() => Math.round(mockData.confidence * 100), [])

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
    setFormData(initialData)
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
    pdf.save(`fiche-police-${registrationNumber}.pdf`)

    setSuccessMessage('Fiche générée !')
    setIsGenerating(false)
    setTimeout(() => onConfirm(), 600)
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Confirmation des données</h1>
          <span className="inline-flex items-center justify-center rounded-full bg-[#dcfce7] px-4 py-1 text-sm font-semibold text-[#166534]">
            Confiance : {confidencePercent}%
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <tbody>
                {(Object.keys(fieldLabels) as EditableKey[]).map((key) => (
                  <tr key={key} className="border-b border-gray-100 last:border-b-0">
                    <th className="w-1/3 text-left font-semibold text-gray-700 bg-gray-50 px-4 py-3">
                      {fieldLabels[key]}
                    </th>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData[key]}
                        onChange={handleFieldChange(key)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:border-[#1e3a8a] focus:outline-none focus:ring-0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label htmlFor="roomNumber" className="block text-sm font-semibold text-gray-700 mb-2">
              Numéro de chambre <span className="text-red-600">*</span>
            </label>
            <input
              id="roomNumber"
              type="text"
              required
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:border-[#1e3a8a] focus:outline-none focus:ring-0"
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
            <p className="text-sm font-semibold text-gray-600 mb-2">Signature du client</p>
            <canvas
              ref={canvasRef}
              width={800}
              height={300}
              className="w-full h-[150px] bg-white border border-gray-300 rounded-lg touch-none"
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
              className="mt-2 text-xs text-gray-600 hover:underline"
            >
              Effacer la signature
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isGenerating}
              className="h-12 px-6 rounded-lg bg-[#1e3a8a] text-white font-semibold shadow-sm hover:bg-[#162f6b] transition-colors"
            >
              {isGenerating ? 'Generation...' : '✓ CONFIRMER'}
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleReset}
              className="h-12 px-6 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
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
