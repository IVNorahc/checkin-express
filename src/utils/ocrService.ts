export interface OCRResult {
  documentType: 'CNI' | 'PASSEPORT' | 'TITRE_SEJOUR' | 'AUTRE'
  needsVerso: boolean
  nom: string
  prenoms: string
  dateNaissance: string
  lieuNaissance: string
  nationalite: string
  numeroDocument: string
  dateDelivrance: string
  dateExpiration: string
  confidence: number
}

export async function scanDocument(imageBase64: string): Promise<OCRResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15 secondes max
    
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        imageBase64,
        mediaType: 'image/jpeg'
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error('Erreur OCR: ' + response.status)
    }

    return await response.json()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('OCR timeout - analyse trop longue')
    } else {
      throw new Error('OCR indisponible - ' + err.message)
    }
  }
}
