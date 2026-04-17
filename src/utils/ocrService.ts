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
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64
            }
          },
          {
            type: 'text',
            text: `Analyse cette pièce d'identité et extrais les informations en JSON strict.
Réponds UNIQUEMENT avec ce JSON, sans texte autour, sans markdown :
{
  "documentType": "CNI",
  "needsVerso": true,
  "nom": "",
  "prenoms": "",
  "dateNaissance": "",
  "lieuNaissance": "",
  "nationalite": "",
  "numeroDocument": "",
  "dateDelivrance": "",
  "dateExpiration": "",
  "confidence": 0.95
}
documentType peut être : CNI, PASSEPORT, TITRE_SEJOUR, AUTRE
needsVerso est true uniquement pour CNI et TITRE_SEJOUR`
          }
        ]
      }]
    })
  })

  if (!response.ok) {
    throw new Error('Erreur API Anthropic: ' + response.status)
  }

  const data = await response.json()
  const text = data.content[0].text.trim()
  
  try {
    return JSON.parse(text)
  } catch {
    // Extraire le JSON si entouré de texte
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Réponse OCR invalide')
  }
}
