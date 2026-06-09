import { useLanguage } from '../../context/LanguageContext'
import type { OverheadItem } from '../../types'
import { fmt } from '../../utils/calculations'

interface Props {
  overhead: OverheadItem[]
  onAdd: () => void
  onUpdate: (id: string, field: string, value: string | number) => void
  onRemove: (id: string) => void
}

export default function OverheadTable({ overhead, onAdd, onUpdate, onRemove }: Props) {
  const { t } = useLanguage()
  const total = overhead.reduce((s, o) => s + o.cost, 0)

  return (
    <div className="space-y-2">
      {overhead.length > 0 && (
        <>
          {/* ── Mobile card layout (hidden on sm+) ── */}
          <div className="sm:hidden space-y-2">
            {overhead.map(o => (
              <div key={o.id} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-white">
                <input
                  className="flex-1 form-input text-sm"
                  value={o.description}
                  onChange={e => onUpdate(o.id, 'description', e.target.value)}
                  placeholder={t('overhead.placeholder')}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-gray-400 text-xs">$</span>
                  <input
                    type="number" min="0" step="1"
                    className="w-20 form-input text-xs text-right"
                    value={o.cost}
                    onChange={e => onUpdate(o.id, 'cost', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <button
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition text-base font-bold"
                  onClick={() => onRemove(o.id)}
                >×</button>
              </div>
            ))}
            <div className="flex justify-between text-xs font-semibold pt-1 px-1 border-t border-gray-200">
              <span className="text-gray-500">{t('overhead.totalLabel')}</span>
              <span className="text-amber-700">{fmt(total)}</span>
            </div>
          </div>

          {/* ── Desktop table layout (hidden below sm) ── */}
          <div className="hidden sm:block overflow-x-auto -mx-4">
            <table className="w-full text-xs min-w-[360px]">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">{t('overhead.description')}</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[22%]">{t('overhead.cost')}</th>
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
                        placeholder={t('overhead.placeholder')}
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
                  <td className="py-2 px-3 text-right text-xs text-gray-500">{t('overhead.totalLabel')}</td>
                  <td className="py-2 px-2 text-right text-sm text-amber-700">{fmt(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {overhead.length === 0 && (
        <p className="text-xs text-gray-400 italic text-center py-4">{t('overhead.empty')}</p>
      )}

      <button onClick={onAdd} className="btn-secondary text-xs mt-1">
        {t('overhead.add')}
      </button>
    </div>
  )
}
