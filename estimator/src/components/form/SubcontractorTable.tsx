import { useLanguage } from '../../context/LanguageContext'
import type { SubcontractorItem } from '../../types'
import { fmt } from '../../utils/calculations'

interface Props {
  subcontractors: SubcontractorItem[]
  onAdd: () => void
  onUpdate: (id: string, field: string, value: string | number) => void
  onRemove: (id: string) => void
  onDuplicate?: (id: string) => void
}

export default function SubcontractorTable({ subcontractors, onAdd, onUpdate, onRemove, onDuplicate }: Props) {
  const { t, lang } = useLanguage()
  const total = subcontractors.reduce((s, sc) => s + sc.cost, 0)

  return (
    <div className="space-y-2">
      {subcontractors.length > 0 && (
        <>
          {/* ── Mobile card layout (hidden on sm+) ── */}
          <div className="sm:hidden space-y-2">
            {subcontractors.map(sc => (
              <div key={sc.id} className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 form-input text-sm"
                    value={sc.name}
                    onChange={e => onUpdate(sc.id, 'name', e.target.value)}
                    placeholder={t('sub.namePlaceholder')}
                  />
                  {onDuplicate && (
                    <button
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition text-sm"
                      title={lang === 'es' ? 'Duplicar fila' : 'Duplicate row'}
                      onClick={() => onDuplicate(sc.id)}
                    >⊕</button>
                  )}
                  <button
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition text-base font-bold"
                    onClick={() => onRemove(sc.id)}
                  >×</button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 form-input text-xs"
                    value={sc.trade}
                    onChange={e => onUpdate(sc.id, 'trade', e.target.value)}
                    placeholder={t('sub.tradePlaceholder')}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-gray-400 text-xs">$</span>
                    <input
                      type="number" min="0" step="1"
                      className="w-24 form-input text-xs text-right"
                      value={sc.cost}
                      onChange={e => onUpdate(sc.id, 'cost', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-xs font-semibold pt-1 px-1 border-t border-gray-200">
              <span className="text-gray-500">{t('sub.totalLabel')}</span>
              <span className="text-amber-700">{fmt(total)}</span>
            </div>
          </div>

          {/* ── Desktop table layout (hidden below sm) ── */}
          <div className="hidden sm:block overflow-x-auto -mx-4">
            <table className="w-full text-xs min-w-[480px]">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">{t('sub.name')}</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500 w-[28%]">{t('sub.trade')}</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[22%]">{t('sub.cost')}</th>
                  <th className="w-6 px-1" />
                </tr>
              </thead>
              <tbody>
                {subcontractors.map(sc => (
                  <tr key={sc.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                    <td className="py-1.5 px-3">
                      <input
                        className="w-full bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-amber-300 rounded px-1 py-0.5"
                        value={sc.name}
                        onChange={e => onUpdate(sc.id, 'name', e.target.value)}
                        placeholder={t('sub.namePlaceholder')}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        className="w-full bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-amber-300 rounded px-1 py-0.5"
                        value={sc.trade}
                        onChange={e => onUpdate(sc.id, 'trade', e.target.value)}
                        placeholder={t('sub.tradePlaceholder')}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <span className="text-gray-400">$</span>
                        <input
                          type="number" min="0" step="1"
                          className="w-24 bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-amber-300 rounded px-1 py-0.5"
                          value={sc.cost}
                          onChange={e => onUpdate(sc.id, 'cost', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </td>
                    <td className="py-1.5 px-1">
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                        {onDuplicate && (
                          <button
                            className="text-gray-400 hover:text-purple-600 transition px-1 py-0.5 rounded text-xs"
                            title={lang === 'es' ? 'Duplicar fila' : 'Duplicate row'}
                            onClick={() => onDuplicate(sc.id)}
                          >⊕</button>
                        )}
                        <button className="btn-danger" onClick={() => onRemove(sc.id)}>×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                  <td colSpan={2} className="py-2 px-3 text-right text-xs text-gray-500">{t('sub.totalLabel')}</td>
                  <td className="py-2 px-2 text-right text-sm text-amber-700">{fmt(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {subcontractors.length === 0 && (
        <p className="text-xs text-gray-400 italic text-center py-4">{t('sub.empty')}</p>
      )}

      <button onClick={onAdd} className="btn-secondary text-xs mt-1">
        {t('sub.add')}
      </button>
    </div>
  )
}
