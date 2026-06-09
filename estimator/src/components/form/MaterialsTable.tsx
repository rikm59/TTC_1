import { useLanguage } from '../../context/LanguageContext'
import type { MaterialItem } from '../../types'
import { fmt } from '../../utils/calculations'

interface Props {
  materials: MaterialItem[]
  onAdd: () => void
  onUpdate: (id: string, field: string, value: string | number) => void
  onRemove: (id: string) => void
  defaultMarkup: number
  isLaborOnly?: boolean
  showLaborOnlyMaterials?: boolean
  onToggleLaborOnlyMaterials?: () => void
}

const CATEGORIES = ['Coating', 'Paint', 'Lumber', 'Concrete', 'Hardware', 'Fencing', 'Flooring', 'Tile', 'Drywall', 'Framing', 'Electrical', 'Plumbing', 'HVAC', 'Landscaping', 'Roofing', 'Supplies', 'Other']

export default function MaterialsTable({ materials, onAdd, onUpdate, onRemove, defaultMarkup, isLaborOnly, showLaborOnlyMaterials, onToggleLaborOnlyMaterials }: Props) {
  const { t } = useLanguage()
  const total = materials.reduce((s, m) => s + m.quantity * m.unitCost, 0)
  const totalWithMarkup = materials.reduce((s, m) => s + m.quantity * m.unitCost * (1 + m.markup / 100), 0)

  return (
    <div className="space-y-2">
      {/* Labor Only toggle */}
      {isLaborOnly && (
        <label className="flex items-center gap-2 cursor-pointer mb-2 p-2 rounded-lg bg-green-50 border border-green-100">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-green-600"
            checked={showLaborOnlyMaterials}
            onChange={onToggleLaborOnlyMaterials}
          />
          <span className="text-xs font-medium text-green-800">{t('mat.laborOnlyToggle')}</span>
          <span className="text-xs text-green-600 italic">— {t('mat.laborOnlyHint')}</span>
        </label>
      )}

      {(!isLaborOnly || showLaborOnlyMaterials) && (
        <>
          {materials.length > 0 && (
            <>
              {/* ── Mobile card layout (hidden on sm+) ── */}
              <div className="sm:hidden space-y-2">
                {materials.map(m => {
                  const clientUnit = m.unitCost * (1 + m.markup / 100)
                  const rowTotal = m.quantity * m.unitCost
                  return (
                    <div key={m.id} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 form-input text-sm"
                          value={m.name}
                          onChange={e => onUpdate(m.id, 'name', e.target.value)}
                          placeholder={t('mat.namePlaceholder')}
                        />
                        <button
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition text-base font-bold"
                          onClick={() => onRemove(m.id)}
                        >×</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="form-label">{t('mat.category')}</label>
                          <select className="form-input text-xs" value={m.category} onChange={e => onUpdate(m.id, 'category', e.target.value)}>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">{t('mat.unit')}</label>
                          <input className="form-input text-xs" value={m.unit} onChange={e => onUpdate(m.id, 'unit', e.target.value)} placeholder="ea" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="form-label">{t('mat.qty')}</label>
                          <input type="number" min="0" step="any" className="form-input text-xs" value={m.quantity} onChange={e => onUpdate(m.id, 'quantity', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label className="form-label">{t('mat.unitCost')}</label>
                          <input type="number" min="0" step="0.01" className="form-input text-xs" value={m.unitCost} onChange={e => onUpdate(m.id, 'unitCost', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label className="form-label">{t('mat.markup')} %</label>
                          <input type="number" min="0" max="300" className="form-input text-xs" value={m.markup} onChange={e => onUpdate(m.id, 'markup', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <input
                        className="form-input text-xs text-gray-500 placeholder-gray-300"
                        value={m.notes}
                        onChange={e => onUpdate(m.id, 'notes', e.target.value)}
                        placeholder="Notes (optional)"
                      />
                      <div className="flex justify-between text-xs text-gray-600 pt-1 border-t border-gray-100">
                        <span>{t('mat.clientPrice')}: <strong>{fmt(clientUnit)}</strong>/ea</span>
                        <span>{t('mat.total')}: <strong className="text-gray-800">{fmt(rowTotal)}</strong></span>
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-between text-xs font-semibold pt-1 px-1 border-t border-gray-200">
                  <span className="text-gray-500">{t('mat.costTotal')} <span className="text-gray-800">{fmt(total)}</span></span>
                  <span className="text-brand-700">{t('mat.clientTotal')} {fmt(totalWithMarkup)}</span>
                </div>
              </div>

              {/* ── Desktop table layout (hidden below sm) ── */}
              <div className="hidden sm:block overflow-x-auto -mx-4">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-y border-gray-100">
                      <th className="text-left py-2 px-3 font-semibold text-gray-500 w-[28%]">{t('mat.item')}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-500 w-[12%]">{t('mat.category')}</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[9%]">{t('mat.qty')}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-500 w-[8%]">{t('mat.unit')}</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[11%]">{t('mat.unitCost')}</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[9%]">{t('mat.markup')}</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[11%]">{t('mat.clientPrice')}</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[10%]">{t('mat.total')}</th>
                      <th className="w-6 px-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map(m => {
                      const clientUnit = m.unitCost * (1 + m.markup / 100)
                      const rowTotal = m.quantity * m.unitCost
                      return (
                        <>
                          <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                            <td className="py-1.5 px-3">
                              <input
                                className="w-full bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-brand-300 rounded px-1 py-0.5"
                                value={m.name}
                                onChange={e => onUpdate(m.id, 'name', e.target.value)}
                                placeholder={t('mat.namePlaceholder')}
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
                          <tr key={m.id + '-notes'} className="border-b border-gray-50">
                            <td colSpan={9} className="px-3 pb-1.5">
                              <input
                                className="w-full text-[11px] text-gray-400 bg-transparent border-0 focus:outline-none focus:bg-gray-50 rounded px-1 py-0.5 placeholder-gray-300"
                                value={m.notes}
                                onChange={e => onUpdate(m.id, 'notes', e.target.value)}
                                placeholder="Notes…"
                              />
                            </td>
                          </tr>
                        </>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                      <td colSpan={7} className="py-2 px-3 text-right text-xs text-gray-500">
                        {t('mat.costTotal')} <span className="text-gray-800">{fmt(total)}</span>
                        &nbsp;&nbsp;|&nbsp;&nbsp;
                        {t('mat.clientTotal')} <span className="text-brand-700">{fmt(totalWithMarkup)}</span>
                      </td>
                      <td className="py-2 px-2 text-right text-sm">{fmt(total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {materials.length === 0 && (
            <p className="text-xs text-gray-400 italic text-center py-4">{t('mat.empty')}</p>
          )}

          <button onClick={onAdd} className="btn-secondary text-xs mt-1">
            {t('mat.add')}
          </button>
        </>
      )}
    </div>
  )
}
