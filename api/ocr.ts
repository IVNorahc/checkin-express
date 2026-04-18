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
documentType : CNI, PASSEPORT, TITRE_SEJOUR, ou AUTRE
needsVerso : true seulement pour CNI et TITRE_SEJOUR
Si tu ne peux pas lire un champ, laisse une chaîne vide.`
            }
          ]
        }]
      })
    })

    const data = await anthropicRes.json()

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', data)
      return res.status(anthropicRes.status).json({ 
        error: data.error?.message || 'Erreur Anthropic' 
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
