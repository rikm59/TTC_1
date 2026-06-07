import { format, addDays } from 'date-fns'
import type { Estimate, CalculatedTotals, CompanySettings } from '../../types'
import { fmt } from '../../utils/calculations'
import { getTierConfig } from '../../data/contractorTiers'

interface Props {
  estimate: Estimate
  totals: CalculatedTotals
  company: CompanySettings
}

export default function ClientQuote({ estimate, totals, company }: Props) {
  const { client, settings } = estimate
  const validUntil = addDays(new Date(estimate.createdAt), settings.validityDays)

  const tierConfig = getTierConfig(settings.contractorTier ?? 'contractor')
  const isLaborOnly = (settings.contractorTier ?? 'contractor') === 'labor-only'

  const clientMaterials = estimate.materials.map(m => ({
    ...m,
    clientUnitPrice: m.unitCost * (1 + m.markup / 100),
    clientTotal: m.quantity * m.unitCost * (1 + m.markup / 100),
  }))
  const materialClientTotal = clientMaterials.reduce((s, m) => s + m.clientTotal, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-sm print-area">
      {/* Header */}
      <div className="bg-brand-700 text-white px-6 py-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">{company.companyName || 'Your Company'}</h1>
            <p className="text-brand-200 text-xs mt-0.5">
              {[company.address, company.city, company.state].filter(Boolean).join(', ')}
            </p>
            <p className="text-brand-200 text-xs">
              {[company.phone, company.email].filter(Boolean).join('  ·  ')}
            </p>
            {company.license && <p className="text-brand-200 text-xs">Lic #{company.license}</p>}
          </div>
          <div className="text-right">
            <div className="text-brand-100 text-xs uppercase tracking-widest">
              {estimate.type === 'invoice' ? 'Invoice' : 'Estimate'}
            </div>
            <div className="font-mono font-bold text-lg">{estimate.estimateNumber}</div>
            <div className="text-brand-200 text-xs">
              Date: {settings.estimateDate
                ? format(new Date(settings.estimateDate + 'T12:00:00'), 'MMM d, yyyy')
                : format(new Date(estimate.createdAt), 'MMM d, yyyy')}
            </div>
            <div className="text-brand-200 text-xs">Valid Until: {format(validUntil, 'MMM d, yyyy')}</div>
          </div>
        </div>
      </div>

      {/* Client + Project */}
      <div className="grid grid-cols-2 gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
          <p className="font-semibold">{client.name || '—'}</p>
          {client.company && <p className="text-gray-600 text-xs">{client.company}</p>}
          <p className="text-gray-600 text-xs">{[client.address, client.city, client.state, client.zip].filter(Boolean).join(', ')}</p>
          {client.phone && <p className="text-gray-600 text-xs">{client.phone}</p>}
          {client.email && <p className="text-gray-600 text-xs">{client.email}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Project</p>
          <p className="font-semibold">{estimate.projectDescription || `${estimate.projectType} — ${estimate.projectSubType}`}</p>
          {estimate.jobAddress && <p className="text-gray-600 text-xs">📍 {estimate.jobAddress}</p>}
          {estimate.measurements.filter(m => m.value > 0).map(m => (
            <p key={m.id} className="text-gray-600 text-xs">{m.label}: <strong>{m.value} {m.unit}</strong></p>
          ))}
          {settings.projectStartDate && (
            <p className="text-gray-600 text-xs mt-1">
              🗓 Start: <strong>{format(new Date(settings.projectStartDate + 'T12:00:00'), 'MMM d, yyyy')}</strong>
            </p>
          )}
          {settings.projectEndDate && (
            <p className="text-gray-600 text-xs">
              🏁 Completion: <strong>{format(new Date(settings.projectEndDate + 'T12:00:00'), 'MMM d, yyyy')}</strong>
            </p>
          )}
          {settings.projectStartDate && settings.projectEndDate && (() => {
            const days = Math.max(0, Math.round(
              (new Date(settings.projectEndDate).getTime() - new Date(settings.projectStartDate).getTime()) / 86400000
            ))
            const weeks = Math.floor(days / 7)
            const rem   = days % 7
            const label = weeks > 0
              ? `${weeks} wk${weeks > 1 ? 's' : ''}${rem > 0 ? ` ${rem}d` : ''}`
              : `${days} day${days !== 1 ? 's' : ''}`
            return <p className="text-gray-500 text-xs">⏱ Duration: <strong>{label}</strong></p>
          })()}
          {tierConfig.clientQuoteNote && (
            <p className="text-gray-500 text-xs mt-1 italic">{tierConfig.clientQuoteNote}</p>
          )}
        </div>
      </div>

      {/* Materials — hidden for Labor Only, show note instead */}
      {isLaborOnly ? (
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-100">
            <span className="text-xs text-green-700 font-medium">
              👷 Materials supplied by client/GC — not included in this quote.
            </span>
          </div>
        </div>
      ) : (
        clientMaterials.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">Materials</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 text-gray-500 font-medium">Item</th>
                  <th className="text-right pb-2 text-gray-500 font-medium w-16">Qty</th>
                  <th className="text-left pb-2 text-gray-500 font-medium w-12">Unit</th>
                  <th className="text-right pb-2 text-gray-500 font-medium w-20">Price</th>
                  <th className="text-right pb-2 text-gray-500 font-medium w-20">Total</th>
                </tr>
              </thead>
              <tbody>
                {clientMaterials.map(m => (
                  <tr key={m.id} className="border-b border-gray-50">
                    <td className="py-1.5">{m.name}</td>
                    <td className="py-1.5 text-right">{m.quantity.toFixed(2)}</td>
                    <td className="py-1.5 text-left pl-1 text-gray-500">{m.unit}</td>
                    <td className="py-1.5 text-right">{fmt(m.clientUnitPrice)}</td>
                    <td className="py-1.5 text-right font-medium">{fmt(m.clientTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="pt-2 text-right text-gray-500">Materials Subtotal:</td>
                  <td className="pt-2 text-right font-semibold">{fmt(materialClientTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      )}

      {/* Labor */}
      {estimate.labor.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-3">Labor</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 text-gray-500 font-medium">Description</th>
                <th className="text-right pb-2 text-gray-500 font-medium w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {estimate.labor.map(l => (
                <tr key={l.id} className="border-b border-gray-50">
                  <td className="py-1.5">{l.description}</td>
                  <td className="py-1.5 text-right font-medium">{fmt(l.workers * l.hours * l.ratePerHour)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-2 text-right text-gray-500">Labor Subtotal:</td>
                <td className="pt-2 text-right font-semibold">{fmt(totals.laborCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Total */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex justify-end">
          <div className="w-56 space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal:</span>
              <span>{fmt(totals.selectedQuote)}</span>
            </div>
            {settings.includeTax && totals.taxAmount > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tax ({settings.taxRate}%):</span>
                <span>{fmt(totals.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-base">
              <span>{estimate.type === 'invoice' ? 'Amount Due:' : 'Total:'}</span>
              <span className="text-brand-700">{fmt(totals.selectedQuote + totals.taxAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scope */}
      {estimate.scopeOfWork && (
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">Scope of Work</h3>
          <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{estimate.scopeOfWork}</p>
        </div>
      )}

      {estimate.exclusions && (
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">Exclusions</h3>
          <p className="text-xs text-gray-700 whitespace-pre-line">{estimate.exclusions}</p>
        </div>
      )}

      {/* Terms */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-semibold text-gray-600">Payment Terms: </span>
            <span className="text-gray-600">{settings.paymentTerms}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-600">Warranty: </span>
            <span className="text-gray-600">{settings.warranty}</span>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="px-6 py-5 grid grid-cols-2 gap-8">
        <div>
          <div className="border-b border-gray-400 mb-1 h-8" />
          <p className="text-xs text-gray-500">Client Signature / Date</p>
        </div>
        <div>
          <div className="border-b border-gray-400 mb-1 h-8" />
          <p className="text-xs text-gray-500">Contractor Signature / Date</p>
        </div>
      </div>
    </div>
  )
}
