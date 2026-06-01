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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `You are a strict identity document detector. You must ONLY accept official government-issued identity documents with visible text fields like name, date of birth, document number, expiry date, and photo. These include: national ID cards (CNI), passports, residence permits, driver's licenses. REJECT everything else including: regular photos of people, landscapes, objects, screenshots, business cards, receipts, or any image that does not show an official document with printed text fields. If there is ANY doubt, return the error JSON. Do not be helpful - be strict.`
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
                text: `CRITICAL: First, verify this is a physical identity document with printed fields (name, DOB, document number). If you see a regular photo, screenshot, or anything other than an official ID document with text fields, return ONLY:
{"error":"Aucune pièce d'identité détectée. Veuillez photographier un document valide (CNI, passeport, titre de séjour)."}

If this image DOES show a valid identity document, return ONLY this JSON (no markdown, no extra text):
{"nom":"","prenom":"","date_naissance":"","lieu_naissance":"","sexe":"M ou F","nationalite":"","numero_piece":"","type_piece":"CNI ou Passeport ou Titre de séjour ou Permis de conduire","date_expiration":"","date_delivrance":"","adresse":"","profession":"","nom_pere":"","nom_mere":""}
Leave a field empty if unreadable.`
              }
            ]
          }]
        })
      }
    )

    const geminiData = await geminiResponse.json()

    if (!geminiResponse.ok || geminiData.error || !geminiData.candidates) {
      console.error('Gemini API error:', JSON.stringify(geminiData.error ?? 'no candidates'))
      return new Response(
        JSON.stringify({ error: 'Service OCR temporairement indisponible. Veuillez utiliser la saisie manuelle.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const text = geminiData.candidates[0]?.content?.parts?.[0]?.text ?? ''
    if (!text.trim()) {
      return new Response(
        JSON.stringify({ error: 'Service OCR temporairement indisponible. Veuillez utiliser la saisie manuelle.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
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
