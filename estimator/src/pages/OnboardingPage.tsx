import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TTCLogo from '../components/TTCLogo'
import {
  User, Building2, Palette, CheckCircle, ArrowRight, ArrowLeft,
  Upload, X, Loader2,
} from 'lucide-react'

const BUSINESS_TYPES = [
  'General Contractor', 'Electrical', 'Plumbing', 'Painting & Coatings',
  'Roofing', 'Landscaping & Lawn Care', 'Flooring', 'HVAC',
  'Masonry & Concrete', 'Carpentry & Woodwork', 'Drywall & Plastering',
  'Fencing', 'Pool Cleaning & Maintenance', 'Pool & Spa Construction',
  'Tile & Stone', 'Excavation & Grading', 'Other',
]

const STEPS = [
  { label: 'Personal',  icon: User },
  { label: 'Business',  icon: Building2 },
  { label: 'Branding',  icon: Palette },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

interface FormData {
  firstName: string; lastName: string; phone: string
  address: string; city: string; state: string; zip: string
  businessType: string; businessName: string
  businessAddress: string; businessCity: string; businessState: string; businessZip: string
  businessPhone: string; businessEmail: string; website: string
  licenseNumber: string; insurance: string
  businessLogoUrl: string; businessDetails: string
}

const BLANK: FormData = {
  firstName: '', lastName: '', phone: '',
  address: '', city: '', state: '', zip: '',
  businessType: '', businessName: '',
  businessAddress: '', businessCity: '', businessState: '', businessZip: '',
  businessPhone: '', businessEmail: '', website: '',
  licenseNumber: '', insurance: '',
  businessLogoUrl: '', businessDetails: '',
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition bg-white placeholder:text-gray-400'
const selectCls = `${inputCls} appearance-none`

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>({ ...BLANK, businessEmail: user?.email ?? '' })
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const logoInputRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof FormData, v: string) => {
    setData(d => ({ ...d, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  const validate = (): boolean => {
    const errs: typeof errors = {}
    if (step === 1) {
      if (!data.firstName.trim()) errs.firstName = 'Required'
      if (!data.lastName.trim())  errs.lastName  = 'Required'
      if (!data.phone.trim())     errs.phone     = 'Required'
    }
    if (step === 2) {
      if (!data.businessName.trim()) errs.businessName = 'Required'
      if (!data.businessType)        errs.businessType = 'Required'
      if (!data.businessPhone.trim()) errs.businessPhone = 'Required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => { if (validate()) setStep(s => s + 1) }
  const back = () => setStep(s => s - 1)

  const uploadLogo = async (file: File) => {
    if (!user) return
    if (file.size > 5 * 1024 * 1024) { alert('Logo must be under 5 MB'); return }
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/logo/logo.${ext}`
    const { error } = await supabase.storage.from('business-assets').upload(path, file, { upsert: true })
    if (!error) {
      const { data: url } = supabase.storage.from('business-assets').getPublicUrl(path)
      set('businessLogoUrl', url.publicUrl)
    }
    setUploadingLogo(false)
  }

  const finish = async () => {
    setSaving(true)
    const fullName = `${data.firstName} ${data.lastName}`.trim()
    await supabase.from('profiles').update({
      first_name:         data.firstName,
      last_name:          data.lastName,
      full_name:          fullName,
      company_name:       data.businessName,
      phone:              data.phone,
      address:            data.address,
      city:               data.city,
      state:              data.state,
      zip:                data.zip,
      business_type:      data.businessType,
      business_address:   data.businessAddress,
      business_city:      data.businessCity,
      business_state:     data.businessState,
      business_zip:       data.businessZip,
      business_phone:     data.businessPhone,
      business_email:     data.businessEmail,
      website:            data.website,
      license_number:     data.licenseNumber,
      insurance:          data.insurance,
      business_logo_url:  data.businessLogoUrl,
      business_details:   data.businessDetails,
      onboarding_complete: true,
    }).eq('id', user!.id)
    await refreshProfile()
    setSaving(false)
    setStep(4)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 py-12">
      {/* Card */}
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <TTCLogo size={64} variant="full" />
        </div>

        {step < 4 && (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Progress bar */}
            <div className="bg-gray-50 border-b border-gray-100 px-8 pt-6 pb-5">
              <div className="flex items-center justify-between">
                {STEPS.map((s, i) => {
                  const num = i + 1
                  const done = step > num
                  const active = step === num
                  const Icon = s.icon
                  return (
                    <div key={s.label} className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          done   ? 'bg-emerald-500 text-white' :
                          active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                                   'bg-gray-200 text-gray-400'
                        }`}>
                          {done ? <CheckCircle className="w-4.5 h-4.5" /> : <Icon className="w-4 h-4" />}
                        </div>
                        <span className={`text-xs font-semibold hidden sm:block ${active ? 'text-indigo-700' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {s.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-2 rounded-full transition-colors ${step > num ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Step content */}
            <div className="p-8">
              {/* ── STEP 1: Personal ── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Welcome! Let's get you set up.</h2>
                    <p className="text-gray-500 text-sm mt-1">Tell us a bit about yourself first — this takes about 2 minutes.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="First Name" required>
                      <input className={inputCls} value={data.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" />
                      {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                    </Field>
                    <Field label="Last Name" required>
                      <input className={inputCls} value={data.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" />
                      {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                    </Field>
                  </div>
                  <Field label="Contact Phone" required>
                    <input className={inputCls} value={data.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 555-5555" type="tel" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </Field>
                  <Field label="Email Address">
                    <input className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`} value={user?.email ?? ''} readOnly />
                  </Field>
                  <Field label="Home / Mailing Address">
                    <input className={inputCls} value={data.address} onChange={e => set('address', e.target.value)} placeholder="123 Main Street" />
                  </Field>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <Field label="City">
                        <input className={inputCls} value={data.city} onChange={e => set('city', e.target.value)} placeholder="Denver" />
                      </Field>
                    </div>
                    <div>
                      <Field label="State">
                        <select className={selectCls} value={data.state} onChange={e => set('state', e.target.value)}>
                          <option value="">—</option>
                          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </Field>
                    </div>
                    <div className="col-span-2">
                      <Field label="ZIP">
                        <input className={inputCls} value={data.zip} onChange={e => set('zip', e.target.value)} placeholder="80201" maxLength={10} />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Business ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Your Business</h2>
                    <p className="text-gray-500 text-sm mt-1">This info will appear on every estimate and invoice you create.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Business Type" required>
                      <select className={selectCls} value={data.businessType} onChange={e => set('businessType', e.target.value)}>
                        <option value="">Select type…</option>
                        {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {errors.businessType && <p className="text-red-500 text-xs mt-1">{errors.businessType}</p>}
                    </Field>
                    <Field label="Business Name" required>
                      <input className={inputCls} value={data.businessName} onChange={e => set('businessName', e.target.value)} placeholder="Smith Contracting LLC" />
                      {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
                    </Field>
                  </div>
                  <Field label="Business Address">
                    <input className={inputCls} value={data.businessAddress} onChange={e => set('businessAddress', e.target.value)} placeholder="456 Commerce Blvd" />
                  </Field>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <Field label="City">
                        <input className={inputCls} value={data.businessCity} onChange={e => set('businessCity', e.target.value)} placeholder="Denver" />
                      </Field>
                    </div>
                    <div>
                      <Field label="State">
                        <select className={selectCls} value={data.businessState} onChange={e => set('businessState', e.target.value)}>
                          <option value="">—</option>
                          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </Field>
                    </div>
                    <div className="col-span-2">
                      <Field label="ZIP">
                        <input className={inputCls} value={data.businessZip} onChange={e => set('businessZip', e.target.value)} placeholder="80201" maxLength={10} />
                      </Field>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Business Phone" required>
                      <input className={inputCls} value={data.businessPhone} onChange={e => set('businessPhone', e.target.value)} placeholder="(555) 555-5555" type="tel" />
                      {errors.businessPhone && <p className="text-red-500 text-xs mt-1">{errors.businessPhone}</p>}
                    </Field>
                    <Field label="Business Email">
                      <input className={inputCls} value={data.businessEmail} onChange={e => set('businessEmail', e.target.value)} placeholder="info@smithcontracting.com" type="email" />
                    </Field>
                  </div>
                  <Field label="Website (optional)">
                    <input className={inputCls} value={data.website} onChange={e => set('website', e.target.value)} placeholder="https://smithcontracting.com" type="url" />
                  </Field>
                </div>
              )}

              {/* ── STEP 3: Branding ── */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">Branding & Credentials</h2>
                    <p className="text-gray-500 text-sm mt-1">Your logo will appear on all quotes and client-facing documents.</p>
                  </div>

                  {/* Logo upload */}
                  <Field label="Business Logo">
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
                    {data.businessLogoUrl ? (
                      <div className="relative inline-block">
                        <img src={data.businessLogoUrl} alt="Business logo" className="h-24 w-auto rounded-xl border border-gray-200 object-contain p-2 bg-gray-50" />
                        <button
                          onClick={() => set('businessLogoUrl', '')}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50 transition group cursor-pointer disabled:opacity-60"
                      >
                        {uploadingLogo ? (
                          <Loader2 className="w-8 h-8 text-indigo-400 mx-auto animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-indigo-500 transition" />
                        )}
                        <p className="text-sm font-semibold text-gray-600 group-hover:text-indigo-700 transition">
                          {uploadingLogo ? 'Uploading…' : 'Click to upload logo'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG · Max 5 MB</p>
                      </button>
                    )}
                  </Field>

                  <Field label="About Your Business">
                    <textarea
                      className={`${inputCls} h-24 resize-none`}
                      value={data.businessDetails}
                      onChange={e => set('businessDetails', e.target.value)}
                      placeholder="Tell clients what you do, your specialty, years of experience, service area…"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Contractor License #">
                      <input className={inputCls} value={data.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} placeholder="LIC-123456" />
                    </Field>
                    <Field label="Insurance Info">
                      <input className={inputCls} value={data.insurance} onChange={e => set('insurance', e.target.value)} placeholder="Provider / Policy #" />
                    </Field>
                  </div>
                </div>
              )}

              {/* Nav buttons */}
              <div className="flex gap-3 mt-8">
                {step > 1 && (
                  <button onClick={back} className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                )}
                {step < 3 ? (
                  <button onClick={next} className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={finish}
                    disabled={saving}
                    className="ml-auto flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-60"
                  >
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Finish Setup <CheckCircle className="w-4 h-4" /></>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Complete ── */}
        {step === 4 && (
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-3">You're all set!</h2>
            <p className="text-gray-500 mb-2">
              Your profile is saved. Your business name, logo, and contact info will now appear on every estimate and invoice you create.
            </p>
            <p className="text-gray-400 text-sm mb-8">You can update these details anytime from the Settings menu.</p>
            <button
              onClick={() => navigate('/estimator')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl text-base font-bold transition"
            >
              Start Estimating <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <p className="text-center text-gray-600 text-xs mt-6">
          {step < 4 ? `Step ${step} of 3` : ''} · Top Trade Contractor Estimator
        </p>
      </div>
    </div>
  )
}
