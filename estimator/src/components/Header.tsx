import type { CompanySettings } from '../types'

interface Props {
  company: CompanySettings
  estimateNumber: string
  estimateType: 'estimate' | 'invoice'
  status: string
  onSettings: () => void
  onSavedEstimates: () => void
  onNew: () => void
  onSave: () => void
  onConvertInvoice: () => void
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

export default function Header({ company, estimateNumber, estimateType, status, onSettings, onSavedEstimates, onNew, onSave, onConvertInvoice }: Props) {
  return (
    <header className="bg-brand-700 text-white shadow-lg no-print z-10 relative">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center text-lg font-bold">
            📋
          </div>
          <div>
            <div className="font-bold text-base leading-tight">{company.companyName}</div>
            <div className="text-brand-200 text-xs">Contractor Estimator</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <span className="text-brand-200 text-xs">{estimateType === 'invoice' ? 'Invoice' : 'Estimate'}:</span>
            <span className="font-mono font-semibold text-sm">{estimateNumber}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[status]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>

          <button onClick={onSave} className="hidden sm:flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            💾 Save
          </button>
          <button onClick={onNew} className="hidden sm:flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            + New
          </button>
          {estimateType === 'estimate' && (
            <button onClick={onConvertInvoice} className="hidden md:flex items-center gap-1 bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              → Invoice
            </button>
          )}
          <button onClick={onSavedEstimates} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            📁 Saved
          </button>
          <button onClick={onSettings} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            ⚙️
          </button>
        </div>
      </div>
    </header>
  )
}
