import { useState } from 'react'
import { Building2, User, MapPin, Phone, Globe, ShieldCheck, DollarSign, FileText, X, Info } from 'lucide-react'
import type { CompanySettings } from '../../types'

interface Props {
  company: CompanySettings
  onSave: (c: CompanySettings) => void
  onClose: () => void
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

export default function SettingsModal({ company, onSave, onClose }: Props) {
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
              <h2 className="font-bold text-gray-900 text-base">Company Settings</h2>
              <p className="text-xs text-gray-400">Used on all estimates and client documents</p>
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
              title="Business Identity"
              subtitle="Your company name and owner name appear at the top of every quote"
              color="bg-brand-50 text-brand-700"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Company / Business Name">
                  <input className={inputCls} value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Smith Contracting LLC" />
                </Field>
              </div>
              <Field label="Owner / Contact Name">
                <input className={inputCls} value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="John Smith" />
              </Field>
              <Field label="Logo URL" hint="Paste a direct link to your logo image (PNG, JPG, SVG). Upload your logo in the Onboarding wizard or update it in your profile.">
                <input className={inputCls} value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder="https://…/logo.png" />
              </Field>
              {form.logoUrl && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Logo Preview</p>
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
              title="Contact & Location"
              subtitle="Address and contact details printed on estimates"
              color="bg-blue-50 text-blue-700"
            />
            <div className="space-y-4">
              <Field label="Street Address">
                <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="456 Commerce Blvd" />
              </Field>
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <Field label="City">
                    <input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Denver" />
                  </Field>
                </div>
                <div>
                  <Field label="State">
                    <select className={selectCls} value={form.state} onChange={e => set('state', e.target.value)}>
                      <option value="">—</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="ZIP Code">
                    <input className={inputCls} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="80201" maxLength={10} />
                  </Field>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className={`${inputCls} pl-9`} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-5555" type="tel" />
                  </div>
                </Field>
                <Field label="Email">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className={`${inputCls} pl-9`} value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@yourcompany.com" type="email" />
                  </div>
                </Field>
                <Field label="Website">
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
              title="Credentials"
              subtitle="License and insurance info shown on client-facing quotes"
              color="bg-emerald-50 text-emerald-700"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contractor License #">
                <input className={inputCls} value={form.license} onChange={e => set('license', e.target.value)} placeholder="LIC-123456" />
              </Field>
              <Field label="Insurance Provider / Policy #">
                <input className={inputCls} value={form.insurance} onChange={e => set('insurance', e.target.value)} placeholder="Acme Insurance · POL-789" />
              </Field>
            </div>
          </section>

          {/* ── Pricing Defaults ── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <SectionHeader
              icon={DollarSign}
              title="Pricing Defaults"
              subtitle="These values pre-fill every new estimate — you can override per job"
              color="bg-amber-50 text-amber-700"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Material Markup" hint="Added on top of material cost before applying your margin.">
                <NumberInput value={form.defaultMaterialMarkup} onChange={v => set('defaultMaterialMarkup', v)} min={0} max={200} suffix="%" />
              </Field>
              <Field label="Tax Rate">
                <NumberInput value={form.taxRate} onChange={v => set('taxRate', v)} min={0} max={20} step={0.1} suffix="%" />
              </Field>
              <Field label="Quote Valid">
                <NumberInput value={form.defaultValidityDays} onChange={v => set('defaultValidityDays', v)} min={1} suffix="days" />
              </Field>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">3-Tier Profit Margins</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Conservative</p>
                  <NumberInput value={form.defaultMarginMin} onChange={v => set('defaultMarginMin', v)} min={0} max={99} suffix="%" />
                  <p className="text-xs text-gray-400 mt-1.5">Budget-friendly quote</p>
                </div>
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-semibold text-brand-600 mb-2">Standard ★</p>
                  <NumberInput value={form.defaultMarginMid} onChange={v => set('defaultMarginMid', v)} min={0} max={99} suffix="%" />
                  <p className="text-xs text-brand-400 mt-1.5">Your typical rate</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-semibold text-amber-600 mb-2">Premium</p>
                  <NumberInput value={form.defaultMarginMax} onChange={v => set('defaultMarginMax', v)} min={0} max={99} suffix="%" />
                  <p className="text-xs text-amber-500 mt-1.5">High-end pricing</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Default Terms ── */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <SectionHeader
              icon={FileText}
              title="Default Terms"
              subtitle="Pre-filled on every quote — edit per estimate as needed"
              color="bg-purple-50 text-purple-700"
            />
            <div className="space-y-4">
              <Field label="Payment Terms">
                <textarea
                  className={`${inputCls} h-20 resize-none`}
                  value={form.defaultPaymentTerms}
                  onChange={e => set('defaultPaymentTerms', e.target.value)}
                  placeholder="e.g. 50% deposit required to schedule. Balance due upon project completion."
                />
              </Field>
              <Field label="Warranty">
                <textarea
                  className={`${inputCls} h-20 resize-none`}
                  value={form.defaultWarranty}
                  onChange={e => set('defaultWarranty', e.target.value)}
                  placeholder="e.g. 1-year warranty on all labor. Manufacturer warranty applies to materials."
                />
              </Field>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-6 py-4 bg-white rounded-b-2xl border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(form); onClose() }}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
