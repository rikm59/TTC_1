import type { MaterialItem } from '../../types'
import { fmt } from '../../utils/calculations'

interface Props {
  materials: MaterialItem[]
  onAdd: () => void
  onUpdate: (id: string, field: string, value: string | number) => void
  onRemove: (id: string) => void
  defaultMarkup: number
}

const CATEGORIES = ['Coating', 'Paint', 'Lumber', 'Concrete', 'Hardware', 'Fencing', 'Flooring', 'Tile', 'Drywall', 'Framing', 'Electrical', 'Plumbing', 'HVAC', 'Landscaping', 'Roofing', 'Supplies', 'Other']

export default function MaterialsTable({ materials, onAdd, onUpdate, onRemove, defaultMarkup }: Props) {
  const total = materials.reduce((s, m) => s + m.quantity * m.unitCost, 0)
  const totalWithMarkup = materials.reduce((s, m) => s + m.quantity * m.unitCost * (1 + m.markup / 100), 0)

  return (
    <div className="space-y-2">
      {materials.length > 0 && (
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100">
                <th className="text-left py-2 px-3 font-semibold text-gray-500 w-[28%]">Item</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-500 w-[12%]">Category</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[9%]">Qty</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-500 w-[8%]">Unit</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[11%]">Unit Cost</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[9%]">Markup%</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[11%]">Client $</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[10%]">Total</th>
                <th className="w-6 px-1" />
              </tr>
            </thead>
            <tbody>
              {materials.map(m => {
                const clientUnit = m.unitCost * (1 + m.markup / 100)
                const rowTotal = m.quantity * m.unitCost
                return (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                    <td className="py-1.5 px-3">
                      <input
                        className="w-full bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5"
                        value={m.name}
                        onChange={e => onUpdate(m.id, 'name', e.target.value)}
                        placeholder="Material name"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        className="w-full bg-transparent border-0 focus:outline-none text-xs focus:bg-white focus:border focus:border-brand-300 rounded"
                        value={m.category}
                        onChange={e => onUpdate(m.id, 'category', e.target.value)}
                      >
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number" min="0" step="any"
                        className="w-full bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5"
                        value={m.quantity}
                        onChange={e => onUpdate(m.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        className="w-full bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5 text-xs"
                        value={m.unit}
                        onChange={e => onUpdate(m.id, 'unit', e.target.value)}
                        placeholder="ea"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number" min="0" step="0.01"
                        className="w-full bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5"
                        value={m.unitCost}
                        onChange={e => onUpdate(m.id, 'unitCost', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <input
                          type="number" min="0" max="300"
                          className="w-12 bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5"
                          value={m.markup}
                          onChange={e => onUpdate(m.id, 'markup', parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-right text-gray-600">{fmt(clientUnit)}</td>
                    <td className="py-1.5 px-2 text-right font-medium">{fmt(rowTotal)}</td>
                    <td className="py-1.5 px-1">
                      <button className="btn-danger opacity-0 group-hover:opacity-100" onClick={() => onRemove(m.id)}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td colSpan={7} className="py-2 px-3 text-right text-xs text-gray-500">
                  Cost Total: <span className="text-gray-800">{fmt(total)}</span>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  Client Total: <span className="text-brand-700">{fmt(totalWithMarkup)}</span>
                </td>
                <td className="py-2 px-2 text-right text-sm">{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {materials.length === 0 && (
        <p className="text-xs text-gray-400 italic text-center py-4">No materials yet. Select a project type and enter measurements to auto-populate, or add items manually.</p>
      )}

      <button onClick={onAdd} className="btn-secondary text-xs mt-1">
        + Add Material
      </button>
    </div>
  )
}
