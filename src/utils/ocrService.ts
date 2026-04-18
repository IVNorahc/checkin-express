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
  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      imageBase64,
      mediaType: 'image/jpeg'
    })
  })

  if (!response.ok) {
    throw new Error('Erreur OCR: ' + response.status)
  }

  return await response.json()
}
