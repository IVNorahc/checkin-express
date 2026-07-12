import { jsPDF } from 'jspdf'

// ── Paramètres d'une fiche A6 ──────────────────────────────────────────────────

export interface FicheParams {
  hotelName: string
  hotelPhone?: string
  nom: string
  prenoms: string
  dateNaissance: string
  lieuNaissance: string
  nationalite: string
  numeroPiece: string
  typePiece: string
  dateDelivrance: string
  paysEmission?: string
  adresse: string
  profession: string
  venantDe: string
  allantA: string
  numeroChambre: string
  dateArrivee: string
  dateDepart: string
  objetVoyage?: string
  signatureDataUrl?: string
  registrationNumber?: string
  logoUrl?: string  // data URL base64 (converti avant appel)
  signatureTimestamp?: string  // ISO UTC — horodatage de signature
  documentHash?: string        // SHA-256 hex — empreinte du document
}

// ── Helpers internes ───────────────────────────────────────────────────────────

function renderCertificationBloc(doc: jsPDF, p: FicheParams, yStart: number) {
  const W = doc.internal.pageSize.getWidth()
  const m = 5
  const xi = m + 2
  const maxR = W - m - 1
  let y = yStart + 3

  doc.setLineWidth(0.15)
  doc.line(xi, y, maxR, y)
  y += 2.5

  if (p.signatureTimestamp || p.documentHash) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(4.5)
    doc.text('SIGNATURE ÉLECTRONIQUE CERTIFIÉE', W / 2, y, { align: 'center' })
    y += 3

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(4)
    const parts: string[] = []
    if (p.signatureTimestamp) {
      const d = new Date(p.signatureTimestamp)
      const dd = d.toLocaleDateString('fr-FR', {
        timeZone: 'Africa/Dakar', day: '2-digit', month: '2-digit', year: 'numeric',
      })
      const tt = d.toLocaleTimeString('fr-FR', {
        timeZone: 'Africa/Dakar', hour: '2-digit', minute: '2-digit',
      })
      parts.push(`Signé le ${dd} à ${tt} (WAT)`)
    }
    if (p.documentHash) {
      parts.push(`Code : ${p.documentHash.substring(0, 8).toUpperCase()}`)
    }
    if (parts.length > 0) {
      doc.text(parts.join('  ·  '), W / 2, y, { align: 'center' })
      y += 3
    }
  }

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(3.5)
  doc.text('Document généré par Check-in Express by Percepta SUARL', W / 2, y, { align: 'center' })
}

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

  // En-tête : nom hôtel + tél | FICHE DE CONTRÔLE  (22mm de hauteur)
  const headerH = 22
  const midX = m + cw / 2
  doc.setLineWidth(0.25)
  doc.line(midX, m, midX, m + headerH)
  doc.line(m, m + headerH, m + cw, m + headerH)

  // Logo ou nom texte dans la moitié gauche de l'en-tête
  if (p.logoUrl && p.logoUrl.startsWith('data:')) {
    try {
      const match = p.logoUrl.match(/^data:image\/(\w+)/)
      const fmt = match ? match[1].toUpperCase().replace('JPG', 'JPEG') : 'JPEG'
      doc.addImage(p.logoUrl, fmt, xi, m + 1.5, 38, 13)
    } catch {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      const nameLines = doc.splitTextToSize(p.hotelName, cw / 2 - 4)
      doc.text(nameLines[0] ?? '', xi, m + 7)
      if (nameLines[1]) doc.text(nameLines[1], xi, m + 12)
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    const nameLines = doc.splitTextToSize(p.hotelName, cw / 2 - 4)
    doc.text(nameLines[0] ?? '', xi, m + 7)
    if (nameLines[1]) doc.text(nameLines[1], xi, m + 12)
  }

  // Téléphone hôtel sous le nom/logo
  if (p.hotelPhone) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.text(p.hotelPhone, xi, m + headerH - 3)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('FICHE DE', midX + 2, m + 9)
  doc.text('CONTRÔLE', midX + 2, m + 16)

  // Numéro de fiche de police — bien visible, juste après l'en-tête
  if (p.registrationNumber) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(`N° ${p.registrationNumber}`, W / 2, m + headerH + 6, { align: 'center' })
  }

  let y = m + headerH + 12

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

  y = field(doc, 'Délivré le :', p.dateDelivrance, 'Issue date', xi, y, maxR)
  if (p.paysEmission) {
    y = field(doc, "Pays d'émission :", p.paysEmission, 'Issuing country', xi, y, maxR)
  }
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
  y = field(doc, 'Objet du voyage :', p.objetVoyage ?? '', 'Purpose of travel', xi, y, maxR)

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
  y += sigH + 4

  // Numéro de registre
  if (p.registrationNumber) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.text(`N° registre : ${p.registrationNumber}`, xi, y)
    y += 4
  }

  renderCertificationBloc(doc, p, y)
}

// ── Exports publics ────────────────────────────────────────────────────────────

/** Retourne l'instance jsPDF A6 recto-verso (utile pour doc.save() ou doc.output('bloburl')). */
export function generateFicheA6Doc(params: FicheParams): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a6' })
  renderRecto(doc, params)
  doc.addPage()
  renderVerso(doc, params)
  return doc
}

/** Génère une fiche A6 recto-verso (2 pages) à partir des données d'un check-in. */
export function generateFicheA6(params: FicheParams): Blob {
  return generateFicheA6Doc(params).output('blob')
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

