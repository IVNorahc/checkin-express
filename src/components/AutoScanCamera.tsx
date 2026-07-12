import { useEffect, useRef, useState } from 'react'

// ─── Tuneable constants ────────────────────────────────────────────────────────
// Increase COVERAGE_MIN if it fires on partial documents, decrease if it never triggers
const COVERAGE_MIN = 0.25
// Lower STABILITY_THRESHOLD_PX if it captures while still moving, raise to require less stillness
const STABILITY_THRESHOLD_PX = 14
// How long the document must stay still before auto-capture fires (ms)
const STABILITY_DURATION_MS = 700
// Lower SHARPNESS_MIN if it never triggers on reflective/laminated cards (min ~30 for very shiny cards)
const SHARPNESS_MIN = 55
// Min pixels from frame edge — prevents capturing clipped documents
const EDGE_MARGIN_PX = 8
// Max analysis passes per second (lower = less CPU)
const ANALYSIS_INTERVAL_MS = 110
// Canvas size for analysis (smaller = faster, larger = more precise)
const ANALYSIS_W = 400
const ANALYSIS_H = 300
// OpenCV load timeout: if it takes longer than this, we fall back to manual-only mode
const CV_LOAD_TIMEOUT_MS = 10_000
// ──────────────────────────────────────────────────────────────────────────────

interface Corner { x: number; y: number }

// Module-level singleton — OpenCV.js is fetched only once per browser session
let cvLoadPromise: Promise<void> | null = null

function loadOpenCV(): Promise<void> {
  if (cvLoadPromise) return cvLoadPromise
  const w = window as any
  if (w.cv?.Mat) {
    console.log('[AutoScan] OpenCV already loaded (cached)')
    cvLoadPromise = Promise.resolve()
    return cvLoadPromise
  }
  cvLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://docs.opencv.org/4.9.0/opencv.js'
    console.log('[AutoScan] Injecting OpenCV.js script...')

    script.onload = () => {
      console.log('[AutoScan] opencv.js script loaded — polling for WASM init...')
      // Poll every 200ms — never call cv.then() or cv.catch() (cv is NOT a Promise)
      const interval = setInterval(() => {
        const cv = w.cv
        if (cv && typeof cv.Mat === 'function') {
          clearInterval(interval)
          console.log('[AutoScan] OpenCV.js ready (cv.Mat available)')
          resolve()
        } else {
          console.log('[AutoScan] Still waiting for cv.Mat...')
        }
      }, 200)
    }

    script.onerror = (e) => {
      console.error('[AutoScan] Failed to load opencv.js script:', e)
      reject(new Error('opencv.js script load failed'))
    }

    document.head.appendChild(script)
  })
  return cvLoadPromise
}

// ─── OpenCV detection helpers ──────────────────────────────────────────────────

function polygonArea(pts: Corner[]): number {
  let area = 0
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return Math.abs(area) / 2
}

function sortCorners(pts: Corner[]): [Corner, Corner, Corner, Corner] {
  const s = [...pts].sort((a, b) => (a.x + a.y) - (b.x + b.y))
  const tl = s[0], br = s[3]
  const rem = [s[1], s[2]].sort((a, b) => (b.x - b.y) - (a.x - a.y))
  return [tl, rem[0], br, rem[1]] // tl, tr, br, bl
}

function detectDocument(cv: any, canvas: HTMLCanvasElement): { corners: Corner[] | null; sharpness: number } {
  const src = cv.imread(canvas)
  const gray = new cv.Mat(), blur = new cv.Mat(), edges = new cv.Mat(), dilated = new cv.Mat()
  const contours = new cv.MatVector(), hierarchy = new cv.Mat()
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0)
    cv.Canny(blur, edges, 40, 140)
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U)
    cv.dilate(edges, dilated, kernel)
    kernel.delete()
    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    const frameArea = canvas.width * canvas.height
    let maxArea = 0, bestPts: Corner[] | null = null

    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i)
      const area = cv.contourArea(c)
      if (area < frameArea * 0.08) { c.delete(); continue }
      const perim = cv.arcLength(c, true)
      const approx = new cv.Mat()
      cv.approxPolyDP(c, approx, 0.02 * perim, true)
      if (approx.rows === 4 && area > maxArea) {
        maxArea = area
        const pts: Corner[] = []
        for (let j = 0; j < 4; j++)
          pts.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] })
        bestPts = sortCorners(pts) as Corner[]
      }
      approx.delete(); c.delete()
    }

    let sharpness = 0
    if (bestPts) {
      const xs = bestPts.map(p => p.x), ys = bestPts.map(p => p.y)
      const rx = Math.max(0, Math.min(...xs)), ry = Math.max(0, Math.min(...ys))
      const rw = Math.min(canvas.width - rx, Math.max(...xs) - rx)
      const rh = Math.min(canvas.height - ry, Math.max(...ys) - ry)
      if (rw > 20 && rh > 20) {
        const roi = gray.roi(new cv.Rect(rx, ry, rw, rh))
        const lap = new cv.Mat(), mean = new cv.Mat(), std = new cv.Mat()
        cv.Laplacian(roi, lap, cv.CV_64F)
        cv.meanStdDev(lap, mean, std)
        sharpness = std.data64F[0] * std.data64F[0]
        mean.delete(); std.delete(); lap.delete(); roi.delete()
      }
    }
    return { corners: bestPts, sharpness }
  } finally {
    src.delete(); gray.delete(); blur.delete(); edges.delete()
    dilated.delete(); contours.delete(); hierarchy.delete()
  }
}

function captureWithPerspective(cv: any, video: HTMLVideoElement, corners: Corner[], analysisW: number, analysisH: number): string {
  const scaleX = video.videoWidth / analysisW, scaleY = video.videoHeight / analysisH
  const scaled = sortCorners(corners.map(c => ({ x: c.x * scaleX, y: c.y * scaleY })))
  const [tl, tr, br, bl] = scaled

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = video.videoWidth; srcCanvas.height = video.videoHeight
  const sCtx = srcCanvas.getContext('2d')!
  sCtx.filter = 'contrast(1.2) brightness(1.05)'
  sCtx.drawImage(video, 0, 0)

  const outW = Math.round(Math.max(Math.hypot(tr.x - tl.x, tr.y - tl.y), Math.hypot(br.x - bl.x, br.y - bl.y)))
  const outH = Math.round(Math.max(Math.hypot(bl.x - tl.x, bl.y - tl.y), Math.hypot(br.x - tr.x, br.y - tr.y)))

  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y])
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, outW, 0, outW, outH, 0, outH])
  const M = cv.getPerspectiveTransform(srcPts, dstPts)
  const srcMat = cv.imread(srcCanvas), dstMat = new cv.Mat()
  cv.warpPerspective(srcMat, dstMat, M, new cv.Size(outW, outH))
  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW; outCanvas.height = outH
  cv.imshow(outCanvas, dstMat)
  srcPts.delete(); dstPts.delete(); M.delete(); srcMat.delete(); dstMat.delete()
  return outCanvas.toDataURL('image/jpeg', 0.95)
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AutoScanCameraProps {
  onCapture: (dataURL: string) => void
  onManualInput?: () => void
  onBack?: () => void
}

export default function AutoScanCamera({ onCapture, onManualInput, onBack }: AutoScanCameraProps) {
  const videoRef       = useRef<HTMLVideoElement>(null)
  const overlayRef     = useRef<HTMLCanvasElement>(null)
  const analysisRef    = useRef<HTMLCanvasElement>(null)
  const streamRef      = useRef<MediaStream | null>(null)
  const rafRef         = useRef<number>(0)
  const lastAnalysis   = useRef(0)
  const stableStart    = useRef<number | null>(null)
  const lastCorners    = useRef<Corner[] | null>(null)
  const capturedRef    = useRef(false)
  const isMounted      = useRef(true)
  const cvReadyRef     = useRef(false)
  const cvLoadStartRef = useRef(Date.now())   // timestamp when CV load began

  const [cvReady,        setCvReady]        = useState(false)
  const [cvLoading,      setCvLoading]      = useState(true)   // OpenCV loading in background
  const [cvError,        setCvError]        = useState(false)  // OpenCV failed / timed out
  const [cameraError,    setCameraError]    = useState<string | null>(null)
  const [devices,        setDevices]        = useState<MediaDeviceInfo[]>([])
  const [deviceId,       setDeviceId]       = useState('')
  const [guidance,       setGuidance]       = useState('Placez la pièce devant la caméra')
  const [stableProgress, setStableProgress] = useState(0)
  const [flash,          setFlash]          = useState(false)
  // ── Diagnostic state (visible on-screen, no console needed) ──────────────────
  const [cvLoadMs,    setCvLoadMs]    = useState<number | null>(null) // null = loading/failed
  const [diagElapsed, setDiagElapsed] = useState(0)                   // seconds elapsed while loading
  const [diagDetail,  setDiagDetail]  = useState('')                  // precise detection info

  // ── 1. Start camera IMMEDIATELY on mount, independently of OpenCV ────────────
  useEffect(() => {
    // Reset flags here — React Strict Mode unmounts+remounts in dev, so refs
    // set to false during cleanup must be reset to true for the second mount.
    isMounted.current  = true
    capturedRef.current = false
    console.log('[AutoScan] Component mounted — starting camera immediately')
    startCamera()       // no deviceId → tries environment first, falls back to { video: true }
    enumerateCameras()  // enumerate in parallel; won't block the stream
    return () => {
      console.log('[AutoScan] Component unmounting — cleanup')
      isMounted.current = false
      cancelAnimationFrame(rafRef.current)
      stopCamera()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. If user picks a different camera from the selector, restart ───────────
  useEffect(() => {
    if (!deviceId) return
    console.log('[AutoScan] Device changed to:', deviceId)
    startCamera(deviceId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId])

  // ── 3. Load OpenCV in background, with 10 s timeout ─────────────────────────
  useEffect(() => {
    cvLoadStartRef.current = Date.now()

    // Live ticker: increments diagElapsed every second while loading
    const tickerId = setInterval(() => {
      if (isMounted.current && !cvReadyRef.current)
        setDiagElapsed(Math.floor((Date.now() - cvLoadStartRef.current) / 1000))
    }, 1000)

    const timeoutId = setTimeout(() => {
      if (!cvReadyRef.current) {
        console.warn('[AutoScan] OpenCV.js timed out after', CV_LOAD_TIMEOUT_MS / 1000, 's — falling back to manual mode')
        if (isMounted.current) { setCvError(true); setCvLoading(false) }
        cvLoadPromise = null
      }
    }, CV_LOAD_TIMEOUT_MS)

    loadOpenCV()
      .then(() => {
        clearTimeout(timeoutId)
        clearInterval(tickerId)
        if (isMounted.current) {
          const ms = Date.now() - cvLoadStartRef.current
          console.log('[AutoScan] OpenCV.js ready — detection active, loaded in', ms, 'ms')
          cvReadyRef.current = true
          setCvReady(true)
          setCvLoading(false)
          setCvLoadMs(ms)
        }
      })
      .catch(err => {
        clearTimeout(timeoutId)
        clearInterval(tickerId)
        console.error('[AutoScan] OpenCV.js load failed:', err)
        if (isMounted.current) { setCvError(true); setCvLoading(false) }
        cvLoadPromise = null
      })

    return () => { clearTimeout(timeoutId); clearInterval(tickerId) }
  }, [])

  // ── 4. Start detection loop once OpenCV is ready (video might already be running) ──
  useEffect(() => {
    if (!cvReady) return
    console.log('[AutoScan] Starting detection loop')
    const video = videoRef.current
    if (!video) return
    const begin = () => startLoop()
    if (video.readyState >= 2) {
      begin()
    } else {
      console.log('[AutoScan] Video not yet playing — waiting for playing event')
      video.addEventListener('playing', begin, { once: true })
      return () => video.removeEventListener('playing', begin)
    }
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvReady])

  // ── Camera helpers ─────────────────────────────────────────────────────────────
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const startCamera = async (specificId?: string) => {
    stopCamera()
    if (!isMounted.current) return

    // Ordered list of constraints to try in sequence.
    // facingMode:'environment' is ignored on desktop — we fall back to plain { video: true }.
    const attempts: MediaStreamConstraints[] = specificId
      ? [{ video: { deviceId: { exact: specificId }, width: { ideal: 1920 }, height: { ideal: 1080 } } }]
      : [
          { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
          { video: true },
        ]

    let stream: MediaStream | null = null
    let lastErr: any = null

    for (const constraints of attempts) {
      console.log('[AutoScan] getUserMedia attempt:', JSON.stringify(constraints))
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        console.log('[AutoScan] getUserMedia succeeded with:', JSON.stringify(constraints))
        break
      } catch (err: any) {
        lastErr = err
        console.warn('[AutoScan] Attempt failed:', err.name, '—', err.message)
        // Permission denied or no hardware: no point retrying other constraints
        if (
          err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' ||
          err.name === 'NotFoundError'   || err.name === 'DevicesNotFoundError'
        ) break
      }
    }

    if (!stream) {
      if (!isMounted.current) return
      console.error('[AutoScan] All getUserMedia attempts failed. Last error:', lastErr?.name, lastErr?.message)
      if (lastErr?.name === 'NotAllowedError' || lastErr?.name === 'PermissionDeniedError') {
        setCameraError("Accès à la caméra refusé. Autorisez-le dans les paramètres de votre navigateur puis rechargez la page.")
      } else if (lastErr?.name === 'NotFoundError' || lastErr?.name === 'DevicesNotFoundError') {
        setCameraError("Aucune caméra détectée sur cet appareil.")
      } else if (lastErr?.name === 'NotReadableError') {
        setCameraError("Caméra occupée par une autre application. Fermez-la et réessayez.")
      } else {
        setCameraError(`Impossible d'accéder à la caméra (${lastErr?.name ?? 'inconnu'}). Utilisez la saisie manuelle.`)
      }
      return
    }

    const track = stream.getVideoTracks()[0]
    console.log('[AutoScan] Stream obtained — track label:', track?.label || '(no label)', '| settings:', JSON.stringify(track?.getSettings()))

    if (!isMounted.current) { stream.getTracks().forEach(t => t.stop()); return }
    streamRef.current = stream

    const video = videoRef.current
    if (!video) return

    video.srcObject = stream
    console.log('[AutoScan] srcObject assigned — waiting for loadedmetadata...')

    video.onloadedmetadata = () => {
      console.log('[AutoScan] loadedmetadata fired —', video.videoWidth, 'x', video.videoHeight)
      if (overlayRef.current) {
        overlayRef.current.width  = video.videoWidth
        overlayRef.current.height = video.videoHeight
      }
    }

    try {
      await video.play()
      console.log('[AutoScan] video.play() OK — readyState:', video.readyState, '| size:', video.videoWidth, 'x', video.videoHeight)
    } catch (playErr: any) {
      console.error('[AutoScan] video.play() failed:', playErr.name, playErr.message)
    }
  }

  const enumerateCameras = async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      const cams = all.filter(d => d.kind === 'videoinput')
      console.log(
        '[AutoScan] enumerateDevices →', cams.length, 'camera(s):',
        cams.map((c, i) => `[${i}] ${c.label || '(no label — permission not yet granted)'}`)
      )
      setDevices(cams)
      // Auto-select the back/rear camera on mobile if labelled
      const back = cams.find(c => /back|rear|environment/i.test(c.label))
      if (back) {
        console.log('[AutoScan] Back camera found by label — switching to:', back.label)
        setDeviceId(back.deviceId)
      }
    } catch (e) {
      console.warn('[AutoScan] enumerateDevices failed:', e)
    }
  }

  // ── Detection loop ─────────────────────────────────────────────────────────────
  const startLoop = () => {
    console.log('[AutoScan] rAF detection loop started')
    const loop = (ts: number) => {
      if (!isMounted.current || capturedRef.current) return
      rafRef.current = requestAnimationFrame(loop)
      if (ts - lastAnalysis.current < ANALYSIS_INTERVAL_MS) return
      lastAnalysis.current = ts

      const video = videoRef.current, ac = analysisRef.current
      if (!video || video.readyState < 2 || !ac) return

      const ctx = ac.getContext('2d')!
      ctx.drawImage(video, 0, 0, ANALYSIS_W, ANALYSIS_H)

      const cv = (window as any).cv
      if (!cv?.Mat) return

      let corners: Corner[] | null = null, sharpness = 0
      try {
        ;({ corners, sharpness } = detectDocument(cv, ac))
      } catch (e) {
        console.error('[AutoScan] detectDocument error:', e)
        return
      }

      if (!corners) {
        stableStart.current = null; lastCorners.current = null
        setStableProgress(0); setGuidance('Placez la pièce devant la caméra')
        setDiagDetail('aucun quadrilatère détecté')
        clearOverlay(); return
      }

      const area = polygonArea(corners)
      const coveragePct = (area / (ANALYSIS_W * ANALYSIS_H) * 100).toFixed(0)
      if (area / (ANALYSIS_W * ANALYSIS_H) < COVERAGE_MIN) {
        stableStart.current = null; setStableProgress(0)
        setGuidance('Rapprochez la pièce de la caméra')
        setDiagDetail(`surface ${coveragePct}% < ${(COVERAGE_MIN * 100).toFixed(0)}% requis`)
        drawOverlay(corners, '#f97316'); return
      }

      const xs = corners.map(c => c.x), ys = corners.map(c => c.y)
      if (Math.min(...xs) < EDGE_MARGIN_PX || Math.min(...ys) < EDGE_MARGIN_PX ||
          Math.max(...xs) > ANALYSIS_W - EDGE_MARGIN_PX ||
          Math.max(...ys) > ANALYSIS_H - EDGE_MARGIN_PX) {
        stableStart.current = null; setStableProgress(0)
        setGuidance('Reculez légèrement')
        setDiagDetail(`bords rognés (surface ${coveragePct}%)`)
        drawOverlay(corners, '#f97316'); return
      }

      if (sharpness < SHARPNESS_MIN) {
        stableStart.current = null; setStableProgress(0)
        setGuidance('Image floue — stabilisez la caméra')
        setDiagDetail(`netteté ${sharpness.toFixed(0)} < ${SHARPNESS_MIN} requis`)
        drawOverlay(corners, '#facc15'); return
      }

      const prev = lastCorners.current
      lastCorners.current = corners
      if (prev) {
        const delta = corners.reduce((s, c, i) => s + Math.hypot(c.x - prev[i].x, c.y - prev[i].y), 0)
        if (delta > STABILITY_THRESHOLD_PX) {
          stableStart.current = null; setStableProgress(0)
          setGuidance('Tenez stable…')
          setDiagDetail(`mouvement ${delta.toFixed(0)}px > ${STABILITY_THRESHOLD_PX}px max`)
          drawOverlay(corners, '#60a5fa'); return
        }
      }

      if (!stableStart.current) stableStart.current = ts
      const stableMs = ts - stableStart.current
      const pct = Math.min(100, (stableMs / STABILITY_DURATION_MS) * 100)
      setStableProgress(pct); drawOverlay(corners, '#22c55e'); setGuidance('Tenez stable…')
      setDiagDetail(`stable ${stableMs.toFixed(0)}ms / ${STABILITY_DURATION_MS}ms — net. ${sharpness.toFixed(0)} — surf. ${coveragePct}%`)

      if (stableMs >= STABILITY_DURATION_MS) {
        capturedRef.current = true
        console.log('[AutoScan] All conditions met — triggering capture (sharpness:', sharpness.toFixed(1), ')')
        void triggerCapture(corners)
      }
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  const clearOverlay = () => {
    const c = overlayRef.current
    if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
  }

  const drawOverlay = (corners: Corner[], color: string) => {
    const canvas = overlayRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const sx = canvas.width / ANALYSIS_W, sy = canvas.height / ANALYSIS_H
    const sc = corners.map(c => ({ x: c.x * sx, y: c.y * sy }))
    ctx.strokeStyle = color; ctx.lineWidth = 3
    ctx.shadowColor = color; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.moveTo(sc[0].x, sc[0].y)
    sc.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
    ctx.closePath(); ctx.stroke()
    ctx.fillStyle = color
    sc.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill() })
  }

  const triggerCapture = async (corners: Corner[]) => {
    setFlash(true); setTimeout(() => { if (isMounted.current) setFlash(false) }, 180)
    const video = videoRef.current!
    const cv = (window as any).cv
    let dataURL: string
    try {
      dataURL = captureWithPerspective(cv, video, corners, ANALYSIS_W, ANALYSIS_H)
      console.log('[AutoScan] Perspective-corrected capture done')
    } catch (e) {
      console.warn('[AutoScan] Perspective correction failed, using plain capture:', e)
      const c = document.createElement('canvas')
      c.width = video.videoWidth || 1280; c.height = video.videoHeight || 720
      const ctx = c.getContext('2d')!; ctx.filter = 'contrast(1.2) brightness(1.05)'
      ctx.drawImage(video, 0, 0)
      dataURL = c.toDataURL('image/jpeg', 0.95)
    }
    setGuidance('Capture réussie ✓')
    stopCamera()
    onCapture(dataURL)
  }

  const handleManualCapture = () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) {
      console.warn('[AutoScan] Manual capture attempted but video not ready (readyState:', video?.readyState, ')')
      return
    }
    console.log('[AutoScan] Manual capture triggered by user')
    capturedRef.current = true
    const c = document.createElement('canvas')
    c.width = video.videoWidth || 1280; c.height = video.videoHeight || 720
    const ctx = c.getContext('2d')!; ctx.filter = 'contrast(1.2) brightness(1.05)'
    ctx.drawImage(video, 0, 0)
    onCapture(c.toDataURL('image/jpeg', 0.95))
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-3">

      {/* Camera selector — only when multiple devices are available */}
      {devices.length > 1 && (
        <select
          value={deviceId}
          onChange={e => setDeviceId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 bg-white"
        >
          {devices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Caméra ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      )}

      {/* ── Video + overlay ────────────────────────────────────────────────── */}
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>

        {/* Camera feed — always visible, never blocked */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Document-outline overlay canvas */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          width={ANALYSIS_W}
          height={ANALYSIS_H}
        />

        {/* Flash effect on capture */}
        {flash && <div className="absolute inset-0 bg-white/80 z-20 pointer-events-none" />}

        {/* OpenCV loading: small pill at top, non-blocking */}
        {cvLoading && !cameraError && (
          <div className="absolute top-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
              <p className="text-white text-xs">Chargement détection auto…</p>
            </div>
          </div>
        )}

        {/* Camera permission / hardware error — shown over the black preview */}
        {cameraError && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 p-5 gap-4">
            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18" />
            </svg>
            <p className="text-white text-center text-sm leading-relaxed">{cameraError}</p>
          </div>
        )}
      </div>

      {/* ── Guidance text + stability bar ─────────────────────────────────── */}
      <div className="text-center px-2">
        <p className="text-sm font-medium text-gray-700">{guidance}</p>

        {stableProgress > 0 && stableProgress < 100 && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${stableProgress}%` }}
            />
          </div>
        )}

        {/* OpenCV unavailable message — non-blocking, just informative */}
        {cvError && (
          <p className="mt-1 text-xs text-amber-600">
            Détection auto indisponible — utilisez "Capturer manuellement"
          </p>
        )}
      </div>

      {/* ── Diagnostic panel (visible on mobile, no console needed) ────────── */}
      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-500 space-y-0.5">
        <p>
          <span className="font-semibold text-gray-700">OpenCV : </span>
          {cvLoading
            ? `chargement… ${diagElapsed}s / ${CV_LOAD_TIMEOUT_MS / 1000}s`
            : cvError
              ? `❌ échec — timeout ${CV_LOAD_TIMEOUT_MS / 1000}s`
              : `✅ prêt en ${cvLoadMs != null ? (cvLoadMs / 1000).toFixed(1) + 's' : '?'}`}
        </p>
        <p>
          <span className="font-semibold text-gray-700">Détection : </span>
          {cvReady ? (diagDetail || guidance) : cvError ? 'désactivée (mode manuel)' : 'en attente d\'OpenCV…'}
        </p>
      </div>

      {/* ── Buttons ─────────────────────────────────────────────────────────── */}

      {/* Secondary: manual photo capture (fallback for bad lighting / CV failure) */}
      <button
        type="button"
        onClick={handleManualCapture}
        className="w-full h-12 rounded-xl bg-gray-100 border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        📷 Capturer manuellement
      </button>

      {/* Tertiary: skip OCR entirely */}
      {onManualInput && (
        <button
          type="button"
          onClick={onManualInput}
          className="w-full h-11 rounded-xl bg-white border border-blue-300 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors"
        >
          ✏️ Saisie manuelle
        </button>
      )}

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full h-11 rounded-xl bg-white border border-gray-300 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
        >
          ✕ Annuler
        </button>
      )}

      {/* Hidden analysis canvas */}
      <canvas ref={analysisRef} width={ANALYSIS_W} height={ANALYSIS_H} className="hidden" aria-hidden />
    </div>
  )
}
