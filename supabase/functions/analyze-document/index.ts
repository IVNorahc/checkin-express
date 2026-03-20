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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { 
                text: `Tu es un expert en lecture de documents 
                d'identité officiels (passeports, cartes 
                d'identité, permis de conduire).
                Analyse cette image et retourne UNIQUEMENT 
                un objet JSON valide, sans markdown, 
                sans backticks, sans explication.
                Format exact :
                {"documentType":"passport","issuingCountry":"SEN","surname":"NOM","givenNames":"Prenom","dateOfBirth":"1990-01-01","documentNumber":"AB123456","nationality":"SÉNÉGALAISE","sex":"M","expiryDate":"2030-01-01","address":null,"needsBackSide":false,"confidence":0.9}
                Adapte les valeurs selon le document.
                Si illisible mets null pour ce champ.`
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
            topP: 0.8,
            maxOutputTokens: 1024
          }
        })
      }
    )

    const geminiData = await geminiResponse.json()
    
    console.log(
      "Gemini raw response:",
      JSON.stringify(geminiData),
    )

    if (!geminiData.candidates || 
        geminiData.candidates.length === 0) {
      throw new Error(
        "Gemini n'a pas retourné de résultat: " + 
        JSON.stringify(geminiData)
      )
    }

    const text = geminiData
      .candidates[0]
      .content
      .parts[0]
      .text

    console.log("Gemini text:", text)

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()

    const parsed = JSON.parse(cleaned)

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
