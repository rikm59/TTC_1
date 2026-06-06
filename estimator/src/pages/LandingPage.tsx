import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  FileText, Calculator, Users, Download, Shield, Zap,
  CheckCircle, ArrowRight, Eye, EyeOff, AlertCircle
} from 'lucide-react'

type Mode = 'login' | 'signup' | 'reset'

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
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/`,
        },
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

  const features = [
    { icon: Calculator, title: '18 Project Types', desc: 'Paint, concrete, fencing, roofing, electrical, plumbing and more — each with auto-populated cost formulas.' },
    { icon: FileText, title: 'PDF & Word Export', desc: 'Generate professional quotes instantly. Contractor view with full cost breakdown, client view with clean pricing.' },
    { icon: Users, title: 'CRM Dashboard', desc: 'Track every client, lead, and project. Notes, status pipeline, and complete estimate history in one place.' },
    { icon: Calculator, title: '3-Tier Pricing', desc: 'Conservative, Standard, and Premium quotes generated automatically from your margin settings.' },
    { icon: Download, title: 'Offline-Ready', desc: 'All estimates stored locally and in the cloud. Work anywhere, sync everywhere.' },
    { icon: Shield, title: 'Secure & Private', desc: 'Your pricing data stays private. Row-level security ensures no one sees your numbers but you.' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center font-black text-white text-sm">
              TTC
            </div>
            <div>
              <p className="font-bold text-white leading-tight">Top Trade Contractor</p>
              <p className="text-xs text-gray-400 leading-tight">Estimating & CRM</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-16 items-start">
        {/* Left: Hero + Features */}
        <div>
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3 h-3" />
            Professional Contractor Software
          </div>

          <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-4">
            Estimate Jobs,<br />
            <span className="text-brand-400">Win More Bids</span>
          </h1>
          <p className="text-gray-400 text-lg mb-10 leading-relaxed">
            Build accurate estimates in minutes, not hours. Auto-populate material & labor costs, generate 3-tier pricing, export professional PDFs, and manage every client from one dashboard.
          </p>

          <div id="features" className="grid sm:grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-brand-500/30 transition">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-brand-400" />
                </div>
                <p className="font-semibold text-sm mb-1">{title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div id="pricing" className="mt-10 bg-gradient-to-r from-brand-900/40 to-brand-800/20 border border-brand-500/20 rounded-2xl p-6">
            <p className="font-bold mb-3 text-brand-300">Plans</p>
            <div className="space-y-2 text-sm">
              {[
                { name: 'Free', price: '$0', features: 'Up to 10 estimates, PDF export' },
                { name: 'Pro', price: '$29/mo', features: 'Unlimited estimates, CRM, Word export' },
                { name: 'Enterprise', price: '$79/mo', features: 'Everything + team members, priority support' },
              ].map(p => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-brand-400 shrink-0" />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-gray-400">— {p.features}</span>
                  </div>
                  <span className="font-bold text-brand-300">{p.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Auth Card */}
        <div className="lg:sticky lg:top-8">
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
                  {m === 'login' ? 'Sign In' : 'Create Account'}
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
              <h2 className="font-bold text-xl mb-6">
                {mode === 'login' ? 'Welcome back' : 'Get started free'}
              </h2>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="form-label text-gray-600">Full Name</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Ricardo Martinez"
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
                    {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
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
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Top Trade Contractor · XpertAISolution.com
      </footer>
    </div>
  )
}
