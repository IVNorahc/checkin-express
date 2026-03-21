  import { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { analyzeDocument } from '../lib/gemini'

type ScanProps = {
  onBack: () => void
  onCapture: (data: OCRData | null) => void
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

export default function Scan({ onBack, onCapture }: ScanProps) {
  const webcamRef = useRef<Webcam>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null)
  const [capturedMimeType, setCapturedMimeType] = useState<string>('image/jpeg')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)

  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

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

    const screenshot = webcamRef.current?.getScreenshot()
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
      const data = (await analyzeDocument(enhanced.imageBase64, enhanced.mimeType)) as OCRData
      if (!isMountedRef.current) return
      onCapture(data)
      return
    } catch (e1) {
      if (!isMountedRef.current) return
      setAnalysisError(extractGeminiErrorMessage(e1))
      setCanRetry(true)

      // Retry automatique une seule fois après 2 secondes
      await waitMs(2000)

      try {
        const data = (await analyzeDocument(enhanced.imageBase64, enhanced.mimeType)) as OCRData
        if (!isMountedRef.current) return
        onCapture(data)
        return
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
      const data = (await analyzeDocument(capturedImageBase64, capturedMimeType)) as OCRData
      if (!isMountedRef.current) return
      onCapture(data)
      return
    } catch (e1) {
      if (!isMountedRef.current) return
      setAnalysisError(extractGeminiErrorMessage(e1))
      await waitMs(2000)

      try {
        const data = (await analyzeDocument(capturedImageBase64, capturedMimeType)) as OCRData
        if (!isMountedRef.current) return
        onCapture(data)
        return
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
      issuingCountry: "",
      surname: "",
      givenNames: "",
      dateOfBirth: "",
      documentNumber: "",
      nationality: "",
      sex: "M",
      expiryDate: "",
      address: null,
      needsBackSide: false,
      confidence: 1.0
    }
    onCapture(manualData)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="h-16 px-4 flex items-center relative">
        <button
          type="button"
          onClick={onBack}
          className="text-2xl leading-none text-white z-10"
          aria-label="Retour"
        >
          ←
        </button>
        <h1 className="absolute inset-0 flex items-center justify-center text-lg font-semibold">
          Scanner un document
        </h1>
      </header>

      <main className="px-4 pb-8 flex flex-col items-center">
        {capturedImage ? (
          <div className="w-full max-w-xl">
            <img
              src={capturedImage}
              alt="Capture du document"
              className="w-full rounded-xl border border-white/20"
            />
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
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleRetry}
                className="px-8 h-12 rounded-full border border-white text-white hover:bg-white/10 transition-colors"
                disabled={isAnalyzing}
              >
                ↻ Reprendre
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full max-w-xl aspect-[3/4] relative rounded-xl overflow-hidden h-[60vh] max-h-[500px]">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.95}
                videoConstraints={
                  {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    focusMode: 'continuous',
                  } as any
                }
                className="w-full h-full object-cover"
              />

              {isAnalyzing && (
                <div className="absolute inset-0 z-10 bg-black/50 flex flex-col items-center justify-center gap-3">
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <p className="text-base sm:text-lg font-medium text-center px-4">Analyse en cours...</p>
                </div>
              )}

              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                <div className="relative w-[85%] h-[55%] rounded-[12px] border-[3px] border-primary">
                  <span className="absolute -top-[3px] -left-[3px] w-8 h-8 sm:w-10 sm:h-10 border-t-[4px] border-l-[4px] border-primary-hover rounded-tl-[12px]" />
                  <span className="absolute -top-[3px] -right-[3px] w-8 h-8 sm:w-10 sm:h-10 border-t-[4px] border-r-[4px] border-primary-hover rounded-tr-[12px]" />
                  <span className="absolute -bottom-[3px] -left-[3px] w-8 h-8 sm:w-10 sm:h-10 border-b-[4px] border-l-[4px] border-primary-hover rounded-bl-[12px]" />
                  <span className="absolute -bottom-[3px] -right-[3px] w-8 h-8 sm:w-10 sm:h-10 border-b-[4px] border-r-[4px] border-primary-hover rounded-br-[12px]" />
                </div>
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
                className="w-full h-12 sm:h-14 rounded-[50px] bg-primary text-white text-base sm:text-lg font-semibold shadow-lg hover:bg-primary-hover transition-colors"
              >
                📸 CAPTURER
              </button>
              <button
                type="button"
                onClick={handleManualInput}
                disabled={isAnalyzing}
                className="w-full h-12 rounded-lg border border-primary text-primary bg-transparent font-medium hover:bg-primary hover:text-white transition-colors"
                style={{ marginTop: '12px' }}
              >
                ✏️ SAISIE MANUELLE
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full h-12 rounded-[50px] border border-gray-600 text-gray-300 bg-transparent hover:bg-gray-700 transition-colors"
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
