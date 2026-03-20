import { useRef, useState } from 'react'
import Webcam from 'react-webcam'

type ScanProps = {
  onBack: () => void
  onCapture: () => void
}

export default function Scan({ onBack, onCapture }: ScanProps) {
  const webcamRef = useRef<Webcam>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const handleCapture = () => {
    const image = webcamRef.current?.getScreenshot()
    if (!image) return
    setCapturedImage(image)
    onCapture()
  }

  const handleRetry = () => {
    setCapturedImage(null)
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
              <span className="inline-block h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <p className="text-lg font-medium">Analyse en cours...</p>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleRetry}
                className="px-8 h-12 rounded-full border border-white text-white hover:bg-white/10 transition-colors"
              >
                ↻ Reprendre
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full max-w-xl aspect-[3/4] relative rounded-xl overflow-hidden">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'environment' }}
                className="w-full h-full object-cover"
              />

              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-[85%] h-[55%] rounded-[12px] border-[3px] border-[#1e3a8a]">
                  <span className="absolute -top-[3px] -left-[3px] w-10 h-10 border-t-[4px] border-l-[4px] border-[#60a5fa] rounded-tl-[12px]" />
                  <span className="absolute -top-[3px] -right-[3px] w-10 h-10 border-t-[4px] border-r-[4px] border-[#60a5fa] rounded-tr-[12px]" />
                  <span className="absolute -bottom-[3px] -left-[3px] w-10 h-10 border-b-[4px] border-l-[4px] border-[#60a5fa] rounded-bl-[12px]" />
                  <span className="absolute -bottom-[3px] -right-[3px] w-10 h-10 border-b-[4px] border-r-[4px] border-[#60a5fa] rounded-br-[12px]" />
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-white">Placez le document dans le cadre</p>

            <div className="mt-8 w-full max-w-xl flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={handleCapture}
                className="w-full max-w-[340px] h-14 rounded-[50px] bg-[#1e3a8a] text-white text-lg font-semibold shadow-lg hover:bg-[#162f6b] transition-colors"
              >
                📸 CAPTURER
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full max-w-[340px] h-12 rounded-[50px] border border-white text-white bg-transparent hover:bg-white/10 transition-colors"
              >
                ✕ Annuler
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
