import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mediaType } = req.body

  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
              media_type: mediaType || 'image/jpeg',
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

  const data = await response.json()
  
  if (!response.ok) {
    return res.status(response.status).json({ error: data })
  }

  const text = data.content[0].text.trim()
  
  try {
    const result = JSON.parse(text)
    return res.status(200).json(result)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return res.status(200).json(JSON.parse(match[0]))
    return res.status(500).json({ error: 'Réponse OCR invalide' })
  }
}
