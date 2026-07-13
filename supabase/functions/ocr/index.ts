import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Parser principal ────────────────────────────────────────────────────────
// RECTO : label sur une ligne, valeur sur la ligne suivante
// VERSO  : "NIN <valeur>" sur une seule ligne

function parseIdentityText(text: string): Record<string, string> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  const result: Record<string, string> = {
    nom: '', prenom: '', date_naissance: '', lieu_naissance: '',
    sexe: '', nationalite: 'SÉNÉGALAISE', numero_piece: '', type_piece: 'CNI',
    date_expiration: '', date_delivrance: '', adresse: '',
    profession: '', nom_pere: '', nom_mere: '', pays_emission: '',
  }

  const find = (pattern: RegExp): number => lines.findIndex(l => pattern.test(l))
  // Accept DD/MM/YYYY, DD.MM.YYYY and DD-MM-YYYY
  const isDate  = (s: string) => /^\d{2}[\/.\-]\d{2}[\/.\-]\d{4}$/.test(s)
  const normDate = (s: string) => s.replace(/[.\-]/g, '/')
  // Extract first date from a line or from the next N lines, supports inline too
  const extractDate = (fromIdx: number, maxOffset = 6): string => {
    for (let o = 0; o <= maxOffset; o++) {
      const line = lines[fromIdx + o] ?? ''
      const m = line.match(/\b(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})\b/)
      if (m) return normDate(m[1])
    }
    return ''
  }

  // ── VERSO : NIN ─────────────────────────────────────────────────────────
  // Exemple : "NIN 1 770 1994 03910" → "1 770 1994 03910"
  const ninLine = lines.find(l => /^NIN\s+/i.test(l))
  if (ninLine) result.numero_piece = ninLine.replace(/^NIN\s+/i, '').trim()

  // ── RECTO : Prénoms — tolérant aux accents (Prénoms / Prenoms) ──────────
  const prenomIdx = find(/^pr[eé]noms?$/i)
  if (prenomIdx !== -1) result.prenom = lines[prenomIdx + 1] ?? ''

  // ── RECTO : Nom ─────────────────────────────────────────────────────────
  const nomIdx = find(/^nom$/i)
  if (nomIdx !== -1) result.nom = lines[nomIdx + 1] ?? ''

  // ── RECTO : Sexe ──────────────────────────────────────────────────────────
  // 1st try: "Sexe" label → next line
  const sexeIdx  = find(/^sexe/i)
  if (sexeIdx !== -1) {
    const v = lines[sexeIdx + 1] ?? ''
    if (v === 'M' || v === 'F') result.sexe = v
  }
  // 2nd try: value immediately before "Taille" label (some older CNI formats)
  if (!result.sexe) {
    const tailleIdx = find(/^taille/i)
    if (tailleIdx !== -1) {
      for (let o = 1; o <= 3; o++) {
        const v = lines[tailleIdx - o] ?? ''
        if (v === 'M' || v === 'F') { result.sexe = v; break }
      }
    }
  }

  // ── RECTO : Date de naissance ─────────────────────────────────────────────
  // Always search by label — never tie this to the "Taille" branch.
  // The CEDEAO CNI has date-of-birth BEFORE "Taille", not after.
  const naissIdx = find(/^date de naissance/i)  // matches bilingual "Date de naissance / Date of birth"
  if (naissIdx !== -1) {
    result.date_naissance = extractDate(naissIdx)
  }
  // Fallback: if label not found, scan lines just before "Taille"
  if (!result.date_naissance) {
    const tailleIdx = find(/^taille/i)
    if (tailleIdx !== -1) {
      for (let o = 2; o <= 6; o++) {
        const v = lines[tailleIdx - o] ?? ''
        if (isDate(v)) { result.date_naissance = normDate(v); break }
      }
    }
  }

  // ── RECTO : Lieu de naissance ────────────────────────────────────────────
  const lieuIdx = find(/^lieu de naissance/i)  // no $ — tolerates bilingual labels
  if (lieuIdx !== -1) result.lieu_naissance = lines[lieuIdx + 1] ?? ''

  // ── RECTO : Date de délivrance ───────────────────────────────────────────
  // No $ anchor — matches "Date de délivrance / Date of issue" (CEDEAO bilingual)
  const delivIdx = find(/^d[ae]t[ae] de d[eé]livrance/i)
  if (delivIdx !== -1) {
    result.date_delivrance = extractDate(delivIdx)
  }

  // ── RECTO : Date d'expiration ────────────────────────────────────────────
  const expirIdx = find(/^date d['']expiration/i)
  if (expirIdx !== -1) {
    result.date_expiration = extractDate(expirIdx)
  }

  // ── RECTO : Adresse du domicile (2 lignes jointes si non-label) ──────────
  const adresseIdx = find(/^adresse du domicile$/i)
  if (adresseIdx !== -1) {
    const line1 = lines[adresseIdx + 1] ?? ''
    const line2 = lines[adresseIdx + 2] ?? ''
    const isLabelLike = /^(nom|pr[eé]nom|date|lieu|sexe|taille|profession|nationalit[eé]|centre)/i
    result.adresse = (line2 && !isLabelLike.test(line2)) ? `${line1} ${line2}`.trim() : line1
  }

  // ── Type de pièce ──────────────────────────────────────────────────────
  if (/passeport|passport/i.test(text)) result.type_piece = 'Passeport'
  else if (/titre de s[eé]jour/i.test(text)) result.type_piece = 'Titre de séjour'
  else if (/permis de conduire/i.test(text)) result.type_piece = 'Permis de conduire'

  // ── Pays d'émission ────────────────────────────────────────────────────
  // Adjectifs nationaux → noms de pays
  const adjPays: Record<string, string> = {
    'FRANÇAISE': 'FRANCE', 'FRANCAISE': 'FRANCE',
    'IVOIRIENNE': "CÔTE D'IVOIRE", 'IVOIRIEN': "CÔTE D'IVOIRE",
    'MALIENNE': 'MALI', 'MALIEN': 'MALI',
    'GUINÉENNE': 'GUINÉE', 'GUINÉEN': 'GUINÉE',
    'MAURITANIENNE': 'MAURITANIE', 'MAURITANIEN': 'MAURITANIE',
    'GAMBIENNE': 'GAMBIE', 'GAMBIEN': 'GAMBIE',
    'BURKINABÈ': 'BURKINA FASO', 'BURKINABE': 'BURKINA FASO',
    'TOGOLAISE': 'TOGO', 'TOGOLAIS': 'TOGO',
    'BÉNINOISE': 'BÉNIN', 'BENINOISE': 'BÉNIN',
    'NIGÉRIANE': 'NIGERIA', 'NIGÉRIAN': 'NIGERIA',
  }
  const upper = text.toUpperCase()
  if (upper.includes('SENEGAL') || upper.includes('SÉNÉGAL')) {
    result.pays_emission = 'SÉNÉGAL'
  } else {
    // "REPUBLIQUE DU X" ou "REPUBLIQUE DE X"
    const m1 = upper.match(/REPUBLIQUE\s+(?:DU|DE|DES|D')\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s'\-]{1,40})/)
    if (m1) {
      result.pays_emission = m1[1].trim()
    } else {
      // "REPUBLIQUE FRANÇAISE" etc.
      const m2 = upper.match(/REPUBLIQUE\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ]{4,20})/)
      if (m2) {
        result.pays_emission = adjPays[m2[1].trim()] ?? m2[1].trim()
      }
    }
  }

  return result
}

// ── Serveur ─────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()

    // Google Cloud Vision — extraction du texte brut
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${Deno.env.get('GOOGLE_VISION_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
          }]
        })
      }
    )

    const visionData = await visionResponse.json()

    if (!visionResponse.ok || visionData.error) {
      console.error('Vision API error:', visionResponse.status, JSON.stringify(visionData))
      return new Response(
        JSON.stringify({ error: 'Service OCR temporairement indisponible. Veuillez utiliser la saisie manuelle.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawText = visionData.responses?.[0]?.fullTextAnnotation?.text ?? ''
    console.log('[OCR] rawText brut Vision:\n' + rawText)
    if (!rawText.trim()) {
      return new Response(
        JSON.stringify({ error: 'Aucun texte détecté. Veuillez photographier un document valide.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parser JS local — pas d'appel API supplémentaire
    const parsed = parseIdentityText(rawText)

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
