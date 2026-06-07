import { useLanguage } from '../../context/LanguageContext'

interface Props {
  onPDF: () => void
  onWord: () => void
  onPrint: () => void
  onSave: () => void
  estimateType: 'estimate' | 'invoice'
  activeView: 'contractor' | 'client'
}

export default function ExportBar({ onPDF, onWord, onPrint, onSave, estimateType, activeView }: Props) {
  const { t } = useLanguage()
  const label = estimateType === 'invoice' ? t('export.invoice') : t('export.quote')
  const viewLabel = activeView === 'client' ? t('export.client') : t('export.contractor')

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
      <button onClick={onSave} className="btn-secondary text-xs ml-auto">
        {t('export.saveDraft')}
      </button>
    </div>
  )
}
