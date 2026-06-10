import { useLanguage } from '../../context/LanguageContext'

type EmailStatus = 'idle' | 'sending' | 'sent' | 'error'

interface Props {
  onPDF: () => void
  onWord: () => void
  onPrint: () => void
  onSave: () => void
  onEmail?: () => void
  emailStatus?: EmailStatus
  hasClientEmail?: boolean
  estimateType: 'estimate' | 'invoice'
  activeView: 'contractor' | 'client'
  onCopySummary?: () => void
  copySummaryStatus?: 'idle' | 'copied'
}

export default function ExportBar({
  onPDF, onWord, onPrint, onSave, onEmail, emailStatus = 'idle',
  hasClientEmail, estimateType, activeView, onCopySummary, copySummaryStatus = 'idle',
}: Props) {
  const { t } = useLanguage()
  const label = estimateType === 'invoice' ? t('export.invoice') : t('export.quote')
  const viewLabel = activeView === 'client' ? t('export.client') : t('export.contractor')

  const emailLabel =
    emailStatus === 'sending' ? t('export.emailSending') :
    emailStatus === 'sent'    ? t('export.emailSent') :
    emailStatus === 'error'   ? t('export.emailError') :
    t('export.email')

  const emailColor =
    emailStatus === 'sent'  ? 'btn-secondary text-xs !text-green-700 !border-green-300' :
    emailStatus === 'error' ? 'btn-secondary text-xs !text-red-600 !border-red-300' :
    'btn-secondary text-xs'

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400 mr-1">{t('export.label', { view: viewLabel })}</span>
      <button onClick={onPDF} className="btn-primary text-xs">
        {t('export.pdf', { label })}
      </button>
      <button onClick={onWord} className="btn-secondary text-xs">
        {t('export.word')}
      </button>
      <button onClick={onPrint} className="btn-secondary text-xs">
        {t('export.print')}
      </button>
      {onEmail && (
        <button
          onClick={onEmail}
          disabled={emailStatus === 'sending' || !hasClientEmail}
          title={!hasClientEmail ? t('export.emailNoAddress') : undefined}
          className={`${emailColor} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {emailLabel}
        </button>
      )}
      {onCopySummary && (
        <button
          onClick={onCopySummary}
          className={`btn-secondary text-xs transition-colors ${copySummaryStatus === 'copied' ? '!text-green-700 !border-green-300' : ''}`}
          title="Copy a text summary to clipboard for sharing via WhatsApp or SMS"
        >
          {copySummaryStatus === 'copied' ? '✓ Copied!' : '📋 Copy'}
        </button>
      )}
      <button onClick={onSave} className="btn-secondary text-xs ml-auto">
        {t('export.saveDraft')}
      </button>
    </div>
  )
}
