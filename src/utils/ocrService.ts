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
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  
  if (!apiKey) {
    throw new Error('Clé API Anthropic non configurée')
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-calls': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64.split(',')[1] // Remove data:image/jpeg;base64, prefix
                }
              },
              {
                type: 'text',
                text: `Tu es un expert en lecture de documents d'identité. 
Analyse cette pièce d'identité et extrais les informations suivantes en JSON strict :
documentType (CNI/PASSEPORT/TITRE_SEJOUR/AUTRE), 
needsVerso (true si CNI ou titre de séjour, false sinon),
nom, prenoms, dateNaissance (JJ/MM/AAAA), lieuNaissance,
nationalite, numeroDocument, dateDelivrance (JJ/MM/AAAA), 
dateExpiration (JJ/MM/AAAA), confidence (0 à 1).
Réponds UNIQUEMENT avec le JSON, sans texte autour.`
              }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Erreur API Anthropic: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.content[0]?.text

    if (!content) {
      throw new Error('Pas de réponse de l\'OCR')
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide')
    }

    const ocrData = JSON.parse(jsonMatch[0])

    // Validate and normalize data
    return {
      documentType: ocrData.documentType || 'AUTRE',
      needsVerso: ocrData.needsVerso || false,
      nom: ocrData.nom || '',
      prenoms: ocrData.prenoms || '',
      dateNaissance: ocrData.dateNaissance || '',
      lieuNaissance: ocrData.lieuNaissance || '',
      nationalite: ocrData.nationalite || '',
      numeroDocument: ocrData.numeroDocument || '',
      dateDelivrance: ocrData.dateDelivrance || '',
      dateExpiration: ocrData.dateExpiration || '',
      confidence: Math.min(Math.max(ocrData.confidence || 0, 0), 1)
    }
  } catch (error) {
    console.error('Erreur OCR:', error)
    throw new Error(`Échec de l'analyse OCR: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}

export function getDocumentTypeInfo(documentType: string) {
  const types = {
    'CNI': {
      name: 'Carte Nationale d\'Identité',
      needsVerso: true,
      color: '#1e3a8a'
    },
    'PASSEPORT': {
      name: 'Passeport',
      needsVerso: false,
      color: '#16a34a'
    },
    'TITRE_SEJOUR': {
      name: 'Titre de Séjour',
      needsVerso: true,
      color: '#7c3aed'
    },
    'AUTRE': {
      name: 'Autre document',
      needsVerso: false,
      color: '#64748b'
    }
  }
  
  return types[documentType as keyof typeof types] || types.AUTRE
}
