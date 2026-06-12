import { useState } from 'react'
import { Building2, User, MapPin, Phone, Globe, ShieldCheck, DollarSign, FileText, X, Info, CreditCard, ExternalLink } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import type { CompanySettings } from '../../types'
import type { Profile } from '../../lib/supabase'

interface Props {
  company: CompanySettings
  onSave: (c: CompanySettings) => void
  onClose: () => void
  profile?: Profile
  onBillingPortal?: () => void
  onStartCheckout?: () => void
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

function SectionHeader({ icon: Icon, title, subtitle, color }: {
  icon: React.ElementType; title: string; subtitle?: string; color: string
}) {
  return (
    <div className={`flex items-center gap-3 px-5 py-4 rounded-xl mb-4 ${color}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <div>
        <p className="font-bold text-sm">{title}</p>
        {subtitle && <p className="text-xs opacity-75 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
        {hint && (
          <span className="group relative">
            <Info className="w-3 h-3 text-gray-400 cursor-help" />
            <span className="pointer-events-none absolute left-5 -top-1 z-50 w-52 rounded-lg bg-gray-900 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {hint}
            </span>
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition placeholder:text-gray-400'
const selectCls = `${inputCls} appearance-none`

function NumberInput({ value, onChange, min, max, step, suffix }: {
  value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; suffix?: string
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(+e.target.value)}
        className={`${inputCls} ${suffix ? 'pr-8' : ''}`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  )
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:   { label: 'Active',    color: 'bg-green-100 text-green-700' },
  trialing: { label: 'Trial',     color: 'bg-blue-100 text-blue-700' },
  past_due: { label: 'Past Due',  color: 'bg-yellow-100 text-yellow-700' },
  canceled: { label: 'Canceled',  color: 'bg-red-100 text-red-600' },
  inactive: { label: 'Inactive',  color: 'bg-gray-100 text-gray-500' },
}

const ACCOUNT_TYPE_LABELS: Record<string, { label: string; price: string }> = {
  'contractor':    { label: 'Contractor',     price: '$97/mo' },
  'subcontractor': { label: 'Sub-Contractor', price: '$67/mo' },
  'labor-only':    { label: 'Labor Only',     price: '$39/mo' },
}

function BillingSection({
  profile, onBillingPortal, onStartCheckout,
}: { profile: Profile; onBillingPortal?: () => void; onStartCheckout?: () => void }) {
  const status = profile.subscription_status ?? 'inactive'
  const statusCfg = STATUS_LABELS[status] ?? STATUS_LABELS.inactive
  const accountCfg = ACCOUNT_TYPE_LABELS[profile.account_type ?? 'contractor']
  const hasSubscription = !!profile.stripe_subscription_id
  const isTrialing = status === 'trialing'
  const isPastDue = status === 'past_due'
  const isCanceled = status === 'canceled'
  const trialDaysLeft = isTrialing && profile.trial_expires_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_expires_at).getTime() - Date.now()) / 86_400_000))
    : null

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <SectionHeader
        icon={CreditCard}
        title="Billing & Subscription"
        subtitle="Manage your plan and payment details"
        color="bg-indigo-50 text-indigo-700"
      />

      <div className="space-y-3">
        {/* Account type + plan row */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Account Type</p>
            <p className="text-sm font-bold text-gray-900">{accountCfg.label}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Rate</p>
            <p className="text-sm font-bold text-gray-900">{accountCfg.price}</p>
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Status</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
              {trialDaysLeft !== null && (
                <span className="text-xs text-gray-500">{trialDaysLeft} days remaining</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Plan</p>
            <p className="text-sm font-bold text-gray-900 capitalize">{profile.plan ?? 'free'}</p>
          </div>
        </div>

        {/* Warning messages */}
        {isPastDue && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-800 font-medium">
            Payment failed — update your payment method to keep access.
          </div>
        )}
        {isCanceled && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 font-medium">
            Your subscription has ended. Resubscribe to restore full access.
          </div>
        )}

        {/* Action button */}
        {hasSubscription && onBillingPortal ? (
          <button
            onClick={onBillingPortal}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <ExternalLink className="w-4 h-4" />
            Manage Billing
          </button>
        ) : !hasSubscription && onStartCheckout ? (
          <button
            onClick={onStartCheckout}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            Start Free Trial
          </button>
        ) : null}
      </div>
    </section>
  )
}

export default function SettingsModal({ company, onSave, onClose, profile, onBillingPortal, onStartCheckout }: Props) {
  const { t } = useLanguage()
  const [form, setForm] = useState<CompanySettings>(company)
  const set = (k: keyof CompanySettings, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white rounded-t-2xl border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">{t('settings.title')}</h2>
              <p className="text-xs text-gray-400">{t('settings.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Business Identity ── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <SectionHeader
              icon={Building2}
              title={t('settings.identity.title')}
              subtitle={t('settings.identity.subtitle')}
              color="bg-brand-50 text-brand-700"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label={t('settings.company')}>
                  <input className={inputCls} value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Smith Contracting LLC" />
                </Field>
              </div>
              <Field label={t('settings.owner')}>
                <input className={inputCls} value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="John Smith" />
              </Field>
              <Field label={t('settings.logo')} hint={t('settings.logoHint')}>
                <input className={inputCls} value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder="https://…/logo.png" />
              </Field>
              {form.logoUrl && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('settings.logoPreview')}</p>
                  <div className="h-16 w-auto inline-flex items-center justify-center border border-gray-200 rounded-xl bg-gray-50 px-4">
                    <img src={form.logoUrl} alt="Logo preview" className="h-12 w-auto object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Contact & Location ── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <SectionHeader
              icon={MapPin}
              title={t('settings.contact.title')}
              subtitle={t('settings.contact.subtitle')}
              color="bg-blue-50 text-blue-700"
            />
            <div className="space-y-4">
              <Field label={t('settings.streetAddress')}>
                <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="456 Commerce Blvd" />
              </Field>
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <Field label={t('settings.city')}>
                    <input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Denver" />
                  </Field>
                </div>
                <div>
                  <Field label={t('settings.state')}>
                    <select className={selectCls} value={form.state} onChange={e => set('state', e.target.value)}>
                      <option value="">—</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label={t('settings.zip')}>
                    <input className={inputCls} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="80201" maxLength={10} />
                  </Field>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t('settings.phone')}>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className={`${inputCls} pl-9`} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-5555" type="tel" />
                  </div>
                </Field>
                <Field label={t('settings.email')}>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className={`${inputCls} pl-9`} value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@yourcompany.com" type="email" />
                  </div>
                </Field>
                <Field label={t('settings.website')}>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className={`${inputCls} pl-9`} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yourcompany.com" type="url" />
                  </div>
                </Field>
              </div>
            </div>
          </section>

          {/* ── Credentials ── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <SectionHeader
              icon={ShieldCheck}
              title={t('settings.creds.title')}
              subtitle={t('settings.creds.subtitle')}
              color="bg-emerald-50 text-emerald-700"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('settings.license')}>
                <input className={inputCls} value={form.license} onChange={e => set('license', e.target.value)} placeholder="LIC-123456" />
              </Field>
              <Field label={t('settings.insurance')}>
                <input className={inputCls} value={form.insurance} onChange={e => set('insurance', e.target.value)} placeholder="Acme Insurance · POL-789" />
              </Field>
            </div>
          </section>

          {/* ── Pricing Defaults ── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <SectionHeader
              icon={DollarSign}
              title={t('settings.pricing.title')}
              subtitle={t('settings.pricing.subtitle')}
              color="bg-amber-50 text-amber-700"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label={t('settings.matMarkup')} hint={t('settings.matMarkupHint')}>
                <NumberInput value={form.defaultMaterialMarkup} onChange={v => set('defaultMaterialMarkup', v)} min={0} max={200} suffix="%" />
              </Field>
              <Field label={t('settings.taxRate')}>
                <NumberInput value={form.taxRate} onChange={v => set('taxRate', v)} min={0} max={20} step={0.1} suffix="%" />
              </Field>
              <Field label={t('settings.quoteValid')}>
                <NumberInput value={form.defaultValidityDays} onChange={v => set('defaultValidityDays', v)} min={1} suffix={t('settings.days')} />
              </Field>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('settings.margins')}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-semibold text-gray-500 mb-2">{t('settings.conservative')}</p>
                  <NumberInput value={form.defaultMarginMin} onChange={v => set('defaultMarginMin', v)} min={0} max={99} suffix="%" />
                  <p className="text-xs text-gray-400 mt-1.5">{t('settings.conservativeSub')}</p>
                </div>
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-semibold text-brand-600 mb-2">{t('settings.standard')}</p>
                  <NumberInput value={form.defaultMarginMid} onChange={v => set('defaultMarginMid', v)} min={0} max={99} suffix="%" />
                  <p className="text-xs text-brand-400 mt-1.5">{t('settings.standardSub')}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-semibold text-amber-600 mb-2">{t('settings.premium')}</p>
                  <NumberInput value={form.defaultMarginMax} onChange={v => set('defaultMarginMax', v)} min={0} max={99} suffix="%" />
                  <p className="text-xs text-amber-500 mt-1.5">{t('settings.premiumSub')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Default Terms ── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <SectionHeader
              icon={FileText}
              title={t('settings.terms.title')}
              subtitle={t('settings.terms.subtitle')}
              color="bg-purple-50 text-purple-700"
            />
            <div className="space-y-4">
              <Field label={t('settings.paymentTerms')}>
                <textarea
                  className={`${inputCls} h-20 resize-none`}
                  value={form.defaultPaymentTerms}
                  onChange={e => set('defaultPaymentTerms', e.target.value)}
                  placeholder="e.g. 50% deposit required to schedule. Balance due upon project completion."
                />
              </Field>
              <Field label={t('settings.warranty')}>
                <textarea
                  className={`${inputCls} h-20 resize-none`}
                  value={form.defaultWarranty}
                  onChange={e => set('defaultWarranty', e.target.value)}
                  placeholder="e.g. 1-year warranty on all labor. Manufacturer warranty applies to materials."
                />
              </Field>
            </div>
          </section>

          {/* ── Billing & Subscription ── */}
          {profile && (
            <BillingSection
              profile={profile}
              onBillingPortal={onBillingPortal}
              onStartCheckout={onStartCheckout}
            />
          )}

        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 bg-white rounded-b-2xl border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            {t('settings.cancel')}
          </button>
          <button
            onClick={() => { onSave(form); onClose() }}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
