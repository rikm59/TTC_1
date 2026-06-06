import type { Measurement } from '../../types'

interface Props {
  measurements: Measurement[]
  onChange: (id: string, value: number) => void
}

export default function MeasurementsForm({ measurements, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {measurements.map(m => (
        <div key={m.id}>
          <label className="form-label">{m.label}</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              step="any"
              className="form-input"
              value={m.value || ''}
              onChange={e => onChange(m.id, parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <span className="text-xs text-gray-500 whitespace-nowrap">{m.unit}</span>
          </div>
        </div>
      ))}
      {measurements.length === 0 && (
        <p className="col-span-full text-xs text-gray-400 italic">Select a project sub-type to see measurement fields.</p>
      )}
    </div>
  )
}
