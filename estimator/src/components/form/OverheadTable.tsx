import { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import type { OverheadItem } from '../../types'
import { fmt } from '../../utils/calculations'
import { estimateOverheadCost } from '../../utils/costEstimator'
import type { CostEstimate } from '../../utils/costEstimator'

interface Props {
  overhead: OverheadItem[]
  onAdd: () => void
  onUpdate: (id: string, field: string, value: string | number) => void
  onRemove: (id: string) => void
  onDuplicate?: (id: string) => void
  onRecalculate?: () => void
  canRecalc?: boolean
}

export default function OverheadTable({ overhead, onAdd, onUpdate, onRemove, onDuplicate, onRecalculate, canRecalc }: Props) {
  const { t, lang } = useLanguage()
  const total = overhead.reduce((s, o) => s + o.cost, 0)

  const [estPopup, setEstPopup] = useState<{rowId: string} & CostEstimate | null>(null)

  const runEstimate = (rowId: string, desc: string) => {
    if (estPopup?.rowId === rowId) { setEstPopup(null); return }
    const r = estimateOverheadCost(desc)
    setEstPopup(r ? { rowId, ...r } : null)
  }

  const applyEst = (rowId: string, val: number) => {
    onUpdate(rowId, 'cost', val)
    setEstPopup(null)
  }

  const EstPopover = ({ id }: { id: string }) => {
    if (estPopup?.rowId !== id) return null
    return (
      <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-amber-200 rounded-xl shadow-xl p-2.5 w-52" onMouseDown={e => e.preventDefault()}>
        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide mb-1.5">
          {lang === 'es' ? 'Costo estimado · EE.UU.' : 'Est. cost · US market'}
          {estPopup.note && <span className="text-gray-300 ml-1 normal-case font-normal">({estPopup.note})</span>}
        </p>
        <div className="flex gap-1 mb-1">
          <button onClick={() => applyEst(id, estPopup.low)} className="flex-1 text-[11px] py-1 rounded-lg bg-gray-100 hover:bg-amber-50 text-gray-600 hover:text-amber-700 font-medium transition-colors">
            Low<br /><span className="font-bold text-xs">{fmt(estPopup.low)}</span>
          </button>
          <button onClick={() => applyEst(id, estPopup.mid)} className="flex-1 text-[11px] py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors">
            Mid<br /><span className="font-bold text-xs">{fmt(estPopup.mid)}</span>
          </button>
          <button onClick={() => applyEst(id, estPopup.high)} className="flex-1 text-[11px] py-1 rounded-lg bg-gray-100 hover:bg-amber-50 text-gray-600 hover:text-amber-700 font-medium transition-colors">
            High<br /><span className="font-bold text-xs">{fmt(estPopup.high)}</span>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center">per {estPopup.unit}</p>
      </div>
    )
  }

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
                <div className="flex items-center gap-1 shrink-0 relative">
                  {o.description.trim() && (
                    <button type="button" onClick={() => runEstimate(o.id, o.description)} className={`text-[11px] leading-none transition-colors ${o.cost === 0 ? 'text-amber-400 hover:text-amber-600' : 'text-gray-300 hover:text-amber-400'}`} title={lang === 'es' ? 'Estimar costo' : 'Estimate cost'}>✨</button>
                  )}
                  <span className="text-gray-400 text-xs">$</span>
                  <input
                    type="number" min="0" step="1"
                    className="w-20 form-input text-xs text-right"
                    value={o.cost}
                    onChange={e => onUpdate(o.id, 'cost', parseFloat(e.target.value) || 0)}
                  />
                  <EstPopover id={o.id} />
                </div>
                {onDuplicate && (
                  <button
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition text-sm"
                    title={lang === 'es' ? 'Duplicar fila' : 'Duplicate row'}
                    onClick={() => onDuplicate(o.id)}
                  >⊕</button>
                )}
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
                    <td className="py-1.5 px-2 relative">
                      <div className="flex items-center justify-end gap-0.5">
                        {o.description.trim() && (
                          <button
                            type="button"
                            onClick={() => runEstimate(o.id, o.description)}
                            className={`text-[11px] transition-colors leading-none ${o.cost === 0 ? 'text-amber-400 hover:text-amber-600' : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-amber-400'}`}
                            title={lang === 'es' ? 'Estimar costo' : 'Estimate cost'}
                          >✨</button>
                        )}
                        <span className="text-gray-400">$</span>
                        <input
                          type="number" min="0" step="1"
                          className="w-20 bg-transparent border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-amber-300 rounded px-1 py-0.5"
                          value={o.cost}
                          onChange={e => onUpdate(o.id, 'cost', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <EstPopover id={o.id} />
                    </td>
                    <td className="py-1.5 px-1">
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                        {onDuplicate && (
                          <button
                            className="text-gray-400 hover:text-amber-600 transition px-1 py-0.5 rounded text-xs"
                            title={lang === 'es' ? 'Duplicar fila' : 'Duplicate row'}
                            onClick={() => onDuplicate(o.id)}
                          >⊕</button>
                        )}
                        <button className="btn-danger" onClick={() => onRemove(o.id)}>×</button>
                      </div>
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

      <div className="flex gap-2 mt-1 flex-wrap">
        {canRecalc && onRecalculate && (
          <button
            type="button"
            onClick={onRecalculate}
            className="btn-secondary text-xs text-brand-600 border-brand-200 hover:bg-brand-50 flex items-center gap-1"
            title={lang === 'es' ? 'Recalcular costos desde las medidas' : 'Recalculate costs from measurements'}
          >
            ↻ {lang === 'es' ? 'Recalcular' : 'Recalc costs'}
          </button>
        )}
        <button onClick={onAdd} className="btn-secondary text-xs">
          {t('overhead.add')}
        </button>
      </div>
    </div>
  )
}
