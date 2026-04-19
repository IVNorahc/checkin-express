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

const buildFormDataFromOCR = (ocr: OCRData): FormData => {
  console.log('OCR Result:', JSON.stringify(ocr))
  
  return {
    documentType: ocr.documentType ?? '',
    issuingCountry: ocr.nationalite ?? '', // nationalite -> issuingCountry
    surname: ocr.nom ?? '', // nom -> surname
    givenNames: ocr.prenoms ?? '', // prenoms -> givenNames
    dateOfBirth: ocr.dateNaissance ?? '', // dateNaissance -> dateOfBirth
    documentNumber: ocr.numeroDocument ?? '', // numeroDocument -> documentNumber
    nationality: ocr.nationalite ?? '', // nationalite -> nationality
    sex: '', // Champ non fourni par l'OCR
    expiryDate: ocr.dateExpiration ?? '', // dateExpiration -> expiryDate
    address: '', // Champ non fourni par l'OCR
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)

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

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    
    // Constants for card layout
    const cardWidth = 100
    const cardHeight = 140
    const cardSpacing = 5
    const pageWidth = 210
    const pageHeight = 297
    const borderWidth = 0.3
    
    // Helper function to draw dotted lines
    const drawDottedLine = (x: number, y: number, width: number) => {
      const dashLength = 2
      const gapLength = 1
      let currentX = x
      
      while (currentX < x + width) {
        pdf.line(currentX, y, Math.min(currentX + dashLength, x + width), y)
        currentX += dashLength + gapLength
      }
    }
    
    // Helper function to draw one card
    const drawCard = (startX: number, startY: number) => {
      // Draw card border
      pdf.setLineWidth(borderWidth)
      pdf.rect(startX, startY, cardWidth, cardHeight)
      
      let y = startY + 3
      const x = startX + 3
      const maxWidth = cardWidth - 6
      
      // EN-TÊTE
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.text('HÔTEL EXEMPLE', x, y)
      pdf.text('☎ 33 000 000 000', x + 45, y)
      pdf.text('FICHE DE CONTRÔLE', x + 70, y)
      y += 4
      
      // Separator line under header
      pdf.line(x, y, x + maxWidth, y)
      y += 3
      
      // SECTION 1 — IDENTITÉ
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      
      // NOM
      pdf.text('NOM :', x, y)
      pdf.setFont('helvetica', 'bold')
      pdf.text(formData.surname?.toUpperCase() || '', x + 15, y)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Name in capital letters', x, y + 2.5)
      y += 5
      
      // Nom de jeune fille
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Nom de jeune fille :', x, y)
      drawDottedLine(x + 25, y, maxWidth - 25)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Maiden name', x, y + 2.5)
      y += 5
      
      // Prénoms
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Prénoms :', x, y)
      pdf.setFont('helvetica', 'bold')
      pdf.text(formData.givenNames || '', x + 15, y)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Christian name', x, y + 2.5)
      y += 5
      
      // Né(e) le
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Né(e) le :', x, y)
      pdf.setFont('helvetica', 'bold')
      pdf.text(formData.dateOfBirth || '', x + 15, y)
      pdf.text(' lieu', x + 30, y)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Date and place of birth', x, y + 2.5)
      y += 5
      
      // Département
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Département :', x, y)
      drawDottedLine(x + 20, y, maxWidth - 20)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('ou pays pour l\'étranger', x, y + 2.5)
      y += 5
      
      // Country
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Country :', x, y)
      pdf.setFont('helvetica', 'bold')
      pdf.text(formData.issuingCountry || '', x + 15, y)
      y += 6
      
      // SECTION 2 — PIÈCES D'IDENTITÉ
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.text('PIÈCES D\'IDENTITÉ', x, y)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Identity documents produced', x, y + 2.5)
      y += 5
      
      // Nature
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Nature :', x, y)
      pdf.setFont('helvetica', 'bold')
      pdf.text(formData.documentType || '', x + 15, y)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Type of identity documents', x, y + 2.5)
      y += 5
      
      // N°
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('N° :', x, y)
      pdf.setFont('helvetica', 'bold')
      pdf.text(formData.documentNumber || '', x + 8, y)
      pdf.text('délivré le :', x + 35, y)
      drawDottedLine(x + 50, y, maxWidth - 50)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('issued on', x + 35, y + 2.5)
      y += 5
      
      // Second N°
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('N° :', x, y)
      drawDottedLine(x + 8, y, maxWidth - 8)
      y += 4
      pdf.text('at :', x, y)
      drawDottedLine(x + 10, y, maxWidth - 10)
      y += 5
      
      // Date d'entrée
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Date d\'entrée au Sénégal :', x, y)
      drawDottedLine(x + 35, y, maxWidth - 35)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Date of entry into Senegal', x, y + 2.5)
      y += 5
      
      // Nationalité
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Nationalité :', x, y)
      pdf.setFont('helvetica', 'bold')
      pdf.text(formData.nationality || '', x + 20, y)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Nationality', x, y + 2.5)
      y += 6
      
      // SECTION 3 — VOYAGE
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.text('SECTION 3 — VOYAGE (verso)', x, y)
      y += 4
      
      // Profession
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Profession ou qualité :', x, y)
      drawDottedLine(x + 35, y, maxWidth - 35)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Occupation', x, y + 2.5)
      y += 5
      
      // Domicile
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Domicile habituel :', x, y)
      pdf.setFont('helvetica', 'bold')
      pdf.text(formData.address || '', x + 25, y)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Home address', x, y + 2.5)
      y += 5
      
      // Date d'arrivée
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Date d\'arrivée dans l\'Établissement :', x, y)
      pdf.setFont('helvetica', 'bold')
      const arrivalDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      pdf.text(arrivalDate, x + 45, y)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Date of arriving in to Hotel', x, y + 2.5)
      y += 5
      
      // Venant de
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Venant de :', x, y)
      drawDottedLine(x + 20, y, maxWidth - 20)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Coming from', x, y + 2.5)
      y += 5
      
      // Allant à
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Allant à :', x, y)
      drawDottedLine(x + 20, y, maxWidth - 20)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Going to', x, y + 2.5)
      y += 5
      
      // Country
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Country :', x, y)
      drawDottedLine(x + 15, y, maxWidth - 15)
      y += 5
      
      // Objet du voyage
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Objet du voyage :', x, y)
      drawDottedLine(x + 30, y, maxWidth - 30)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Business, Health, Touring', x, y + 2.5)
      y += 5
      
      // Nombre d'enfants
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Nombre d\'enfants < 15 ans :', x, y)
      drawDottedLine(x + 35, y, maxWidth - 35)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Number of children under 15', x, y + 2.5)
      y += 5
      
      // Immatriculation
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('N° immatriculation véhicule :', x, y)
      drawDottedLine(x + 35, y, maxWidth - 35)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(5)
      pdf.text('Car number plate', x, y + 2.5)
      y += 6
      
      // SECTION 4 — SIGNATURE
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text('Le : ___________  Signature', x, y)
      y += 3
      
      // Add signature image
      if (signatureDataUrl) {
        pdf.addImage(signatureDataUrl, 'PNG', x + 30, y - 2, 30, 12)
      }
      y += 8
      
      // Registration number
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text(`N° d\'inscription sur le registre : ${registrationNumber}`, x, y)
      y += 4
      
      // Room number
      pdf.text(`Chambre N° : ${roomNumber}`, x, y)
      y += 4
      
      // Phone
      pdf.text('☎ :', x, y)
      drawDottedLine(x + 8, y, maxWidth - 8)
    }
    
    // Draw 4 cards (2x2 grid)
    const startX = (pageWidth - (2 * cardWidth + cardSpacing)) / 2
    const startY = (pageHeight - (2 * cardHeight + cardSpacing)) / 2
    
    // Top-left card
    drawCard(startX, startY)
    
    // Top-right card
    drawCard(startX + cardWidth + cardSpacing, startY)
    
    // Bottom-left card
    drawCard(startX, startY + cardHeight + cardSpacing)
    
    // Bottom-right card
    drawCard(startX + cardWidth + cardSpacing, startY + cardHeight + cardSpacing)
    
    // Draw separator lines
    pdf.setLineWidth(borderWidth)
    // Vertical separator
    pdf.line(pageWidth / 2, startY - 2, pageWidth / 2, startY + 2 * cardHeight + cardSpacing + 2)
    // Horizontal separator
    pdf.line(startX - 2, pageHeight / 2, startX + 2 * cardWidth + cardSpacing + 2, pageHeight / 2)

    // 3) Générer et télécharger le PDF
    const pdfData = pdf.output('datauristring')
    await db.fichesPolice.update(fichePoliceId, { pdfData })
    
    // Generate filename with customer name and date
    const customerName = formData.surname?.toUpperCase() || 'CLIENT'
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
    pdf.save(`fiche-controle-${customerName}-${today}.pdf`)

    setSuccessMessage('✅ 4 fiches générées !')
    setIsGenerating(false)
    // 4) Revenir au dashboard après affichage du message
    setTimeout(() => onConfirm(), 600)
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
        </form>
      </div>
    </div>
  )
}
