import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${Deno.env.get('GOOGLE_VISION_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }]
        })
      }
    )

    const visionData = await visionResponse.json()
    const rawText = visionData.responses?.[0]?.fullTextAnnotation?.text ?? ''

    // Parse le texte extrait avec Claude
    const parseResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Voici le texte brut extrait d'une pièce d'identité :
          
${rawText}

Extrais les informations en JSON uniquement, sans texte autour :
{"nom":"","prenom":"","date_naissance":"","nationalite":"","numero_piece":"","type_piece":"","date_expiration":""}`
        }]
      })
    })

    const parseData = await parseResponse.json()
    const result = parseData.content?.[0]?.text ?? '{}'
    const clean = result.replace(/```json|```/g, '').trim()

    return new Response(clean, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
