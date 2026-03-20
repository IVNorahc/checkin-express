import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { image, mimeType } = await req.json()
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Tu es un expert en lecture de documents 
                d'identité. Analyse cette image et retourne 
                UNIQUEMENT un JSON brut sans markdown :
                {
                  "documentType": "passport" ou "id_card" 
                    ou "driving_license",
                  "issuingCountry": "code ISO 3 lettres",
                  "surname": "NOM EN MAJUSCULES",
                  "givenNames": "prénoms",
                  "dateOfBirth": "YYYY-MM-DD",
                  "documentNumber": "numéro du document",
                  "nationality": "nationalité en français",
                  "sex": "M" ou "F",
                  "expiryDate": "YYYY-MM-DD",
                  "address": null,
                  "needsBackSide": false,
                  "confidence": 0.95
                }` 
              },
              { 
                inline_data: { 
                  mime_type: mimeType || "image/jpeg", 
                  data: image 
                } 
              }
            ]
          }]
        })
      }
    )

    const data = await response.json()
    const text = data.candidates[0].content.parts[0].text
    const cleaned = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleaned)

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }
})
