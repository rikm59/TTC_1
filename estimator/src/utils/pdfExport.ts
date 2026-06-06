import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type { Estimate, CompanySettings, CalculatedTotals } from '../types'
import { fmt } from './calculations'

export function generatePDF(
  estimate: Estimate,
  totals: CalculatedTotals,
  company: CompanySettings,
  viewType: 'client' | 'contractor'
) {
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
  const title = estimate.type === 'invoice' ? 'INVOICE' : 'PROJECT ESTIMATE'
  doc.text(title, margin, y)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const rightX = W - margin
  doc.text(`${estimate.type === 'invoice' ? 'Invoice' : 'Estimate'} #: ${estimate.estimateNumber}`, rightX, y - 5, { align: 'right' })
  doc.text(`Date: ${format(new Date(estimate.createdAt), 'MMMM d, yyyy')}`, rightX, y, { align: 'right' })
  const validDate = new Date(estimate.createdAt)
  validDate.setDate(validDate.getDate() + (estimate.settings.validityDays || 30))
  doc.text(`Valid Until: ${format(validDate, 'MMMM d, yyyy')}`, rightX, y + 5, { align: 'right' })

  y += 14

  // ── Client + Company Info ─────────────────────────────────
  doc.setFillColor(247, 248, 250)
  doc.rect(margin, y, (W - margin * 2) / 2 - 4, 32, 'F')
  doc.rect(W / 2 + 2, y, (W - margin * 2) / 2 - 4, 32, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO:', margin + 4, y + 7)
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
  doc.text('FROM:', cx, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.text(company.companyName || '—', cx, y + 13)
  doc.text([company.address, company.city, company.state].filter(Boolean).join(', '), cx, y + 18, { maxWidth: (W - margin * 2) / 2 - 8 })
  doc.text(company.phone || '', cx, y + 23)
  doc.text(company.email || '', cx, y + 28)

  y += 40

  // ── Project Info ──────────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PROJECT:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(estimate.projectDescription || `${estimate.projectType} — ${estimate.projectSubType}`, margin + 20, y)
  if (estimate.jobAddress) {
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text('JOB SITE:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(estimate.jobAddress, margin + 20, y)
  }
  y += 10

  // ── Materials Table ───────────────────────────────────────
  if (estimate.materials.length > 0) {
    checkSpace(20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('MATERIALS', margin, y)
    y += 4

    const matColumns = viewType === 'contractor'
      ? [
          { header: 'Item', dataKey: 'name' },
          { header: 'Qty', dataKey: 'qty' },
          { header: 'Unit', dataKey: 'unit' },
          { header: 'Unit Cost', dataKey: 'unitCost' },
          { header: 'Markup', dataKey: 'markup' },
          { header: 'Client Price', dataKey: 'clientPrice' },
          { header: 'Total', dataKey: 'total' },
        ]
      : [
          { header: 'Item', dataKey: 'name' },
          { header: 'Qty', dataKey: 'qty' },
          { header: 'Unit', dataKey: 'unit' },
          { header: 'Unit Price', dataKey: 'clientPrice' },
          { header: 'Total', dataKey: 'total' },
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
    doc.text('LABOR', margin, y)
    y += 4

    const laborColumns = viewType === 'contractor'
      ? [
          { header: 'Description', dataKey: 'desc' },
          { header: 'Workers', dataKey: 'workers' },
          { header: 'Hours', dataKey: 'hours' },
          { header: 'Rate/Hr', dataKey: 'rate' },
          { header: 'Total', dataKey: 'total' },
        ]
      : [
          { header: 'Description', dataKey: 'desc' },
          { header: 'Total', dataKey: 'total' },
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
    doc.text('OVERHEAD / EQUIPMENT', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      columns: [
        { header: 'Description', dataKey: 'desc' },
        { header: 'Cost', dataKey: 'cost' },
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
    writeRow('Materials Cost:', fmt(totals.materialsCost))
    writeRow('Materials w/ Markup:', fmt(totals.materialsWithMarkup))
    writeRow('Labor:', fmt(totals.laborCost))
    writeRow('Overhead:', fmt(totals.overheadCost))
    writeRow('Total Hard Cost:', fmt(totals.hardCost), true)
    y += 2
    doc.setDrawColor(63, 54, 203)
    doc.line(totX, y, totX + 80, y)
    y += 4
    writeRow(`Conservative (${totals.conservativeMargin.toFixed(0)}% margin):`, fmt(totals.conservativeQuote))
    writeRow(`Standard (${totals.standardMargin.toFixed(0)}% margin):`, fmt(totals.standardQuote))
    writeRow(`Premium (${totals.premiumMargin.toFixed(0)}% margin):`, fmt(totals.premiumQuote))
    y += 2
  }

  doc.setFillColor(63, 54, 203)
  doc.rect(totX, y, 80, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  const finalLabel = estimate.type === 'invoice' ? 'AMOUNT DUE:' : 'TOTAL QUOTE:'
  doc.text(finalLabel, totX + 4, y + 8)
  doc.text(fmt(totals.selectedQuote + totals.taxAmount), totX + 79, y + 8, { align: 'right' })
  y += 18

  // ── Scope of Work ────────────────────────────────────────
  if (estimate.scopeOfWork) {
    checkSpace(20)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('SCOPE OF WORK', margin, y)
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
    doc.text('EXCLUSIONS', margin, y)
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
  doc.text('PAYMENT TERMS:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(estimate.settings.paymentTerms || '50% deposit required to schedule. Balance due upon completion.', margin + 38, y)
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text('WARRANTY:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(estimate.settings.warranty || '1-year warranty on all labor. Manufacturer warranty on materials.', margin + 22, y)
  y += 14

  // ── Signature ────────────────────────────────────────────
  checkSpace(30)
  doc.setDrawColor(180, 180, 180)
  const sigW = (W - margin * 2 - 20) / 2
  doc.line(margin, y + 15, margin + sigW, y + 15)
  doc.line(W - margin - sigW, y + 15, W - margin, y + 15)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Client Signature / Date', margin, y + 20)
  doc.text('Contractor Signature / Date', W - margin - sigW, y + 20)

  // ── Footer ────────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Page ${i} of ${pages}`, W / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
    doc.text(company.companyName, margin, doc.internal.pageSize.getHeight() - 8)
  }

  const filename = `${estimate.type === 'invoice' ? 'Invoice' : 'Estimate'}_${estimate.estimateNumber}_${estimate.client.name || 'Client'}.pdf`
  doc.save(filename)
}
