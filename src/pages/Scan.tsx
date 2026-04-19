  import { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { scanDocument } from '../utils/ocrService'
import { apiService } from '../services/apiService'

type ScanProps = {
  onBack: () => void
  onCapture: (data: OCRData | null) => void
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

function normalizeScreenshot(screenshot: string, fallbackMimeType = 'image/jpeg') {
  if (screenshot.startsWith('data:')) {
    const match = screenshot.match(/^data:(.*?);base64,(.*)$/)
    if (match) {
      return {
        previewSrc: screenshot,
        imageBase64: match[2],
        mimeType: match[1],
      }
    }
  }

  return {
    previewSrc: `data:${fallbackMimeType};base64,${screenshot}`,
    imageBase64: screenshot,
    mimeType: fallbackMimeType,
  }
}

async function prepareForOCR(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxSize = 1600 // Plus grand pour meilleure lecture OCR
      let { width, height } = img
      if (width > maxSize) {
        height = (height * maxSize) / width
        width = maxSize
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.92)
        .replace(/^data:image\/jpeg;base64,/, ''))
    }
    img.src = base64.startsWith('data:') 
      ? base64 
      : `data:image/jpeg;base64,${base64}` 
  })
}

export default function Scan({ onBack, onCapture }: ScanProps) {
  const webcamRef = useRef<Webcam>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null)
  const [capturedMimeType, setCapturedMimeType] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [rectoResult, setRectoResult] = useState<OCRData | null>(null)
  const [isVersoMode, setIsVersoMode] = useState(false)
  const [showVersoPrompt, setShowVersoPrompt] = useState(false)
  const isMountedRef = useRef(true)

  // Fonction alternative avec API sécurisée
  const analyzeWithSecureAPI = async (imageBase64: string, mimeType: string): Promise<OCRData | null> => {
    if (!apiService.isApiKeyAvailable()) {
      console.warn('API Key non disponible, utilisation de Gemini')
      return null
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiService['apiKey']!,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: imageBase64
                }
              },
              {
                type: 'text',
                text: isVersoMode ? `Tu es un expert en lecture de CNI sénégalaise CEDEAO (verso).
Sur le VERSO de cette CNI sénégalaise :
- Le NIN (Numéro d'Identification National) commence par "NIN" suivi de chiffres
- L'adresse domicile
- La profession
- Le nom du père
- Le nom de la mère

Réponds UNIQUEMENT avec ce JSON :
{
  "numeroDocument": "NIN...",
  "adresse": "",
  "profession": "",
  "nomPere": "",
  "nomMere": "",
  "confidence": 0.95
}` : `Tu es un expert en lecture de CNI sénégalaise CEDEAO (recto).
Lis TRÈS attentivement chaque chiffre et lettre.

Sur le RECTO de cette CNI sénégalaise :
- Les PRÉNOMS sont écrits en premier (souvent 2 mots)
- Le NOM DE FAMILLE est en dessous des prénoms (souvent 1 mot)
- La DATE DE NAISSANCE est au format JJ/MM/AAAA - lis chaque chiffre séparément
- Le LIEU DE NAISSANCE est une ville sénégalaise
- La DATE DE DÉLIVRANCE est la date d'émission de la carte
- La DATE D'EXPIRATION est 10 ans après la délivrance

IMPORTANT : 
- Le numéro NIN est au VERSO, pas ici - laisse numeroDocument vide
- Lis la ligne MRZ en bas pour vérifier les dates si illisibles
- La ligne MRZ format : I<SEN[numéro]<<[date_naissance]...[date_expiration]

Réponds UNIQUEMENT avec ce JSON :
{
  "documentType": "CNI",
  "needsVerso": true,
  "nom": "NOM_FAMILLE",
  "prenoms": "PRENOM(S)",
  "dateNaissance": "JJ/MM/AAAA",
  "lieuNaissance": "VILLE",
  "nationalite": "SENEGALAISE",
  "numeroDocument": "",
  "dateDelivrance": "JJ/MM/AAAA",
  "dateExpiration": "JJ/MM/AAAA",
  "confidence": 0.95
}`
              }
            ]
          }]
        })
      })

      if (!response.ok) {
        console.error('API sécurisée error:', response.status, response.statusText)
        return null
      }

      const data = await response.json()
      const content = data.content[0]?.text || ''
      
      // Parser le JSON de la réponse
      let parsedData
      try {
        parsedData = JSON.parse(content)
      } catch (e) {
        console.error('Erreur parsing JSON API sécurisée:', e)
        return null
      }

      // Mapper les champs selon le mode
      if (isVersoMode) {
        return {
          documentType: 'CNI',
          needsVerso: false,
          nom: '',
          prenoms: '',
          dateNaissance: '',
          lieuNaissance: '',
          nationalite: '',
          numeroDocument: parsedData.numeroDocument || '',
          dateDelivrance: '',
          dateExpiration: '',
          confidence: parsedData.confidence || 0.95,
          adresse: parsedData.adresse || '',
          profession: parsedData.profession || '',
          nomPere: parsedData.nomPere || '',
          nomMere: parsedData.nomMere || ''
        }
      } else {
        return {
          documentType: parsedData.documentType || 'CNI',
          needsVerso: parsedData.needsVerso !== false,
          nom: parsedData.nom || '',
          prenoms: parsedData.prenoms || '',
          dateNaissance: parsedData.dateNaissance || '',
          lieuNaissance: parsedData.lieuNaissance || '',
          nationalite: parsedData.nationalite || '',
          numeroDocument: parsedData.numeroDocument || '',
          dateDelivrance: parsedData.dateDelivrance || '',
          dateExpiration: parsedData.dateExpiration || '',
          confidence: parsedData.confidence || 0.95,
          adresse: '',
          profession: '',
          nomPere: '',
          nomMere: ''
        }
      }
    } catch (error) {
      console.error('Erreur API sécurisée:', error)
      return null
    }
  }

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

  const captureHighQuality = async (): Promise<string> => {
    const video = videoRef.current
    if (!video) {
      // Fallback sur webcamRef si videoRef n'est pas disponible
      const screenshot = webcamRef.current?.getScreenshot()
      if (!screenshot) throw new Error('Impossible de capturer la caméra')
      return screenshot
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth   // Pleine résolution native
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Qualité maximale pour l'OCR
    return canvas.toDataURL('image/jpeg', 0.95)
  }

  const handleScanResult = (result: OCRData) => {
    if (isVersoMode) {
      // Mode verso : fusionner recto + verso et passer au formulaire
      const mergedData = { ...rectoResult, ...result }
      onCapture(mergedData)
    } else {
      // Mode recto : vérifier si verso nécessaire
      if (result.documentType === 'CNI' || result.needsVerso === true) {
        // CNI détectée : sauvegarder recto et afficher l'écran intermédiaire
        setRectoResult(result)
        setShowVersoPrompt(true)
        setIsAnalyzing(false)
      } else {
        // Pas de verso nécessaire : passer directement au formulaire
        onCapture(result)
      }
    }
  }

  const handleSkipVerso = () => {
    if (rectoResult) {
      onCapture(rectoResult)
    }
  }

  const handleStartVerso = () => {
    setShowVersoPrompt(false)
    setIsVersoMode(true)
    setCapturedImage(null)
    setCapturedImageBase64(null)
    setCapturedMimeType(null)
  }

  const handleBackToRecto = () => {
    if (showVersoPrompt) {
      setShowVersoPrompt(false)
      setRectoResult(null)
    } else {
      setIsVersoMode(false)
      setRectoResult(null)
    }
    setCapturedImage(null)
    setCapturedImageBase64(null)
    setCapturedMimeType(null)
    setAnalysisError(null)
    setCanRetry(false)
  }

  const extractGeminiErrorMessage = (err: unknown) => {
    if (err && typeof err === 'object') {
      const anyErr = err as any
      const msg =
        anyErr?.message ??
        anyErr?.error?.message ??
        anyErr?.error_description ??
        anyErr?.response?.data?.message
      if (typeof msg === 'string' && msg.trim()) return msg.trim()
    }
    if (typeof err === 'string') return err
    return "Erreur d'analyse"
  }

  const handleCapture = async () => {
    if (isAnalyzing) return

    setIsAnalyzing(true)
    setAnalysisError(null)
    setCanRetry(false)
    setCapturedImageBase64(null)

    // Laisser l'autofocus se stabiliser
    await waitMs(500)

    const screenshot = await captureHighQuality()
    if (!screenshot) {
      if (isMountedRef.current) {
        setAnalysisError("Impossible de capturer la caméra")
        setCanRetry(true)
        setIsAnalyzing(false)
      }
      return
    }

    const normalized = normalizeScreenshot(screenshot, 'image/jpeg')

    // Afficher rapidement un aperçu pendant la préparation/analysis.
    if (isMountedRef.current) {
      setCapturedImage(normalized.previewSrc)
    }

    // Re-coder en JPEG haute résolution pour améliorer la qualité d'OCR.
    const enhanced = await (async () => {
      const img = new Image()
      img.src = normalized.previewSrc
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Image de capture invalide'))
      })

      const canvas = document.createElement('canvas')
      canvas.width = 1920
      canvas.height = 1080
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas non supporté')

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95)
      const match = jpegDataUrl.match(/^data:image\/jpeg;base64,(.*)$/)
      const base64 = match?.[1] ?? jpegDataUrl.split(',')[1]

      return {
        previewSrc: jpegDataUrl,
        imageBase64: base64,
        mimeType: 'image/jpeg',
      }
    })()

    if (isMountedRef.current) {
      setCapturedImage(enhanced.previewSrc)
      setCapturedImageBase64(enhanced.imageBase64)
      setCapturedMimeType(enhanced.mimeType)
    }

    try {
      // Essayer d'abord avec l'API sécurisée
      const secureApiData = await analyzeWithSecureAPI(enhanced.imageBase64, enhanced.mimeType)
      
      if (secureApiData && isMountedRef.current) {
        handleScanResult(secureApiData)
        return
      }
      
      // Fallback sur Anthropic OCR si l'API sécurisée n'est pas disponible
      console.log('Fallback sur Anthropic OCR')
      if (enhanced.imageBase64 && enhanced.mimeType) {
        const compressedBase64 = await prepareForOCR(enhanced.imageBase64)
        const data = (await scanDocument(compressedBase64)) as unknown as OCRData
        if (!isMountedRef.current) return
        handleScanResult(data)
        return
      }
    } catch (e1) {
      if (!isMountedRef.current) return
      
      // Si l'API sécurisée échoue, essayer Anthropic OCR
      try {
        console.log('Fallback sur Anthropic OCR après erreur')
        if (enhanced.imageBase64 && enhanced.mimeType) {
          const compressedBase64 = await prepareForOCR(enhanced.imageBase64)
          const data = (await scanDocument(compressedBase64)) as unknown as OCRData
          if (!isMountedRef.current) return
          handleScanResult(data)
          return
        }
      } catch (e2) {
        if (!isMountedRef.current) return
        setAnalysisError(extractGeminiErrorMessage(e2))
        setCanRetry(true)
      }
    } finally {
      if (isMountedRef.current) setIsAnalyzing(false)
    }
  }

  const handleRetry = () => {
    setCapturedImage(null)
    setCapturedImageBase64(null)
    setAnalysisError(null)
    setIsAnalyzing(false)
    setCanRetry(false)
  }

  const handleRetryAnalysis = async () => {
    if (!capturedImageBase64) return
    if (isAnalyzing) return

    setIsAnalyzing(true)
    setAnalysisError(null)
    setCanRetry(false)

    try {
      if (capturedImageBase64 && capturedMimeType) {
        const compressedBase64 = await prepareForOCR(capturedImageBase64)
        const data = (await scanDocument(compressedBase64)) as unknown as OCRData
        if (!isMountedRef.current) return
        handleScanResult(data)
        return
      }
    } catch (e1) {
      if (!isMountedRef.current) return
      setAnalysisError(extractGeminiErrorMessage(e1))
      await waitMs(2000)

      try {
        if (capturedImageBase64 && capturedMimeType) {
          const compressedBase64 = await prepareForOCR(capturedImageBase64)
          const data = (await scanDocument(compressedBase64)) as unknown as OCRData
          if (!isMountedRef.current) return
          handleScanResult(data)
          return
        }
      } catch (e2) {
        if (!isMountedRef.current) return
        setAnalysisError(extractGeminiErrorMessage(e2))
        setCanRetry(true)
      }
    } finally {
      if (isMountedRef.current) setIsAnalyzing(false)
    }
  }

  const handleManualInput = () => {
    const manualData: OCRData = {
      documentType: "id_card",
      needsVerso: false,
      nom: "",
      prenoms: "",
      dateNaissance: "",
      lieuNaissance: "",
      nationalite: "",
      numeroDocument: "",
      dateDelivrance: "",
      dateExpiration: "",
      confidence: 0,
      adresse: "",
      profession: "",
      nomPere: "",
      nomMere: ""
    }
    onCapture(manualData)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="h-16 px-4 flex items-center relative">
        <button
          type="button"
          onClick={handleBackToRecto}
          className="text-2xl leading-none text-white z-10"
          aria-label="Retour"
        >
          {isVersoMode || showVersoPrompt ? 'Retour' : 'Retour'}
        </button>
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-lg font-semibold">
            {showVersoPrompt ? 'CNI détectée' : isVersoMode ? 'Scanner le verso' : 'Scanner un document'}
          </h1>
          {!showVersoPrompt && !isVersoMode && (
            <p className="text-sm text-gray-300 ml-4">
              Placez la pièce à 15-20cm du téléphone
            </p>
          )}
        </div>
      </header>

      <main className="px-4 pb-8 flex flex-col items-center">
        {showVersoPrompt ? (
          // Écran intermédiaire après détection CNI
          <div className="w-full max-w-xl flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-8">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              CNI détectée
            </h2>
            
            <p className="text-lg text-gray-300 mb-8 text-center">
              Retournez la carte pour scanner le verso
            </p>
            
            <div className="w-full space-y-4">
              <button
                type="button"
                onClick={handleStartVerso}
                className="w-full px-8 h-14 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-lg flex items-center justify-center gap-2"
              >
                <span className="text-xl">Scanner le verso</span>
              </button>
              
              <button
                type="button"
                onClick={handleSkipVerso}
                className="w-full px-8 h-12 rounded-full border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition-colors font-medium"
              >
                Passer le verso
              </button>
            </div>
          </div>
        ) : capturedImage ? (
          <div className="w-full max-w-xl">
            <img
              src={capturedImage}
              alt="Capture du document"
              className="w-full rounded-xl border border-white/20"
            />
            
            {/* Message spécial pour mode verso */}
            {isVersoMode && !analysisError && !isAnalyzing && (
              <div className="mt-6 p-4 bg-blue-50/90 border border-blue-200 text-blue-700 rounded-xl text-center">
                <p className="font-medium">CNI détectée ! Retournez la carte et scannez le verso.</p>
              </div>
            )}
            
            <div className="mt-6 flex items-center justify-center gap-3 text-white">
              {isAnalyzing ? (
                <>
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <p className="text-lg font-medium">Analyse en cours...</p>
                </>
              ) : (
                <p className="text-lg font-medium">{analysisError ? 'Analyse terminée' : 'Prêt pour confirmation'}</p>
              )}
            </div>
            {analysisError && <p className="mt-3 text-sm text-red-500 text-center">{analysisError}</p>}

            {canRetry && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleRetryAnalysis}
                  className="px-8 h-12 rounded-full border border-white text-white bg-transparent hover:bg-white/10 transition-colors"
                  disabled={isAnalyzing}
                >
                  Réessayer
                </button>
              </div>
            )}
            
            {/* Boutons spécifiques au mode verso */}
            {isVersoMode && !isAnalyzing && !analysisError && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleCapture}
                  className="px-8 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                >
                  Scanner le verso
                </button>
                <button
                  type="button"
                  onClick={handleSkipVerso}
                  className="text-sm text-blue-300 hover:text-blue-200 transition-colors underline"
                >
                  Passer le verso
                </button>
              </div>
            )}
            
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleRetry}
                className="px-8 h-12 rounded-full border border-white text-white hover:bg-white/10 transition-colors"
                disabled={isAnalyzing}
              >
                Reprendre
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full max-w-xl aspect-[3/4] relative rounded-xl overflow-hidden h-[60vh] max-h-[500px]" style={{animation: "pulse-border 2s infinite"}}>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.95}
                videoConstraints={
                  {
                    facingMode: 'environment',
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 },
                    aspectRatio: { ideal: 1.777 },
                    focusMode: 'continuous',
                    zoom: 1.0
                  } as any
                }
                className="w-full h-full object-cover"
                onUserMedia={() => {
                  // Accéder à l'élément vidéo après l'initialisation
                  const videoElement = webcamRef.current?.video
                  if (videoElement) {
                    videoRef.current = videoElement
                  }
                }}
              />

              <div style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: "2px",
                background: "linear-gradient(90deg, transparent, #4a90d9, transparent)",
                animation: "scan-line 2s linear infinite"
              }}></div>

              {isAnalyzing && (
                <div className="absolute inset-0 z-10 bg-black/50 flex flex-col items-center justify-center gap-3">
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <p className="text-base sm:text-lg font-medium text-center px-4">Analyse en cours...</p>
                </div>
              )}

              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                {/* Fond sombre autour du cadre */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.45)'
                }} />
                {/* Cadre blanc proportions carte d'identité */}
                <div style={{
                  position: 'relative',
                  width: '92%',
                  aspectRatio: '1.586',
                  border: '3px solid white',
                  borderRadius: '10px',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                  zIndex: 10
                }}>
                  {/* Coins de guidage */}
                  <div style={{position:'absolute',top:-3,left:-3,width:20,height:20,
                    borderTop:'4px solid #3B82F6',borderLeft:'4px solid #3B82F6'}} />
                  <div style={{position:'absolute',top:-3,right:-3,width:20,height:20,
                    borderTop:'4px solid #3B82F6',borderRight:'4px solid #3B82F6'}} />
                  <div style={{position:'absolute',bottom:-3,left:-3,width:20,height:20,
                    borderBottom:'4px solid #3B82F6',borderLeft:'4px solid #3B82F6'}} />
                  <div style={{position:'absolute',bottom:-3,right:-3,width:20,height:20,
                    borderBottom:'4px solid #3B82F6',borderRight:'4px solid #3B82F6'}} />
                </div>
                {/* Texte guide */}
                <p style={{
                  position: 'absolute',
                  bottom: '15%',
                  color: 'white',
                  fontSize: '14px',
                  textAlign: 'center',
                  zIndex: 11,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                }}>
                  📏 Rapprochez-vous · La carte doit remplir le cadre
                </p>
              </div>
            </div>

            <div className="mt-4 sm:mt-5 w-full max-w-xl text-center text-white text-sm sm:text-base space-y-1 px-4">
              <p>📏 Placez le document bien à plat</p>
              <p>💡 Assurez-vous d'avoir un bon éclairage</p>
              <p>🔍 Remplissez le cadre avec le document</p>
              <p>⏱️ Restez immobile au moment de capturer</p>
            </div>

            <div className="mt-6 sm:mt-8 w-full max-w-xl flex flex-col items-center gap-3 sm:gap-4 px-4">
              <button
                type="button"
                onClick={handleCapture}
                disabled={isAnalyzing}
                className="w-full h-12 sm:h-14 rounded-xl bg-[#1e3a8a] text-white text-base sm:text-lg font-bold hover:bg-[#1e40af] transition-colors"
              >
                📸 CAPTURER
              </button>
              <button
                type="button"
                onClick={handleManualInput}
                disabled={isAnalyzing}
                className="w-full h-12 rounded-xl bg-white border-2 border-[#1e3a8a] text-[#1e3a8a] font-bold hover:bg-[#1e3a8a] hover:text-white transition-colors"
                style={{ marginTop: '12px' }}
              >
                ✏️ SAISIE MANUELLE
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full h-12 rounded-xl border border-white/50 text-white hover:bg-white/10 transition-colors"
              >
                ✕ Annuler
              </button>
              <p className="w-full text-center text-white/60 text-xs sm:text-sm mt-2 px-4">
                💡 Sans connexion ou en cas d'erreur OCR, utilisez la saisie manuelle
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
