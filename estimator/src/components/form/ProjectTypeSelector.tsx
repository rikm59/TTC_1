import type { ProjectTypeConfig } from '../../types'

interface Props {
  projectTypes: ProjectTypeConfig[]
  projectType: string
  projectSubType: string
  projectDescription: string
  jobAddress: string
  onTypeChange: (id: string) => void
  onSubTypeChange: (id: string) => void
  onDescriptionChange: (v: string) => void
  onJobAddressChange: (v: string) => void
}

export default function ProjectTypeSelector({
  projectTypes, projectType, projectSubType, projectDescription, jobAddress,
  onTypeChange, onSubTypeChange, onDescriptionChange, onJobAddressChange,
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
    </div>
  )
}
