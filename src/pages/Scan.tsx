import { useEffect, useRef, useState, useCallback } from 'react'
import { apiService } from '../services/apiService'
import BackButton from '../components/BackButton'
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

  const analyseImage = async (imageBase64: string) => {
    console.log('imageBase64 length:', imageBase64?.length)
    console.log('imageBase64 début:', imageBase64?.substring(0, 50))
    
    const response = await fetch(
      'https://kcrwbjhtofyoojjamoaz.supabase.co/functions/v1/ocr',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageBase64 })
      }
    )

    console.log('response status:', response.status)
    const text = await response.text()
    console.log('response body:', text)
    const parsed = JSON.parse(text)
    console.log('OCR result:', parsed)
    
    // Transformer les données pour correspondre au format OCRData
    const ocrData: OCRData = {
      documentType: parsed.type_piece || 'CNI',
      needsVerso: isVersoMode ? false : true,
      nom: parsed.nom || null,
      prenoms: parsed.prenom || null,
      dateNaissance: parsed.date_naissance || null,
      lieuNaissance: null,
      nationalite: parsed.nationalite || null,
      numeroDocument: parsed.numero_piece || null,
      dateDelivrance: null,
      dateExpiration: parsed.date_expiration || null,
      confidence: 0.8,
      adresse: null,
      profession: null,
      nomPere: null,
      nomMere: null
    }
    
    if (!isMountedRef.current) return
    handleScanResult(ocrData)
    setIsAnalyzing(false)
  }

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
      
      const capturedImage = canvas.toDataURL('image/jpeg', 0.8)
      const imageBase64 = capturedImage.split(',')[1]
      
      setCapturedImage(capturedImage)
      setCapturedImageBase64(imageBase64)
      setCapturedMimeType('image/jpeg')
      
      // Utiliser la nouvelle fonction analyseImage avec l'Edge Function
      await analyseImage(imageBase64)
      return
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

  const capturePhoto = async () => {
  if (!videoRef.current) return
  
  const video = videoRef.current
  
  // Vérifier que la vidéo est bien en lecture
  if (video.paused || video.ended || video.readyState < 2) {
    console.error('Vidéo pas en lecture - état:', video.readyState)
    setError('Vidéo pas prête. Réessayez.')
    return
  }
  
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 1280
  canvas.height = video.videoHeight || 720
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  
  const dataURL = canvas.toDataURL('image/jpeg', 0.8)
  
  if (!dataURL || dataURL === 'data:,') {
    console.error('Capture échouée - canvas vide')
    setError('Capture échouée. Réessayez.')
    return
  }
  
  const imageBase64 = dataURL.split(',')[1]
  console.log('Image capturée, taille base64:', imageBase64.length)
  
  setCapturedImage(dataURL)
  await analyseImage(imageBase64)
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
        await analyseImage(compressedBase64)
        return
      }
    } catch (e1) {
      if (!isMountedRef.current) return
      setAnalysisError('Erreur analyse - utilisez la saisie manuelle')
      setCanRetry(true)
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
        <div className="w-full max-w-xl self-start">
          <BackButton />
        </div>
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
                  onClick={capturePhoto}
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
                    onClick={capturePhoto}
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
                    onClick={capturePhoto}
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
                  onClick={capturePhoto}
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
                  onClick={capturePhoto}
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
