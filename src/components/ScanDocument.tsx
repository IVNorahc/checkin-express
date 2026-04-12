import { useState, useRef, useEffect } from 'react'
import { scanDocument, type OCRResult, getDocumentTypeInfo } from '../utils/ocrService'
import { canUseOCR } from '../utils/ocrLimitService'

type ScanDocumentProps = {
  onScanComplete: (result: OCRResult) => void
  onBack: () => void
  userId: string
}

type ScanStep = 'recto' | 'verso' | 'form'

export default function ScanDocument({ onScanComplete, onBack, userId }: ScanDocumentProps) {
  const [step, setStep] = useState<ScanStep>('recto')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rectoData, setRectoData] = useState<OCRResult | null>(null)
  const [versoData, setVersoData] = useState<OCRResult | null>(null)
  const [finalData, setFinalData] = useState<OCRResult | null>(null)
  
  // Form fields
  const [formData, setFormData] = useState<{
    nom: string
    prenoms: string
    dateNaissance: string
    lieuNaissance: string
    nationalite: string
    documentType: 'CNI' | 'PASSEPORT' | 'TITRE_SEJOUR' | 'AUTRE'
    numeroDocument: string
    dateDelivrance: string
    dateExpiration: string
    
    departement: string
    profession: string
    domicile: string
    dateArrivee: string
    venantDe: string
    allantA: string
    objetVoyage: string
    enfants: string
    immatriculation: string
    chambre: string
    inscriptionRegistre: string
    telephone: string
  }>({
    // Auto-filled fields
    nom: '',
    prenoms: '',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: '',
    documentType: 'AUTRE',
    numeroDocument: '',
    dateDelivrance: '',
    dateExpiration: '',
    
    // Manual fields
    departement: '',
    profession: '',
    domicile: '',
    dateArrivee: '',
    venantDe: '',
    allantA: '',
    objetVoyage: '',
    enfants: '',
    immatriculation: '',
    chambre: '',
    inscriptionRegistre: '',
    telephone: ''
  })
  
  const [signature, setSignature] = useState<string>('')
  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Erreur caméra:', err)
      setError('Impossible d\'accéder à la caméra')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'scan.jpg', { type: 'image/jpeg' })
            setImageFile(file)
          }
        }, 'image/jpeg', 0.8)
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      stopCamera()
    }
  }

  const processImage = async () => {
    if (!imageFile) return
    
    // Check OCR limits first
    const ocrCheck = await canUseOCR(userId)
    if (!ocrCheck.canUse) {
      setError(ocrCheck.reason || 'Accès OCR non autorisé')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(imageFile)
      })
      
      const result = await scanDocument(base64)
      
      if (step === 'recto') {
        setRectoData(result)
        
        // Auto-fill form data
        setFormData(prev => ({
          ...prev,
          nom: result.nom,
          prenoms: result.prenoms,
          dateNaissance: result.dateNaissance,
          lieuNaissance: result.lieuNaissance,
          nationalite: result.nationalite,
          documentType: result.documentType,
          numeroDocument: result.numeroDocument,
          dateDelivrance: result.dateDelivrance,
          dateExpiration: result.dateExpiration
        }))
        
        if (result.needsVerso) {
          // Show message and move to verso step
          const docInfo = getDocumentTypeInfo(result.documentType)
          alert(`📄 ${docInfo.name} détecté ! Veuillez maintenant scanner le verso.`)
          setStep('verso')
        } else {
          // Move directly to form
          setFinalData(result)
          setStep('form')
        }
      } else if (step === 'verso') {
        setVersoData(result)
        // Merge recto and verso data (prioritize recto for main fields)
        const mergedData: OCRResult = {
          ...rectoData!,
          ...result,
          documentType: rectoData!.documentType,
          needsVerso: rectoData!.needsVerso,
          nom: rectoData!.nom || result.nom,
          prenoms: rectoData!.prenoms || result.prenoms,
          dateNaissance: rectoData!.dateNaissance || result.dateNaissance,
          lieuNaissance: rectoData!.lieuNaissance || result.lieuNaissance,
          nationalite: rectoData!.nationalite || result.nationalite,
          numeroDocument: rectoData!.numeroDocument || result.numeroDocument,
          dateDelivrance: rectoData!.dateDelivrance || result.dateDelivrance,
          dateExpiration: rectoData!.dateExpiration || result.dateExpiration,
          confidence: Math.max(rectoData!.confidence, result.confidence)
        }
        setFinalData(mergedData)
        setStep('form')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  const handleSignatureDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const context = canvas.getContext('2d')
    if (context) {
      context.lineWidth = 2
      context.lineCap = 'round'
      context.strokeStyle = '#1e3a8a'
      context.lineTo(x, y)
      context.stroke()
      context.beginPath()
      context.moveTo(x, y)
    }
  }

  const clearSignature = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height)
        setSignature('')
        setSignatureEmpty(true)
      }
    }
  }

  const validateSignature = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (context) {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = imageData.data
        let hasSignature = false
        
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] > 0) { // Alpha channel
            hasSignature = true
            break
          }
        }
        
        setSignatureEmpty(!hasSignature)
        if (hasSignature) {
          setSignature(canvas.toDataURL())
        }
      }
    }
  }

  const handleSubmit = async () => {
    if (!finalData) return
    
    // Here you would integrate with the existing check-in flow
    // For now, just log complete data
    console.log('Complete check-in data:', {
      ocrData: finalData,
      manualData: formData,
      signature
    })
    
    alert('Check-in validé avec succès !')
    onScanComplete(finalData)
  }

  const docTypeInfo = finalData ? getDocumentTypeInfo(finalData.documentType) : null

  return (
    <div className="min-h-screen bg-[#f1f5f9] py-4 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1e3a8a]">
            📸 Scan de Document
          </h1>
          <button
            onClick={onBack}
            className="px-4 py-2 text-[#1e3a8a] hover:text-[#1e40af] font-medium"
          >
            ← Retour
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8 space-x-4">
          <div className={`flex items-center ${step === 'recto' ? 'text-[#1e3a8a]' : 'text-[#64748b]'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'recto' ? 'bg-[#1e3a8a] text-white' : 'bg-[#e2e8f0]'
            }`}>
              1
            </div>
            <span className="ml-2">Recto</span>
          </div>
          
          {finalData?.needsVerso && (
            <>
              <div className="w-8 h-0.5 bg-[#e2e8f0]"></div>
              <div className={`flex items-center ${step === 'verso' ? 'text-[#1e3a8a]' : 'text-[#64748b]'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'verso' ? 'bg-[#1e3a8a] text-white' : 'bg-[#e2e8f0]'
                }`}>
                  2
                </div>
                <span className="ml-2">Verso</span>
              </div>
            </>
          )}
          
          <div className="w-8 h-0.5 bg-[#e2e8f0]"></div>
          <div className={`flex items-center ${step === 'form' ? 'text-[#1e3a8a]' : 'text-[#64748b]'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'form' ? 'bg-[#1e3a8a] text-white' : 'bg-[#e2e8f0]'
            }`}>
              {finalData?.needsVerso ? '3' : '2'}
            </div>
            <span className="ml-2">Formulaire</span>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {step === 'recto' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-[#1e3a8a] mb-4">
              📸 Scanner le recto du document
            </h2>
            
            {/* Camera or Upload */}
            <div className="space-y-4">
              {!stream ? (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg border-2 border-[#e2e8f0]"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  <div className="flex space-x-4">
                    <button
                      onClick={captureImage}
                      className="flex-1 bg-[#1e3a8a] text-white py-3 rounded-lg font-medium hover:bg-[#1e40af]"
                    >
                      📸 Capturer
                    </button>
                    <button
                      onClick={stopCamera}
                      className="flex-1 bg-[#64748b] text-white py-3 rounded-lg font-medium hover:bg-[#475569]"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={startCamera}
                    className="w-full bg-[#1e3a8a] text-white py-4 rounded-lg font-medium hover:bg-[#1e40af]"
                  >
                    📸 Démarrer la caméra
                  </button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[#64748b] text-lg">OU</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="w-full border-2 border-dashed border-[#e2e8f0] rounded-lg py-8 text-center"
                    />
                  </div>
                </div>
              )}
              
              {imageFile && (
                <div className="mt-4">
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Document scanné"
                    className="w-full rounded-lg border-2 border-[#e2e8f0]"
                  />
                  <button
                    onClick={processImage}
                    disabled={loading}
                    className="w-full mt-4 bg-[#16a34a] text-white py-3 rounded-lg font-medium hover:bg-[#15803d] disabled:opacity-50"
                  >
                    {loading ? '🔄 Analyse en cours...' : '🔍 Analyser le document'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'verso' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-[#1e3a8a] mb-4">
              📸 Scanner le verso du document
            </h2>
            
            <div className="space-y-4">
              {!stream ? (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg border-2 border-[#e2e8f0]"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  <div className="flex space-x-4">
                    <button
                      onClick={captureImage}
                      className="flex-1 bg-[#1e3a8a] text-white py-3 rounded-lg font-medium hover:bg-[#1e40af]"
                    >
                      📸 Capturer
                    </button>
                    <button
                      onClick={stopCamera}
                      className="flex-1 bg-[#64748b] text-white py-3 rounded-lg font-medium hover:bg-[#475569]"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={startCamera}
                    className="w-full bg-[#1e3a8a] text-white py-4 rounded-lg font-medium hover:bg-[#1e40af]"
                  >
                    📸 Démarrer la caméra
                  </button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[#64748b] text-lg">OU</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="w-full border-2 border-dashed border-[#e2e8f0] rounded-lg py-8 text-center"
                    />
                  </div>
                </div>
              )}
              
              {imageFile && (
                <div className="mt-4">
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Verso scanné"
                    className="w-full rounded-lg border-2 border-[#e2e8f0]"
                  />
                  <button
                    onClick={processImage}
                    disabled={loading}
                    className="w-full mt-4 bg-[#16a34a] text-white py-3 rounded-lg font-medium hover:bg-[#15803d] disabled:opacity-50"
                  >
                    {loading ? '🔄 Analyse en cours...' : '🔍 Analyser le verso'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'form' && finalData && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-[#1e3a8a] mb-6">
              📝 Valider les informations du client
            </h2>

            {/* Document type info */}
            {docTypeInfo && (
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: `${docTypeInfo.color}10` }}>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: docTypeInfo.color }}>
                    {finalData.documentType}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold" style={{ color: docTypeInfo.color }}>
                      {docTypeInfo.name}
                    </h3>
                    <p className="text-sm text-[#64748b]">
                      Confiance: {Math.round(finalData.confidence * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Section A - Auto-filled fields */}
              <div>
                <h3 className="font-semibold text-[#1e3a8a] mb-4 pb-2 border-b border-[#e2e8f0]">
                  🤖 Informations détectées par OCR
                </h3>
                <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Nom</label>
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent ${
                        finalData.confidence < 0.85 ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-[#e2e8f0]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Prénoms</label>
                    <input
                      type="text"
                      value={formData.prenoms}
                      onChange={(e) => setFormData(prev => ({ ...prev, prenoms: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent ${
                        finalData.confidence < 0.85 ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-[#e2e8f0]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Date de naissance</label>
                    <input
                      type="text"
                      placeholder="JJ/MM/AAAA"
                      value={formData.dateNaissance}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateNaissance: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent ${
                        finalData.confidence < 0.85 ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-[#e2e8f0]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Lieu de naissance</label>
                    <input
                      type="text"
                      value={formData.lieuNaissance}
                      onChange={(e) => setFormData(prev => ({ ...prev, lieuNaissance: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent ${
                        finalData.confidence < 0.85 ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-[#e2e8f0]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Nationalité</label>
                    <input
                      type="text"
                      value={formData.nationalite}
                      onChange={(e) => setFormData(prev => ({ ...prev, nationalite: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent ${
                        finalData.confidence < 0.85 ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-[#e2e8f0]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Type de pièce</label>
                    <input
                      type="text"
                      value={formData.documentType}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg bg-gray-100 border-gray-300"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">N° de document</label>
                    <input
                      type="text"
                      value={formData.numeroDocument}
                      onChange={(e) => setFormData(prev => ({ ...prev, numeroDocument: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent ${
                        finalData.confidence < 0.85 ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-[#e2e8f0]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Délivré le</label>
                    <input
                      type="text"
                      placeholder="JJ/MM/AAAA"
                      value={formData.dateDelivrance}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateDelivrance: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent ${
                        finalData.confidence < 0.85 ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-[#e2e8f0]'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Date d'expiration</label>
                    <input
                      type="text"
                      placeholder="JJ/MM/AAAA"
                      value={formData.dateExpiration}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateExpiration: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent ${
                        finalData.confidence < 0.85 ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-[#e2e8f0]'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Section B - Manual fields */}
              <div>
                <h3 className="font-semibold text-[#1e3a8a] mb-4 pb-2 border-b border-[#e2e8f0]">
                  ✏️ Informations à compléter
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Département / Country</label>
                    <input
                      type="text"
                      value={formData.departement}
                      onChange={(e) => setFormData(prev => ({ ...prev, departement: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Profession ou qualité</label>
                    <input
                      type="text"
                      value={formData.profession}
                      onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Domicile habituel</label>
                    <input
                      type="text"
                      value={formData.domicile}
                      onChange={(e) => setFormData(prev => ({ ...prev, domicile: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Date d'arrivée dans l'établissement</label>
                    <input
                      type="date"
                      value={formData.dateArrivee}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateArrivee: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Venant de</label>
                    <input
                      type="text"
                      value={formData.venantDe}
                      onChange={(e) => setFormData(prev => ({ ...prev, venantDe: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Allant à</label>
                    <input
                      type="text"
                      value={formData.allantA}
                      onChange={(e) => setFormData(prev => ({ ...prev, allantA: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Objet du voyage</label>
                    <select
                      value={formData.objetVoyage}
                      onChange={(e) => setFormData(prev => ({ ...prev, objetVoyage: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    >
                      <option value="">Sélectionner...</option>
                      <option value="Travail">Travail</option>
                      <option value="Santé">Santé</option>
                      <option value="Tourisme">Tourisme</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Nombre d'enfants de moins de 15 ans</label>
                    <input
                      type="number"
                      value={formData.enfants}
                      onChange={(e) => setFormData(prev => ({ ...prev, enfants: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">N° d'immatriculation du véhicule</label>
                    <input
                      type="text"
                      value={formData.immatriculation}
                      onChange={(e) => setFormData(prev => ({ ...prev, immatriculation: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">N° de chambre</label>
                    <input
                      type="text"
                      value={formData.chambre}
                      onChange={(e) => setFormData(prev => ({ ...prev, chambre: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">N° d'inscription au registre</label>
                    <input
                      type="text"
                      value={formData.inscriptionRegistre}
                      onChange={(e) => setFormData(prev => ({ ...prev, inscriptionRegistre: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1e293b] mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section C - Signature */}
            <div className="mt-8">
              <h3 className="font-semibold text-[#1e3a8a] mb-4 pb-2 border-b border-[#e2e8f0]">
                ✍️ Signature électronique
              </h3>
              <div className="bg-white border-2 border-[#e2e8f0] rounded-lg p-2">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="w-full border border-[#e2e8f0] rounded cursor-crosshair"
                  onMouseDown={(e) => {
                    const canvas = canvasRef.current
                    if (canvas) {
                      const context = canvas.getContext('2d')
                      if (context) {
                        context.beginPath()
                        const rect = canvas.getBoundingClientRect()
                        context.moveTo(e.clientX - rect.left, e.clientY - rect.top)
                      }
                    }
                  }}
                  onMouseMove={handleSignatureDraw}
                  onMouseUp={validateSignature}
                  onMouseLeave={validateSignature}
                />
              </div>
              <div className="flex space-x-4 mt-4">
                <button
                  onClick={clearSignature}
                  className="px-4 py-2 bg-[#64748b] text-white rounded-lg hover:bg-[#475569]"
                >
                  Effacer
                </button>
                <button
                  onClick={validateSignature}
                  className="px-4 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e40af]"
                >
                  Valider la signature
                </button>
              </div>
              {signatureEmpty && (
                <p className="text-red-600 text-sm mt-2">
                  La signature est obligatoire
                </p>
              )}
            </div>

            {/* Submit button */}
            <div className="mt-8">
              <button
                onClick={handleSubmit}
                disabled={signatureEmpty}
                className="w-full bg-gradient-to-r from-[#16a34a] to-[#22c55e] text-white py-4 rounded-lg font-semibold text-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✅ Valider le check-in et générer la fiche
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
