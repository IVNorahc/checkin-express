import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { image, mimeType } = await req.json()

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { 
                text: `Tu es un expert en lecture de documents 
                d'identité officiels du monde entier.
                Analyse cette image et retourne UNIQUEMENT 
                un JSON brut valide sans markdown ni backticks :
                {"documentType":"id_card","issuingCountry":"SEN",
                "surname":"NOM","givenNames":"Prenom",
                "dateOfBirth":"1990-01-01","documentNumber":"AB123",
                "nationality":"SÉNÉGALAISE","sex":"M",
                "expiryDate":"2030-01-01","address":null,
                "needsBackSide":true,"confidence":0.95}
                Adapte selon le vrai document.
                Si illisible mets null.
                RETOURNE UNIQUEMENT LE JSON.`
              },
              { 
                inline_data: { 
                  mime_type: mimeType || "image/jpeg", 
                  data: image 
                } 
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512
          }
        })
      }
    )

    const geminiData = await geminiResponse.json()
    console.log("Gemini raw:", JSON.stringify(geminiData))

    if (!geminiData.candidates || 
        geminiData.candidates.length === 0) {
      throw new Error(
        "Pas de résultat Gemini: " + 
        JSON.stringify(geminiData)
      )
    }

    const text = geminiData
      .candidates[0]
      .content
      .parts[0]
      .text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()

    console.log("Gemini text:", text)
    const parsed = JSON.parse(text)

    return new Response(
      JSON.stringify(parsed),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    )

  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    )
  }
})
