import type { CompanySettings } from '../types'
import { useLanguage } from '../context/LanguageContext'

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
  onStatusChange: (status: string) => void
  onChangeOrders?: () => void
  onPayment?: () => void
}

const statusColors: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

export default function Header({ company, estimateNumber, estimateType, status, onSettings, onSavedEstimates, onNew, onSave, onConvertInvoice, onStatusChange, onChangeOrders, onPayment }: Props) {
  const { t } = useLanguage()

  return (
    <header className="bg-brand-700 text-white shadow-lg no-print z-10 relative">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center text-lg font-bold">
            📋
          </div>
          <div>
            <div className="font-bold text-base leading-tight">{company.companyName}</div>
            <div className="text-brand-200 text-xs">{t('header.contractorEstimator')}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <span className="text-brand-200 text-xs">
              {estimateType === 'invoice' ? t('header.invoice') : t('header.estimate')}:
            </span>
            <span className="font-mono font-semibold text-sm">{estimateNumber}</span>
            <select
              value={status}
              onChange={e => onStatusChange(e.target.value)}
              className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer border-0 outline-none ${statusColors[status] ?? statusColors.draft}`}
              title="Change estimate status"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          <button onClick={onSave} className="hidden sm:flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            {t('header.save')}
          </button>
          <button onClick={onNew} className="hidden sm:flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            {t('header.new')}
          </button>
          {onChangeOrders && (
            <button onClick={onChangeOrders} className="hidden sm:flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" title="Change Orders for this estimate">
              🔄 COs
            </button>
          )}
          {onPayment && (
            <button onClick={onPayment} className="hidden sm:flex items-center gap-1 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              💰 {t('header.payment')}
            </button>
          )}
          {estimateType === 'estimate' && (
            <button onClick={onConvertInvoice} className="hidden md:flex items-center gap-1 bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              {t('header.toInvoice')}
            </button>
          )}
          <button onClick={onSavedEstimates} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            {t('header.saved')}
          </button>
          <button onClick={onSettings} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            ⚙️
          </button>
        </div>
      </div>
    </header>
  )
}
