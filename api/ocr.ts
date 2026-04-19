import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { imageBase64, mediaType } = req.body

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image manquante' })
    }

    // Nettoyer le base64 (enlever le préfixe data:image/...;base64, si présent)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const cleanMediaType = mediaType || 'image/jpeg'

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
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
                media_type: cleanMediaType,
                data: cleanBase64
              }
            },
            {
              type: 'text',
              text: `Tu es un expert en lecture de CNI sénégalaise CEDEAO (recto).
Lis TRÈS attentivement chaque chiffre et lettre.

Sur le RECTO de cette CNI sénégalaise :
- Les PRÉNOMS sont écrits en premier (souvent 2 mots)
- Le NOM DE FAMILLE est en dessous des prénoms (souvent 1 mot)
- La DATE DE NAISSANCE est au format JJ/MM/AAAA - lis chaque chiffre séparément
- Le LIEU DE NAISSANCE est une ville sénégalaise
- La DATE DE DÉLIVRANCE est la date d'émission de la carte
- La DATE D'EXPIRATION est 10 ans après la délivrance

IMPORTANT : 
- Le numéro NIN est au VERSO, pas ici - laisse numeroDocument vide
- Lis la ligne MRZ en bas pour vérifier les dates si illisibles
- La ligne MRZ format : I<SEN[numéro]<<[date_naissance]...[date_expiration]

Réponds UNIQUEMENT avec ce JSON :
{
  "documentType": "CNI",
  "needsVerso": true,
  "nom": "NOM_FAMILLE",
  "prenoms": "PRENOM(S)",
  "dateNaissance": "JJ/MM/AAAA",
  "lieuNaissance": "VILLE",
  "nationalite": "SENEGALAISE",
  "numeroDocument": "",
  "dateDelivrance": "JJ/MM/AAAA",
  "dateExpiration": "JJ/MM/AAAA",
  "confidence": 0.95
}`
            }
          ]
        }]
      })
    })

    const data = await anthropicRes.json()

    if (!anthropicRes.ok) {
      console.error('Anthropic error full:', JSON.stringify(data))
      return res.status(200).json({ 
        debugError: data,
        documentType: 'AUTRE',
        needsVerso: false,
        nom: 'ERREUR: ' + JSON.stringify(data.error),
        prenoms: '',
        dateNaissance: '',
        lieuNaissance: '',
        nationalite: '',
        numeroDocument: '',
        dateDelivrance: '',
        dateExpiration: '',
        confidence: 0
      })
    }

    const text = data.content[0].text.trim()
    
    try {
      return res.status(200).json(JSON.parse(text))
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) return res.status(200).json(JSON.parse(match[0]))
      return res.status(500).json({ error: 'Réponse OCR invalide: ' + text })
    }
  } catch (err: any) {
    console.error('Proxy error:', err)
    return res.status(500).json({ error: err.message })
  }
}
