import type { LaborItem } from '../../types'
import { fmt } from '../../utils/calculations'

interface Props {
  labor: LaborItem[]
  onAdd: () => void
  onUpdate: (id: string, field: string, value: string | number) => void
  onRemove: (id: string) => void
}

export default function LaborTable({ labor, onAdd, onUpdate, onRemove }: Props) {
  const total = labor.reduce((s, l) => s + l.workers * l.hours * l.ratePerHour, 0)

  return (
    <div className="space-y-2">
      {labor.length > 0 && (
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-xs min-w-[520px]">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100">
                <th className="text-left py-2 px-3 font-semibold text-gray-500 w-[38%]">Description</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[12%]">Workers</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[12%]">Hours</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[14%]">Rate/Hr</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[16%]">Total</th>
                <th className="w-6 px-1" />
              </tr>
            </thead>
            <tbody>
              {labor.map(l => {
                const rowTotal = l.workers * l.hours * l.ratePerHour
                return (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                    <td className="py-1.5 px-3">
                      <input
                        className="w-full bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-green-300 rounded px-1 py-0.5"
                        value={l.description}
                        onChange={e => onUpdate(l.id, 'description', e.target.value)}
                        placeholder="Task description"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number" min="1" max="20"
                        className="w-full bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-green-300 rounded px-1 py-0.5"
                        value={l.workers}
                        onChange={e => onUpdate(l.id, 'workers', parseInt(e.target.value) || 1)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number" min="0" step="0.5"
                        className="w-full bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-green-300 rounded px-1 py-0.5"
                        value={l.hours}
                        onChange={e => onUpdate(l.id, 'hours', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <span className="text-gray-400">$</span>
                        <input
                          type="number" min="0" step="1"
                          className="w-14 bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-green-300 rounded px-1 py-0.5"
                          value={l.ratePerHour}
                          onChange={e => onUpdate(l.id, 'ratePerHour', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-right font-medium">{fmt(rowTotal)}</td>
                    <td className="py-1.5 px-1">
                      <button className="btn-danger opacity-0 group-hover:opacity-100" onClick={() => onRemove(l.id)}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td colSpan={4} className="py-2 px-3 text-right text-xs text-gray-500">Total Labor:</td>
                <td className="py-2 px-2 text-right text-sm text-green-700">{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {labor.length === 0 && (
        <p className="text-xs text-gray-400 italic text-center py-4">No labor items yet. Auto-populated from measurements or add manually.</p>
      )}

      <button onClick={onAdd} className="btn-secondary text-xs mt-1">
        + Add Labor Item
      </button>
    </div>
  )
}
