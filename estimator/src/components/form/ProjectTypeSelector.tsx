import type { ProjectTypeConfig } from '../../types'
import { useLanguage } from '../../context/LanguageContext'

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
          <select className="form-input" value={projectSubType} onChange={e => onSubTypeChange(e.target.value)}>
            <option value="">{t('proj.subTypeSelect')}</option>
            {selected.subTypes.map(st => (
              <option key={st.id} value={st.id}>{t(`proj.sub.${st.id}`)}</option>
            ))}
          </select>
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
