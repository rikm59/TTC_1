import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type { Estimate, CompanySettings, CalculatedTotals } from '../types'
import { fmt } from './calculations'

const pdfStrings = {
  en: {
    invoice: 'INVOICE',
    estimate: 'PROJECT ESTIMATE',
    invoiceShort: 'Invoice',
    estimateShort: 'Estimate',
    number: '#',
    date: 'Date:',
    validUntil: 'Valid Until:',
    billTo: 'BILL TO:',
    from: 'FROM:',
    project: 'PROJECT:',
    jobSite: 'JOB SITE:',
    materials: 'MATERIALS',
    labor: 'LABOR',
    overhead: 'OVERHEAD / EQUIPMENT',
    matCost: 'Materials Cost:',
    matMarkup: 'Materials w/ Markup:',
    laborCost: 'Labor:',
    overheadCost: 'Overhead:',
    hardCost: 'Total Hard Cost:',
    conservative: 'Conservative',
    standard: 'Standard',
    premium: 'Premium',
    margin: 'margin',
    amountDue: 'AMOUNT DUE:',
    totalQuote: 'TOTAL QUOTE:',
    scopeOfWork: 'SCOPE OF WORK',
    exclusions: 'EXCLUSIONS',
    paymentTerms: 'PAYMENT TERMS:',
    warranty: 'WARRANTY:',
    paymentStatus: 'PAYMENT STATUS:',
    deposit: 'Deposit:',
    balance: 'Balance:',
    paid: 'PAID',
    unpaid: 'UNPAID',
    via: 'via',
    clientSig: 'Client Signature / Date',
    contractorSig: 'Contractor Signature / Date',
    page: 'Page',
    of: 'of',
    // Table column headers
    item: 'Item',
    qty: 'Qty',
    unit: 'Unit',
    unitCost: 'Unit Cost',
    markup: 'Markup',
    clientPrice: 'Client Price',
    unitPrice: 'Unit Price',
    total: 'Total',
    description: 'Description',
    workers: 'Workers',
    hours: 'Hours',
    rateHr: 'Rate/Hr',
    cost: 'Cost',
  },
  es: {
    invoice: 'FACTURA',
    estimate: 'ESTIMACIÓN DE PROYECTO',
    invoiceShort: 'Factura',
    estimateShort: 'Estimación',
    number: '#',
    date: 'Fecha:',
    validUntil: 'Válido Hasta:',
    billTo: 'FACTURAR A:',
    from: 'DE:',
    project: 'PROYECTO:',
    jobSite: 'SITIO:',
    materials: 'MATERIALES',
    labor: 'MANO DE OBRA',
    overhead: 'GASTOS GENERALES / EQUIPOS',
    matCost: 'Costo de Materiales:',
    matMarkup: 'Materiales con Margen:',
    laborCost: 'Mano de Obra:',
    overheadCost: 'Gastos Generales:',
    hardCost: 'Costo Duro Total:',
    conservative: 'Conservador',
    standard: 'Estándar',
    premium: 'Premium',
    margin: 'margen',
    amountDue: 'MONTO A PAGAR:',
    totalQuote: 'COTIZACIÓN TOTAL:',
    scopeOfWork: 'ALCANCE DEL TRABAJO',
    exclusions: 'EXCLUSIONES',
    paymentTerms: 'TÉRMINOS DE PAGO:',
    warranty: 'GARANTÍA:',
    paymentStatus: 'ESTADO DE PAGO:',
    deposit: 'Depósito:',
    balance: 'Saldo:',
    paid: 'PAGADO',
    unpaid: 'PENDIENTE',
    via: 'vía',
    clientSig: 'Firma del Cliente / Fecha',
    contractorSig: 'Firma del Contratista / Fecha',
    page: 'Página',
    of: 'de',
    // Table column headers
    item: 'Artículo',
    qty: 'Cant.',
    unit: 'Unidad',
    unitCost: 'Costo Unit.',
    markup: 'Margen',
    clientPrice: 'Precio Cliente',
    unitPrice: 'Precio Unit.',
    total: 'Total',
    description: 'Descripción',
    workers: 'Trabajadores',
    hours: 'Horas',
    rateHr: 'Tarifa/Hr',
    cost: 'Costo',
  },
}

export interface PaymentInfo {
  deposit_amount: number
  deposit_paid: boolean
  deposit_paid_at: string | null
  deposit_method: string | null
  balance_paid: boolean
  balance_paid_at: string | null
  balance_method: string | null
}

export async function generatePDF(
  estimate: Estimate,
  totals: CalculatedTotals,
  company: CompanySettings,
  viewType: 'client' | 'contractor',
  lang: 'en' | 'es' = 'en',
  options?: { paymentInfo?: PaymentInfo; returnBlob?: boolean }
): Promise<Blob | void> {
  const paymentInfo = options?.paymentInfo
  const s = pdfStrings[lang]
  // Yield to event loop so UI doesn't freeze before heavy PDF work starts
  await new Promise(resolve => setTimeout(resolve, 0))
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const W = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = margin

  const addPage = () => {
    doc.addPage()
    y = margin
  }

  const checkSpace = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) addPage()
  }

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(63, 54, 203)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(company.companyName || 'Contractor Estimator', margin, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const contactLine = [company.phone, company.email, company.website].filter(Boolean).join('  |  ')
  doc.text(contactLine, margin, 20)
  if (company.license) {
    doc.text(`Lic #${company.license}`, W - margin, 20, { align: 'right' })
  }

  y = 36

  // ── Title block ─────────────────────────────────────────
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const title = estimate.type === 'invoice' ? s.invoice : s.estimate
  doc.text(title, margin, y)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const rightX = W - margin
  doc.text(`${estimate.type === 'invoice' ? s.invoiceShort : s.estimateShort} ${s.number}: ${estimate.estimateNumber}`, rightX, y - 5, { align: 'right' })
  doc.text(`${s.date} ${format(new Date(estimate.createdAt), 'MMMM d, yyyy')}`, rightX, y, { align: 'right' })
  const validDate = new Date(estimate.createdAt)
  validDate.setDate(validDate.getDate() + (estimate.settings.validityDays || 30))
  doc.text(`${s.validUntil} ${format(validDate, 'MMMM d, yyyy')}`, rightX, y + 5, { align: 'right' })

  y += 14

  // ── Client + Company Info ─────────────────────────────────
  doc.setFillColor(247, 248, 250)
  doc.rect(margin, y, (W - margin * 2) / 2 - 4, 32, 'F')
  doc.rect(W / 2 + 2, y, (W - margin * 2) / 2 - 4, 32, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(s.billTo, margin + 4, y + 7)
  doc.setFont('helvetica', 'normal')
  const cname = estimate.client.name || '—'
  const caddr = [estimate.client.address, estimate.client.city, estimate.client.state, estimate.client.zip]
    .filter(Boolean).join(', ')
  doc.text(cname, margin + 4, y + 13)
  if (estimate.client.company) doc.text(estimate.client.company, margin + 4, y + 18)
  doc.text(caddr || '—', margin + 4, y + 23, { maxWidth: (W - margin * 2) / 2 - 8 })
  doc.text(estimate.client.phone || '', margin + 4, y + 29)

  const cx = W / 2 + 6
  doc.setFont('helvetica', 'bold')
  doc.text(s.from, cx, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.text(company.companyName || '—', cx, y + 13)
  doc.text([company.address, company.city, company.state].filter(Boolean).join(', '), cx, y + 18, { maxWidth: (W - margin * 2) / 2 - 8 })
  doc.text(company.phone || '', cx, y + 23)
  doc.text(company.email || '', cx, y + 28)

  y += 40

  // ── Project Info ──────────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(s.project, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(estimate.projectDescription || `${estimate.projectType} — ${estimate.projectSubType}`, margin + 20, y)
  if (estimate.jobAddress) {
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text(s.jobSite, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(estimate.jobAddress, margin + 20, y)
  }
  y += 10

  // ── Materials Table ───────────────────────────────────────
  if (estimate.materials.length > 0) {
    checkSpace(20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(s.materials, margin, y)
    y += 4

    const matColumns = viewType === 'contractor'
      ? [
          { header: s.item, dataKey: 'name' },
          { header: s.qty, dataKey: 'qty' },
          { header: s.unit, dataKey: 'unit' },
          { header: s.unitCost, dataKey: 'unitCost' },
          { header: s.markup, dataKey: 'markup' },
          { header: s.clientPrice, dataKey: 'clientPrice' },
          { header: s.total, dataKey: 'total' },
        ]
      : [
          { header: s.item, dataKey: 'name' },
          { header: s.qty, dataKey: 'qty' },
          { header: s.unit, dataKey: 'unit' },
          { header: s.unitPrice, dataKey: 'clientPrice' },
          { header: s.total, dataKey: 'total' },
        ]

    const matRows = estimate.materials.map(m => {
      const clientUnit = m.unitCost * (1 + m.markup / 100)
      return {
        name: `${m.name}${m.notes ? `\n${m.notes}` : ''}`,
        qty: m.quantity.toFixed(2),
        unit: m.unit,
        unitCost: fmt(m.unitCost),
        markup: `${m.markup}%`,
        clientPrice: fmt(clientUnit),
        total: fmt(m.quantity * (viewType === 'contractor' ? m.unitCost : clientUnit)),
      }
    })

    autoTable(doc, {
      startY: y,
      columns: matColumns,
      body: matRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [63, 54, 203], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 249, 255] },
      columnStyles: viewType === 'contractor'
        ? { 0: { cellWidth: 55 }, 3: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } }
        : { 0: { cellWidth: 80 }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── Labor Table ───────────────────────────────────────────
  if (estimate.labor.length > 0) {
    checkSpace(20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(s.labor, margin, y)
    y += 4

    const laborColumns = viewType === 'contractor'
      ? [
          { header: s.description, dataKey: 'desc' },
          { header: s.workers, dataKey: 'workers' },
          { header: s.hours, dataKey: 'hours' },
          { header: s.rateHr, dataKey: 'rate' },
          { header: s.total, dataKey: 'total' },
        ]
      : [
          { header: s.description, dataKey: 'desc' },
          { header: s.total, dataKey: 'total' },
        ]

    const laborRows = estimate.labor.map(l => ({
      desc: l.description,
      workers: l.workers,
      hours: l.hours.toFixed(1),
      rate: fmt(l.ratePerHour),
      total: fmt(l.workers * l.hours * l.ratePerHour),
    }))

    autoTable(doc, {
      startY: y,
      columns: laborColumns,
      body: laborRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [16, 128, 80], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 255, 250] },
      columnStyles: { 0: { cellWidth: viewType === 'contractor' ? 80 : 140 }, 4: { halign: 'right' } },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── Overhead Table (contractor only) ──────────────────────
  if (viewType === 'contractor' && estimate.overhead.length > 0) {
    checkSpace(20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(s.overhead, margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      columns: [
        { header: s.description, dataKey: 'desc' },
        { header: s.cost, dataKey: 'cost' },
      ],
      body: estimate.overhead.map(o => ({ desc: o.description, cost: fmt(o.cost) })),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [180, 100, 20], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 252, 245] },
      columnStyles: { 0: { cellWidth: 140 }, 1: { halign: 'right' } },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // ── Totals ───────────────────────────────────────────────
  checkSpace(50)
  const totX = W - margin - 80
  doc.setFillColor(247, 248, 250)
  doc.rect(totX, y, 80, viewType === 'contractor' ? 60 : 20, 'F')

  doc.setFontSize(9)

  const writeRow = (label: string, val: string, bold = false, color?: [number, number, number]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    if (color) doc.setTextColor(...color)
    else doc.setTextColor(0, 0, 0)
    doc.text(label, totX + 4, y + 5)
    doc.text(val, totX + 79, y + 5, { align: 'right' })
    y += 7
  }

  y += 3
  if (viewType === 'contractor') {
    writeRow(s.matCost, fmt(totals.materialsCost))
    writeRow(s.matMarkup, fmt(totals.materialsWithMarkup))
    writeRow(s.laborCost, fmt(totals.laborCost))
    writeRow(s.overheadCost, fmt(totals.overheadCost))
    writeRow(s.hardCost, fmt(totals.hardCost), true)
    y += 2
    doc.setDrawColor(63, 54, 203)
    doc.line(totX, y, totX + 80, y)
    y += 4
    writeRow(`${s.conservative} (${totals.conservativeMargin.toFixed(0)}% ${s.margin}):`, fmt(totals.conservativeQuote))
    writeRow(`${s.standard} (${totals.standardMargin.toFixed(0)}% ${s.margin}):`, fmt(totals.standardQuote))
    writeRow(`${s.premium} (${totals.premiumMargin.toFixed(0)}% ${s.margin}):`, fmt(totals.premiumQuote))
    y += 2
  }

  doc.setFillColor(63, 54, 203)
  doc.rect(totX, y, 80, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  const finalLabel = estimate.type === 'invoice' ? s.amountDue : s.totalQuote
  doc.text(finalLabel, totX + 4, y + 8)
  doc.text(fmt(totals.selectedQuote + totals.taxAmount), totX + 79, y + 8, { align: 'right' })
  y += 18

  // ── Scope of Work ────────────────────────────────────────
  if (estimate.scopeOfWork) {
    checkSpace(20)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(s.scopeOfWork, margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const lines = doc.splitTextToSize(estimate.scopeOfWork, W - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 4 + 6
  }

  if (estimate.exclusions) {
    checkSpace(20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(s.exclusions, margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const lines = doc.splitTextToSize(estimate.exclusions, W - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 4 + 6
  }

  // ── Terms ────────────────────────────────────────────────
  checkSpace(40)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(s.paymentTerms, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(estimate.settings.paymentTerms || '50% deposit required to schedule. Balance due upon completion.', margin + 38, y)
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text(s.warranty, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(estimate.settings.warranty || '1-year warranty on all labor. Manufacturer warranty on materials.', margin + 22, y)
  y += 10

  // ── Payment Status (when payment data is available) ──────
  if (paymentInfo) {
    checkSpace(24)
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y, W - margin, y)
    y += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text(s.paymentStatus, margin, y)
    y += 6

    const depMethod = paymentInfo.deposit_method ? ` ${s.via} ${paymentInfo.deposit_method}` : ''
    doc.setFont('helvetica', 'bold')
    doc.text(s.deposit, margin + 2, y)
    if (paymentInfo.deposit_paid) {
      doc.setTextColor(22, 163, 74)
      doc.setFont('helvetica', 'bold')
      doc.text(`${s.paid}  ${fmt(paymentInfo.deposit_amount)}${depMethod}`, margin + 22, y)
    } else {
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      doc.text(s.unpaid, margin + 22, y)
    }
    doc.setTextColor(60, 60, 60)
    y += 6

    const balMethod = paymentInfo.balance_method ? ` ${s.via} ${paymentInfo.balance_method}` : ''
    doc.setFont('helvetica', 'bold')
    doc.text(s.balance, margin + 2, y)
    if (paymentInfo.balance_paid) {
      doc.setTextColor(22, 163, 74)
      doc.setFont('helvetica', 'bold')
      doc.text(`${s.paid}${balMethod}`, margin + 22, y)
    } else {
      doc.setTextColor(220, 38, 38)
      doc.setFont('helvetica', 'normal')
      doc.text(s.unpaid, margin + 22, y)
    }
    doc.setTextColor(60, 60, 60)
    y += 8
  } else {
    y += 4
  }

  // ── Signature / Authorization Block ─────────────────────
  checkSpace(60)

  // Section divider
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.4)
  doc.line(margin, y, W - margin, y)
  y += 7

  // Header
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  const authHeader = lang === 'es' ? 'AUTORIZACIÓN Y ACEPTACIÓN' : 'AUTHORIZATION & ACCEPTANCE'
  doc.text(authHeader, margin, y)
  y += 6

  // Authorization text
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  const authText = lang === 'es'
    ? `Al firmar a continuación, el cliente autoriza a ${company.companyName || 'el contratista'} a proceder con el trabajo descrito en este documento por el monto acordado de ${fmt(totals.selectedQuote + totals.taxAmount)}. El cliente reconoce haber leído y aceptado todos los términos, el alcance del trabajo y las exclusiones indicadas en esta ${estimate.type === 'invoice' ? 'factura' : 'estimación'}.`
    : `By signing below, the client authorizes ${company.companyName || 'the contractor'} to proceed with the work described above for the agreed amount of ${fmt(totals.selectedQuote + totals.taxAmount)}. Client acknowledges having read and agreed to all terms, scope of work, and exclusions stated in this ${estimate.type === 'invoice' ? 'invoice' : 'estimate'}.`
  const authLines = doc.splitTextToSize(authText, W - margin * 2)
  doc.text(authLines, margin, y)
  y += authLines.length * 4 + 8

  // Signature boxes
  const sigBoxW = (W - margin * 2 - 8) / 2
  const sigBoxH = 30

  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.rect(margin, y, sigBoxW, sigBoxH)
  doc.rect(W - margin - sigBoxW, y, sigBoxW, sigBoxH)

  const drawSigBox = (bx: number, role: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(50, 50, 50)
    doc.text(role, bx + 3, y + 5.5)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    const fieldLabel = lang === 'es' ? 'Firma:' : 'Signature:'
    const nameLabel = lang === 'es' ? 'Nombre:' : 'Print Name:'
    const dateLabel = lang === 'es' ? 'Fecha:' : 'Date:'
    doc.text(fieldLabel, bx + 3, y + 14)
    doc.setDrawColor(160, 160, 160)
    doc.line(bx + (lang === 'es' ? 18 : 23), y + 14, bx + sigBoxW - 3, y + 14)
    doc.text(nameLabel, bx + 3, y + 21)
    doc.line(bx + (lang === 'es' ? 23 : 27), y + 21, bx + sigBoxW - 3, y + 21)
    doc.text(dateLabel, bx + 3, y + 28)
    doc.line(bx + (lang === 'es' ? 18 : 15), y + 28, bx + sigBoxW - 3, y + 28)
  }

  const clientRole = lang === 'es' ? 'CLIENTE' : 'CLIENT'
  const contractorRole = lang === 'es' ? 'CONTRATISTA' : 'CONTRACTOR'
  drawSigBox(margin, clientRole)
  drawSigBox(W - margin - sigBoxW, contractorRole)

  y += sigBoxH + 4

  // ── Footer ────────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`${s.page} ${i} ${s.of} ${pages}`, W / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
    doc.text(company.companyName, margin, doc.internal.pageSize.getHeight() - 8)
  }

  // ── Project Photos Appendix ──────────────────────────────
  const photoUrls = estimate.photos ?? []
  if (photoUrls.length > 0) {
    const fetchDataUrl = async (url: string): Promise<string | null> => {
      try {
        const res = await fetch(url)
        const blob = await res.blob()
        return new Promise(resolve => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve(null)
          reader.readAsDataURL(blob)
        })
      } catch {
        return null
      }
    }

    const dataUrls = await Promise.all(photoUrls.map(fetchDataUrl))
    const validPhotos = dataUrls.filter(Boolean) as string[]

    if (validPhotos.length > 0) {
      doc.addPage()
      const pageH = doc.internal.pageSize.getHeight()
      let py = margin

      // Section header
      doc.setFillColor(63, 54, 203)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.rect(margin, py, W - margin * 2, 8, 'F')
      doc.text('PROJECT PHOTOS', margin + 3, py + 5.5)
      py += 12

      const cols = 2
      const gap = 4
      const cellW = (W - margin * 2 - gap * (cols - 1)) / cols
      const cellH = cellW * 0.65

      for (let i = 0; i < validPhotos.length; i++) {
        const col = i % cols
        const x = margin + col * (cellW + gap)

        if (col === 0 && i > 0) py += cellH + gap

        if (py + cellH > pageH - 20) {
          doc.addPage()
          py = margin
        }

        try {
          doc.addImage(validPhotos[i], 'JPEG', x, py, cellW, cellH, undefined, 'MEDIUM')
        } catch {
          // If format not recognised, try as PNG
          try {
            doc.addImage(validPhotos[i], 'PNG', x, py, cellW, cellH, undefined, 'MEDIUM')
          } catch {
            // Skip unrenderable image
          }
        }

        // Photo number label
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        doc.setFont('helvetica', 'normal')
        doc.text(`Photo ${i + 1}`, x, py + cellH + 3.5)
        doc.setTextColor(0, 0, 0)
      }
    }
  }

  if (options?.returnBlob) {
    return doc.output('blob')
  }
  const filename = `${estimate.type === 'invoice' ? s.invoiceShort : s.estimateShort}_${estimate.estimateNumber}_${estimate.client.name || 'Client'}.pdf`
  doc.save(filename)
}
