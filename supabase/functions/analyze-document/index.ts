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

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mimeType || "image/jpeg",
                    data: image
                  }
                },
                {
                  type: "text",
                  text: `Tu es un expert en lecture de documents 
                  d'identité officiels du monde entier.
                  Analyse cette image de document d'identité 
                  et retourne UNIQUEMENT un JSON brut valide, 
                  sans markdown, sans backticks, sans explication.
                  Format exact :
                  {
                    "documentType": "passport" ou "id_card" 
                      ou "driving_license",
                    "issuingCountry": "code ISO 3 lettres ex: SEN, FRA",
                    "surname": "NOM EN MAJUSCULES",
                    "givenNames": "Prénoms",
                    "dateOfBirth": "YYYY-MM-DD",
                    "documentNumber": "numéro du document",
                    "nationality": "nationalité en français",
                    "sex": "M" ou "F",
                    "expiryDate": "YYYY-MM-DD",
                    "address": null,
                    "needsBackSide": true si carte d'identité 
                      ou permis sinon false,
                    "confidence": nombre entre 0.0 et 1.0
                  }
                  Si un champ est illisible mets null.
                  Retourne uniquement le JSON, rien d'autre.`
                }
              ]
            }
          ]
        })
      }
    )

    const data = await response.json()
    console.log("Claude response:", JSON.stringify(data))

    if (!data.content || data.content.length === 0) {
      throw new Error(
        "Claude n'a pas retourné de résultat: " + 
        JSON.stringify(data)
      )
    }

    const text = data.content[0].text
    console.log("Claude text:", text)

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
