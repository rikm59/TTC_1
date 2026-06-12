import { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import type { SubcontractorItem } from '../../types'
import { fmt } from '../../utils/calculations'
import { estimateSubcontractorCost } from '../../utils/costEstimator'
import type { CostEstimate } from '../../utils/costEstimator'

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

  const [estPopup, setEstPopup] = useState<{rowId: string} & CostEstimate | null>(null)

  const runEstimate = (rowId: string, trade: string, name: string) => {
    if (estPopup?.rowId === rowId) { setEstPopup(null); return }
    const r = estimateSubcontractorCost(trade, name)
    setEstPopup(r ? { rowId, ...r } : null)
  }

  const applyEst = (rowId: string, val: number) => {
    onUpdate(rowId, 'cost', val)
    setEstPopup(null)
  }

  const EstPopover = ({ id }: { id: string }) => {
    if (estPopup?.rowId !== id) return null
    return (
      <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-purple-200 rounded-xl shadow-xl p-2.5 w-56" onMouseDown={e => e.preventDefault()}>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wide mb-1.5">
          {lang === 'es' ? 'Costo estimado · EE.UU.' : 'Est. sub cost · US market'}
          {estPopup.note && <span className="text-gray-300 ml-1 normal-case font-normal">({estPopup.note})</span>}
        </p>
        <div className="flex gap-1 mb-1">
          <button onClick={() => applyEst(id, estPopup.low)} className="flex-1 text-[11px] py-1 rounded-lg bg-gray-100 hover:bg-purple-50 text-gray-600 hover:text-purple-700 font-medium transition-colors">
            Low<br /><span className="font-bold text-xs">{fmt(estPopup.low)}</span>
          </button>
          <button onClick={() => applyEst(id, estPopup.mid)} className="flex-1 text-[11px] py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors">
            Mid<br /><span className="font-bold text-xs">{fmt(estPopup.mid)}</span>
          </button>
          <button onClick={() => applyEst(id, estPopup.high)} className="flex-1 text-[11px] py-1 rounded-lg bg-gray-100 hover:bg-purple-50 text-gray-600 hover:text-purple-700 font-medium transition-colors">
            High<br /><span className="font-bold text-xs">{fmt(estPopup.high)}</span>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center">per {estPopup.unit} · adjust for project scope</p>
      </div>
    )
  }

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
                  <div className="flex items-center gap-1 shrink-0 relative">
                    {(sc.trade.trim() || sc.name.trim()) && (
                      <button type="button" onClick={() => runEstimate(sc.id, sc.trade, sc.name)} className={`text-[11px] leading-none transition-colors ${sc.cost === 0 ? 'text-purple-400 hover:text-purple-600' : 'text-gray-300 hover:text-purple-400'}`} title={lang === 'es' ? 'Estimar costo' : 'Estimate cost'}>✨</button>
                    )}
                    <span className="text-gray-400 text-xs">$</span>
                    <input
                      type="number" min="0" step="1"
                      className="w-24 form-input text-xs text-right"
                      value={sc.cost}
                      onChange={e => onUpdate(sc.id, 'cost', parseFloat(e.target.value) || 0)}
                    />
                    <EstPopover id={sc.id} />
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
                    <td className="py-1.5 px-2 relative">
                      <div className="flex items-center justify-end gap-0.5">
                        {(sc.trade.trim() || sc.name.trim()) && (
                          <button
                            type="button"
                            onClick={() => runEstimate(sc.id, sc.trade, sc.name)}
                            className={`text-[11px] transition-colors leading-none ${sc.cost === 0 ? 'text-purple-400 hover:text-purple-600' : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-purple-400'}`}
                            title={lang === 'es' ? 'Estimar costo' : 'Estimate cost'}
                          >✨</button>
                        )}
                        <span className="text-gray-400">$</span>
                        <input
                          type="number" min="0" step="1"
                          className="w-24 bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-amber-300 rounded px-1 py-0.5"
                          value={sc.cost}
                          onChange={e => onUpdate(sc.id, 'cost', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <EstPopover id={sc.id} />
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
