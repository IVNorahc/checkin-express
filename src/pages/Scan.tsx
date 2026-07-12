import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { OCRData } from '../types/ocr'
import AutoScanCamera from '../components/AutoScanCamera'

type ScanProps = {
  onBack: () => void
  onCapture: (data: OCRData | null) => void
}

export default function Scan({ onBack, onCapture }: ScanProps) {
  const [capturedImage,      setCapturedImage]      = useState<string | null>(null)
  const [capturedImageBase64,setCapturedImageBase64] = useState<string | null>(null)
  const [analysisError,      setAnalysisError]      = useState<string | null>(null)
  const [canRetry,           setCanRetry]           = useState(false)
  const [isServiceError,     setIsServiceError]     = useState(false)
  const [isAnalyzing,        setIsAnalyzing]        = useState(false)
  const [rectoResult,        setRectoResult]        = useState<OCRData | null>(null)
  const [isVersoMode,        setIsVersoMode]        = useState(false)
  const [showVersoPrompt,    setShowVersoPrompt]    = useState(false)
  const isMountedRef = useRef(true)

  const analyseImage = async (imageBase64: string) => {
    const { data, error: fnError } = await supabase.functions.invoke('ocr', {
      body: { imageBase64 }
    })

    if (fnError) {
      setAnalysisError('Service OCR temporairement indisponible. Veuillez utiliser la saisie manuelle.')
      setIsServiceError(true)
      setCanRetry(false)
      setIsAnalyzing(false)
      return
    }

    if (data.error) {
      const svcErr = (data.error as string).includes('temporairement indisponible')
      setAnalysisError(data.error)
      setIsServiceError(svcErr)
      setCanRetry(!svcErr)
      setIsAnalyzing(false)
      return
    }

    const ocrData: OCRData = {
      documentType:    data.type_piece    || 'CNI',
      needsVerso:      isVersoMode ? false : true,
      nom:             data.nom           || null,
      prenoms:         data.prenom        || null,
      dateNaissance:   data.date_naissance|| null,
      lieuNaissance:   data.lieu_naissance|| null,
      nationalite:     data.nationalite   || null,
      paysEmission:    data.pays_emission || null,
      sexe:            data.sexe          || null,
      numeroDocument:  data.numero_piece  || null,
      dateDelivrance:  data.date_delivrance || null,
      dateExpiration:  data.date_expiration || null,
      confidence:      0.8,
      adresse:         data.adresse       || null,
      profession:      data.profession    || null,
    }

    if (!isMountedRef.current) return
    handleScanResult(ocrData)
    setIsAnalyzing(false)
  }

  const handleScanResult = (result: OCRData) => {
    if (isVersoMode) {
      const merged: OCRData = {
        ...rectoResult!,
        ...(result.numeroDocument ? { numeroDocument: result.numeroDocument } : {}),
      }
      onCapture(merged)
    } else {
      if (result.documentType === 'CNI' || result.needsVerso === true) {
        setRectoResult(result)
        setShowVersoPrompt(true)
        setIsAnalyzing(false)
      } else {
        onCapture(result)
      }
    }
  }

  // Called by AutoScanCamera with the captured dataURL
  const handleAutoCapture = async (dataURL: string) => {
    const base64 = dataURL.split(',')[1]
    setCapturedImage(dataURL)
    setCapturedImageBase64(base64)
    setIsAnalyzing(true)
    await analyseImage(base64)
  }

  const handleManualInput = () => {
    onCapture({
      documentType: '', needsVerso: false,
      nom: '', prenoms: '', dateNaissance: '', lieuNaissance: '',
      nationalite: '', paysEmission: null, sexe: null,
      numeroDocument: '', dateDelivrance: '', dateExpiration: '',
      confidence: 0, adresse: '', profession: '',
    })
  }

  const handleSkipVerso = () => {
    if (rectoResult) onCapture(rectoResult)
  }

  const handleStartVerso = () => {
    setShowVersoPrompt(false)
    setIsVersoMode(true)
    setCapturedImage(null)
    setCapturedImageBase64(null)
    setAnalysisError(null)
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
    setAnalysisError(null)
    setCanRetry(false)
    setIsServiceError(false)
  }

  const handleRetry = () => {
    setCapturedImage(null)
    setCapturedImageBase64(null)
    setAnalysisError(null)
    setIsAnalyzing(false)
    setCanRetry(false)
    setIsServiceError(false)
    // AutoScanCamera remounts automatically because capturedImage is now null
  }

  const handleRetryAnalysis = async () => {
    if (!capturedImageBase64 || isAnalyzing) return
    setIsAnalyzing(true)
    setAnalysisError(null)
    setCanRetry(false)
    setIsServiceError(false)
    try {
      await analyseImage(capturedImageBase64)
    } catch {
      if (isMountedRef.current) {
        setAnalysisError('Erreur analyse — utilisez la saisie manuelle')
        setCanRetry(true)
      }
    } finally {
      if (isMountedRef.current) setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="h-16 px-4 md:px-8 flex flex-col items-center justify-center">
        <div className="w-full text-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {showVersoPrompt ? 'CNI détectée' : isVersoMode ? 'Scanner le verso' : 'Scanner un document'}
          </h1>
          {!showVersoPrompt && !isVersoMode && (
            <p className="text-sm text-gray-700">
              Posez la pièce devant la caméra — capture automatique
            </p>
          )}
        </div>
      </header>

      <main className="px-4 md:px-8 pb-8 flex flex-col items-center gap-3 md:gap-6">

        {/* ── Verso prompt ──────────────────────────────────────────────── */}
        {showVersoPrompt ? (
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
                Scanner le verso
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

        /* ── Captured image + analysis ───────────────────────────────────── */
        ) : capturedImage ? (
          <div className="w-full max-w-xl">
            <img
              src={capturedImage}
              alt="Capture du document"
              className="w-full rounded-xl border border-gray-200"
            />

            <div className="mt-6 flex items-center justify-center gap-3 text-gray-900">
              {isAnalyzing ? (
                <>
                  <span className="inline-block h-5 w-5 rounded-full border-2 border-blue-700 border-t-transparent animate-spin" />
                  <p className="text-lg font-medium">Analyse en cours...</p>
                </>
              ) : (
                <p className="text-lg font-medium">
                  {analysisError ? 'Analyse terminée' : 'Prêt pour confirmation'}
                </p>
              )}
            </div>

            {isServiceError ? (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-300 p-4 text-center">
                <p className="text-red-700 font-medium mb-4">{analysisError}</p>
                <button
                  type="button"
                  onClick={handleManualInput}
                  className="w-full h-12 rounded-full bg-blue-700 text-white font-bold hover:bg-blue-800 transition-colors"
                >
                  ✏️ Saisie manuelle
                </button>
              </div>
            ) : (
              <>
                {analysisError && (
                  <p className="mt-3 text-sm text-red-500 text-center">{analysisError}</p>
                )}
                {canRetry && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={handleRetryAnalysis}
                      disabled={isAnalyzing}
                      className="w-full md:w-auto px-8 h-12 rounded-full bg-white border border-gray-400 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Réessayer l'analyse
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleRetry}
                disabled={isAnalyzing}
                className="w-full md:w-auto px-8 h-12 rounded-full bg-white border border-gray-400 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Reprendre
              </button>
            </div>
          </div>

        /* ── Camera view (auto-scan) ──────────────────────────────────────── */
        ) : (
          <AutoScanCamera
            onCapture={handleAutoCapture}
            onManualInput={handleManualInput}
            onBack={isVersoMode ? handleBackToRecto : onBack}
          />
        )}
      </main>
    </div>
  )
}
