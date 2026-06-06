import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  FileText, Calculator, Users, Download, Shield, Zap,
  CheckCircle, ArrowRight, Eye, EyeOff, AlertCircle,
  ChevronDown, Clock, DollarSign, TrendingUp, HardHat,
  Layers, Star
} from 'lucide-react'
import TTCLogo from '../components/TTCLogo'

type Mode = 'login' | 'signup' | 'reset'

const PROJECT_TYPES = [
  'Painting & Coatings', 'Cabinets & Millwork', 'Fencing', 'Remodeling',
  'Framing & Drywall', 'Outdoor Patio', 'Concrete & Masonry', 'Windows & Doors',
  'Flooring', 'Landscaping & Lawn', 'Sprinkler Systems', 'Roofing',
  'Electrical', 'Plumbing', 'HVAC', 'Tile & Stone',
  'Insulation', 'Gutters', 'Pool Cleaning & Maintenance',
]

const FEATURES = [
  {
    icon: HardHat,
    title: '19 Project Types',
    desc: 'Every major trade covered — each with auto-populated cost formulas built from real 2026 pricing data.',
    color: 'text-brand-400',
    bg: 'bg-brand-500/15',
    border: 'border-brand-500/30',
    bullets: PROJECT_TYPES,
    badgeText: '19 trades',
  },
  {
    icon: FileText,
    title: 'PDF & Word Export',
    desc: 'Generate polished, professional quotes your clients will trust — in seconds, not hours.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
    bullets: [
      'Branded PDF with your logo & contact info',
      'Client-facing view — clean pricing, no cost breakdown',
      'Contractor copy with full material & labor detail',
      'Word (.docx) export for easy editing',
      'Scope of work, exclusions & payment terms included',
      'One-click regenerate when numbers change',
    ],
    badgeText: 'PDF + DOCX',
  },
  {
    icon: Users,
    title: 'CRM Dashboard',
    desc: 'Stop losing leads in your inbox. Track every client, project, and follow-up from one screen.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    bullets: [
      'Client profiles with contact info & project history',
      'Lead & deal status pipeline (New → Won / Lost)',
      'Internal notes & follow-up reminders',
      'Full estimate history per client',
      'Quick re-estimate from past jobs',
      'Search & filter across all clients',
    ],
    badgeText: 'Built-in CRM',
  },
  {
    icon: Calculator,
    title: '3-Tier Pricing',
    desc: 'Present Conservative, Standard, and Premium options — let clients choose, while you protect your margin.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    bullets: [
      'Three price tiers auto-calculated from your margin settings',
      'Conservative (competitive), Standard, and Premium tiers',
      'Instant profit & margin display for each tier',
      'Material markup & overhead applied automatically',
      'Tax rate applied per your company settings',
      'Change one number — all tiers update instantly',
    ],
    badgeText: '3-Tier quotes',
  },
  {
    icon: Download,
    title: 'Works Offline',
    desc: 'Build estimates on the job site, in the truck, or anywhere — syncs automatically when you reconnect.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/30',
    bullets: [
      'All estimates saved locally in your browser',
      'Cloud sync keeps data across devices',
      'No connectivity needed to create or edit',
      'Import / export full estimate JSON backup',
      'Never lose a quote to a lost connection',
    ],
    badgeText: 'Offline-ready',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    desc: 'Your pricing intelligence is your competitive edge. We keep it that way — no sharing, no leaking.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    bullets: [
      'Row-level security — only you see your data',
      'Encrypted at rest and in transit (Supabase / Postgres)',
      'No data sold to third parties — ever',
      'Your markup & margin settings are never exposed',
      'Admin-only access controls for team accounts',
    ],
    badgeText: 'Enterprise security',
  },
]

const STATS = [
  { value: '5×', label: 'Faster Than Spreadsheets', icon: Clock },
  { value: '19', label: 'Trade Categories', icon: HardHat },
  { value: '3-Tier', label: 'Pricing Per Quote', icon: Layers },
  { value: '100%', label: 'Private — Your Data Only', icon: Shield },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Pick Your Trade', desc: 'Select from 19 project types. The app loads the right measurement fields, cost formulas, and labor rates for that trade automatically.' },
  { step: '02', title: 'Enter Measurements', desc: 'Type in your dimensions. Materials, quantities, and labor hours calculate instantly based on proven industry formulas.' },
  { step: '03', title: 'Review & Export', desc: 'See your conservative, standard, and premium prices with full margin breakdown. Export a branded PDF in one click.' },
]

function ExpandableFeature({ icon: Icon, title, desc, color, bg, border, bullets, badgeText }: typeof FEATURES[0]) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`bg-white/5 border rounded-xl transition-all cursor-pointer select-none ${open ? border + ' bg-white/8' : 'border-white/10 hover:' + border}`}
      onClick={() => setOpen(v => !v)}
    >
      <div className="p-5 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-semibold text-sm">{title}</p>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bg} ${color} hidden sm:inline`}>{badgeText}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </div>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
        </div>
      </div>
      {open && (
        <div className={`border-t border-white/10 px-5 pb-5 pt-4`}>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {bullets.map(b => (
              <li key={b} className="flex items-start gap-2 text-xs text-gray-300">
                <CheckCircle className={`w-3.5 h-3.5 ${color} shrink-0 mt-0.5`} />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reset = () => { setError(''); setSuccess('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    reset()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) setError(error.message)
      else setSuccess('Check your email to confirm your account.')
    } else if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset`,
      })
      if (error) setError(error.message)
      else setSuccess('Password reset link sent — check your email.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/90 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <TTCLogo size={40} variant="full" />
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </div>
          <a href="#auth" className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300 transition">
            Sign In <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-8 grid lg:grid-cols-2 gap-16 items-start">
        {/* Left column */}
        <div>
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3 h-3" />
            Professional Contractor Estimating Software
          </div>

          <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
            Stop Guessing.<br />
            <span className="text-brand-400">Start Winning More Bids.</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            TTC Estimator is your personal bidding assistant. Enter measurements, get instant material & labor breakdowns, and deliver a polished 3-tier quote in minutes — not hours.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            {['No spreadsheets', 'No guessing on margins', 'No lost bids'].map(tag => (
              <span key={tag} className="flex items-center gap-1.5 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                <CheckCircle className="w-3.5 h-3.5 text-brand-400" />
                {tag}
              </span>
            ))}
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <Icon className="w-5 h-5 text-brand-400 mx-auto mb-2" />
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Auth Card */}
        <div id="auth" className="lg:sticky lg:top-24">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-gray-900">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
              {(['login', 'signup'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); reset() }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    mode === m ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Create Free Account'}
                </button>
              ))}
            </div>

            {mode === 'reset' ? (
              <div className="mb-4">
                <button onClick={() => { setMode('login'); reset() }} className="text-sm text-brand-600 hover:underline flex items-center gap-1 mb-4">
                  <ArrowRight className="w-3 h-3 rotate-180" /> Back to sign in
                </button>
                <h2 className="font-bold text-lg mb-1">Reset password</h2>
                <p className="text-sm text-gray-500 mb-4">Enter your email and we'll send a reset link.</p>
              </div>
            ) : (
              <div className="mb-6">
                <h2 className="font-bold text-xl">
                  {mode === 'login' ? 'Welcome back' : 'Get started — it\'s free'}
                </h2>
                {mode === 'signup' && (
                  <p className="text-sm text-gray-500 mt-1">No credit card required. Free plan includes 3 estimates.</p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="form-label text-gray-600">Full Name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div>
                <label className="form-label text-gray-600">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              {mode !== 'reset' && (
                <div>
                  <label className="form-label text-gray-600">Password</label>
                  <div className="relative">
                    <input
                      className="form-input pr-10"
                      type={showPw ? 'text' : 'password'}
                      placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'login' && (
                    <button type="button" onClick={() => { setMode('reset'); reset() }}
                      className="text-xs text-brand-600 hover:underline mt-1 float-right">
                      Forgot password?
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Free Account' : 'Send Reset Link'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {mode === 'signup' && (
              <p className="text-xs text-gray-400 text-center mt-4">
                By creating an account you agree to our Terms of Service and Privacy Policy.
              </p>
            )}

            {mode === 'login' && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="ml-1">Trusted by contractors across 19 trades</span>
                </div>
              </div>
            )}
          </div>

          {/* Testimonial */}
          <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-300 italic leading-relaxed mb-3">
              "Used to take me 2 hours per estimate in Excel. Now I walk the job, enter measurements on my phone, and have a PDF quote ready before I leave the driveway."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold">R</div>
              <div>
                <p className="text-xs font-semibold text-white">Ricardo M.</p>
                <p className="text-[11px] text-gray-500">General Contractor, TX</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">Simple by Design</p>
          <h2 className="text-3xl font-black">How It Works</h2>
          <p className="text-gray-400 mt-2">From job site to signed quote in under 10 minutes.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} className="relative bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="text-5xl font-black text-brand-500/20 mb-4 leading-none">{step}</div>
              <h3 className="font-bold text-lg mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROI Banner */}
      <section className="bg-gradient-to-r from-brand-900/50 via-brand-800/30 to-brand-900/50 border-y border-brand-500/20 py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">The Business Case</p>
            <h2 className="text-3xl font-black">Why Smart Contractors Use TTC</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                color: 'text-brand-400',
                bg: 'bg-brand-500/15',
                title: 'Save 2–3 Hours Per Bid',
                desc: 'Auto-populated cost formulas eliminate the manual lookup grind. Enter dimensions — get a quote. What used to take a night now takes minutes.',
              },
              {
                icon: DollarSign,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/15',
                title: 'Protect Your Margins',
                desc: 'Built-in overhead, markup, and 3-tier pricing ensure you never walk away from a job wondering if you left money on the table — or worse, undercut yourself.',
              },
              {
                icon: TrendingUp,
                color: 'text-amber-400',
                bg: 'bg-amber-500/15',
                title: 'Win More Professional Jobs',
                desc: 'Clients choose the contractor who looks most professional. Branded PDF quotes with scope, exclusions, and payment terms separate you from the competition.',
              },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div>
                  <h3 className="font-bold mb-1">{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">Everything You Need</p>
          <h2 className="text-3xl font-black">Built for Contractors, by Contractors</h2>
          <p className="text-gray-400 mt-2 max-w-lg mx-auto">Click any feature to see exactly what's included.</p>
        </div>
        <div className="space-y-3">
          {FEATURES.map(f => <ExpandableFeature key={f.title} {...f} />)}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">Simple Pricing</p>
          <h2 className="text-3xl font-black">Start Free. Upgrade When Ready.</h2>
          <p className="text-gray-400 mt-2">No credit card required to get started.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: 'Free',
              price: '$0',
              period: 'forever',
              highlight: false,
              features: ['Up to 3 estimates', 'All 19 project types', 'PDF export', '3-tier pricing preview'],
            },
            {
              name: 'Pro',
              price: '$29',
              period: '/month',
              highlight: true,
              features: ['Unlimited estimates', 'All 19 project types', 'PDF + Word export', 'Full CRM dashboard', 'Client history', 'Custom branding'],
            },
            {
              name: 'Enterprise',
              price: '$79',
              period: '/month',
              highlight: false,
              features: ['Everything in Pro', 'Team members', 'Priority support', 'Custom integrations', 'White-label export'],
            },
          ].map(plan => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 border relative ${
                plan.highlight
                  ? 'bg-brand-600 border-brand-500 shadow-lg shadow-brand-900/50'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <p className={`font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-200'}`}>{plan.name}</p>
              <p className={`mb-5 ${plan.highlight ? 'text-white' : 'text-gray-200'}`}>
                <span className="text-3xl font-black">{plan.price}</span>
                <span className={`text-sm ${plan.highlight ? 'text-brand-200' : 'text-gray-400'}`}>{plan.period}</span>
              </p>
              <ul className="space-y-2.5">
                {plan.features.map(f => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlight ? 'text-brand-100' : 'text-gray-300'}`}>
                    <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${plan.highlight ? 'text-brand-200' : 'text-brand-400'}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Top Trade Contractor · XpertAISolution.com
      </footer>
    </div>
  )
}
