import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
);

export async function analyzeDocument(
  imageBase64: string,
  mimeType: string = "image/jpeg"
) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash" 
  });

  const prompt = `Tu es un expert en lecture de documents 
  d'identité officiels. Analyse cette image et retourne 
  UNIQUEMENT un JSON valide sans aucun texte autour, 
  sans balises markdown, juste le JSON brut :
  {
    "documentType": "passport" ou "id_card" ou "driving_license",
    "issuingCountry": "code pays ISO 3 lettres",
    "surname": "nom de famille en majuscules",
    "givenNames": "prénoms",
    "dateOfBirth": "YYYY-MM-DD",
    "documentNumber": "numéro du document",
    "nationality": "nationalité en français",
    "sex": "M" ou "F",
    "expiryDate": "YYYY-MM-DD",
    "address": "adresse si présente sinon null",
    "needsBackSide": true si carte d'identité ou permis,
    "confidence": nombre entre 0 et 1
  }
  Si un champ est illisible mets null.`;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  const text = response.text();
  
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}
