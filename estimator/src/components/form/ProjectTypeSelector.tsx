import { useState } from 'react'
import type { ProjectTypeConfig } from '../../types'
import { useLanguage } from '../../context/LanguageContext'
import { findBestSubType } from '../../utils/subtypeMatcher'
import { Search } from 'lucide-react'

interface Props {
  projectTypes: ProjectTypeConfig[]
  projectType: string
  projectSubType: string
  projectDescription: string
  jobAddress: string
  locationZip: string
  locationLabel: string
  materialMult: number
  laborMult: number
  onTypeChange: (id: string) => void
  onSubTypeChange: (id: string) => void
  onDescriptionChange: (v: string) => void
  onJobAddressChange: (v: string) => void
  onLocationZipChange: (v: string) => void
}

export default function ProjectTypeSelector({
  projectTypes, projectType, projectSubType, projectDescription, jobAddress,
  locationZip, locationLabel, materialMult, laborMult,
  onTypeChange, onSubTypeChange, onDescriptionChange, onJobAddressChange, onLocationZipChange,
}: Props) {
  const { t } = useLanguage()
  const selected = projectTypes.find(pt => pt.id === projectType)

  const [customText, setCustomText] = useState('')
  const [matchResult, setMatchResult] = useState<'matched' | 'none' | null>(null)
  const [matchedLabel, setMatchedLabel] = useState('')

  const handleCustomSearch = () => {
    const match = findBestSubType(projectType, customText)
    if (match) {
      const type = projectTypes.find(pt => pt.id === projectType)
      const sub = type?.subTypes.find(st => st.id === match.id)
      setMatchedLabel(sub?.label ?? match.id)
      setMatchResult('matched')
      onSubTypeChange(match.id)
    } else {
      setMatchResult('none')
    }
  }

  const showCustomInput = selected && (projectSubType === 'other-custom' || !projectSubType)

  return (
    <div className="space-y-3">
      <div>
        <label className="form-label">{t('proj.typeLabel')}</label>
        <select className="form-input" value={projectType} onChange={e => onTypeChange(e.target.value)}>
          <option value="">{t('proj.typeSelect')}</option>
          {projectTypes.map(pt => (
            <option key={pt.id} value={pt.id}>{pt.icon} {t(`proj.type.${pt.id}`)}</option>
          ))}
        </select>
      </div>

      {selected && (
        <div>
          <label className="form-label">{t('proj.subTypeLabel')}</label>
          <select
            className="form-input"
            value={projectSubType}
            onChange={e => {
              onSubTypeChange(e.target.value)
              setMatchResult(null)
            }}
          >
            <option value="">{t('proj.subTypeSelect')}</option>
            {selected.subTypes.map(st => (
              <option key={st.id} value={st.id}>{t(`proj.sub.${st.id}`)}</option>
            ))}
            <option value="other-custom">✏️ {t('proj.customOption')}</option>
          </select>
        </div>
      )}

      {showCustomInput && (
        <div>
          <label className="form-label">{t('proj.customLabel')}</label>
          <div className="flex gap-2">
            <input
              className="form-input flex-1"
              value={customText}
              onChange={e => { setCustomText(e.target.value); setMatchResult(null) }}
              onKeyDown={e => e.key === 'Enter' && handleCustomSearch()}
              placeholder={t('proj.customPlaceholder')}
            />
            <button
              type="button"
              onClick={handleCustomSearch}
              disabled={!customText.trim() || !projectType}
              className="px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold flex items-center gap-1 transition"
            >
              <Search className="w-4 h-4" />
              {t('proj.customFind')}
            </button>
          </div>
          {matchResult === 'matched' && (
            <p className="mt-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
              ✓ {t('proj.customMatched', { label: matchedLabel })}
            </p>
          )}
          {matchResult === 'none' && (
            <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              {t('proj.customNoMatch')}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="form-label">{t('proj.descLabel')}</label>
        <input
          className="form-input"
          value={projectDescription}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder={t('proj.descPlaceholder')}
        />
      </div>

      <div>
        <label className="form-label">{t('proj.jobAddress')}</label>
        <input
          className="form-input"
          value={jobAddress}
          onChange={e => onJobAddressChange(e.target.value)}
          placeholder={t('proj.jobAddressPlaceholder')}
        />
      </div>

      <div>
        <label className="form-label">
          {t('proj.zipLabel')} <span className="text-gray-400 text-xs">{t('proj.zipHint')}</span>
        </label>
        <div className="flex gap-2 items-center">
          <input
            className="form-input w-32"
            value={locationZip}
            onChange={e => onLocationZipChange(e.target.value)}
            placeholder={t('proj.zipPlaceholder')}
            maxLength={5}
          />
          {locationLabel && locationLabel !== 'National Average' && (
            <span className="flex-1 text-xs bg-brand-50 text-brand-700 border border-brand-100 rounded-lg px-2 py-1 font-medium">
              {t('proj.locationFactor', { label: locationLabel, mat: materialMult.toFixed(2), lab: laborMult.toFixed(2) })}
            </span>
          )}
          {locationLabel === 'National Average' && locationZip.length === 5 && (
            <span className="flex-1 text-xs bg-gray-50 text-gray-500 border border-gray-100 rounded-lg px-2 py-1">
              {t('proj.nationalAvg')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
