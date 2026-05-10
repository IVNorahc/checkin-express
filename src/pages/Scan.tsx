  import { useEffect, useRef, useState, useCallback } from 'react'
import { scanDocument } from '../utils/ocrService'
import { apiService } from '../services/apiService'
// import * as tf from '@tensorflow/tfjs'
// import * as cocoSsd from '@tensorflow-models/coco-ssd'

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
      // Mistral OCR performe mieux avec 1600px minimum
      const maxSize = 1600
      let { width, height } = img
      if (width > maxSize) {
        height = (height * maxSize) / width
        width = maxSize
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      // Améliorer le contraste pour meilleure lecture
      ctx.filter = 'contrast(1.2) brightness(1.05)'
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.95)
        .replace(/^data:image\/jpeg;base64,/, ''))
    }
    img.src = base64.startsWith('data:') 
      ? base64 
      : `data:image/jpeg;base64,${base64}` 
  })
}

export default function Scan({ onBack, onCapture }: ScanProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null)
  const [capturedMimeType, setCapturedMimeType] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [rectoResult, setRectoResult] = useState<OCRData | null>(null)
  const [isVersoMode, setIsVersoMode] = useState(false)
  const [showVersoPrompt, setShowVersoPrompt] = useState(false)
  const [showManualCapture, setShowManualCapture] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const startCamera = async () => {
    stopCamera()
    await new Promise(resolve => setTimeout(resolve, 800))
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err) {
      console.error('Erreur caméra:', err)
    }
  }

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

  // Fonction pour arrêter complètement le flux caméra
  const stopCameraStream = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }
  }

  useEffect(() => {
    startCamera()
    
    return () => {
      isMountedRef.current = false
      // Nettoyer complètement le stream vidéo
      stopCamera()
    }
  }, [])

  // useEffect pour gérer les changements d'étape (recto ↔ verso)
  useEffect(() => {
    // Quand on change d'étape, redémarrer la caméra
    if (!showVersoPrompt && !capturedImage) {
      const restartCamera = async () => {
        // Arrêter le flux actuel
        stopCamera()
        
        // Réinitialiser la vidéo
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
        
        // Attendre 500ms pour la réinitialisation
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Redémarrer la caméra avec facingMode: 'environment'
        await startCamera()
      }
      
      restartCamera()
    }
  }, [isVersoMode, showVersoPrompt])

  // Capture et analyse manuelle
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current) return
    
    setIsAnalyzing(true)
    setError(null)
    
    try {
      const canvas = document.createElement('canvas')
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0)
      
      const base64 = canvas.toDataURL('image/jpeg', 0.95)
      const processedBase64 = await prepareForOCR(base64)
      
      setCapturedImage(base64)
      const { imageBase64, mimeType } = normalizeScreenshot(base64)
      setCapturedImageBase64(imageBase64)
      setCapturedMimeType(mimeType)
      
      const ocrResult = await scanDocument(processedBase64)
      const completeResult: OCRData = {
        documentType: ocrResult.documentType,
        needsVerso: ocrResult.needsVerso,
        nom: ocrResult.nom,
        prenoms: ocrResult.prenoms,
        dateNaissance: ocrResult.dateNaissance,
        lieuNaissance: ocrResult.lieuNaissance,
        nationalite: ocrResult.nationalite,
        numeroDocument: ocrResult.numeroDocument,
        dateDelivrance: ocrResult.dateDelivrance,
        dateExpiration: ocrResult.dateExpiration,
        confidence: ocrResult.confidence,
        adresse: (ocrResult as any).adresse || '',
        profession: (ocrResult as any).profession || '',
        nomPere: (ocrResult as any).nomPere || '',
        nomMere: (ocrResult as any).nomMere || ''
      }
      setRectoResult(completeResult)
      
      if (completeResult?.needsVerso && !isVersoMode) {
        setShowVersoPrompt(true)
      } else {
        onCapture(completeResult)
      }
    } catch (error) {
      console.error('Erreur capture:', error)
      setError('Erreur lors de la capture. Veuillez réessayer.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [isVersoMode, onCapture])

  const captureHighQuality = async (): Promise<string> => {
    const video = videoRef.current
    if (!video) {
      throw new Error('Impossible de capturer la caméra')
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.filter = 'contrast(1.2) brightness(1.05)'
    ctx.drawImage(video, 0, 0)
    
    return canvas.toDataURL('image/jpeg', 0.95)
      .replace(/^data:image\/jpeg;base64,/, '')
  }

  const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

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

  const handleStartVerso = async () => {
    setShowVersoPrompt(false)
    setIsVersoMode(true)
    setCapturedImage(null)
    setCapturedImageBase64(null)
    setCapturedMimeType(null)
    
    // Démarrer la caméra pour le scan verso
    await startCamera()
  }

  const handleBackToRecto = async () => {
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
    
    // Arrêter complètement le flux caméra
    stopCameraStream()
    
    // Réinitialiser la vidéo
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    // Attendre 500ms pour la réinitialisation complète
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Redémarrer la caméra pour le scan recto
    await startCamera()
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

    // Arrêter la caméra après capture
    stopCamera()

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

  const handleRetry = async () => {
    setCapturedImage(null)
    setCapturedImageBase64(null)
    setAnalysisError(null)
    setIsAnalyzing(false)
    setCanRetry(false)
    
    // Arrêter complètement le flux caméra
    stopCameraStream()
    
    // Réinitialiser la vidéo
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    // Attendre 500ms pour la réinitialisation complète
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Redémarrer la caméra
    await startCamera()
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
    <div className="min-h-screen bg-slate-50">
      <header className="h-16 px-4 md:px-8 flex flex-col items-center justify-center relative pt-2">
        <div className="w-full text-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {showVersoPrompt ? 'CNI détectée' : isVersoMode ? 'Scanner le verso' : 'Scanner un document'}
          </h1>
          {!showVersoPrompt && !isVersoMode && (
            <p className="text-sm text-gray-700">
              Placez la pièce à 15-20cm du téléphone
            </p>
          )}
        </div>
      </header>

      <main className="px-4 md:px-8 pb-8 flex flex-col items-center gap-3 md:gap-6">
        {showVersoPrompt ? (
          // Écran intermédiaire après détection CNI
          <div className="w-full max-w-xl flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-8">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 text-center">
              CNI détectée
            </h2>
            
            <p className="text-lg text-gray-700 mb-8 text-center">
              Retournez la carte pour scanner le verso
            </p>
            
            <div className="w-full space-y-4">
              <button
                type="button"
                onClick={handleStartVerso}
                className="w-full md:w-auto px-8 h-14 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-lg flex items-center justify-center gap-2"
              >
                <span className="text-xl">Scanner le verso</span>
              </button>
              
              <button
                type="button"
                onClick={handleSkipVerso}
                className="w-full md:w-auto px-8 h-12 rounded-full bg-white border border-gray-400 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
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
            
            <div className="mt-6 flex items-center justify-center gap-3 text-gray-900">
              {isAnalyzing ? (
                <>
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-blue-700 border-t-transparent animate-spin" />
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
                  className="w-full md:w-auto px-8 h-12 rounded-full bg-white border border-gray-400 text-gray-700 hover:bg-gray-50 transition-colors"
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
                  className="w-full md:w-auto px-8 h-12 rounded-full bg-blue-700 text-white hover:bg-blue-800 transition-colors font-medium"
                >
                  Scanner le verso
                </button>
                <button
                  type="button"
                  onClick={handleSkipVerso}
                  className="text-sm text-gray-600 hover:text-gray-700 transition-colors underline"
                >
                  Passer le verso
                </button>
              </div>
            )}
            
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full md:w-auto px-8 h-12 rounded-full bg-white border border-gray-400 text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isAnalyzing}
              >
                Reprendre
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full max-w-xl aspect-[3/4] relative rounded-xl overflow-hidden h-[60vh] max-h-[500px]" style={{animation: "pulse-border 2s infinite"}}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  width: '100%', 
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />

              {isAnalyzing && (
                <div className="absolute inset-0 z-10 bg-black/50 flex flex-col items-center justify-center gap-3">
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <p className="text-base sm:text-lg font-medium text-center px-4">Analyse en cours...</p>
                </div>
              )}

              <div className="mt-4 sm:mt-5 w-full max-w-xl text-center text-gray-600 text-sm sm:text-base space-y-1 px-4">
                <p>📏 Placez le document bien à plat</p>
                <p>💡 Assurez-vous d'avoir un bon éclairage</p>
              </div>

              <div className="mt-6 sm:mt-8 w-full max-w-xl flex flex-col items-center gap-3 sm:gap-4 px-4">
                {/* Bouton de capture automatique */}
                {!showManualCapture && (
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={isAnalyzing}
                    className="w-full h-12 sm:h-14 rounded-xl bg-[#1e3a8a] text-white text-base sm:text-lg font-bold hover:bg-[#1e40af] transition-colors"
                  >
                    {isAnalyzing ? 'Analyse en cours...' : 'CAPTURER'}
                  </button>
                )}
                
                {/* Bouton de capture manuelle - fallback */}
                {showManualCapture && (
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={isAnalyzing}
                    className="w-full h-12 sm:h-14 rounded-xl bg-orange-600 text-white text-base sm:text-lg font-bold hover:bg-orange-700 transition-colors"
                  >
                    Capturer manuellement
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleManualInput}
                  disabled={isAnalyzing}
                  className="w-full h-12 rounded-xl bg-white border-2 border-blue-700 text-blue-700 font-bold hover:bg-blue-50 transition-colors"
                  style={{ marginTop: '12px' }}
                >
                  ✏️ Saisie manuelle
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full h-12 rounded-xl bg-white border border-gray-400 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ✕ Annuler
                </button>
                <p className="w-full text-center text-gray-500 text-xs sm:text-sm mt-2 px-4">
                  💡 Sans connexion ou en cas d'erreur OCR, utilisez la saisie manuelle
                </p>
              </div>
            </div>

            <div className="mt-4 sm:mt-5 w-full max-w-xl text-center text-gray-600 text-sm sm:text-base space-y-1 px-4">
              <p>📏 Placez le document bien à plat</p>
              <p>💡 Assurez-vous d'avoir un bon éclairage</p>
            </div>

            <div className="mt-6 sm:mt-8 w-full max-w-xl flex flex-col items-center gap-3 sm:gap-4 px-4">
              {/* Bouton de capture automatique */}
              {!showManualCapture && (
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={isAnalyzing}
                  className="w-full h-12 sm:h-14 rounded-xl bg-blue-700 text-white text-base sm:text-lg font-bold hover:bg-blue-800 transition-colors"
                >
                  {isAnalyzing ? 'Analyse en cours...' : 'CAPTURER'}
                </button>
              )}
              
              {/* Bouton de capture manuelle - fallback */}
              {showManualCapture && (
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={isAnalyzing}
                  className="w-full h-12 sm:h-14 rounded-xl bg-orange-600 text-white text-base sm:text-lg font-bold hover:bg-orange-700 transition-colors"
                >
                  Capturer manuellement
                </button>
              )}
              <button
                type="button"
                onClick={handleManualInput}
                disabled={isAnalyzing}
                className="w-full h-12 rounded-xl bg-white border-2 border-blue-700 text-blue-700 font-bold hover:bg-blue-50 transition-colors"
                style={{ marginTop: '12px' }}
              >
                ✏️ SAISIE MANUELLE
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full h-12 rounded-xl bg-white border border-gray-400 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ✕ Annuler
              </button>
              <p className="w-full text-center text-gray-500 text-xs sm:text-sm mt-2 px-4">
                💡 Sans connexion ou en cas d'erreur OCR, utilisez la saisie manuelle
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
