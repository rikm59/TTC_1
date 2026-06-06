import type { OverheadItem } from '../../types'
import { fmt } from '../../utils/calculations'

interface Props {
  overhead: OverheadItem[]
  onAdd: () => void
  onUpdate: (id: string, field: string, value: string | number) => void
  onRemove: (id: string) => void
}

export default function OverheadTable({ overhead, onAdd, onUpdate, onRemove }: Props) {
  const total = overhead.reduce((s, o) => s + o.cost, 0)

  return (
    <div className="space-y-2">
      {overhead.length > 0 && (
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-xs min-w-[360px]">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100">
                <th className="text-left py-2 px-3 font-semibold text-gray-500">Description</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[22%]">Cost</th>
                <th className="w-6 px-1" />
              </tr>
            </thead>
            <tbody>
              {overhead.map(o => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                  <td className="py-1.5 px-3">
                    <input
                      className="w-full bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-amber-300 rounded px-1 py-0.5"
                      value={o.description}
                      onChange={e => onUpdate(o.id, 'description', e.target.value)}
                      placeholder="Equipment rental, permit, fuel..."
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number" min="0" step="1"
                        className="w-20 bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-amber-300 rounded px-1 py-0.5"
                        value={o.cost}
                        onChange={e => onUpdate(o.id, 'cost', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </td>
                  <td className="py-1.5 px-1">
                    <button className="btn-danger opacity-0 group-hover:opacity-100" onClick={() => onRemove(o.id)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td className="py-2 px-3 text-right text-xs text-gray-500">Total Overhead:</td>
                <td className="py-2 px-2 text-right text-sm text-amber-700">{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {overhead.length === 0 && (
        <p className="text-xs text-gray-400 italic text-center py-4">No overhead items. Add equipment rentals, permits, fuel, disposal, etc.</p>
      )}

      <button onClick={onAdd} className="btn-secondary text-xs mt-1">
        + Add Overhead Item
      </button>
    </div>
  )
}
