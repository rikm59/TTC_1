import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { AppProfile } from '../context/AuthContext'
import {
  X, Globe, CheckCircle, ArrowRight, ArrowLeft, Upload, Loader2,
  Monitor, Layers, Zap, Minimize2, AlertCircle,
} from 'lucide-react'

interface Props {
  onClose: () => void
}

const STYLES = [
  { id: 'modern',  label: 'Modern',  desc: 'Clean lines, bold typography, vibrant accent colors', icon: Zap,      color: 'indigo' },
  { id: 'classic', label: 'Classic', desc: 'Traditional, professional, trust-building layout',    icon: Monitor,  color: 'blue' },
  { id: 'bold',    label: 'Bold',    desc: 'High-impact visuals, strong contrasts, statement look', icon: Layers,  color: 'orange' },
  { id: 'minimal', label: 'Minimal', desc: 'Simple, elegant, content-first with lots of white space', icon: Minimize2, color: 'gray' },
]

const BUDGETS = ['Under $1,000', '$1,000 – $2,500', '$2,500 – $5,000', '$5,000 – $10,000', '$10,000+']
const TIMELINES = ['ASAP (rush)', 'Within 1 month', '1–3 months', '3–6 months', 'Just exploring']
const COLOR_SWATCHES = [
  { label: 'Navy',    hex: '#1e3a5f' },
  { label: 'Forest',  hex: '#166534' },
  { label: 'Crimson', hex: '#991b1b' },
  { label: 'Amber',   hex: '#92400e' },
  { label: 'Steel',   hex: '#374151' },
  { label: 'Purple',  hex: '#5b21b6' },
  { label: 'Sky',     hex: '#0369a1' },
  { label: 'Custom',  hex: 'custom'  },
]

const MAX_PHOTOS = 5
const inputCls = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white placeholder:text-gray-400'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export default function WebsiteInterestModal({ onClose }: Props) {
  const { user, profile } = useAuth()
  const p = profile as AppProfile | null

  const [step, setStep] = useState(1)
  const [useExisting, setUseExisting] = useState<boolean | null>(null)
  const [bizName,    setBizName]    = useState(p?.company_name ?? '')
  const [bizAddress, setBizAddress] = useState([p?.business_address, p?.business_city, p?.business_state].filter(Boolean).join(', '))
  const [bizPhone,   setBizPhone]   = useState(p?.business_phone ?? '')
  const [bizEmail,   setBizEmail]   = useState(p?.business_email ?? user?.email ?? '')
  const [styleChoice,      setStyleChoice]      = useState('')
  const [selectedColors,   setSelectedColors]   = useState<string[]>([])
  const [customColor,      setCustomColor]      = useState('#4f46e5')
  const [budgetRange,      setBudgetRange]      = useState('')
  const [timeline,         setTimeline]         = useState('')
  const [specialDetails,   setSpecialDetails]   = useState('')
  const [logoUrl,          setLogoUrl]          = useState(p?.business_logo_url ?? '')
  const [imageUrls,        setImageUrls]        = useState<string[]>([])
  const [uploadingLogo,    setUploadingLogo]    = useState(false)
  const [uploadingPhoto,   setUploadingPhoto]   = useState<number | null>(null)
  const [submitting,       setSubmitting]       = useState(false)
  const [submitted,        setSubmitted]        = useState(false)
  const [error,            setError]            = useState('')

  const logoRef   = useRef<HTMLInputElement>(null)
  const photoRefs = useRef<(HTMLInputElement | null)[]>([])

  const totalSteps = useExisting === false ? 6 : 5

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5 MB'); return null }
    const { error: upErr } = await supabase.storage.from('business-assets').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); return null }
    const { data } = supabase.storage.from('business-assets').getPublicUrl(path)
    return data.publicUrl
  }

  const handleLogoUpload = async (file: File) => {
    if (!user) return
    setUploadingLogo(true); setError('')
    const url = await uploadFile(file, `${user.id}/web-interest/logo.${file.name.split('.').pop()}`)
    if (url) setLogoUrl(url)
    setUploadingLogo(false)
  }

  const handlePhotoUpload = async (file: File, idx: number) => {
    if (!user) return
    setUploadingPhoto(idx); setError('')
    const url = await uploadFile(file, `${user.id}/web-interest/photo-${idx}-${Date.now()}.${file.name.split('.').pop()}`)
    if (url) {
      const updated = [...imageUrls]
      updated[idx] = url
      setImageUrls(updated)
    }
    setUploadingPhoto(null)
  }

  const removePhoto = (idx: number) => {
    const updated = [...imageUrls]
    updated.splice(idx, 1)
    setImageUrls(updated)
  }

  const toggleColor = (hex: string) => {
    if (hex === 'custom') {
      toggleColor(customColor)
      return
    }
    setSelectedColors(prev =>
      prev.includes(hex) ? prev.filter(c => c !== hex) : [...prev, hex]
    )
  }

  const submit = async () => {
    setSubmitting(true); setError('')
    const colorText = selectedColors.map(h => {
      const sw = COLOR_SWATCHES.find(s => s.hex === h)
      return sw ? sw.label : h
    }).join(', ')

    try {
      const { error: fnErr } = await supabase.functions.invoke('send-interest-email', {
        body: {
          useExistingDetails: useExisting,
          businessName:       bizName,
          businessAddress:    bizAddress,
          businessPhone:      bizPhone,
          businessEmail:      bizEmail,
          logoUrl:            logoUrl || null,
          imageUrls:          imageUrls.filter(Boolean),
          stylePreference:    styleChoice,
          colorPreferences:   colorText,
          budgetRange,
          timeline,
          specialDetails,
        },
      })
      if (fnErr) throw fnErr
      setSubmitted(true)
    } catch (e) {
      setError((e as Error).message)
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto relative">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition">
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* ── STEP 1: Intro ── */}
        {step === 1 && !submitted && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Globe className="w-9 h-9 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3">Need a Professional Website?</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              We specialize in creating stunning, high-converting websites for contractors and trade businesses.
            </p>
            <ul className="text-left text-sm text-gray-700 space-y-2 mb-8 max-w-xs mx-auto">
              {[
                'Mobile-first responsive design',
                'SEO optimized to get found locally',
                'Lead generation & quote request forms',
                'Photo gallery to showcase your work',
                'Starting from $1,200 — flexible packages',
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={onClose} className="flex-1 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">
                Maybe Later
              </button>
              <button onClick={next} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition">
                Get a Free Quote <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Use existing details? ── */}
        {step === 2 && !submitted && (
          <div className="p-8">
            <h2 className="text-xl font-black text-gray-900 mb-2">Quick question…</h2>
            <p className="text-gray-500 text-sm mb-6">Should we use your current business details for the website?</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { val: true,  label: 'Yes, use my business profile', sub: 'Pre-fill from your account' },
                { val: false, label: 'No, use different details',    sub: "I'll enter them manually" },
              ].map(opt => (
                <button
                  key={String(opt.val)}
                  onClick={() => { setUseExisting(opt.val); if (opt.val) { setBizName(p?.company_name ?? ''); setBizAddress([p?.business_address, p?.business_city, p?.business_state].filter(Boolean).join(', ')); setBizPhone(p?.business_phone ?? ''); setBizEmail(p?.business_email ?? user?.email ?? '') } }}
                  className={`p-5 rounded-2xl border-2 text-left transition ${
                    useExisting === opt.val
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-bold text-gray-900 text-sm mb-1">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.sub}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={next}
                disabled={useExisting === null}
                className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-40"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Business details (only if "No") ── */}
        {step === 3 && useExisting === false && !submitted && (
          <div className="p-8">
            <h2 className="text-xl font-black text-gray-900 mb-2">Website Business Details</h2>
            <p className="text-gray-500 text-sm mb-6">What business info should appear on your website?</p>
            <div className="space-y-4">
              <Field label="Business Name">
                <input className={inputCls} value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Smith Contracting LLC" />
              </Field>
              <Field label="Business Address">
                <input className={inputCls} value={bizAddress} onChange={e => setBizAddress(e.target.value)} placeholder="456 Commerce Blvd, Denver, CO 80201" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone"><input className={inputCls} value={bizPhone} onChange={e => setBizPhone(e.target.value)} placeholder="(555) 555-5555" /></Field>
                <Field label="Email"><input className={inputCls} value={bizEmail} onChange={e => setBizEmail(e.target.value)} placeholder="info@example.com" /></Field>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={back} className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={next} className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── UPLOAD step ── (step 3 if yes, step 4 if no) */}
        {((step === 3 && useExisting === true) || (step === 4 && useExisting === false)) && !submitted && (
          <div className="p-8">
            <h2 className="text-xl font-black text-gray-900 mb-2">Upload Your Images</h2>
            <p className="text-gray-500 text-sm mb-6">Help us build your site — share your logo and photos of your work.</p>

            {/* Logo */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Your Logo</p>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
              {logoUrl ? (
                <div className="relative inline-block">
                  <img src={logoUrl} alt="logo" className="h-20 w-auto rounded-xl border border-gray-200 object-contain p-2 bg-gray-50" />
                  <button onClick={() => setLogoUrl('')} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => logoRef.current?.click()} disabled={uploadingLogo} className="w-full border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-indigo-300 hover:bg-indigo-50 transition cursor-pointer disabled:opacity-60">
                  {uploadingLogo ? <Loader2 className="w-5 h-5 text-indigo-400 mx-auto animate-spin" /> : <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />}
                  <p className="text-xs font-medium text-gray-500">{uploadingLogo ? 'Uploading…' : 'Click to upload logo'}</p>
                </button>
              )}
            </div>

            {/* Photos grid */}
            <div className="mb-2">
              <p className="text-sm font-semibold text-gray-700 mb-1">Business Photos <span className="text-gray-400 font-normal">(up to {MAX_PHOTOS} — show your best work)</span></p>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
                  const url = imageUrls[i]
                  const uploading = uploadingPhoto === i
                  return (
                    <div key={i}>
                      <input
                        ref={el => { photoRefs.current[i] = el }}
                        type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f, i) }}
                      />
                      {url ? (
                        <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                          <img src={url} alt={`photo ${i+1}`} className="w-full h-full object-cover" />
                          <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => photoRefs.current[i]?.click()}
                          disabled={uploading}
                          className="aspect-square w-full border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center hover:border-indigo-300 hover:bg-indigo-50 transition cursor-pointer disabled:opacity-60"
                        >
                          {uploading ? <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /> : <span className="text-2xl text-gray-300">+</span>}
                          <span className="text-xs text-gray-400 mt-1">Photo {i+1}</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {error && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

            <div className="flex gap-3 mt-8">
              <button onClick={back} className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={next} className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STYLE step ── (step 4 if yes, step 5 if no) */}
        {((step === 4 && useExisting === true) || (step === 5 && useExisting === false)) && !submitted && (
          <div className="p-8">
            <h2 className="text-xl font-black text-gray-900 mb-2">Your Website Style</h2>
            <p className="text-gray-500 text-sm mb-5">How should your website look and feel?</p>

            {/* Style cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {STYLES.map(s => {
                const Icon = s.icon
                return (
                  <button
                    key={s.id}
                    onClick={() => setStyleChoice(s.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition ${
                      styleChoice === s.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${styleChoice === s.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div className="font-bold text-gray-900 text-sm">{s.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
                  </button>
                )
              })}
            </div>

            {/* Color swatches */}
            <div className="mb-5">
              <p className="text-sm font-semibold text-gray-700 mb-2">Preferred Colors <span className="text-gray-400 font-normal">(pick any)</span></p>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map(sw => {
                  const isCustom = sw.hex === 'custom'
                  const activeHex = isCustom ? customColor : sw.hex
                  const selected = selectedColors.includes(activeHex)
                  return (
                    <button
                      key={sw.label}
                      onClick={() => { if (isCustom) { toggleColor(customColor) } else toggleColor(sw.hex) }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                        selected ? 'border-gray-800 ring-2 ring-gray-400' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {isCustom ? (
                        <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="w-4 h-4 rounded-full border-0 cursor-pointer" onClick={e => e.stopPropagation()} />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-white/30" style={{ background: sw.hex }} />
                      )}
                      {sw.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <Field label="Budget Range">
                <select className={inputCls} value={budgetRange} onChange={e => setBudgetRange(e.target.value)}>
                  <option value="">Select…</option>
                  {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Timeline">
                <select className={inputCls} value={timeline} onChange={e => setTimeline(e.target.value)}>
                  <option value="">Select…</option>
                  {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Anything else we should know?">
              <textarea
                className={`${inputCls} h-24 resize-none`}
                value={specialDetails}
                onChange={e => setSpecialDetails(e.target.value)}
                placeholder="Specific pages, competitor sites you like, must-have features, anything…"
              />
            </Field>

            {error && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

            <div className="flex gap-3 mt-8">
              <button onClick={back} className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="ml-auto flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-60"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Submit Request <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {submitted && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-9 h-9 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3">Request Submitted!</h2>
            <p className="text-gray-500 text-sm mb-6">Thanks for your interest! Our team will review your details and reach out within 24 hours.</p>
            <div className="bg-gray-50 rounded-2xl p-5 text-left mb-8">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">What happens next</p>
              {[
                '1. Our team reviews your submission',
                '2. We reach out to discuss your vision',
                '3. You receive a custom proposal',
                '4. Your website goes live!',
              ].map(s => (
                <div key={s} className="flex items-center gap-2 py-1.5 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  {s}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl text-sm font-bold transition">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
