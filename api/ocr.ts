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
              text: `Tu es un expert en lecture de documents d'identité officiels.
Analyse attentivement cette pièce d'identité et extrais les informations.

Pour une CNI sénégalaise (CEDEAO), les champs sont :
- NOM (nom de famille, en majuscules)
- Prénoms (prénom(s))
- Date de naissance (format JJ/MM/AAAA)
- Lieu de naissance
- Numéro de la carte (commence par I ou B suivi de chiffres)
- Date de délivrance
- Date d'expiration
- Nationalité : SENEGALAISE

Réponds UNIQUEMENT avec ce JSON sans texte autour :
{
  "documentType": "CNI",
  "needsVerso": true,
  "nom": "NOM_DE_FAMILLE",
  "prenoms": "PRENOM(S)",
  "dateNaissance": "JJ/MM/AAAA",
  "lieuNaissance": "VILLE",
  "nationalite": "SENEGALAISE",
  "numeroDocument": "NUMERO",
  "dateDelivrance": "JJ/MM/AAAA",
  "dateExpiration": "JJ/MM/AAAA",
  "confidence": 0.95
}
Si tu ne peux pas lire un champ avec certitude, laisse-le vide.
Ne confonds pas le nom et le prénom.`
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
