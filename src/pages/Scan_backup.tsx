import { useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { analyzeDocument } from '../lib/gemini'
import { apiService } from '../services/apiService'

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
  const [capturedMimeType, setCapturedMimeType] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const isMountedRef = useRef(true)

  // Fonction alternative avec API sécurisée
  const analyzeWithSecureAPI = async (imageBase64: string, mimeType: string): Promise<OCRData | null> => {
    if (!apiService.isApiKeyAvailable()) {
      console.warn('API Key non disponible, utilisation de Gemini')
      return null
    }

    try {
      // Créer FormData pour l'envoi de l'image
      const formData = new FormData()
      
      // Convertir base64 en Blob
      const response = await fetch(`data:${mimeType};base64,${imageBase64}`)
      const blob = await response.blob()
      formData.append('image', blob, 'document.jpg')
      
      // Appel à l'API sécurisée
      const result = await apiService.processDocument(formData)
      
      // Transformer le résultat au format OCRData
      return {
        documentType: result.documentType || null,
        issuingCountry: result.issuingCountry || null,
        surname: result.surname || null,
        givenNames: result.givenNames || null,
        dateOfBirth: result.dateOfBirth || null,
        documentNumber: result.documentNumber || null,
        nationality: result.nationality || null,
        sex: result.sex || null,
        expiryDate: result.expiryDate || null,
        address: result.address || null,
        needsBackSide: result.needsBackSide || false,
        confidence: result.confidence || 0.8
      }
    } catch (error) {
      console.error('Erreur avec l\'API sécurisée:', error)
      return null
    }
  }

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

  const extractGeminiErrorMessage = (err: unknown) => {
    if (err && typeof err === 'object') {
      if ('message' in err && typeof err.message === 'string') {
        if (err.message.includes('quota')) return 'Quota d\'API dépassé. Veuillez réessayer plus tard.'
        if (err.message.includes('rate')) return 'Trop de requêtes. Veuillez patienter.'
        if (err.message.includes('timeout')) return 'Délai d\'attente dépassé. Veuillez réessayer.'
        if (err.message.includes('network')) return 'Erreur réseau. Vérifiez votre connexion.'
        return err.message
      }
    }
    return 'Erreur lors de l\'analyse du document. Veuillez réessayer.'
  }

  const capture = async () => {
    if (!webcamRef.current) return
    setIsAnalyzing(true)
    setAnalysisError(null)
    setCanRetry(false)

    const screenshot = webcamRef.current.getScreenshot()
    if (!screenshot) {
      if (isMountedRef.current) {
        setAnalysisError('Impossible de capturer l\'image')
        setIsAnalyzing(false)
      }
      return
    }

    const enhanced = await (async () => {
      try {
        const img = new Image()
        img.src = screenshot
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Impossible de créer le contexte 2D')

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const processed = canvas.toDataURL('image/jpeg', 0.95)
        return normalizeScreenshot(processed, 'image/jpeg')
      } catch {
        return normalizeScreenshot(screenshot, 'image/jpeg')
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
        onCapture(secureApiData)
        return
      }
      
      // Fallback sur Gemini si l'API sécurisée n'est pas disponible
      console.log('Fallback sur Gemini API')
      const data = (await analyzeDocument(enhanced.imageBase64, enhanced.mimeType)) as OCRData
      if (!isMountedRef.current) return
      onCapture(data)
      return
    } catch (e1) {
      if (!isMountedRef.current) return
      
      // Si l'API sécurisée échoue, essayer Gemini
      try {
        console.log('Fallback sur Gemini API après erreur')
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

  const handleManualInput = () => {
    const manualData: OCRData = {
      documentType: 'passport',
      issuingCountry: 'FR',
      surname: 'DUPONT',
      givenNames: 'JEAN',
      dateOfBirth: '1990-01-01',
      documentNumber: '123456789',
      nationality: 'FR',
      sex: 'M',
      expiryDate: '2030-01-01',
      address: '123 rue de la Paix, 75001 Paris',
      needsBackSide: false,
      confidence: 1.0
    }
    onCapture(manualData)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#e8f4fd', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#1e3a8a', textAlign: 'center', marginBottom: '20px' }}>
          Scanner un document
        </h1>

        {!capturedImage ? (
          <div style={{ textAlign: 'center' }}>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              style={{ width: '100%', maxWidth: '600px', borderRadius: '10px' }}
            />
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={capture}
                disabled={isAnalyzing}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#1e3a8a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                {isAnalyzing ? 'Analyse en cours...' : 'Capturer'}
              </button>
              <button
                onClick={onBack}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Retour
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <img
              src={capturedImage}
              alt="Document capturé"
              style={{ width: '100%', maxWidth: '600px', borderRadius: '10px', marginBottom: '20px' }}
            />
            
            {isAnalyzing && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '18px', color: '#1e3a8a' }}>
                  Analyse du document en cours...
                </div>
              </div>
            )}

            {analysisError && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  Erreur d'analyse
                </div>
                <div>{analysisError}</div>
                {canRetry && (
                  <button
                    onClick={handleRetry}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Réessayer
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleRetry}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Recapturer
              </button>
              <button
                onClick={handleManualInput}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Saisie manuelle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
