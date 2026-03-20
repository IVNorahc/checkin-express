export async function analyzeDocument(
  imageBase64: string,
  mimeType: string = "image/jpeg"
) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const response = await fetch(
    `${supabaseUrl}/functions/v1/analyze-document`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ image: imageBase64, mimeType })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error)
  }

  return await response.json()
}
