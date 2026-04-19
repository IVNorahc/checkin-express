import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { imageBase64 } = req.body
    if (!imageBase64) return res.status(400).json({ error: 'Image manquante' })

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    // ÉTAPE 1 : Mistral OCR extrait le texte brut du document
    const ocrRes = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` 
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: 'image_url',
          image_url: `data:image/jpeg;base64,${cleanBase64}` 
        }
      })
    })

    if (!ocrRes.ok) {
      const err = await ocrRes.json()
      console.error('Mistral OCR error:', err)
      return res.status(ocrRes.status).json({ error: err })
    }

    const ocrData = await ocrRes.json()
    const extractedText = ocrData.pages?.[0]?.markdown || ''
    console.log('Texte extrait:', extractedText)

    // ÉTAPE 2 : Mistral Chat analyse le texte extrait et structure les données
    const chatRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` 
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{
          role: 'user',
          content: `Voici le texte extrait d'une pièce d'identité sénégalaise :

${extractedText}

Sur une CNI sénégalaise CEDEAO :
- Le NOM DE FAMILLE est un mot court (ex: SAMB, DIOP, FALL)
- Les PRÉNOMS peuvent être composés (ex: MOUHAMADOU MOUSTAPHA)
- Le NIN (Numéro d'Identification National) commence par "NIN" - uniquement au verso
- Les dates sont au format JJ/MM/AAAA
- La ligne MRZ commence par I<SEN

Extrais les informations et réponds UNIQUEMENT avec ce JSON :
{
  "documentType": "CNI",
  "needsVerso": true,
  "nom": "",
  "prenoms": "",
  "dateNaissance": "JJ/MM/AAAA",
  "lieuNaissance": "",
  "nationalite": "SENEGALAISE",
  "numeroDocument": "",
  "dateDelivrance": "JJ/MM/AAAA",
  "dateExpiration": "JJ/MM/AAAA",
  "adresse": "",
  "profession": "",
  "confidence": 0.95
}
Si c'est le verso, remplis numeroDocument avec le NIN.
Ne mets rien dans les champs que tu ne peux pas lire avec certitude.`
        }],
        response_format: { type: 'json_object' }
      })
    })

    const chatData = await chatRes.json()
    const result = JSON.parse(chatData.choices[0].message.content)
    return res.status(200).json(result)

  } catch (err: any) {
    console.error('Proxy error:', err)
    return res.status(500).json({ error: err.message })
  }
}
