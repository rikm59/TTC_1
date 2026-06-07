import type { ProjectTypeConfig } from '../../types'

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
  const selected = projectTypes.find(pt => pt.id === projectType)

  return (
    <div className="space-y-3">
      <div>
        <label className="form-label">Project Type *</label>
        <select className="form-input" value={projectType} onChange={e => onTypeChange(e.target.value)}>
          <option value="">— Select Project Type —</option>
          {projectTypes.map(pt => (
            <option key={pt.id} value={pt.id}>{pt.icon} {pt.label}</option>
          ))}
        </select>
      </div>

      {selected && (
        <div>
          <label className="form-label">Project Sub-Type *</label>
          <select className="form-input" value={projectSubType} onChange={e => onSubTypeChange(e.target.value)}>
            <option value="">— Select Sub-Type —</option>
            {selected.subTypes.map(st => (
              <option key={st.id} value={st.id}>{st.label}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="form-label">Project Description</label>
        <input
          className="form-input"
          value={projectDescription}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder="e.g. Polyurea epoxy coating for 3-car garage"
        />
      </div>

      <div>
        <label className="form-label">Job Site Address (if different from client)</label>
        <input
          className="form-input"
          value={jobAddress}
          onChange={e => onJobAddressChange(e.target.value)}
          placeholder="456 Work Site Ave, Austin TX"
        />
      </div>

      <div>
        <label className="form-label">
          Job Site Zip Code <span className="text-gray-400 text-xs">(for regional pricing)</span>
        </label>
        <div className="flex gap-2 items-center">
          <input
            className="form-input w-32"
            value={locationZip}
            onChange={e => onLocationZipChange(e.target.value)}
            placeholder="e.g. 78701"
            maxLength={5}
          />
          {locationLabel && locationLabel !== 'National Average' && (
            <span className="flex-1 text-xs bg-brand-50 text-brand-700 border border-brand-100 rounded-lg px-2 py-1 font-medium">
              📍 {locationLabel} · Mat ×{materialMult.toFixed(2)} · Labor ×{laborMult.toFixed(2)}
            </span>
          )}
          {locationLabel === 'National Average' && locationZip.length === 5 && (
            <span className="flex-1 text-xs bg-gray-50 text-gray-500 border border-gray-100 rounded-lg px-2 py-1">
              📍 National Average (no adjustment)
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
