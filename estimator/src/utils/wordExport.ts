import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx'
import { saveAs } from 'file-saver'
import { format } from 'date-fns'
import type { Estimate, CompanySettings, CalculatedTotals } from '../types'
import { fmt } from './calculations'

const brand = { r: 63, g: 54, b: 203 }
const brandHex = '3F36CB'

const hdr = (text: string) =>
  new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: brandHex } },
  })

const row = (cells: string[], isHeader = false) =>
  new TableRow({
    tableHeader: isHeader,
    children: cells.map(
      (text, i) =>
        new TableCell({
          shading: isHeader ? { type: ShadingType.SOLID, color: brandHex, fill: brandHex } : undefined,
          children: [
            new Paragraph({
              alignment: i > 0 ? AlignmentType.RIGHT : AlignmentType.LEFT,
              children: [
                new TextRun({
                  text,
                  bold: isHeader,
                  color: isHeader ? 'FFFFFF' : '000000',
                  size: 18,
                }),
              ],
            }),
          ],
          width: { size: i === 0 ? 3600 : 1200, type: WidthType.DXA },
        })
    ),
  })

const money = (n: number) => fmt(n)

export async function generateWord(
  estimate: Estimate,
  totals: CalculatedTotals,
  company: CompanySettings,
  viewType: 'client' | 'contractor',
  _lang: 'en' | 'es' = 'en'
) {
  const title = estimate.type === 'invoice' ? 'INVOICE' : 'PROJECT ESTIMATE'
  const validDate = new Date(estimate.createdAt)
  validDate.setDate(validDate.getDate() + (estimate.settings.validityDays || 30))

  const sections: Paragraph[] = []

  // Company header
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: company.companyName || 'Contractor Estimator', bold: true, size: 36, color: brandHex })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: [company.address, company.phone, company.email].filter(Boolean).join('  |  '),
        size: 18, color: '666666',
      })],
      spacing: { after: 200 },
    })
  )

  // Title row
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 40 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 100 },
    })
  )

  // Estimate info
  sections.push(
    new Paragraph({ children: [new TextRun({ text: `${title === 'INVOICE' ? 'Invoice' : 'Estimate'} #: `, bold: true, size: 20 }), new TextRun({ text: estimate.estimateNumber, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Date: ', bold: true, size: 20 }), new TextRun({ text: format(new Date(estimate.createdAt), 'MMMM d, yyyy'), size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Valid Until: ', bold: true, size: 20 }), new TextRun({ text: format(validDate, 'MMMM d, yyyy'), size: 20 })], spacing: { after: 200 } })
  )

  // Client info
  sections.push(hdr('CLIENT INFORMATION'))
  sections.push(
    new Paragraph({ children: [new TextRun({ text: 'Client: ', bold: true, size: 20 }), new TextRun({ text: estimate.client.name || '—', size: 20 })] }),
    ...(estimate.client.company ? [new Paragraph({ children: [new TextRun({ text: estimate.client.company, size: 20 })] })] : []),
    new Paragraph({ children: [new TextRun({ text: [estimate.client.address, estimate.client.city, estimate.client.state, estimate.client.zip].filter(Boolean).join(', '), size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: estimate.client.phone || '', size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: estimate.client.email || '', size: 20 })], spacing: { after: 200 } })
  )

  // Project info
  sections.push(hdr('PROJECT DETAILS'))
  sections.push(
    new Paragraph({ children: [new TextRun({ text: 'Description: ', bold: true, size: 20 }), new TextRun({ text: estimate.projectDescription || `${estimate.projectType} — ${estimate.projectSubType}`, size: 20 })] }),
    ...(estimate.jobAddress ? [new Paragraph({ children: [new TextRun({ text: 'Job Site: ', bold: true, size: 20 }), new TextRun({ text: estimate.jobAddress, size: 20 })] })] : []),
  )

  // Materials table
  if (estimate.materials.length > 0) {
    sections.push(hdr('MATERIALS'))
    const matHeaders = viewType === 'contractor'
      ? ['Item', 'Qty', 'Unit', 'Unit Cost', 'Markup', 'Client Price', 'Total']
      : ['Item', 'Qty', 'Unit', 'Unit Price', 'Total']

    const matRows = estimate.materials.map(m => {
      const clientUnit = m.unitCost * (1 + m.markup / 100)
      return viewType === 'contractor'
        ? [m.name, m.quantity.toFixed(2), m.unit, money(m.unitCost), `${m.markup}%`, money(clientUnit), money(m.quantity * m.unitCost)]
        : [m.name, m.quantity.toFixed(2), m.unit, money(clientUnit), money(m.quantity * clientUnit)]
    })

    const matTable = new Table({
      width: { size: 9000, type: WidthType.DXA },
      rows: [row(matHeaders, true), ...matRows.map(r => row(r))],
    })
    sections.push(matTable as unknown as Paragraph)
  }

  // Labor table
  if (estimate.labor.length > 0) {
    sections.push(hdr('LABOR'))
    const laborHeaders = viewType === 'contractor'
      ? ['Description', 'Workers', 'Hours', 'Rate/Hr', 'Total']
      : ['Description', 'Total']

    const laborRows = estimate.labor.map(l =>
      viewType === 'contractor'
        ? [l.description, String(l.workers), l.hours.toFixed(1), money(l.ratePerHour), money(l.workers * l.hours * l.ratePerHour)]
        : [l.description, money(l.workers * l.hours * l.ratePerHour)]
    )

    const laborTable = new Table({
      width: { size: 9000, type: WidthType.DXA },
      rows: [row(laborHeaders, true), ...laborRows.map(r => row(r))],
    })
    sections.push(laborTable as unknown as Paragraph)
  }

  // Overhead (contractor only)
  if (viewType === 'contractor' && estimate.overhead.length > 0) {
    sections.push(hdr('OVERHEAD / EQUIPMENT'))
    const ohTable = new Table({
      width: { size: 9000, type: WidthType.DXA },
      rows: [
        row(['Description', 'Cost'], true),
        ...estimate.overhead.map(o => row([o.description, money(o.cost)])),
      ],
    })
    sections.push(ohTable as unknown as Paragraph)
  }

  // Totals
  sections.push(hdr('TOTALS'))
  if (viewType === 'contractor') {
    const totRows = [
      ['Materials (Actual Cost)', money(totals.materialsCost)],
      ['Materials w/ Markup', money(totals.materialsWithMarkup)],
      ['Labor', money(totals.laborCost)],
      ['Overhead', money(totals.overheadCost)],
      ['Total Hard Cost', money(totals.hardCost)],
      [`Conservative Quote (${totals.conservativeMargin.toFixed(0)}% margin)`, money(totals.conservativeQuote)],
      [`Standard Quote (${totals.standardMargin.toFixed(0)}% margin)`, money(totals.standardQuote)],
      [`Premium Quote (${totals.premiumMargin.toFixed(0)}% margin)`, money(totals.premiumQuote)],
    ]
    totRows.forEach(([k, v]) =>
      sections.push(new Paragraph({ children: [new TextRun({ text: `${k}: `, bold: true, size: 20 }), new TextRun({ text: v, size: 20 })] }))
    )
  }
  sections.push(
    new Paragraph({
      spacing: { before: 120 },
      children: [
        new TextRun({ text: `${title === 'INVOICE' ? 'AMOUNT DUE' : 'TOTAL QUOTE'}: `, bold: true, size: 26, color: brandHex }),
        new TextRun({ text: money(totals.selectedQuote + totals.taxAmount), bold: true, size: 26 }),
      ],
    })
  )

  // Scope of Work
  if (estimate.scopeOfWork) {
    sections.push(hdr('SCOPE OF WORK'))
    sections.push(new Paragraph({ text: estimate.scopeOfWork, spacing: { after: 200 } }))
  }

  if (estimate.exclusions) {
    sections.push(hdr('EXCLUSIONS'))
    sections.push(new Paragraph({ text: estimate.exclusions, spacing: { after: 200 } }))
  }

  // Terms
  sections.push(hdr('TERMS & CONDITIONS'))
  sections.push(
    new Paragraph({ children: [new TextRun({ text: 'Payment Terms: ', bold: true, size: 20 }), new TextRun({ text: estimate.settings.paymentTerms, size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Warranty: ', bold: true, size: 20 }), new TextRun({ text: estimate.settings.warranty, size: 20 })], spacing: { after: 400 } })
  )

  // Signatures
  sections.push(hdr('ACCEPTANCE'))
  sections.push(
    new Paragraph({ text: 'By signing below, client agrees to the terms and conditions of this estimate.', spacing: { after: 400 } }),
    new Paragraph({ text: 'Client Signature: ________________________________    Date: _______________', spacing: { after: 200 } }),
    new Paragraph({ text: 'Contractor Signature: ____________________________    Date: _______________' })
  )

  const doc = new Document({
    sections: [{
      properties: {},
      children: sections as Paragraph[],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const filename = `${title === 'INVOICE' ? 'Invoice' : 'Estimate'}_${estimate.estimateNumber}_${estimate.client.name || 'Client'}.docx`
  saveAs(blob, filename)
}
