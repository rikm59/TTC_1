import { useLanguage } from '../../context/LanguageContext'
import { Globe, X } from 'lucide-react'

interface Props {
  onConfirm: (lang: 'en' | 'es') => void
  onClose: () => void
}

export default function EstimateLangModal({ onConfirm, onClose }: Props) {
  const { t } = useLanguage()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
            <Globe className="w-5 h-5 text-brand-600" />
          </div>
          <h2 className="text-base font-bold text-gray-900">{t('estimate.langPrompt.title')}</h2>
        </div>

        <p className="text-sm text-gray-600 mb-5">{t('estimate.langPrompt.question')}</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onConfirm('en')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition text-left"
          >
            <span className="text-xl">🇺🇸</span>
            <span className="font-semibold text-sm text-gray-800">{t('estimate.langPrompt.english')}</span>
          </button>
          <button
            onClick={() => onConfirm('es')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition text-left"
          >
            <span className="text-xl">🇲🇽</span>
            <span className="font-semibold text-sm text-gray-800">{t('estimate.langPrompt.spanish')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
