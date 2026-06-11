import { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import type { LaborItem, PriceBookItem } from '../../types'
import { fmt } from '../../utils/calculations'

interface Props {
  labor: LaborItem[]
  onAdd: () => void
  onUpdate: (id: string, field: string, value: string | number) => void
  onRemove: (id: string) => void
  onDuplicate?: (id: string) => void
  onOpenPriceBook?: () => void
  onSaveToPriceBook?: (item: LaborItem) => void
  priceBook?: PriceBookItem[]
}

export default function LaborTable({ labor, onAdd, onUpdate, onRemove, onDuplicate, onOpenPriceBook, onSaveToPriceBook, priceBook }: Props) {
  const { t, lang } = useLanguage()
  const total = labor.reduce((s, l) => s + l.workers * l.hours * l.ratePerHour, 0)

  const [acRowId, setAcRowId] = useState<string | null>(null)

  const pbLabor = (priceBook ?? []).filter(p => p.type === 'labor')

  const getMatches = (desc: string) => {
    if (!desc.trim() || pbLabor.length === 0) return []
    const q = desc.toLowerCase()
    return pbLabor.filter(p => p.name.toLowerCase().includes(q)).slice(0, 6)
  }

  const applyPbItem = (rowId: string, item: PriceBookItem) => {
    onUpdate(rowId, 'description', item.name)
    onUpdate(rowId, 'ratePerHour', item.cost)
    setAcRowId(null)
  }

  return (
    <div className="space-y-2">
      {labor.length > 0 && (
        <>
          {/* ── Mobile card layout (hidden on sm+) ── */}
          <div className="sm:hidden space-y-2">
            {labor.map(l => {
              const rowTotal = l.workers * l.hours * l.ratePerHour
              return (
                <div key={l.id} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        className="w-full form-input text-sm"
                        value={l.description}
                        onChange={e => { onUpdate(l.id, 'description', e.target.value); setAcRowId(l.id) }}
                        onFocus={() => setAcRowId(l.id)}
                        onBlur={() => setTimeout(() => setAcRowId(null), 150)}
                        placeholder={t('labor.placeholder')}
                      />
                      {acRowId === l.id && getMatches(l.description).length > 0 && (
                        <div className="absolute left-0 top-full mt-0.5 z-30 bg-white border border-gray-200 rounded-lg shadow-lg w-full max-h-48 overflow-y-auto">
                          {getMatches(l.description).map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onMouseDown={e => { e.preventDefault(); applyPbItem(l.id, item) }}
                              className="w-full text-left px-3 py-2 hover:bg-green-50 text-xs border-b border-gray-50 last:border-0"
                            >
                              <span className="font-medium text-gray-800">{item.name}</span>
                              <span className="text-gray-400 ml-2">{fmt(item.cost)}/hr</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {onDuplicate && (
                      <button
                        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-green-50 hover:text-green-600 transition text-sm"
                        title={lang === 'es' ? 'Duplicar fila' : 'Duplicate row'}
                        onClick={() => onDuplicate(l.id)}
                      >⊕</button>
                    )}
                    <button
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition text-base font-bold"
                      onClick={() => onRemove(l.id)}
                    >×</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="form-label">{t('labor.workers')}</label>
                      <input
                        type="number" min="1" max="20"
                        className="form-input text-xs"
                        value={l.workers}
                        onChange={e => onUpdate(l.id, 'workers', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <label className="form-label">{t('labor.hours')}</label>
                      <input
                        type="number" min="0" step="0.5"
                        className="form-input text-xs"
                        value={l.hours}
                        onChange={e => onUpdate(l.id, 'hours', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="form-label">{t('labor.rateHr')}</label>
                      <input
                        type="number" min="0" step="1"
                        className="form-input text-xs"
                        value={l.ratePerHour}
                        onChange={e => onUpdate(l.id, 'ratePerHour', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <input
                    className="form-input text-xs text-gray-500 placeholder-gray-300"
                    value={l.notes}
                    onChange={e => onUpdate(l.id, 'notes', e.target.value)}
                    placeholder="Notes (optional)"
                  />
                  <div className="text-right text-xs font-semibold text-green-700 pt-1 border-t border-gray-100">
                    {t('labor.total')}: {fmt(rowTotal)}
                  </div>
                </div>
              )
            })}
            <div className="flex justify-between text-xs font-semibold pt-1 px-1 border-t border-gray-200">
              <span className="text-gray-500">{t('labor.totalLabel')}</span>
              <span className="text-green-700">{fmt(total)}</span>
            </div>
          </div>

          {/* ── Desktop table layout (hidden below sm) ── */}
          <div className="hidden sm:block overflow-x-auto -mx-4">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500 w-[38%]">{t('labor.description')}</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[12%]">{t('labor.workers')}</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[12%]">{t('labor.hours')}</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[14%]">{t('labor.rateHr')}</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500 w-[16%]">{t('labor.total')}</th>
                  <th className="w-6 px-1" />
                </tr>
              </thead>
              <tbody>
                {labor.map(l => {
                  const rowTotal = l.workers * l.hours * l.ratePerHour
                  return (
                    <>
                      <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                        <td className="py-1.5 px-3 relative">
                          <input
                            className="w-full bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-green-300 rounded px-1 py-0.5"
                            value={l.description}
                            onChange={e => { onUpdate(l.id, 'description', e.target.value); setAcRowId(l.id) }}
                            onFocus={() => setAcRowId(l.id)}
                            onBlur={() => setTimeout(() => setAcRowId(null), 150)}
                            placeholder={t('labor.placeholder')}
                          />
                          {acRowId === l.id && getMatches(l.description).length > 0 && (
                            <div className="absolute left-3 top-full mt-0.5 z-30 bg-white border border-gray-200 rounded-lg shadow-lg w-64 max-h-48 overflow-y-auto">
                              {getMatches(l.description).map(item => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onMouseDown={e => { e.preventDefault(); applyPbItem(l.id, item) }}
                                  className="w-full text-left px-3 py-2 hover:bg-green-50 text-xs border-b border-gray-50 last:border-0"
                                >
                                  <span className="font-medium text-gray-800">{item.name}</span>
                                  <span className="text-gray-400 ml-2">{fmt(item.cost)}/hr</span>
                                </button>
                              ))}
                            </div>
                          )}
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
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                            {onDuplicate && (
                              <button
                                className="text-gray-400 hover:text-green-600 transition px-1 py-0.5 rounded text-xs"
                                title={lang === 'es' ? 'Duplicar fila' : 'Duplicate row'}
                                onClick={() => onDuplicate(l.id)}
                              >⊕</button>
                            )}
                            {onSaveToPriceBook && (
                              <button
                                className="text-gray-400 hover:text-brand-600 transition px-1 py-0.5 rounded text-xs"
                                title={lang === 'es' ? 'Guardar en catálogo' : 'Save to price book'}
                                onClick={() => onSaveToPriceBook(l)}
                              >💾</button>
                            )}
                            <button className="btn-danger" onClick={() => onRemove(l.id)}>×</button>
                          </div>
                        </td>
                      </tr>
                      <tr key={l.id + '-notes'} className="border-b border-gray-50">
                        <td colSpan={6} className="px-3 pb-1.5">
                          <input
                            className="w-full text-[11px] text-gray-400 bg-transparent border-0 focus:outline-none focus:bg-gray-50 rounded px-1 py-0.5 placeholder-gray-300"
                            value={l.notes}
                            onChange={e => onUpdate(l.id, 'notes', e.target.value)}
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
                  <td colSpan={4} className="py-2 px-3 text-right text-xs text-gray-500">{t('labor.totalLabel')}</td>
                  <td className="py-2 px-2 text-right text-sm text-green-700">{fmt(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {labor.length === 0 && (
        <p className="text-xs text-gray-400 italic text-center py-4">{t('labor.empty')}</p>
      )}

      <div className="flex gap-2 mt-1">
        <button onClick={onAdd} className="btn-secondary text-xs">
          {t('labor.add')}
        </button>
        {onOpenPriceBook && (
          <button onClick={onOpenPriceBook} className="btn-secondary text-xs">
            📖 {lang === 'es' ? 'Catálogo' : 'Price Book'}
          </button>
        )}
      </div>
    </div>
  )
}
