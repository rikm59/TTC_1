import { format } from 'date-fns'
import type { Estimate, CalculatedTotals } from '../../types'
import { fmt, fmtPct } from '../../utils/calculations'
import { getTierConfig } from '../../data/contractorTiers'
import { useLanguage } from '../../context/LanguageContext'

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
}) => {
  const { t } = useLanguage()
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selected ? `border-${color}-500 bg-${color}-50` : 'border-gray-100 bg-white hover:border-gray-200'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-semibold text-sm ${selected ? `text-${color}-700` : 'text-gray-700'}`}>{label}</span>
        {selected && <span className={`text-xs px-2 py-0.5 rounded-full bg-${color}-100 text-${color}-700 font-medium`}>{t('results.selectedBadge')}</span>}
      </div>
      <div className={`text-2xl font-bold ${selected ? `text-${color}-700` : 'text-gray-800'}`}>{fmt(quote)}</div>
      <div className="flex gap-3 mt-1">
        <span className="text-xs text-gray-500">{t('results.profit')} <span className="font-semibold text-green-600">{fmt(profit)}</span></span>
        <span className="text-xs text-gray-500">{t('results.margin')} <span className="font-semibold">{fmtPct(margin)}</span></span>
      </div>
    </button>
  )
}

export default function ContractorResults({ estimate, totals, onUpdateSettings }: Props) {
  const { t } = useLanguage()
  const { settings } = estimate
  const { materialsCost, materialsWithMarkup, laborCost, overheadCost, hardCost } = totals

  const tierConfig = getTierConfig(settings.contractorTier ?? 'contractor')

  const tierColorClasses = {
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', title: 'text-blue-800' },
    amber: { border: 'border-amber-500', bg: 'bg-amber-50', title: 'text-amber-800' },
    green: { border: 'border-green-500', bg: 'bg-green-50', title: 'text-green-800' },
  }[tierConfig.color]

  const matMult = settings.materialLocationMultiplier ?? 1.0
  const labMult = settings.laborLocationMultiplier ?? 1.0

  // Projected duration from labor hours
  const totalLaborHours = estimate.labor.reduce((s, l) => s + l.workers * l.hours, 0)
  const projectedDays   = totalLaborHours > 0 ? Math.ceil(totalLaborHours / 8) : 0
  const projWeeks = Math.floor(projectedDays / 7)
  const projRem   = projectedDays % 7
  const projLabel = projectedDays === 0 ? null
    : projWeeks > 0
      ? `${projWeeks} week${projWeeks > 1 ? 's' : ''}${projRem > 0 ? ` ${projRem} day${projRem > 1 ? 's' : ''}` : ''}`
      : `${projectedDays} day${projectedDays > 1 ? 's' : ''}`

  // Date display helpers
  const fmt_date = (d: string | undefined) =>
    d ? format(new Date(d + 'T12:00:00'), 'MMM d, yyyy') : null

  return (
    <div className="space-y-4">
      {/* Tier badge */}
      <div className={`card p-3 border-l-4 ${tierColorClasses.border} ${tierColorClasses.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-bold text-sm ${tierColorClasses.title}`}>
              {tierConfig.icon} {tierConfig.tagline}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">{tierConfig.description}</p>
          </div>
        </div>
      </div>

      {/* Timeline summary */}
      {(projLabel || settings.estimateDate || settings.projectStartDate || settings.projectEndDate) && (
        <div className="card p-3 bg-gray-50 border border-gray-200">
          <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-2">{t('results.timeline')}</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {settings.estimateDate && (
              <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">{t('results.estimateDate')}</span><span className="font-medium text-gray-700">{fmt_date(settings.estimateDate)}</span></div>
            )}
            {settings.projectStartDate && (
              <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">{t('results.startDate')}</span><span className="font-medium text-gray-700">{fmt_date(settings.projectStartDate)}</span></div>
            )}
            {settings.projectEndDate && (
              <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">{t('results.completion')}</span><span className="font-medium text-gray-700">{fmt_date(settings.projectEndDate)}</span></div>
            )}
            {projLabel && (
              <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">{t('results.estDuration')}</span><span className="font-medium text-brand-700">{projLabel} ({totalLaborHours.toFixed(0)} {t('results.laborHrs')})</span></div>
            )}
          </div>
        </div>
      )}

      {/* Cost Breakdown */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
          {t('results.costBreakdown')} <span className="text-xs font-normal text-gray-400">{t('results.contractorOnly')}</span>
        </h3>
        <div className="space-y-2">
          {[
            { label: t('results.matCost'), val: materialsCost, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: t('results.matWithMarkup', { n: String(settings.materialMarkupPercent) }), val: materialsWithMarkup, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: t('results.labor'), val: laborCost, color: 'text-green-600', bg: 'bg-green-50' },
            { label: t('results.overhead'), val: overheadCost, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ label, val, color, bg }) => (
            <div key={label} className={`flex justify-between items-center px-3 py-2 rounded-lg ${bg}`}>
              <span className="text-xs text-gray-600">{label}</span>
              <span className={`font-semibold text-sm ${color}`}>{fmt(val)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-gray-800 mt-1">
            <span className="text-sm font-semibold text-white">{t('results.totalHardCost')}</span>
            <span className="text-lg font-bold text-white">{fmt(hardCost)}</span>
          </div>

          {/* Location factor */}
          {(matMult !== 1.0 || labMult !== 1.0) && settings.locationLabel && (
            <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-purple-50 mt-1">
              <span className="text-xs text-gray-600">
                📍 Location: {settings.locationLabel}
              </span>
              <span className="text-xs font-medium text-purple-700">
                Mat ×{matMult.toFixed(2)} · Labor ×{labMult.toFixed(2)}
              </span>
            </div>
          )}

          {/* Labor Only note */}
          {(settings.contractorTier === 'labor-only') && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-100">
              <span className="text-xs text-green-700 font-medium">
                {t('results.laborOnlyNote')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Markup Settings */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">{t('results.markupSettings')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">{t('results.matMarkupPct')}</label>
            <div className="flex items-center gap-1">
              <input
                type="number" min="0" max="500"
                className="form-input"
                value={settings.materialMarkupPercent}
                onChange={e => onUpdateSettings('materialMarkupPercent', parseFloat(e.target.value) || 0)}
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{t('results.matMarkupHint')}</p>
          </div>
          <div>
            <label className="form-label">{t('results.taxRate')}</label>
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
            <label className="form-label">{t('results.conservativePct')}</label>
            <input
              type="number" min="0" max="99"
              className="form-input"
              value={settings.marginMin}
              onChange={e => onUpdateSettings('marginMin', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="form-label">{t('results.standardPct')}</label>
            <input
              type="number" min="0" max="99"
              className="form-input"
              value={settings.marginMid}
              onChange={e => onUpdateSettings('marginMid', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="form-label">{t('results.premiumPct')}</label>
            <input
              type="number" min="0" max="99"
              className="form-input"
              value={settings.marginMax}
              onChange={e => onUpdateSettings('marginMax', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">{t('results.grossMarginHint')}</p>
      </div>

      {/* Pricing Tiers */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">{t('results.pricingOptions')}</h3>
        <div className="space-y-2">
          <TierCard
            label={t('results.conservative', { n: fmtPct(settings.marginMin) })}
            quote={totals.conservativeQuote}
            profit={totals.conservativeProfit}
            margin={totals.conservativeMargin}
            selected={settings.selectedTier === 'conservative'}
            onSelect={() => onUpdateSettings('selectedTier', 'conservative')}
            color="blue"
          />
          <TierCard
            label={t('results.standard', { n: fmtPct(settings.marginMid) })}
            quote={totals.standardQuote}
            profit={totals.standardProfit}
            margin={totals.standardMargin}
            selected={settings.selectedTier === 'standard'}
            onSelect={() => onUpdateSettings('selectedTier', 'standard')}
            color="brand"
          />
          <TierCard
            label={t('results.premium', { n: fmtPct(settings.marginMax) })}
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
              {t('results.quoteRange')} <strong>{fmt(totals.conservativeQuote)}</strong> – <strong>{fmt(totals.premiumQuote)}</strong>
            </p>
            <p className="text-xs text-brand-600 mt-1">
              {t('results.selectedSummary', { quote: fmt(totals.selectedQuote), margin: fmtPct(totals.selectedMargin), profit: fmt(totals.selectedProfit) })}
            </p>
          </div>
        )}
      </div>

      {/* Quote Terms */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">{t('results.quoteTerms')}</h3>
        <div className="space-y-2">
          <div>
            <label className="form-label">{t('results.paymentTerms')}</label>
            <input
              className="form-input text-xs"
              value={settings.paymentTerms}
              onChange={e => onUpdateSettings('paymentTerms', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">{t('results.warranty')}</label>
            <input
              className="form-input text-xs"
              value={settings.warranty}
              onChange={e => onUpdateSettings('warranty', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">{t('results.validDays')}</label>
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
          <p className="text-sm">{t('results.empty')}</p>
        </div>
      )}
    </div>
  )
}
