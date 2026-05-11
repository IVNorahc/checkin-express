import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    }})
  }

  try {
    const { imageBase64, isVersoMode } = await req.json()

    // Définir le prompt en fonction du mode
    const prompt = isVersoMode 
      ? `Tu es un expert en lecture de CNI sénégalaise CEDEAO (verso). Sur le VERSO de cette CNI sénégalaise, extrais: NIN, adresse, profession, nom du père, nom de la mère. Retourne un JSON avec les champs: nom, prenoms, dateNaissance, lieuNaissance, nationalite, numeroDocument, documentType, dateDelivrance, dateExpiration, confidence, adresse, profession, nomPere, nomMere. Si info illisible, mets "".`
      : `Tu es un expert en lecture de CNI sénégalaise CEDEAO (recto). Sur le RECTO de cette CNI sénégalaise, extrais: nom, prénoms, date de naissance, lieu de naissance, nationalité, numéro pièce, date délivrance, date expiration. Retourne un JSON avec les champs: nom, prenoms, dateNaissance, lieuNaissance, nationalite, numeroDocument, documentType, dateDelivrance, dateExpiration, confidence, adresse, profession, nomPere, nomMere. Si info illisible, mets ""`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
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
              text: prompt
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? '{}'
    
    // Nettoyer la réponse pour extraire le JSON
    const clean = text.replace(/```json|```/g, '').trim()
    
    try {
      const parsed = JSON.parse(clean)
      
      // Transformer les données pour correspondre au format OCRData
      const ocrData = {
        documentType: parsed.documentType || 'CNI',
        needsVerso: isVersoMode ? false : true,
        nom: parsed.nom || null,
        prenoms: parsed.prenoms || null,
        dateNaissance: parsed.dateNaissance || null,
        lieuNaissance: parsed.lieuNaissance || null,
        nationalite: parsed.nationalite || null,
        numeroDocument: parsed.numeroDocument || null,
        dateDelivrance: parsed.dateDelivrance || null,
        dateExpiration: parsed.dateExpiration || null,
        confidence: parsed.confidence || 0.8,
        adresse: parsed.adresse || null,
        profession: parsed.profession || null,
        nomPere: parsed.nomPere || null,
        nomMere: parsed.nomMere || null
      }

      return new Response(JSON.stringify(ocrData), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      throw new Error('Invalid JSON response from Anthropic API')
    }

  } catch (error) {
    console.error('OCR Function Error:', error)
    
    return new Response(JSON.stringify({ 
      error: error.message || 'OCR processing failed',
      needsManualInput: true
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})
