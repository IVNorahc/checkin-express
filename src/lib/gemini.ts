import { supabase } from "./supabase"

export async function analyzeDocument(
  imageBase64: string,
  mimeType: string = "image/jpeg"
) {
  const { data, error } = await supabase.functions.invoke("analyze-document", {
    body: { image: imageBase64, mimeType },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (typeof data === "string") {
    return JSON.parse(data)
  }

  return data
}
