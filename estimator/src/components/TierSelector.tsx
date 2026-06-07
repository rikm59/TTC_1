import { useLanguage } from '../context/LanguageContext'
import type { ContractorTier } from '../types'
import { CONTRACTOR_TIERS, getTierConfig } from '../data/contractorTiers'

interface Props {
  selected: ContractorTier
  onChange: (tier: ContractorTier) => void
}

export default function TierSelector({ selected, onChange }: Props) {
  const { t } = useLanguage()
  const active = getTierConfig(selected)

  const colorClasses = {
    blue: {
      active: 'border-blue-500 bg-blue-50 text-blue-700',
      inactive: 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50/40',
      panel: 'bg-blue-50 border border-blue-100',
      title: 'text-blue-800',
      meta: 'text-blue-700',
    },
    amber: {
      active: 'border-amber-500 bg-amber-50 text-amber-700',
      inactive: 'border-gray-200 bg-white text-gray-600 hover:border-amber-200 hover:bg-amber-50/40',
      panel: 'bg-amber-50 border border-amber-100',
      title: 'text-amber-800',
      meta: 'text-amber-700',
    },
    green: {
      active: 'border-green-500 bg-green-50 text-green-700',
      inactive: 'border-gray-200 bg-white text-gray-600 hover:border-green-200 hover:bg-green-50/40',
      panel: 'bg-green-50 border border-green-100',
      title: 'text-green-800',
      meta: 'text-green-700',
    },
  }

  return (
    <div className="card p-4">
      <h2 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
        {t('app.tier.title')}
      </h2>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {CONTRACTOR_TIERS.map(tier => {
          const isSelected = tier.id === selected
          const classes = colorClasses[tier.color]
          return (
            <button
              key={tier.id}
              onClick={() => onChange(tier.id)}
              className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${isSelected ? classes.active : classes.inactive}`}
            >
              <span className="text-2xl mb-1">{tier.icon}</span>
              <span className="font-bold text-xs text-center leading-tight">{tier.label}</span>
              {isSelected && (
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{t('app.tier.active')}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Active tier description */}
      <div className={`rounded-lg p-3 text-xs ${colorClasses[active.color].panel}`}>
        <p className={`font-semibold mb-1 ${colorClasses[active.color].title}`}>
          {active.icon} {active.tagline}
        </p>
        <p className="text-gray-600 mb-2">{active.description}</p>
        <ul className="space-y-0.5">
          {active.bullets.map(b => (
            <li key={b} className="text-gray-600">• {b}</li>
          ))}
        </ul>
        <p className={`mt-2 font-medium ${colorClasses[active.color].meta}`}>
          {t('app.tier.defaultMargins', {
            min: String(active.defaultMarginMin),
            mid: String(active.defaultMarginMid),
            max: String(active.defaultMarginMax),
            markup: String(active.defaultMaterialMarkup),
          })}
        </p>
      </div>
    </div>
  )
}
