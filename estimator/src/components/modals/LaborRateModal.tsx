import { useState, useMemo } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { fmt } from '../../utils/calculations'

interface Props {
  onApply: (ratePerHour: number) => void
  onClose: () => void
}

const BURDENS = [
  { key: 'fica',     label: 'FICA (Social Security + Medicare)', labelEs: 'FICA (Seguro Social + Medicare)', value: 7.65 },
  { key: 'futa',     label: 'Federal Unemployment (FUTA)',        labelEs: 'Desempleo Federal (FUTA)',       value: 0.6 },
  { key: 'suta',     label: 'State Unemployment (SUTA)',          labelEs: 'Desempleo Estatal (SUTA)',       value: 2.7 },
  { key: 'workers',  label: "Workers' Comp",                      labelEs: 'Compensación Laboral',           value: 5.0 },
  { key: 'liability',label: 'General Liability Insurance',        labelEs: 'Seguro de Responsabilidad',      value: 2.0 },
  { key: 'health',   label: 'Health / Benefits',                  labelEs: 'Salud / Beneficios',             value: 4.0 },
]

export default function LaborRateModal({ onApply, onClose }: Props) {
  const { lang } = useLanguage()
  const isEs = lang === 'es'

  const [baseWage, setBaseWage] = useState<number>(25)
  const [burdens, setBurdens] = useState<Record<string, number>>(() =>
    Object.fromEntries(BURDENS.map(b => [b.key, b.value]))
  )
  const [overhead, setOverhead] = useState<number>(15)
  const [profit, setProfit] = useState<number>(20)

  const results = useMemo(() => {
    const totalBurdenPct = Object.values(burdens).reduce((s, v) => s + v, 0)
    const burdenCost = baseWage * (totalBurdenPct / 100)
    const loadedCost = baseWage + burdenCost
    const withOverhead = loadedCost / (1 - overhead / 100)
    const billRate = withOverhead / (1 - profit / 100)
    return {
      totalBurdenPct,
      burdenCost,
      loadedCost,
      withOverhead,
      billRate,
      multiplier: billRate / baseWage,
    }
  }, [baseWage, burdens, overhead, profit])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-lg">{isEs ? '⚡ Calculadora de Tarifa Laboral' : '⚡ Labor Rate Calculator'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEs ? 'Calcula tu tarifa de facturación basada en costos reales' : 'Calculate your billing rate from real loaded costs'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Base wage */}
          <div>
            <label className="form-label">{isEs ? 'Salario base por hora' : 'Base wage per hour'}</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">$</span>
              <input
                type="number"
                min={1}
                step={0.5}
                className="form-input flex-1"
                value={baseWage}
                onChange={e => setBaseWage(Math.max(1, +e.target.value))}
              />
              <span className="text-gray-400 text-sm">/hr</span>
            </div>
          </div>

          {/* Burden rates */}
          <div>
            <label className="form-label mb-2">
              {isEs ? 'Cargas laborales' : 'Burden rates'}
              <span className="text-gray-400 text-xs font-normal ml-1">
                ({isEs ? 'total' : 'total'}: {results.totalBurdenPct.toFixed(1)}%)
              </span>
            </label>
            <div className="space-y-2 bg-gray-50 rounded-xl p-3">
              {BURDENS.map(b => (
                <div key={b.key} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">{isEs ? b.labelEs : b.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={0.1}
                      className="w-16 text-right text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-300"
                      value={burdens[b.key]}
                      onChange={e => setBurdens(prev => ({ ...prev, [b.key]: Math.max(0, +e.target.value) }))}
                    />
                    <span className="text-gray-400 text-xs">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overhead & profit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{isEs ? 'Gastos generales (%)' : 'Overhead (%)'}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={60}
                  step={1}
                  className="form-input flex-1"
                  value={overhead}
                  onChange={e => setOverhead(Math.min(60, Math.max(0, +e.target.value)))}
                />
                <span className="text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="form-label">{isEs ? 'Utilidad deseada (%)' : 'Target profit (%)'}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={60}
                  step={1}
                  className="form-input flex-1"
                  value={profit}
                  onChange={e => setProfit(Math.min(60, Math.max(0, +e.target.value)))}
                />
                <span className="text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Results breakdown */}
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{isEs ? 'Salario base' : 'Base wage'}</span>
              <span className="font-medium">{fmt(baseWage)}/hr</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>{isEs ? `Cargas (${results.totalBurdenPct.toFixed(1)}%)` : `Burden (${results.totalBurdenPct.toFixed(1)}%)`}</span>
              <span className="font-medium">+{fmt(results.burdenCost)}/hr</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 pb-1 border-b border-brand-100">
              <span>{isEs ? 'Costo cargado' : 'Loaded cost'}</span>
              <span className="font-medium">{fmt(results.loadedCost)}/hr</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>{isEs ? `Gastos generales (${overhead}%)` : `Overhead (${overhead}%)`}</span>
              <span className="font-medium">+{fmt(results.withOverhead - results.loadedCost)}/hr</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 pb-1 border-b border-brand-100">
              <span>{isEs ? `Utilidad (${profit}%)` : `Profit (${profit}%)`}</span>
              <span className="font-medium">+{fmt(results.billRate - results.withOverhead)}/hr</span>
            </div>
            <div className="flex justify-between font-bold text-brand-700 text-base pt-1">
              <span>{isEs ? '💰 Tarifa de facturación' : '💰 Billing rate'}</span>
              <span>{fmt(results.billRate)}/hr</span>
            </div>
            <p className="text-[10px] text-brand-600 text-right">
              {isEs ? `Multiplicador: ${results.multiplier.toFixed(2)}× salario base` : `${results.multiplier.toFixed(2)}× base wage`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between gap-3">
          <button onClick={onClose} className="btn-secondary">
            {isEs ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            onClick={() => { onApply(Math.round(results.billRate * 100) / 100); onClose() }}
            className="btn-primary"
          >
            {isEs ? `Usar ${fmt(results.billRate)}/hr` : `Use ${fmt(results.billRate)}/hr`}
          </button>
        </div>
      </div>
    </div>
  )
}
