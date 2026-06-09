import { useState } from 'react'
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase'
import { UPGRADE_PLANS } from '../data/plans'
import {
  FileText, Calculator, Users, Download, Shield, Zap,
  CheckCircle, ArrowRight, Eye, EyeOff, AlertCircle,
  ChevronDown, Clock, DollarSign, TrendingUp, HardHat,
  Layers, Star, Globe, Info, LogOut,
} from 'lucide-react'
import TTCLogo from '../components/TTCLogo'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'

type Mode = 'login' | 'signup' | 'reset'

function LanguageToggle() {
  const { lang, setLang, t } = useLanguage()
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
      className="flex items-center gap-1.5 text-xs font-bold border border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-3 py-1.5 rounded-full transition"
    >
      <Globe className="w-3.5 h-3.5" />
      {t('nav.language')}
    </button>
  )
}

function ExpandableFeature({ icon: Icon, title, desc, color, bg, border, bullets, badgeText }: {
  icon: React.ElementType
  title: string
  desc: string
  color: string
  bg: string
  border: string
  bullets: string[]
  badgeText: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`bg-white/5 border rounded-xl transition-all cursor-pointer select-none ${open ? border + ' bg-white/10' : 'border-white/10 hover:' + border}`}
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
        <div className="border-t border-white/10 px-5 pb-5 pt-4">
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
  const { t, lang } = useLanguage()
  const { kickedOut } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reset = () => { setError(''); setSuccess('') }

  const friendlyAuthError = (msg: string): string => {
    console.error('[Auth error]', msg)
    const m = msg.toLowerCase()
    if (m.includes('load failed') || m.includes('failed to fetch') || m.includes('network') || m.includes('fetch')) {
      return lang === 'es'
        ? 'Error de red — su dispositivo no puede conectarse al servidor de autenticación. Pruebe: (1) Cambie de WiFi a datos móviles o viceversa, (2) Desactive VPN, (3) Intente desde otra red.'
        : 'Network error — your device cannot reach the authentication server. Please try: (1) Switch from WiFi to mobile data or vice versa, (2) Disable your VPN, (3) Try from a different network.'
    }
    if (m.includes('email not confirmed')) return lang === 'es' ? 'Por favor confirme su correo antes de iniciar sesión.' : 'Please confirm your email before signing in.'
    if (m.includes('invalid login credentials') || m.includes('invalid credentials')) return lang === 'es' ? 'Correo o contraseña incorrectos.' : 'Incorrect email or password.'
    if (m.includes('user already registered') || m.includes('already registered')) return lang === 'es' ? 'Este correo ya tiene una cuenta. Inicie sesión.' : 'This email is already registered. Please sign in instead.'
    if (m.includes('password should be at least')) return lang === 'es' ? 'La contraseña debe tener al menos 6 caracteres.' : 'Password must be at least 6 characters.'
    return msg
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    reset()

    if (!SUPABASE_CONFIGURED) {
      setError(lang === 'es' ? 'Error de configuración del servidor. Por favor contacte al soporte.' : 'Server configuration error. Please contact support.')
      setLoading(false)
      return
    }

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        })
        if (error) setError(friendlyAuthError(error.message))
        else setSuccess(lang === 'es' ? 'Revise su correo para confirmar su cuenta.' : 'Check your email to confirm your account.')
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(friendlyAuthError(error.message))
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset`,
        })
        if (error) setError(friendlyAuthError(error.message))
        else setSuccess(lang === 'es' ? 'Enlace enviado — revise su correo.' : 'Password reset link sent — check your email.')
      }
    } catch (err) {
      // Network failures (Failed to fetch / Load failed) throw here rather
      // than returning an error object. Surface them through the same mapper.
      const msg = err instanceof Error ? err.message : String(err)
      setError(friendlyAuthError(msg))
    }
    setLoading(false)
  }

  const PROJECT_TYPES_EN = [
    'Painting & Coatings', 'Cabinets & Millwork', 'Fencing', 'Remodeling',
    'Framing & Drywall', 'Outdoor Patio', 'Concrete & Masonry', 'Windows & Doors',
    'Flooring', 'Landscaping & Lawn', 'Sprinkler Systems', 'Roofing',
    'Electrical', 'Plumbing', 'HVAC', 'Tile & Stone',
    'Insulation', 'Gutters', 'Pool Cleaning & Maintenance',
  ]

  const PROJECT_TYPES_ES = [
    'Pintura y Recubrimientos', 'Gabinetes y Carpintería', 'Cercas', 'Remodelación',
    'Encuadre y Paneles de Yeso', 'Patio Exterior', 'Concreto y Mampostería', 'Ventanas y Puertas',
    'Pisos', 'Jardines y Césped', 'Sistemas de Riego', 'Techos',
    'Eléctrico', 'Plomería', 'HVAC/Climatización', 'Azulejos y Piedra',
    'Aislamiento', 'Canales de Desagüe', 'Limpieza y Mantenimiento de Piscinas',
  ]

  const PROJECT_TYPES = lang === 'es' ? PROJECT_TYPES_ES : PROJECT_TYPES_EN

  const FEATURES = [
    {
      icon: HardHat,
      title: lang === 'es' ? '21 Tipos de Proyecto' : '21 Project Types',
      desc: lang === 'es' ? 'Todos los oficios principales cubiertos — cada uno con fórmulas de costo auto-pobladas basadas en datos reales de 2026.' : 'Every major trade covered — each with auto-populated cost formulas built from real 2026 pricing data.',
      color: 'text-brand-400', bg: 'bg-brand-500/15', border: 'border-brand-500/30',
      bullets: PROJECT_TYPES, badgeText: lang === 'es' ? '21 oficios' : '21 trades',
    },
    {
      icon: FileText,
      title: lang === 'es' ? 'Exportar PDF y Word' : 'PDF & Word Export',
      desc: lang === 'es' ? 'Genere cotizaciones pulidas y profesionales que sus clientes confiarán — en segundos, no horas.' : 'Generate polished, professional quotes your clients will trust — in seconds, not hours.',
      color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/30',
      badgeText: 'PDF + DOCX',
      bullets: lang === 'es'
        ? ['PDF con su logo e info de contacto', 'Vista para el cliente — precios limpios', 'Copia del contratista con desglose completo', 'Exportación Word (.docx) para fácil edición', 'Alcance, exclusiones y términos de pago', 'Regenerar con un clic cuando cambien los números']
        : ['Branded PDF with your logo & contact info', 'Client-facing view — clean pricing, no cost breakdown', 'Contractor copy with full material & labor detail', 'Word (.docx) export for easy editing', 'Scope of work, exclusions & payment terms included', 'One-click regenerate when numbers change'],
    },
    {
      icon: Users,
      title: lang === 'es' ? 'Panel CRM de Clientes' : 'CRM Dashboard',
      desc: lang === 'es' ? 'Deje de perder clientes en su bandeja de entrada. Rastree cada cliente, proyecto y seguimiento desde una pantalla.' : 'Stop losing leads in your inbox. Track every client, project, and follow-up from one screen.',
      color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30',
      badgeText: lang === 'es' ? 'CRM incluido' : 'Built-in CRM',
      bullets: lang === 'es'
        ? ['Perfiles de clientes con historial de proyectos', 'Pipeline de estado (Nuevo → Ganado / Perdido)', 'Notas internas y recordatorios de seguimiento', 'Historial completo de estimaciones por cliente', 'Re-estimar rápidamente desde trabajos anteriores', 'Buscar y filtrar en todos los clientes']
        : ['Client profiles with contact info & project history', 'Lead & deal status pipeline (New → Won / Lost)', 'Internal notes & follow-up reminders', 'Full estimate history per client', 'Quick re-estimate from past jobs', 'Search & filter across all clients'],
    },
    {
      icon: Calculator,
      title: lang === 'es' ? 'Precios en 3 Niveles' : '3-Tier Pricing',
      desc: lang === 'es' ? 'Presente opciones Conservadora, Estándar y Premium — deje que los clientes elijan mientras protege su margen.' : 'Present Conservative, Standard, and Premium options — let clients choose, while you protect your margin.',
      color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30',
      badgeText: lang === 'es' ? '3 niveles' : '3-Tier quotes',
      bullets: lang === 'es'
        ? ['Tres niveles de precio calculados automáticamente', 'Tiers Conservador, Estándar y Premium', 'Visualización instantánea de ganancia y margen', 'Markup de materiales y gastos generales automáticos', 'Tasa de impuesto según configuración de empresa', 'Cambie un número — todos los niveles se actualizan']
        : ['Three price tiers auto-calculated from your margin settings', 'Conservative (competitive), Standard, and Premium tiers', 'Instant profit & margin display for each tier', 'Material markup & overhead applied automatically', 'Tax rate applied per your company settings', 'Change one number — all tiers update instantly'],
    },
    {
      icon: Download,
      title: lang === 'es' ? 'Funciona Sin Conexión' : 'Works Offline',
      desc: lang === 'es' ? 'Cree estimaciones en el sitio, en el camión o en cualquier lugar — se sincroniza automáticamente al reconectarse.' : 'Build estimates on the job site, in the truck, or anywhere — syncs automatically when you reconnect.',
      color: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/30',
      badgeText: lang === 'es' ? 'Sin conexión' : 'Offline-ready',
      bullets: lang === 'es'
        ? ['Todas las estimaciones guardadas localmente', 'Sincronización en la nube entre dispositivos', 'No necesita conexión para crear o editar', 'Importar/exportar respaldo completo en JSON', 'Nunca pierda una cotización por conexión perdida']
        : ['All estimates saved locally in your browser', 'Cloud sync keeps data across devices', 'No connectivity needed to create or edit', 'Import / export full estimate JSON backup', 'Never lose a quote to a lost connection'],
    },
    {
      icon: Shield,
      title: lang === 'es' ? 'Seguro y Privado' : 'Secure & Private',
      desc: lang === 'es' ? 'Su inteligencia de precios es su ventaja competitiva. Así la mantenemos — sin compartir, sin filtrar.' : 'Your pricing intelligence is your competitive edge. We keep it that way — no sharing, no leaking.',
      color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30',
      badgeText: lang === 'es' ? 'Seguridad empresarial' : 'Enterprise security',
      bullets: lang === 'es'
        ? ['Seguridad a nivel de fila — solo usted ve sus datos', 'Cifrado en reposo y en tránsito (Supabase / Postgres)', 'Sus datos nunca se venden a terceros', 'Su markup y márgenes nunca se exponen', 'Controles de acceso solo para administradores']
        : ['Row-level security — only you see your data', 'Encrypted at rest and in transit (Supabase / Postgres)', 'No data sold to third parties — ever', 'Your markup & margin settings are never exposed', 'Admin-only access controls for team accounts'],
    },
  ]

  const STATS = [
    { value: '5×', label: t('stats.faster'), icon: Clock },
    { value: '21', label: t('stats.trades'), icon: HardHat },
    { value: '3-Tier', label: t('stats.pricing'), icon: Layers },
    { value: '100%', label: t('stats.private'), icon: Shield },
  ]

  const HOW_IT_WORKS = [
    { step: '01', title: t('how.step1.title'), desc: t('how.step1.desc') },
    { step: '02', title: t('how.step2.title'), desc: t('how.step2.desc') },
    { step: '03', title: t('how.step3.title'), desc: t('how.step3.desc') },
  ]

  const ROI = [
    { icon: Clock, color: 'text-brand-400', bg: 'bg-brand-500/15', title: t('roi.time.title'), desc: t('roi.time.desc') },
    { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/15', title: t('roi.money.title'), desc: t('roi.money.desc') },
    { icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/15', title: t('roi.win.title'), desc: t('roi.win.desc') },
  ]

  const pro = UPGRADE_PLANS.find(p => p.key === 'pro')!
  const enterprise = UPGRADE_PLANS.find(p => p.key === 'enterprise')!

  const PLANS = [
    {
      name: t('price.free.name'), price: '$0', period: t('price.free.period'), highlight: false,
      features: lang === 'es'
        ? ['Prueba de 14 días', 'Hasta 3 estimaciones', '21 tipos de proyecto', 'Exportación PDF', 'Vista previa 3 niveles']
        : ['14-day free trial', 'Up to 3 estimates', 'All 21 project types', 'PDF export', '3-tier pricing preview'],
    },
    {
      name: t('price.pro.name'), price: pro.price, period: t('price.pro.period'), highlight: true,
      features: lang === 'es' ? pro.featuresEs : pro.features,
    },
    {
      name: t('price.enterprise.name'), price: enterprise.price, period: t('price.enterprise.period'), highlight: false,
      features: lang === 'es' ? enterprise.featuresEs : enterprise.features,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/90 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <TTCLogo size={40} variant="full" />
          <div className="hidden md:flex items-center gap-5 text-sm text-gray-400">
            <a href="#how-it-works" className="hover:text-white transition">{t('nav.howItWorks')}</a>
            <a href="#features" className="hover:text-white transition">{t('nav.features')}</a>
            <a href="#pricing" className="hover:text-white transition">{t('nav.pricing')}</a>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <a href="#auth" className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300 transition">
              {t('nav.signIn')} <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-8 grid lg:grid-cols-2 gap-16 items-start">
        {/* Left column */}
        <div>
          {/* Badge */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-2">
              <Zap className="w-3 h-3" />
              {t('landing.badge')}
            </div>
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Top Trade Contractor</div>
          </div>

          <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
            {t('landing.headline1')}<br />
            <span className="text-brand-400">{t('landing.headline2')}</span>
          </h1>

          <p className="text-gray-300 text-lg mb-4 leading-relaxed">
            {t('landing.subheadline')}
          </p>

          {/* AI Disclaimer */}
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 mb-8">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/70 leading-relaxed">
              {t('landing.disclaimer')}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mb-10">
            {[t('landing.tag1'), t('landing.tag2'), t('landing.tag3')].map(tag => (
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
            {/* Kicked-out banner */}
            {kickedOut && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800">
                <LogOut className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <span>
                  {lang === 'es'
                    ? 'Su sesión fue cerrada porque su cuenta inició sesión desde otro dispositivo.'
                    : 'You were signed out because your account was accessed from another device.'}
                </span>
              </div>
            )}
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
                  {m === 'login' ? t('auth.signIn') : t('auth.createAccount')}
                </button>
              ))}
            </div>

            {mode === 'reset' ? (
              <div className="mb-4">
                <button onClick={() => { setMode('login'); reset() }} className="text-sm text-brand-600 hover:underline flex items-center gap-1 mb-4">
                  <ArrowRight className="w-3 h-3 rotate-180" /> {t('auth.backToSignIn')}
                </button>
                <h2 className="font-bold text-lg mb-1">{t('auth.resetTitle')}</h2>
                <p className="text-sm text-gray-500 mb-4">{t('auth.resetDesc')}</p>
              </div>
            ) : (
              <div className="mb-6">
                <h2 className="font-bold text-xl">
                  {mode === 'login' ? t('auth.welcomeBack') : t('auth.getStarted')}
                </h2>
                {mode === 'signup' && (
                  <p className="text-sm text-gray-500 mt-1">{t('auth.noCreditCard')}</p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="form-label text-gray-600">{t('auth.fullName')}</label>
                  <input className="form-input" type="text" placeholder={t('auth.fullName')} value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="form-label text-gray-600">{t('auth.email')}</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              {mode !== 'reset' && (
                <div>
                  <label className="form-label text-gray-600">{t('auth.password')}</label>
                  <div className="relative">
                    <input
                      className="form-input pr-10"
                      type={showPw ? 'text' : 'password'}
                      placeholder={mode === 'signup' ? t('auth.minPassword') : '••••••••'}
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
                      {t('auth.forgotPassword')}
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
                    {mode === 'login' ? t('auth.signIn') : mode === 'signup' ? t('auth.createAccount') : t('auth.sendReset')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {mode === 'signup' && (
              <p className="text-xs text-gray-400 text-center mt-4">{t('auth.terms')}</p>
            )}

            {mode === 'login' && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                  {[0,1,2,3,4].map(i => <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
                  <span className="ml-1">{t('auth.socialProof')}</span>
                </div>
              </div>
            )}

            {/* Logo centered below the form */}
            <div className="flex justify-center mt-6 pt-5 border-t border-gray-100">
              <TTCLogo size={52} variant="icon" />
            </div>
          </div>

          {/* Testimonial */}
          <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-300 italic leading-relaxed mb-3">{t('auth.testimonialQuote')}</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold">R</div>
              <div>
                <p className="text-xs font-semibold text-white">{t('auth.testimonialName')}</p>
                <p className="text-[11px] text-gray-500">{t('auth.testimonialRole')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">{t('how.label')}</p>
          <h2 className="text-3xl font-black">{t('how.title')}</h2>
          <p className="text-gray-400 mt-2">{t('how.subtitle')}</p>
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
            <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">{t('roi.label')}</p>
            <h2 className="text-3xl font-black">{t('roi.title')}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {ROI.map(({ icon: Icon, color, bg, title, desc }) => (
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
          <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">{t('feat.label')}</p>
          <h2 className="text-3xl font-black">{t('feat.title')}</h2>
          <p className="text-gray-400 mt-2 max-w-lg mx-auto">{t('feat.subtitle')}</p>
        </div>
        <div className="space-y-3">
          {FEATURES.map(f => <ExpandableFeature key={f.title} {...f} />)}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">{t('price.label')}</p>
          <h2 className="text-3xl font-black">{t('price.title')}</h2>
          <p className="text-gray-400 mt-2">{t('price.subtitle')}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 border relative ${
                plan.highlight ? 'bg-brand-600 border-brand-500 shadow-lg shadow-brand-900/50' : 'bg-white/5 border-white/10'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                  {t('price.popular')}
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
        {t('footer', { year: String(new Date().getFullYear()) })}
      </footer>
    </div>
  )
}
