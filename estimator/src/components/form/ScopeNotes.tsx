import { useLanguage } from '../../context/LanguageContext'

interface Props {
  scopeOfWork: string
  exclusions: string
  internalNotes: string
  onScopeChange: (v: string) => void
  onExclusionsChange: (v: string) => void
  onNotesChange: (v: string) => void
}

const COMMON_EXCLUSIONS_EN = [
  'Permits & fees',
  'Interior painting',
  'Electrical work',
  'Plumbing',
  'Structural changes',
  'Haul-away / disposal',
  'Landscaping',
  'Furniture removal',
  'HVAC work',
  'Pre-existing damage',
]

const COMMON_EXCLUSIONS_ES = [
  'Permisos y tarifas',
  'Pintura interior',
  'Trabajo eléctrico',
  'Plomería',
  'Cambios estructurales',
  'Acarreo / disposición',
  'Paisajismo',
  'Remoción de muebles',
  'Trabajo de HVAC',
  'Daños preexistentes',
]

export default function ScopeNotes({ scopeOfWork, exclusions, internalNotes, onScopeChange, onExclusionsChange, onNotesChange }: Props) {
  const { t, lang } = useLanguage()
  const chips = lang === 'es' ? COMMON_EXCLUSIONS_ES : COMMON_EXCLUSIONS_EN

  const appendExclusion = (item: string) => {
    const current = exclusions.trim()
    if (current.toLowerCase().includes(item.toLowerCase())) return
    onExclusionsChange(current ? `${current}\n• ${item}` : `• ${item}`)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="form-label">{t('scope.title')}</label>
        <textarea
          className="form-input h-24 resize-none"
          value={scopeOfWork}
          onChange={e => onScopeChange(e.target.value)}
          placeholder={t('scope.placeholder')}
        />
      </div>

      <div>
        <label className="form-label">{t('scope.exclusions')}</label>
        <textarea
          className="form-input h-16 resize-none"
          value={exclusions}
          onChange={e => onExclusionsChange(e.target.value)}
          placeholder={t('scope.exclusionsPlaceholder')}
        />
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <span className="text-[10px] text-gray-400 self-center mr-0.5">{t('scope.quickAdd')}:</span>
          {chips.map(chip => {
            const already = exclusions.toLowerCase().includes(chip.toLowerCase())
            return (
              <button
                key={chip}
                type="button"
                onClick={() => appendExclusion(chip)}
                disabled={already}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  already
                    ? 'border-gray-200 text-gray-300 cursor-default'
                    : 'border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50'
                }`}
              >
                {chip}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="form-label">{t('scope.internal')}</label>
        <textarea
          className="form-input h-16 resize-none"
          value={internalNotes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder={t('scope.internalPlaceholder')}
        />
      </div>
    </div>
  )
}
