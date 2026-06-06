interface Props {
  scopeOfWork: string
  exclusions: string
  internalNotes: string
  onScopeChange: (v: string) => void
  onExclusionsChange: (v: string) => void
  onNotesChange: (v: string) => void
}

export default function ScopeNotes({ scopeOfWork, exclusions, internalNotes, onScopeChange, onExclusionsChange, onNotesChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="form-label">Scope of Work (shown on quote)</label>
        <textarea
          className="form-input h-24 resize-none"
          value={scopeOfWork}
          onChange={e => onScopeChange(e.target.value)}
          placeholder="Describe the full scope of work, materials to be used, process, timeline..."
        />
      </div>
      <div>
        <label className="form-label">Exclusions (shown on quote)</label>
        <textarea
          className="form-input h-16 resize-none"
          value={exclusions}
          onChange={e => onExclusionsChange(e.target.value)}
          placeholder="List what is NOT included: electrical, permits, structural repairs, pre-existing damage..."
        />
      </div>
      <div>
        <label className="form-label">Internal Notes (contractor only, not on quote)</label>
        <textarea
          className="form-input h-16 resize-none"
          value={internalNotes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="Internal reminders, job notes, follow-up items..."
        />
      </div>
    </div>
  )
}
