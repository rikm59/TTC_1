import { useLanguage } from '../../context/LanguageContext'

interface Props {
  scopeOfWork: string
  exclusions: string
  internalNotes: string
  onScopeChange: (v: string) => void
  onExclusionsChange: (v: string) => void
  onNotesChange: (v: string) => void
}

export default function ScopeNotes({ scopeOfWork, exclusions, internalNotes, onScopeChange, onExclusionsChange, onNotesChange }: Props) {
  const { t } = useLanguage()
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
