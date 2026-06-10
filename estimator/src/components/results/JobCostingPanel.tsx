import { useState, useMemo } from 'react'
import { PlusCircle, TrendingUp, TrendingDown, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import type { Estimate, CalculatedTotals, JobActuals, ActualMaterialItem, ActualLaborItem } from '../../types'
import { fmt, fmtPct } from '../../utils/calculations'
import { useLanguage } from '../../context/LanguageContext'
import { format } from 'date-fns'

interface Props {
  estimate: Estimate
  totals: CalculatedTotals
  onChange: (actuals: JobActuals) => void
}

function emptyActuals(estimate: Estimate): JobActuals {
  return {
    materialActuals: estimate.materials.map(m => ({
      id: m.id,
      name: m.name,
      actualCost: Math.round(m.quantity * m.unitCost * 100) / 100,
    })),
    laborActuals: estimate.labor.map(l => ({
      id: l.id,
      description: l.description,
      actualHours: Math.round(l.workers * l.hours * 10) / 10,
    })),
    completedDate: '',
    notes: '',
  }
}

export default function JobCostingPanel({ estimate, totals, onChange }: Props) {
  const { lang } = useLanguage()
  const isEs = lang === 'es'
  const [open, setOpen] = useState(false)
  const [newMatName, setNewMatName] = useState('')
  const [newMatCost, setNewMatCost] = useState('')

  const actuals: JobActuals = estimate.actuals ?? emptyActuals(estimate)

  const update = (patch: Partial<JobActuals>) => onChange({ ...actuals, ...patch })

  const setMatActual = (id: string, actualCost: number) => {
    const existing = actuals.materialActuals.find(a => a.id === id)
    if (existing) {
      update({ materialActuals: actuals.materialActuals.map(a => a.id === id ? { ...a, actualCost } : a) })
    } else {
      const mat = estimate.materials.find(m => m.id === id)
      if (mat) update({ materialActuals: [...actuals.materialActuals, { id, name: mat.name, actualCost }] })
    }
  }

  const setLabActual = (id: string, actualHours: number) => {
    const existing = actuals.laborActuals.find(a => a.id === id)
    if (existing) {
      update({ laborActuals: actuals.laborActuals.map(a => a.id === id ? { ...a, actualHours } : a) })
    } else {
      const lab = estimate.labor.find(l => l.id === id)
      if (lab) update({ laborActuals: [...actuals.laborActuals, { id, description: lab.description, actualHours }] })
    }
  }

  const addExtraMaterial = () => {
    if (!newMatName.trim() || !parseFloat(newMatCost)) return
    const extra: ActualMaterialItem = {
      id: `extra-${Date.now()}`,
      name: newMatName.trim(),
      actualCost: parseFloat(newMatCost) || 0,
    }
    update({ materialActuals: [...actuals.materialActuals, extra] })
    setNewMatName('')
    setNewMatCost('')
  }

  const removeExtra = (id: string) =>
    update({ materialActuals: actuals.materialActuals.filter(a => a.id !== id) })

  // ── Computed values ────────────────────────────────────────────────────────
  const computed = useMemo(() => {
    const estMatCost = totals.materialsCost

    // Actual mat cost: sum of actuals for known items + any extras
    const actualMatCost = estimate.materials.reduce((sum, m) => {
      const a = actuals.materialActuals.find(x => x.id === m.id)
      return sum + (a ? a.actualCost : m.quantity * m.unitCost)
    }, 0) + actuals.materialActuals
      .filter(a => a.id.startsWith('extra-'))
      .reduce((s, a) => s + a.actualCost, 0)

    // Actual labor cost
    const actualLaborCost = estimate.labor.reduce((sum, l) => {
      const a = actuals.laborActuals.find(x => x.id === l.id)
      const hrs = a ? a.actualHours : l.workers * l.hours
      return sum + hrs * l.ratePerHour
    }, 0)

    const actualHardCost = actualMatCost + actualLaborCost + totals.overheadCost
    const quotedPrice = totals.selectedQuote - totals.discountAmount
    const actualProfit = quotedPrice - actualHardCost
    const actualMargin = quotedPrice > 0 ? (actualProfit / quotedPrice) * 100 : 0
    const estimatedProfit = totals.selectedProfit - totals.discountAmount
    const variance = actualProfit - estimatedProfit
    const variancePct = estimatedProfit !== 0 ? (variance / Math.abs(estimatedProfit)) * 100 : 0

    return {
      estMatCost,
      actualMatCost,
      actualLaborCost,
      actualHardCost,
      actualProfit,
      actualMargin,
      estimatedProfit,
      variance,
      variancePct,
      quotedPrice,
    }
  }, [estimate, actuals, totals])

  const hasActuals = estimate.actuals !== undefined

  return (
    <div className={`card border-2 ${hasActuals ? 'border-green-200' : 'border-dashed border-gray-200'}`}>
      {/* Header toggle */}
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${hasActuals ? 'bg-green-100' : 'bg-gray-100'}`}>
            <TrendingUp className={`w-4 h-4 ${hasActuals ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`font-semibold text-sm ${hasActuals ? 'text-green-800' : 'text-gray-600'}`}>
              {isEs ? '📊 Costos Reales vs Estimados' : '📊 Job Costing — Actual vs Estimated'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {hasActuals
                ? isEs
                  ? `Ganancia real: ${fmt(computed.actualProfit)} (${fmtPct(computed.actualMargin)} margen)`
                  : `Actual profit: ${fmt(computed.actualProfit)} (${fmtPct(computed.actualMargin)} margin)`
                : isEs
                  ? 'Registra los costos reales al completar el proyecto'
                  : 'Track what you actually spent when the job is done'
              }
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">

          {/* ── Materials ─────────────────────────────────────────────────────── */}
          <div className="p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              {isEs ? 'Materiales' : 'Materials'}
            </h4>
            <div className="space-y-1.5">
              {/* Known materials */}
              {estimate.materials.map(m => {
                const estCost = Math.round(m.quantity * m.unitCost * 100) / 100
                const actualEntry = actuals.materialActuals.find(a => a.id === m.id)
                const actualCost = actualEntry?.actualCost ?? estCost
                const diff = actualCost - estCost
                return (
                  <div key={m.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-xs">
                    <span className="text-gray-700 truncate font-medium">{m.name}</span>
                    <span className="text-gray-400 text-right whitespace-nowrap">
                      {isEs ? 'Est:' : 'Est:'} {fmt(estCost)}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input text-xs py-1 w-24 text-right"
                        value={actualCost || ''}
                        onChange={e => setMatActual(m.id, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <span className={`text-right font-semibold w-16 ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {diff !== 0 ? `${diff > 0 ? '+' : ''}${fmt(diff)}` : '—'}
                    </span>
                  </div>
                )
              })}
              {estimate.materials.length === 0 && (
                <p className="text-xs text-gray-400 italic">
                  {isEs ? 'Sin materiales en este estimado.' : 'No materials in this estimate.'}
                </p>
              )}

              {/* Extra unplanned materials */}
              {actuals.materialActuals.filter(a => a.id.startsWith('extra-')).map(a => (
                <div key={a.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-xs">
                  <span className="text-purple-700 truncate font-medium italic">{a.name} <span className="text-gray-400">(extra)</span></span>
                  <span className="text-gray-400">—</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input text-xs py-1 w-24 text-right"
                      value={a.actualCost || ''}
                      onChange={e => update({
                        materialActuals: actuals.materialActuals.map(x => x.id === a.id ? { ...x, actualCost: parseFloat(e.target.value) || 0 } : x)
                      })}
                    />
                  </div>
                  <button onClick={() => removeExtra(a.id)} className="text-red-400 hover:text-red-600 text-right">×</button>
                </div>
              ))}

              {/* Add extra row */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                <input
                  className="form-input text-xs py-1 flex-1"
                  placeholder={isEs ? 'Material extra (nombre)' : 'Unplanned material name'}
                  value={newMatName}
                  onChange={e => setNewMatName(e.target.value)}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-gray-400 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input text-xs py-1 w-20"
                    placeholder="0.00"
                    value={newMatCost}
                    onChange={e => setNewMatCost(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addExtraMaterial() }}
                  />
                </div>
                <button
                  onClick={addExtraMaterial}
                  disabled={!newMatName.trim() || !newMatCost}
                  className="text-brand-600 hover:text-brand-800 disabled:opacity-30 shrink-0"
                  title={isEs ? 'Agregar material extra' : 'Add extra material'}
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Material subtotal */}
              <div className="flex justify-between items-center pt-1 text-xs font-semibold border-t border-gray-100 mt-1">
                <span className="text-gray-500">{isEs ? 'Total materiales' : 'Material total'}</span>
                <div className="flex gap-4">
                  <span className="text-gray-500">{isEs ? 'Est:' : 'Est:'} {fmt(computed.estMatCost)}</span>
                  <span className={computed.actualMatCost > computed.estMatCost ? 'text-red-600' : 'text-green-600'}>
                    {isEs ? 'Real:' : 'Act:'} {fmt(computed.actualMatCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Labor ─────────────────────────────────────────────────────────── */}
          <div className="p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              {isEs ? 'Mano de Obra' : 'Labor'}
            </h4>
            <div className="space-y-1.5">
              {estimate.labor.map(l => {
                const estHours = l.workers * l.hours
                const actualEntry = actuals.laborActuals.find(a => a.id === l.id)
                const actualHours = actualEntry?.actualHours ?? estHours
                const estCost = estHours * l.ratePerHour
                const actualCost = actualHours * l.ratePerHour
                const diff = actualCost - estCost
                return (
                  <div key={l.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-xs">
                    <span className="text-gray-700 truncate font-medium">{l.description || (isEs ? 'Trabajo' : 'Labor')}</span>
                    <span className="text-gray-400 whitespace-nowrap">{isEs ? 'Est:' : 'Est:'} {estHours.toFixed(1)}h</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className="form-input text-xs py-1 w-20 text-right"
                        value={actualHours || ''}
                        onChange={e => setLabActual(l.id, parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-gray-400 text-xs shrink-0">h</span>
                    </div>
                    <span className={`text-right font-semibold w-16 ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {diff !== 0 ? `${diff > 0 ? '+' : ''}${fmt(diff)}` : '—'}
                    </span>
                  </div>
                )
              })}
              {estimate.labor.length === 0 && (
                <p className="text-xs text-gray-400 italic">
                  {isEs ? 'Sin mano de obra en este estimado.' : 'No labor in this estimate.'}
                </p>
              )}
            </div>
          </div>

          {/* ── Completion + Notes ───────────────────────────────────────────── */}
          <div className="p-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                {isEs ? 'Fecha de Finalización' : 'Completion Date'}
              </label>
              <input
                type="date"
                className="form-input text-xs py-1"
                value={actuals.completedDate ?? ''}
                onChange={e => update({ completedDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                {isEs ? 'Notas' : 'Notes'}
              </label>
              <input
                className="form-input text-xs py-1"
                placeholder={isEs ? 'Observaciones…' : 'Observations…'}
                value={actuals.notes ?? ''}
                onChange={e => update({ notes: e.target.value })}
              />
            </div>
          </div>

          {/* ── Summary ──────────────────────────────────────────────────────── */}
          <div className="p-4 bg-gray-50 rounded-b-xl">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              {isEs ? 'Resumen de Ganancia' : 'Profit Summary'}
            </h4>
            <div className="space-y-2">
              {[
                {
                  label: isEs ? 'Costo duro estimado' : 'Estimated hard cost',
                  value: fmt(totals.hardCost),
                  cls: 'text-gray-600',
                },
                {
                  label: isEs ? 'Costo duro real' : 'Actual hard cost',
                  value: fmt(computed.actualHardCost),
                  cls: computed.actualHardCost > totals.hardCost ? 'text-red-600' : 'text-green-600',
                },
                {
                  label: isEs ? 'Precio cobrado' : 'Quoted price',
                  value: fmt(computed.quotedPrice),
                  cls: 'text-gray-700',
                },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-semibold ${cls}`}>{value}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">
                    {isEs ? 'Ganancia real' : 'Actual profit'}
                  </span>
                  <div className="flex items-center gap-2">
                    {computed.variance !== 0 && (
                      <span className={`text-xs font-semibold flex items-center gap-0.5 ${computed.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {computed.variance >= 0
                          ? <TrendingUp className="w-3 h-3" />
                          : <TrendingDown className="w-3 h-3" />}
                        {computed.variance >= 0 ? '+' : ''}{fmt(computed.variance)}
                        {' '}({computed.variancePct >= 0 ? '+' : ''}{computed.variancePct.toFixed(1)}%)
                      </span>
                    )}
                    <span className={`text-lg font-black ${computed.actualProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(computed.actualProfit)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-xs text-gray-400">
                    {isEs ? 'Margen real' : 'Actual margin'}
                  </span>
                  <span className={`text-xs font-semibold ${computed.actualMargin >= 20 ? 'text-green-600' : computed.actualMargin >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    {fmtPct(computed.actualMargin)}
                  </span>
                </div>
              </div>
            </div>

            {actuals.completedDate && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isEs ? 'Completado:' : 'Completed:'} {format(new Date(actuals.completedDate + 'T12:00:00'), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
