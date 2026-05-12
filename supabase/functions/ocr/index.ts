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

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64
                }
              },
              {
                text: `Analyse cette pièce d'identité et extrais les informations en JSON uniquement, sans texte autour, sans balises markdown :
{"nom":"","prenom":"","date_naissance":"","nationalite":"","numero_piece":"","type_piece":"CIN ou Passeport ou Titre de séjour","date_expiration":""}
Si une information est illisible ou absente, laisse le champ vide.`
              }
            ]
          }]
        })
      }
    )

    const geminiData = await geminiResponse.json()
    console.log('Gemini response:', JSON.stringify(geminiData))
    
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const clean = text.replace(/```json|```/g, '').trim()

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
