import { jsPDF } from 'jspdf'
import { supabase } from '../lib/supabase'

// ── Paramètres d'une fiche A6 ──────────────────────────────────────────────────

export interface FicheParams {
  hotelName: string
  nom: string
  prenoms: string
  dateNaissance: string
  lieuNaissance: string
  nationalite: string
  numeroPiece: string
  typePiece: string
  dateExpiration: string
  adresse: string
  profession: string
  venantDe: string
  allantA: string
  numeroChambre: string
  dateArrivee: string
  dateDepart: string
  signatureDataUrl?: string
  registrationNumber?: string
}

// ── Helpers internes ───────────────────────────────────────────────────────────

function drawDots(doc: jsPDF, x1: number, y: number, x2: number) {
  const dash = 1, gap = 1
  let x = x1
  while (x < x2) {
    doc.line(x, y, Math.min(x + dash, x2), y)
    x += dash + gap
  }
}

function field(
  doc: jsPDF,
  label: string,
  value: string,
  subtitle: string,
  x: number,
  y: number,
  maxR: number
): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text(label, x, y)
  const lw = doc.getTextWidth(label)
  if (value) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(value.substring(0, 38), x + lw + 1, y)
  } else {
    drawDots(doc, x + lw + 1, y, maxR)
  }
  if (subtitle) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(4.5)
    doc.text(subtitle, x, y + 2.8)
  }
  return y + 7
}

// ── Recto ──────────────────────────────────────────────────────────────────────

function renderRecto(doc: jsPDF, p: FicheParams) {
  const W = doc.internal.pageSize.getWidth()   // 105 mm
  const H = doc.internal.pageSize.getHeight()  // 148 mm
  const m = 5
  const cw = W - 2 * m
  const maxR = m + cw - 1
  const xi = m + 2  // left indent

  // Bordure
  doc.setLineWidth(0.4)
  doc.rect(m, m, cw, H - 2 * m)

  // En-tête : nom hôtel | FICHE DE CONTRÔLE
  const midX = m + cw / 2
  doc.setLineWidth(0.25)
  doc.line(midX, m, midX, m + 16)
  doc.line(m, m + 16, m + cw, m + 16)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  const nameLines = doc.splitTextToSize(p.hotelName, cw / 2 - 4)
  doc.text(nameLines[0] ?? '', xi, m + 7)
  if (nameLines[1]) doc.text(nameLines[1], xi, m + 12)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('FICHE DE', midX + 2, m + 7)
  doc.text('CONTRÔLE', midX + 2, m + 13)

  let y = m + 22

  // Identité
  y = field(doc, 'NOM :', p.nom.toUpperCase(), 'Name in capital letters', xi, y, maxR)
  y = field(doc, 'Prénoms :', p.prenoms, 'Christian name', xi, y, maxR)

  // Né(e) le … à … (deux champs sur la même ligne)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text('Né(e) le :', xi, y)
  const lw1 = doc.getTextWidth('Né(e) le :')
  doc.setFont('helvetica', 'normal')
  doc.text(p.dateNaissance || '', xi + lw1 + 1, y)

  const halfX = xi + cw * 0.44
  doc.setFont('helvetica', 'bold')
  doc.text('à :', halfX, y)
  const lw2 = doc.getTextWidth('à :')
  if (p.lieuNaissance) {
    doc.setFont('helvetica', 'normal')
    doc.text(p.lieuNaissance.substring(0, 20), halfX + lw2 + 1, y)
  } else {
    drawDots(doc, halfX + lw2 + 1, y, maxR)
  }
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(4.5)
  doc.text('Date et lieu de naissance / Date and place of birth', xi, y + 2.8)
  y += 7

  // Section pièce d'identité
  doc.setLineWidth(0.2)
  doc.line(m + 10, y, maxR - 10, y)
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.text("PIÈCES D'IDENTITÉ PRODUITES", W / 2, y, { align: 'center' })
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(4.2)
  doc.text('Identity documents produced', W / 2, y + 2.8, { align: 'center' })
  y += 7

  // Nature + N° sur la même ligne
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.text('Nature :', xi, y)
  const nw = doc.getTextWidth('Nature :')
  doc.setFont('helvetica', 'normal')
  doc.text(p.typePiece || '', xi + nw + 1, y)

  const numX = xi + cw * 0.42
  doc.setFont('helvetica', 'bold')
  doc.text('N° :', numX, y)
  doc.setFont('helvetica', 'normal')
  const numW = doc.getTextWidth('N° :')
  doc.text(p.numeroPiece || '', numX + numW + 1, y)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(4.5)
  doc.text('Type / Numéro du document', xi, y + 2.8)
  y += 7

  y = field(doc, 'Expiration :', p.dateExpiration, 'Expiry date', xi, y, maxR)
  y = field(doc, 'Nationalité :', p.nationalite, 'Nationality', xi, y, maxR)

  // Section adresse & voyage
  doc.setLineWidth(0.2)
  doc.line(m + 10, y, maxR - 10, y)
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.text('ADRESSE & VOYAGE', W / 2, y, { align: 'center' })
  y += 6

  y = field(doc, 'Adresse :', p.adresse, 'Home address', xi, y, maxR)
  y = field(doc, 'Profession :', p.profession, 'Occupation', xi, y, maxR)
  y = field(doc, 'Venant de :', p.venantDe, 'Coming from', xi, y, maxR)
  y = field(doc, 'Allant à :', p.allantA, 'Going to', xi, y, maxR)

  // Pied de page
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6)
  doc.text('Tournez S.V.P', W / 2, H - m - 3, { align: 'center' })
}

// ── Verso ──────────────────────────────────────────────────────────────────────

function renderVerso(doc: jsPDF, p: FicheParams) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const m = 5
  const cw = W - 2 * m
  const maxR = m + cw - 1
  const xi = m + 2

  // Bordure
  doc.setLineWidth(0.4)
  doc.rect(m, m, cw, H - 2 * m)

  let y = m + 8

  // Chambre + dates séjour
  y = field(doc, 'Chambre N° :', p.numeroChambre, '', xi, y, maxR)
  y = field(doc, "Date d'arrivée :", p.dateArrivee, 'Arrival date', xi, y, maxR)
  y = field(doc, 'Départ prévu :', p.dateDepart, 'Expected departure', xi, y, maxR)

  y += 4

  // Signature client
  doc.setLineWidth(0.2)
  doc.line(m + 8, y, maxR - 8, y)
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6)
  doc.text('SIGNATURE DU CLIENT', W / 2, y, { align: 'center' })
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(4.5)
  doc.text('Guest signature', W / 2, y + 2.8, { align: 'center' })
  y += 7

  const sigH = 32
  if (p.signatureDataUrl) {
    try {
      doc.addImage(p.signatureDataUrl, 'PNG', xi, y, cw - 4, sigH)
    } catch {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.rect(xi, y, cw - 4, sigH)
      doc.setDrawColor(0, 0, 0)
    }
  } else {
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.rect(xi, y, cw - 4, sigH)
    doc.setDrawColor(0, 0, 0)
  }
  y += sigH + 5

  // Cachet hôtel
  doc.setLineWidth(0.2)
  doc.line(m + 8, y, maxR - 8, y)
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6)
  doc.text('CACHET & SIGNATURE HÔTEL', W / 2, y, { align: 'center' })
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(4.5)
  doc.text('Hotel stamp & signature', W / 2, y + 2.8, { align: 'center' })
  y += 7

  const stampH = 26
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(xi, y, cw - 4, stampH)
  doc.setDrawColor(0, 0, 0)
  y += stampH + 4

  // Numéro de registre
  if (p.registrationNumber) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.text(`N° registre : ${p.registrationNumber}`, xi, y)
  }
}

// ── Exports publics ────────────────────────────────────────────────────────────

/** Génère une fiche A6 recto-verso (2 pages) à partir des données d'un check-in. */
export function generateFicheA6(params: FicheParams): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a6' })
  renderRecto(doc, params)
  doc.addPage()
  renderVerso(doc, params)
  return doc.output('blob')
}

/**
 * Génère un PDF unique regroupant toutes les fiches (2 pages par fiche).
 * Utilisé pour l'impression groupée du soir à 20h.
 */
export function generateFichesGroupees(fiches: FicheParams[]): Blob {
  if (fiches.length === 0) return new Blob([], { type: 'application/pdf' })
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a6' })
  fiches.forEach((p, i) => {
    if (i > 0) doc.addPage()
    renderRecto(doc, p)
    doc.addPage()
    renderVerso(doc, p)
  })
  return doc.output('blob')
}

// ── Ancienne API (conservée pour FichesControle.tsx) ──────────────────────────

export async function generateFicheControle(hotelName: string, hotelPhone: string, _guestName: string): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a6'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 6
  const contentWidth = pageWidth - 2 * margin
  const borderWidth = 0.5

  const drawDottedLine = (x1: number, y1: number, x2: number, y2: number) => {
    const dashLength = 1
    const gapLength = 1
    const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    const dashCount = Math.floor(distance / (dashLength + gapLength))
    for (let i = 0; i < dashCount; i++) {
      const startRatio = (i * (dashLength + gapLength)) / distance
      const endRatio = ((i * (dashLength + gapLength)) + dashLength) / distance
      const startX = x1 + (x2 - x1) * startRatio
      const startY = y1 + (y2 - y1) * startRatio
      const endX = x1 + (x2 - x1) * endRatio
      const endY = y1 + (y2 - y1) * endRatio
      pdf.line(startX, startY, endX, endY)
    }
  }

  const addField = (label: string, translation: string, y: number, x: number = margin, width?: number) => {
    const fieldWidth = width || contentWidth
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6)
    pdf.text(label, x, y)
    drawDottedLine(x + pdf.getTextWidth(label) + 1, y, x + fieldWidth - 1, y)
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(4.2)
    pdf.text(translation, x, y + 2.5)
    return y + 7
  }

  const addTwoPartField = (label1: string, label2: string, y: number, x: number = margin) => {
    const fieldWidth = contentWidth
    const midPoint = x + fieldWidth / 2
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6)
    pdf.text(label1, x, y)
    pdf.text(label2, midPoint, y)
    drawDottedLine(x + pdf.getTextWidth(label1) + 1, y, midPoint - 1, y)
    drawDottedLine(midPoint + pdf.getTextWidth(label2) + 1, y, x + fieldWidth - 1, y)
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(4.2)
    pdf.text('N°', x, y + 2.5)
    pdf.text('Issued on', midPoint, y + 2.5)
    return y + 7
  }

  pdf.addPage()
  pdf.setLineWidth(borderWidth)
  pdf.rect(margin, margin, contentWidth, pageHeight - 2 * margin)
  const headerY = margin + 8
  const midX = margin + contentWidth / 2
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.text(hotelName, margin + 2, headerY)
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(5.5)
  pdf.text(hotelPhone, margin + 2, headerY + 4)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('FICHE DE', midX + 2, headerY - 2)
  pdf.text('CONTROLE', midX + 2, headerY + 2)
  pdf.line(midX, margin, midX, margin + 16)

  let y = margin + 20
  y = addField('NOM :', 'Name in capital letters / (écrire en majuscule)', y)
  y = addField('Prénoms :', 'Christian name', y)
  y = addField('Né(e) le :', 'Date and place of birth', y)
  y = addField('Département :', 'or country for foreigners', y)
  y = addField('Country :', '', y)
  y += 4
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 6
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6)
  pdf.text('PIECES D\'IDENTITE PRODUITES', pageWidth / 2, y, { align: 'center' })
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(4.2)
  pdf.text('Identity documents produced', pageWidth / 2, y + 2.5, { align: 'center' })
  y += 8
  y = addField('Nature :', 'Type of identity documents produced', y)
  y = addTwoPartField('N° :', 'délivré le :', y)
  y = addField('N° :', '', y)
  y = addField('at :', '', y)
  y = addField('Date d\'entrée au Sénégal :', 'Date of entry into Senegal (pour les étrangers)', y)
  y = addField('Nationalité :', 'Nationality', y)
  pdf.setLineWidth(borderWidth)
  drawDottedLine(margin + 1, y, pageWidth - margin - 1, y)
  y += 7
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(6)
  pdf.text('Tournez S.V.P', pageWidth / 2, pageHeight - margin - 4, { align: 'center' })

  pdf.addPage()
  pdf.setLineWidth(borderWidth)
  pdf.rect(margin, margin, contentWidth, pageHeight - 2 * margin)
  y = margin + 8
  y = addField('Profession ou qualité :', 'Occupation', y)
  y = addField('Domicile habituel :', 'Home address', y)
  y = addField('Date d\'arrivée dans l\'Etablissement :', 'Date of arriving in to Hotel', y)
  y += 4
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 6
  y = addField('Venant de :', 'Coming from', y)
  y = addField('Allant à :', 'Going to', y)
  y = addField('Country :', '', y)
  y = addField('Objet du voyage :', 'Reason of the journey (Business, Health, Touring)', y)
  y += 4
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 6
  y = addField('Nombre d\'enfants de moins de 15 ans accompagnant le chef de famille :', 'Number of children under 15 with the head of the family', y)
  y += 4
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 6
  y = addField('N° d\'immatriculation du véhicule :', 'Car number plate', y)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6)
  pdf.text('Le :', margin, y)
  drawDottedLine(margin + pdf.getTextWidth('Le :') + 1, y, margin + 30, y)
  pdf.text('Signature', pageWidth - margin - 20, y)
  pdf.setLineWidth(borderWidth)
  drawDottedLine(pageWidth - margin - 20 + pdf.getTextWidth('Signature') + 1, y, pageWidth - margin - 1, y)
  y += 7
  y += 4
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 6
  y = addField('N° d\'inscription sur le registre :', '', y)
  y = addField('Chambre N° :', '', y)

  return new Blob([pdf.output('blob')], { type: 'application/pdf' })
}

export async function saveFicheToSupabase(blob: Blob, guestName: string, userId: string): Promise<string> {
  const timestamp = Date.now()
  const fileName = `fiche_${guestName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`
  const filePath = `${userId}/${fileName}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('fiches-controle')
    .upload(filePath, blob, { contentType: 'application/pdf', upsert: false })

  if (uploadError) throw new Error(`Erreur upload: ${uploadError.message}`)

  const { error: insertError } = await supabase
    .from('fiches_controle')
    .insert({ hotel_id: userId, guest_name: guestName, file_path: filePath, file_url: uploadData.path })
    .select()
    .single()

  if (insertError) throw new Error(`Erreur base de données: ${insertError.message}`)

  const { data: urlData, error: urlError } = await supabase.storage
    .from('fiches-controle')
    .createSignedUrl(filePath, 3600)

  if (urlError) throw new Error(`Erreur URL signée: ${urlError.message}`)

  return urlData.signedUrl
}
