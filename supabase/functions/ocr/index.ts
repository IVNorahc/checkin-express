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
          systemInstruction: {
            parts: [{
              text: `You are a strict identity document validator. Your ONLY job is:
1. Determine if the image shows a government-issued identity document (national ID card, passport, residence permit, or driver's license).
2. If it does NOT show such a document, you MUST respond with EXACTLY this JSON and nothing else: {"error":"Aucune pièce d'identité détectée. Veuillez photographier un document valide (CNI, passeport, titre de séjour)."}
3. If it DOES show a valid identity document, extract the fields as JSON.
You must NEVER process non-identity-document images. If there is any doubt, return the error JSON.`
            }]
          },
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64
                }
              },
              {
                text: `STRICT RULE: If this image does NOT show an identity document (national ID card / CNI, passport, residence permit, driver's license), return ONLY this JSON and nothing else:
{"error":"Aucune pièce d'identité détectée. Veuillez photographier un document valide (CNI, passeport, titre de séjour)."}

If this image DOES show a valid identity document, return ONLY this JSON (no markdown, no extra text):
{"nom":"","prenom":"","date_naissance":"","nationalite":"","numero_piece":"","type_piece":"CNI ou Passeport ou Titre de séjour ou Permis de conduire","date_expiration":""}
Leave a field empty if unreadable.`
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
