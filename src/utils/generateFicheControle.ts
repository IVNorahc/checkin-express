import { jsPDF } from 'jspdf'
import { supabase } from '../lib/supabase'

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

  // Helper function to draw dotted line
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

  // Helper function to add field with label and translation
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

  // Helper function to add field with two parts
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

  // PAGE 1 - RECTO
  pdf.addPage()
  
  // Draw border
  pdf.setLineWidth(borderWidth)
  pdf.rect(margin, margin, contentWidth, pageHeight - 2 * margin)
  
  // Header with vertical line
  const headerY = margin + 8
  const midX = margin + contentWidth / 2
  
  // Left side - Hotel info
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.text(hotelName, margin + 2, headerY)
  
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(5.5)
  pdf.text(hotelPhone, margin + 2, headerY + 4)
  
  // Right side - Title
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('FICHE DE', midX + 2, headerY - 2)
  pdf.text('CONTROLE', midX + 2, headerY + 2)
  
  // Vertical separator line
  pdf.line(midX, margin, midX, margin + 16)
  
  // Fields
  let y = margin + 20
  y = addField('NOM :', 'Name in capital letters / (écrire en majuscule)', y)
  y = addField('Prénoms :', 'Christian name', y)
  y = addField('Né(e) le :', 'Date and place of birth', y)
  y = addField('Département :', 'or country for foreigners', y)
  y = addField('Country :', '', y)
  
  // Separator
  y += 4
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 6
  
  // Section title
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
  
  // Extra line for nationality
  pdf.setLineWidth(borderWidth)
  drawDottedLine(margin + 1, y, pageWidth - margin - 1, y)
  y += 7
  
  // "Tournez S.V.P" at bottom
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(6)
  pdf.text('Tournez S.V.P', pageWidth / 2, pageHeight - margin - 4, { align: 'center' })

  // PAGE 2 - VERSO
  pdf.addPage()
  
  // Draw border
  pdf.setLineWidth(borderWidth)
  pdf.rect(margin, margin, contentWidth, pageHeight - 2 * margin)
  
  y = margin + 8
  y = addField('Profession ou qualité :', 'Occupation', y)
  y = addField('Domicile habituel :', 'Home address', y)
  y = addField('Date d\'arrivée dans l\'Etablissement :', 'Date of arriving in to Hotel', y)
  
  // Separator
  y += 4
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 6
  
  y = addField('Venant de :', 'Coming from', y)
  y = addField('Allant à :', 'Going to', y)
  y = addField('Country :', '', y)
  y = addField('Objet du voyage :', 'Reason of the journey (Business, Health, Touring)', y)
  
  // Separator
  y += 4
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 6
  
  y = addField('Nombre d\'enfants de moins de 15 ans accompagnant le chef de famille :', 'Number of children under 15 with the head of the family', y)
  
  // Separator
  y += 4
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 6
  
  y = addField('N° d\'immatriculation du véhicule :', 'Car number plate', y)
  
  // Special field for date and signature
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6)
  pdf.text('Le :', margin, y)
  
  drawDottedLine(margin + pdf.getTextWidth('Le :') + 1, y, margin + 30, y)
  
  pdf.text('Signature', pageWidth - margin - 20, y)
  
  pdf.setLineWidth(borderWidth)
  drawDottedLine(pageWidth - margin - 20 + pdf.getTextWidth('Signature') + 1, y, pageWidth - margin - 1, y)
  
  y += 7
  
  // Separator
  y += 4
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 6
  
  y = addField('N° d\'inscription sur le registre :', '', y)
  y = addField('Chambre N° :', '', y)
  y = addField('?? :', '', y)

  // Return blob instead of downloading
  return new Blob([pdf.output('blob')], { type: 'application/pdf' })
}

export async function saveFicheToSupabase(blob: Blob, guestName: string, userId: string): Promise<string> {
  // Generate filename
  const timestamp = Date.now()
  const fileName = `fiche_${guestName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`
  const filePath = `${userId}/${fileName}`
  
  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('fiches-controle')
    .upload(filePath, blob, {
      contentType: 'application/pdf',
      upsert: false
    })
  
  if (uploadError) {
    throw new Error(`Erreur upload: ${uploadError.message}`)
  }
  
  // Insert into database
  const { data: insertData, error: insertError } = await supabase
    .from('fiches_controle')
    .insert({
      hotel_id: userId,
      guest_name: guestName,
      file_path: filePath,
      file_url: uploadData.path
    })
    .select()
    .single()
  
  if (insertError) {
    throw new Error(`Erreur base de données: ${insertError.message}`)
  }
  
  // Generate signed URL (valid for 1 hour)
  const { data: urlData, error: urlError } = await supabase.storage
    .from('fiches-controle')
    .createSignedUrl(filePath, 3600) // 1 hour
  
  if (urlError) {
    throw new Error(`Erreur URL signée: ${urlError.message}`)
  }
  
  return urlData.signedUrl
}
