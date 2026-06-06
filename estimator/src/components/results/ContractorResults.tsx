import type { Estimate, CalculatedTotals } from '../../types'
import { fmt, fmtPct } from '../../utils/calculations'

interface Props {
  estimate: Estimate
  totals: CalculatedTotals
  onUpdateSettings: (field: string, value: string | number | boolean) => void
}

const TierCard = ({
  label, quote, profit, margin, selected, onSelect, color,
}: {
  label: string; quote: number; profit: number; margin: number
  selected: boolean; onSelect: () => void; color: string
}) => (
  <button
    onClick={onSelect}
    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selected ? `border-${color}-500 bg-${color}-50` : 'border-gray-100 bg-white hover:border-gray-200'}`}
  >
    <div className="flex items-center justify-between mb-1">
      <span className={`font-semibold text-sm ${selected ? `text-${color}-700` : 'text-gray-700'}`}>{label}</span>
      {selected && <span className={`text-xs px-2 py-0.5 rounded-full bg-${color}-100 text-${color}-700 font-medium`}>Selected</span>}
    </div>
    <div className={`text-2xl font-bold ${selected ? `text-${color}-700` : 'text-gray-800'}`}>{fmt(quote)}</div>
    <div className="flex gap-3 mt-1">
      <span className="text-xs text-gray-500">Profit: <span className="font-semibold text-green-600">{fmt(profit)}</span></span>
      <span className="text-xs text-gray-500">Margin: <span className="font-semibold">{fmtPct(margin)}</span></span>
    </div>
  </button>
)

export default function ContractorResults({ estimate, totals, onUpdateSettings }: Props) {
  const { settings } = estimate
  const { materialsCost, materialsWithMarkup, laborCost, overheadCost, hardCost } = totals

  return (
    <div className="space-y-4">
      {/* Cost Breakdown */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
          🔒 Cost Breakdown <span className="text-xs font-normal text-gray-400">(contractor only)</span>
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Materials (Your Cost)', val: materialsCost, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: `Materials (w/ ${settings.materialMarkupPercent}% markup)`, val: materialsWithMarkup, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Labor', val: laborCost, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Overhead / Equipment', val: overheadCost, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ label, val, color, bg }) => (
            <div key={label} className={`flex justify-between items-center px-3 py-2 rounded-lg ${bg}`}>
              <span className="text-xs text-gray-600">{label}</span>
              <span className={`font-semibold text-sm ${color}`}>{fmt(val)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-gray-800 mt-1">
            <span className="text-sm font-semibold text-white">Total Hard Cost</span>
            <span className="text-lg font-bold text-white">{fmt(hardCost)}</span>
          </div>
        </div>
      </div>

      {/* Markup Settings */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">⚙️ Markup & Margin Settings</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Material Markup %</label>
            <div className="flex items-center gap-1">
              <input
                type="number" min="0" max="500"
                className="form-input"
                value={settings.materialMarkupPercent}
                onChange={e => onUpdateSettings('materialMarkupPercent', parseFloat(e.target.value) || 0)}
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Added to each material's unit cost</p>
          </div>
          <div>
            <label className="form-label">Tax Rate %</label>
            <div className="flex items-center gap-1">
              <input
                type="number" min="0" max="20" step="0.1"
                className="form-input"
                value={settings.taxRate}
                onChange={e => onUpdateSettings('taxRate', parseFloat(e.target.value) || 0)}
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div>
            <label className="form-label">Conservative %</label>
            <input
              type="number" min="0" max="99"
              className="form-input"
              value={settings.marginMin}
              onChange={e => onUpdateSettings('marginMin', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="form-label">Standard %</label>
            <input
              type="number" min="0" max="99"
              className="form-input"
              value={settings.marginMid}
              onChange={e => onUpdateSettings('marginMid', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="form-label">Premium %</label>
            <input
              type="number" min="0" max="99"
              className="form-input"
              value={settings.marginMax}
              onChange={e => onUpdateSettings('marginMax', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Gross profit margin targets (Quote = Hard Cost ÷ (1 − margin%))</p>
      </div>

      {/* Pricing Tiers */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">📊 Pricing Options — Select Your Quote</h3>
        <div className="space-y-2">
          <TierCard
            label={`📈 Conservative (${fmtPct(settings.marginMin)} target)`}
            quote={totals.conservativeQuote}
            profit={totals.conservativeProfit}
            margin={totals.conservativeMargin}
            selected={settings.selectedTier === 'conservative'}
            onSelect={() => onUpdateSettings('selectedTier', 'conservative')}
            color="blue"
          />
          <TierCard
            label={`⚖️ Standard (${fmtPct(settings.marginMid)} target)`}
            quote={totals.standardQuote}
            profit={totals.standardProfit}
            margin={totals.standardMargin}
            selected={settings.selectedTier === 'standard'}
            onSelect={() => onUpdateSettings('selectedTier', 'standard')}
            color="brand"
          />
          <TierCard
            label={`🚀 Premium (${fmtPct(settings.marginMax)} target) ★ Recommended`}
            quote={totals.premiumQuote}
            profit={totals.premiumProfit}
            margin={totals.premiumMargin}
            selected={settings.selectedTier === 'premium'}
            onSelect={() => onUpdateSettings('selectedTier', 'premium')}
            color="green"
          />
        </div>

        {hardCost > 0 && (
          <div className="mt-3 p-3 bg-brand-50 rounded-lg border border-brand-100">
            <p className="text-xs text-brand-700 font-medium">
              💡 Quote Range: <strong>{fmt(totals.conservativeQuote)}</strong> – <strong>{fmt(totals.premiumQuote)}</strong>
            </p>
            <p className="text-xs text-brand-600 mt-1">
              Selected: <strong>{fmt(totals.selectedQuote)}</strong> with <strong>{fmtPct(totals.selectedMargin)}</strong> gross profit margin ({fmt(totals.selectedProfit)} profit)
            </p>
          </div>
        )}
      </div>

      {/* Quote Terms */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">📋 Quote Terms</h3>
        <div className="space-y-2">
          <div>
            <label className="form-label">Payment Terms</label>
            <input
              className="form-input text-xs"
              value={settings.paymentTerms}
              onChange={e => onUpdateSettings('paymentTerms', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Warranty</label>
            <input
              className="form-input text-xs"
              value={settings.warranty}
              onChange={e => onUpdateSettings('warranty', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Quote Valid for (days)</label>
            <input
              type="number" min="1" max="365"
              className="form-input"
              value={settings.validityDays}
              onChange={e => onUpdateSettings('validityDays', parseInt(e.target.value) || 30)}
            />
          </div>
        </div>
      </div>

      {hardCost === 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm">Fill in project details to see your estimate calculations</p>
        </div>
      )}
    </div>
  )
}
