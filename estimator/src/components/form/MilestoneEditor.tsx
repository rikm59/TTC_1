import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { PaymentMilestone } from '../../types'
import { fmt } from '../../utils/calculations'
import { useLanguage } from '../../context/LanguageContext'

const PAYMENT_METHODS = ['cash', 'check', 'card', 'zelle', 'venmo', 'ach', 'other']

interface Props {
  milestones: PaymentMilestone[]
  totalQuote: number
  onChange: (milestones: PaymentMilestone[]) => void
}

const PRESETS_EN = [
  [
    { label: 'Deposit to schedule', percent: 50, dueOn: 'Upon signing' },
    { label: 'Balance upon completion', percent: 50, dueOn: 'Upon completion' },
  ],
  [
    { label: 'Deposit', percent: 33, dueOn: 'Upon signing' },
    { label: 'Mid-project', percent: 33, dueOn: 'Midway through project' },
    { label: 'Final payment', percent: 34, dueOn: 'Upon completion' },
  ],
  [
    { label: 'Deposit', percent: 25, dueOn: 'Upon signing' },
    { label: 'Materials delivery', percent: 25, dueOn: 'Materials delivery' },
    { label: 'Rough-in complete', percent: 25, dueOn: 'Rough-in complete' },
    { label: 'Final payment', percent: 25, dueOn: 'Upon completion' },
  ],
]

const PRESETS_ES = [
  [
    { label: 'Depósito para programar', percent: 50, dueOn: 'Al firmar' },
    { label: 'Saldo al finalizar', percent: 50, dueOn: 'Al completar' },
  ],
  [
    { label: 'Depósito', percent: 33, dueOn: 'Al firmar' },
    { label: 'Pago intermedio', percent: 33, dueOn: 'A mitad del proyecto' },
    { label: 'Pago final', percent: 34, dueOn: 'Al completar' },
  ],
  [
    { label: 'Depósito', percent: 25, dueOn: 'Al firmar' },
    { label: 'Entrega de materiales', percent: 25, dueOn: 'Entrega de materiales' },
    { label: 'Instalación inicial', percent: 25, dueOn: 'Instalación inicial' },
    { label: 'Pago final', percent: 25, dueOn: 'Al completar' },
  ],
]

const PRESET_LABELS_EN = ['50 / 50', '33 / 33 / 34', '25 / 25 / 25 / 25']
const PRESET_LABELS_ES = ['50 / 50', '33 / 33 / 34', '25 / 25 / 25 / 25']

export default function MilestoneEditor({ milestones, totalQuote, onChange }: Props) {
  const { lang } = useLanguage()
  const isEs = lang === 'es'
  const presets = isEs ? PRESETS_ES : PRESETS_EN
  const presetLabels = isEs ? PRESET_LABELS_ES : PRESET_LABELS_EN

  const [expandedMethodRow, setExpandedMethodRow] = useState<string | null>(null)

  const totalPct = milestones.reduce((s, m) => s + m.percent, 0)
  const isBalanced = Math.abs(totalPct - 100) < 0.5

  const collectedAmount = milestones
    .filter(m => m.paid)
    .reduce((s, m) => s + (totalQuote * m.percent / 100), 0)
  const remainingAmount = Math.max(0, totalQuote - collectedAmount)
  const anyPaid = milestones.some(m => m.paid)

  const methodLabel = (m: string) => ({
    cash: isEs ? 'Efectivo' : 'Cash',
    check: isEs ? 'Cheque' : 'Check',
    card: isEs ? 'Tarjeta' : 'Card',
    zelle: 'Zelle', venmo: 'Venmo', ach: 'ACH',
    other: isEs ? 'Otro' : 'Other',
  }[m] ?? m)

  const applyPreset = (preset: typeof presets[0]) => {
    onChange(preset.map(p => ({ id: uuidv4(), ...p })))
  }

  const update = (id: string, field: keyof PaymentMilestone, value: string | number | boolean) => {
    onChange(milestones.map(m => m.id === id ? { ...m, [field]: value } : m))
  }

  const remove = (id: string) => onChange(milestones.filter(m => m.id !== id))

  const add = () => {
    if (milestones.length >= 6) return
    const remaining = Math.max(0, 100 - totalPct)
    onChange([...milestones, {
      id: uuidv4(),
      label: isEs ? 'Pago' : 'Payment',
      percent: remaining,
      dueOn: isEs ? 'Al completar' : 'Upon completion',
    }])
  }

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5">{isEs ? 'Plantillas rápidas:' : 'Quick presets:'}</p>
        <div className="flex gap-2 flex-wrap">
          {presets.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyPreset(preset)}
              className="text-xs px-3 py-1 rounded-full border border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors"
            >
              {presetLabels[i]}
            </button>
          ))}
          {milestones.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {isEs ? 'Limpiar' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* Milestone rows */}
      {milestones.length > 0 && (
        <div className="space-y-1.5">
          {milestones.map((m, i) => (
            <div key={m.id} className={`rounded-lg border transition-colors ${m.paid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-transparent'}`}>
              <div className="flex items-center gap-2 px-3 py-2">
                {/* Paid checkbox */}
                <label className="flex items-center gap-1 cursor-pointer shrink-0" title={m.paid ? (isEs ? 'Marcar como pendiente' : 'Mark as unpaid') : (isEs ? 'Marcar como pagado' : 'Mark as paid')}>
                  <input
                    type="checkbox"
                    checked={m.paid ?? false}
                    onChange={e => {
                      update(m.id, 'paid', e.target.checked)
                      if (e.target.checked) setExpandedMethodRow(m.id)
                      else setExpandedMethodRow(prev => prev === m.id ? null : prev)
                    }}
                    className="w-3.5 h-3.5 rounded accent-green-600"
                  />
                </label>
                <span className="text-xs text-gray-400 font-medium w-3 shrink-0">{i + 1}</span>
                <input
                  className={`flex-1 min-w-0 text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300 ${m.paid ? 'line-through text-gray-400' : ''}`}
                  value={m.label}
                  onChange={e => update(m.id, 'label', e.target.value)}
                  placeholder={isEs ? 'Descripción' : 'Description'}
                />
                <div className="flex items-center gap-0.5 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="w-12 text-right text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300"
                    value={m.percent}
                    onChange={e => update(m.id, 'percent', Math.max(1, Math.min(100, +e.target.value)))}
                  />
                  <span className="text-gray-400 text-xs">%</span>
                </div>
                <span className={`text-xs font-semibold w-18 text-right shrink-0 ${m.paid ? 'text-green-600' : 'text-brand-700'}`}>
                  {m.paid ? '✓ ' : ''}{fmt(totalQuote * m.percent / 100)}
                </span>
                <input
                  className="w-24 text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300 shrink-0 hidden sm:block"
                  value={m.dueOn}
                  onChange={e => update(m.id, 'dueOn', e.target.value)}
                  placeholder={isEs ? 'Cuándo' : 'Due when'}
                />
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none shrink-0"
                >×</button>
              </div>
              {/* Inline method selector when paid */}
              {m.paid && (
                <div className="flex items-center gap-2 px-3 pb-2">
                  <span className="text-[10px] text-green-600 font-medium shrink-0">
                    {isEs ? 'Método:' : 'Via:'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {PAYMENT_METHODS.map(pm => (
                      <button
                        key={pm}
                        type="button"
                        onClick={() => update(m.id, 'paidMethod', pm)}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                          m.paidMethod === pm
                            ? 'bg-green-600 text-white border-green-600'
                            : 'border-green-200 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {methodLabel(pm)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="date"
                    className="ml-auto text-[10px] border border-green-200 rounded px-1.5 py-0.5 text-green-700 bg-white focus:outline-none"
                    value={m.paidAt ? m.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                    onChange={e => update(m.id, 'paidAt', e.target.value)}
                  />
                </div>
              )}
            </div>
          ))}
          {/* Balance indicator */}
          <div className="flex items-center justify-between text-xs font-medium px-3 pt-1">
            <div className={isBalanced ? 'text-green-600' : 'text-amber-600'}>
              {isEs ? 'Total' : 'Total'}: {totalPct.toFixed(0)}%
              {!isBalanced && ` (${isEs ? 'debe sumar 100%' : 'must = 100%'})`}
            </div>
            {anyPaid && (
              <div className="flex items-center gap-3 text-right">
                <span className="text-green-600">
                  ✓ {isEs ? 'Cobrado' : 'Collected'}: <strong>{fmt(collectedAmount)}</strong>
                </span>
                {remainingAmount > 0 && (
                  <span className="text-amber-600">
                    {isEs ? 'Pendiente' : 'Remaining'}: <strong>{fmt(remainingAmount)}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add button */}
      {milestones.length < 6 && (
        <button
          type="button"
          onClick={add}
          className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
        >
          + {isEs ? 'Agregar pago' : 'Add milestone'}
        </button>
      )}
    </div>
  )
}
