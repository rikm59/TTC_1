import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, startOfMonth, isWithinInterval, addDays, subMonths } from 'date-fns'
import {
  Calculator, Users, BarChart2, TrendingUp, DollarSign,
  AlertCircle, CheckCircle2, Clock, Target, ArrowRight,
  FileText, PlusCircle,
} from 'lucide-react'
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, type EstimateRecord } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { fmt } from '../utils/calculations'
import QuickPaymentModal from '../components/modals/QuickPaymentModal'

type ClientMap = Record<string, string>

function outstanding(e: EstimateRecord): number {
  if (e.balance_paid) return 0
  return e.total_quote - (e.deposit_paid ? e.deposit_amount : 0)
}

function daysOld(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

const STATUS_BADGE: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

function openInEstimator(e: EstimateRecord, navigate: (path: string) => void) {
  if (e.data) {
    localStorage.setItem('ttc_draft_estimate', JSON.stringify(e.data))
  }
  navigate('/estimator')
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { lang } = useLanguage()
  const navigate = useNavigate()

  const [estimates, setEstimates] = useState<EstimateRecord[]>([])
  const [clientMap, setClientMap] = useState<ClientMap>({})
  const [loading, setLoading] = useState(true)
  const [paymentModalEst, setPaymentModalEst] = useState<EstimateRecord | null>(null)
  const [followUpStatus, setFollowUpStatus] = useState<Record<string, 'sending' | 'sent' | 'error'>>({})
  const [markingSent, setMarkingSent] = useState<Record<string, boolean>>({})

  // Revenue goal — persisted in localStorage
  const [monthlyGoal, setMonthlyGoal] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem('ttc_revenue_goal') || '0') || 0 } catch { return 0 }
  })
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  const saveGoal = (val: number) => {
    setMonthlyGoal(val)
    localStorage.setItem('ttc_revenue_goal', JSON.stringify(val))
    setEditingGoal(false)
  }

  const sendFollowUp = async (e: EstimateRecord) => {
    const clientEmail = (e.data as { client?: { email?: string } } | null)?.client?.email
    const clientName = (e.data as { client?: { name?: string } } | null)?.client?.name
    if (!clientEmail) { alert('No client email on this estimate.'); return }
    setFollowUpStatus(s => ({ ...s, [e.id]: 'sending' }))
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-followup-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          to: clientEmail,
          clientName: clientName || 'Client',
          companyName: profile?.company_name || '',
          replyTo: profile?.business_email || undefined,
          estimateNumber: e.estimate_number,
          projectType: e.project_type,
          totalQuote: e.total_quote,
          daysOld: daysOld(e.created_at),
          lang,
        }),
      })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setFollowUpStatus(s => ({ ...s, [e.id]: 'sent' }))
      setTimeout(() => setFollowUpStatus(s => { const n = { ...s }; delete n[e.id]; return n }), 4000)
    } catch {
      setFollowUpStatus(s => ({ ...s, [e.id]: 'error' }))
      setTimeout(() => setFollowUpStatus(s => { const n = { ...s }; delete n[e.id]; return n }), 4000)
    }
  }

  const markAsSent = async (e: EstimateRecord) => {
    setMarkingSent(s => ({ ...s, [e.id]: true }))
    await supabase.from('estimates').update({ status: 'sent' }).eq('id', e.id)
    setEstimates(prev => prev.map(est => est.id === e.id ? { ...est, status: 'sent' } : est))
    setMarkingSent(s => { const n = { ...s }; delete n[e.id]; return n })
  }

  const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const companyName = profile?.company_name || ''

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase
        .from('estimates')
        .select('id, estimate_number, project_type, status, total_quote, deposit_amount, deposit_paid, deposit_paid_at, balance_paid, balance_paid_at, created_at, updated_at, client_id, data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id),
    ]).then(([estRes, clientRes]) => {
      if (estRes.data) setEstimates(estRes.data as EstimateRecord[])
      if (clientRes.data) {
        const map: ClientMap = {}
        for (const c of clientRes.data) map[c.id] = c.name
        setClientMap(map)
      }
      setLoading(false)
    })
  }, [user?.id])

  // ── Summary metrics ───────────────────────────────────────────────────────────
  const thisMonthStart = useMemo(() => startOfMonth(new Date()), [])

  const openEstimates = useMemo(
    () => estimates.filter(e => e.status === 'draft' || e.status === 'sent'),
    [estimates]
  )

  const pendingValue = useMemo(
    () => openEstimates.reduce((s, e) => s + e.total_quote, 0),
    [openEstimates]
  )

  const outstandingBalance = useMemo(
    () => estimates
      .filter(e => e.status === 'accepted' && !e.balance_paid)
      .reduce((s, e) => s + outstanding(e), 0),
    [estimates]
  )

  const revenueThisMonth = useMemo(
    () => estimates
      .filter(e => e.balance_paid && isWithinInterval(new Date(e.created_at), { start: thisMonthStart, end: new Date() }))
      .reduce((s, e) => s + e.total_quote, 0),
    [estimates, thisMonthStart]
  )

  const winRate = useMemo(() => {
    const sent = estimates.filter(e => ['sent', 'accepted', 'declined'].includes(e.status))
    if (sent.length === 0) return null
    return Math.round((estimates.filter(e => e.status === 'accepted').length / sent.length) * 100)
  }, [estimates])

  const avgJobSize = useMemo(() => {
    const closed = estimates.filter(e => ['accepted', 'declined'].includes(e.status))
    if (closed.length === 0) return null
    return closed.reduce((s, e) => s + e.total_quote, 0) / closed.length
  }, [estimates])

  // ── Aging alerts — sent estimates with no response 7+ days ───────────────────
  const needFollowUp = useMemo(
    () => estimates
      .filter(e => e.status === 'sent' && daysOld(e.created_at) > 7)
      .sort((a, b) => daysOld(b.created_at) - daysOld(a.created_at))
      .slice(0, 5),
    [estimates]
  )

  // ── Upcoming project starts (next 14 days) ────────────────────────────────────
  const upcomingProjects = useMemo(() => {
    const now = new Date()
    const cutoff = addDays(now, 14)
    return estimates
      .filter(e => {
        if (e.status !== 'accepted') return false
        const startDate = (e.data as { settings?: { projectStartDate?: string } } | null)?.settings?.projectStartDate
        if (!startDate) return false
        const d = new Date(startDate + 'T12:00:00')
        return d >= now && d <= cutoff
      })
      .map(e => ({
        ...e,
        startDate: (e.data as { settings?: { projectStartDate?: string } } | null)?.settings?.projectStartDate!,
      }))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5)
  }, [estimates])

  // ── Recent estimates ──────────────────────────────────────────────────────────
  const recentEstimates = useMemo(() => estimates.slice(0, 7), [estimates])

  // ── Pipeline board — estimates grouped by status ──────────────────────────────
  const PIPELINE_STATUSES = ['draft', 'sent', 'accepted', 'declined'] as const
  const pipeline = useMemo(() => {
    return PIPELINE_STATUSES.map(s => {
      const group = estimates.filter(e => e.status === s)
      return {
        status: s,
        count: group.length,
        value: group.reduce((sum, e) => sum + e.total_quote, 0),
        top: group.slice(0, 4),
      }
    })
  }, [estimates])

  // ── Revenue by project type ────────────────────────────────────────────────────
  const revenueByType = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of estimates) {
      if (!e.project_type) continue
      map[e.project_type] = (map[e.project_type] ?? 0) + e.total_quote
    }
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
    const max = entries[0]?.[1] ?? 1
    return entries.map(([type, value]) => ({ type, value, pct: Math.round((value / max) * 100) }))
  }, [estimates])

  // ── 6-month revenue trend ─────────────────────────────────────────────────────
  const monthlyRevenue = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i)
      const start = startOfMonth(d)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59)
      return { label: format(d, 'MMM'), start, end }
    })
    const result = months.map(({ label, start, end }) => {
      const value = estimates
        .filter(e => ['sent', 'accepted'].includes(e.status) && isWithinInterval(new Date(e.created_at), { start, end }))
        .reduce((s, e) => s + e.total_quote, 0)
      return { label, value }
    })
    const max = Math.max(...result.map(r => r.value), 1)
    return result.map(r => ({ ...r, pct: Math.round((r.value / max) * 100) }))
  }, [estimates])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  const isEs = lang === 'es'
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return isEs ? 'Buenos días' : 'Good morning'
    if (h < 17) return isEs ? 'Buenas tardes' : 'Good afternoon'
    return isEs ? 'Buenas noches' : 'Good evening'
  })()

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </h1>
            {companyName && (
              <p className="text-sm text-gray-500 mt-0.5">{companyName}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={() => navigate('/estimator')}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm transition self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            {isEs ? 'Nuevo Estimado' : 'New Estimate'}
          </button>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isEs ? 'Estimados Abiertos' : 'Open Estimates'}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900">{openEstimates.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">{fmt(pendingValue)}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isEs ? 'Saldo Pendiente' : 'Outstanding'}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900">{fmt(outstandingBalance)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEs ? 'Trabajos aceptados' : 'Accepted jobs'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isEs ? 'Cobrado Este Mes' : 'Revenue This Month'}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900">{fmt(revenueThisMonth)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{format(new Date(), 'MMMM yyyy')}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <Target className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isEs ? 'Tasa de Cierre' : 'Win Rate'}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900">
              {winRate !== null ? `${winRate}%` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {avgJobSize !== null
                ? `${isEs ? 'Prom.' : 'Avg'} ${fmt(avgJobSize)}`
                : isEs ? 'Enviados → Aceptados' : 'Sent → Accepted'}
            </p>
          </div>
        </div>

        {/* ── Revenue Goal Tracker ─────────────────────────────────────────── */}
        {(() => {
          const goalPct = monthlyGoal > 0 ? Math.min(Math.round((revenueThisMonth / monthlyGoal) * 100), 100) : 0
          const overGoal = monthlyGoal > 0 && revenueThisMonth >= monthlyGoal
          const remaining = Math.max(0, monthlyGoal - revenueThisMonth)
          // SVG donut: r=28, circumference = 2π*28 ≈ 175.9
          const circ = 2 * Math.PI * 28
          const dash = (goalPct / 100) * circ
          return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-600" />
                  {isEs ? 'Meta Mensual de Ingresos' : 'Monthly Revenue Goal'}
                  <span className="text-xs text-gray-400 font-normal">· {format(new Date(), 'MMMM')}</span>
                </h3>
                {!editingGoal && (
                  <button
                    onClick={() => { setGoalInput(String(monthlyGoal || '')); setEditingGoal(true) }}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                  >
                    {monthlyGoal ? (isEs ? 'Cambiar meta' : 'Edit goal') : (isEs ? '+ Establecer meta' : '+ Set goal')}
                  </button>
                )}
              </div>

              {editingGoal ? (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-semibold text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    autoFocus
                    className="form-input flex-1 text-sm"
                    placeholder={isEs ? 'Meta mensual en $' : 'Monthly goal in $'}
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveGoal(parseFloat(goalInput) || 0)
                      if (e.key === 'Escape') setEditingGoal(false)
                    }}
                  />
                  <button onClick={() => saveGoal(parseFloat(goalInput) || 0)} className="btn-primary text-sm">
                    {isEs ? 'Guardar' : 'Save'}
                  </button>
                  <button onClick={() => setEditingGoal(false)} className="btn-secondary text-sm">
                    {isEs ? 'Cancelar' : 'Cancel'}
                  </button>
                </div>
              ) : monthlyGoal === 0 ? (
                <div className="flex items-center justify-center py-4 text-gray-300">
                  <div className="text-center">
                    <Target className="w-8 h-8 mx-auto mb-1 opacity-30" />
                    <p className="text-xs text-gray-400">
                      {isEs ? 'Establece una meta para ver tu progreso' : 'Set a goal to track your progress'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  {/* Donut ring */}
                  <div className="relative shrink-0">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      {/* Track */}
                      <circle cx="40" cy="40" r="28" fill="none" stroke="#f3f4f6" strokeWidth="9" />
                      {/* Progress */}
                      <circle
                        cx="40" cy="40" r="28" fill="none"
                        stroke={overGoal ? '#16a34a' : goalPct >= 75 ? '#2563eb' : goalPct >= 50 ? '#f59e0b' : '#4f46e5'}
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${circ}`}
                        strokeDashoffset={circ / 4}
                        transform="rotate(-90 40 40) translate(0 0)"
                        style={{ transition: 'stroke-dasharray 0.6s ease' }}
                      />
                      <text x="40" y="44" textAnchor="middle" fontSize="13" fontWeight="800" fill={overGoal ? '#16a34a' : '#111827'}>
                        {goalPct}%
                      </text>
                    </svg>
                    {overGoal && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                  {/* Stats */}
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-500">{isEs ? 'Cobrado' : 'Collected'}</span>
                      <span className="font-bold text-gray-900">{fmt(revenueThisMonth)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-500">{isEs ? 'Meta' : 'Goal'}</span>
                      <span className="font-semibold text-gray-500">{fmt(monthlyGoal)}</span>
                    </div>
                    {overGoal ? (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-green-600 font-semibold">{isEs ? '¡Meta alcanzada! 🎉' : 'Goal reached! 🎉'}</span>
                        <span className="text-xs font-semibold text-green-600">+{fmt(revenueThisMonth - monthlyGoal)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-400">{isEs ? 'Faltante' : 'Remaining'}</span>
                        <span className="text-xs font-semibold text-amber-600">{fmt(remaining)}</span>
                      </div>
                    )}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full transition-all ${overGoal ? 'bg-green-500' : 'bg-brand-500'}`}
                        style={{ width: `${goalPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Follow-up alerts + Upcoming projects ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Follow-up alerts */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-amber-50">
              <h3 className="font-bold text-sm text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                {isEs ? 'Requieren Seguimiento' : 'Need Follow-Up'}
              </h3>
              <button
                onClick={() => navigate('/reports')}
                className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-0.5"
              >
                {isEs ? 'Ver todo' : 'View all'} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {needFollowUp.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <CheckCircle2 className="w-7 h-7 opacity-30 mb-1.5" />
                <p className="text-sm font-medium">
                  {isEs ? '¡Todo al día!' : 'All caught up!'}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {isEs ? 'Sin estimados pendientes de respuesta' : 'No estimates awaiting response'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {needFollowUp.map(e => {
                  const days = daysOld(e.created_at)
                  const fuStatus = followUpStatus[e.id]
                  const clientEmail = (e.data as { client?: { email?: string } } | null)?.client?.email
                  return (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openInEstimator(e, navigate)}>
                        <p className="font-semibold text-sm text-gray-800 truncate">
                          {clientMap[e.client_id ?? ''] ?? '—'}
                        </p>
                        <p className="text-xs text-gray-500 truncate capitalize">
                          {e.project_type?.replace(/-/g, ' ') ?? '—'} · #{e.estimate_number}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-xs text-gray-900">{fmt(e.total_quote)}</p>
                        <p className={`text-xs font-semibold ${days > 30 ? 'text-red-500' : 'text-amber-500'}`}>
                          {days}d {isEs ? 'sin resp.' : 'no resp.'}
                        </p>
                      </div>
                      <button
                        onClick={() => sendFollowUp(e)}
                        disabled={fuStatus === 'sending' || !clientEmail}
                        title={!clientEmail ? (isEs ? 'Sin email de cliente' : 'No client email') : (isEs ? 'Enviar seguimiento' : 'Send follow-up')}
                        className={`shrink-0 text-[10px] px-2 py-1 rounded-lg font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          fuStatus === 'sent' ? 'bg-green-100 text-green-700 border-green-200' :
                          fuStatus === 'error' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {fuStatus === 'sending' ? '⏳' : fuStatus === 'sent' ? '✓ Sent' : fuStatus === 'error' ? '✗ Error' : '📧'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Upcoming projects */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-green-50">
              <h3 className="font-bold text-sm text-green-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                {isEs ? 'Proyectos Próximos (14 días)' : 'Upcoming Projects (14 days)'}
              </h3>
            </div>
            {upcomingProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <TrendingUp className="w-7 h-7 opacity-30 mb-1.5" />
                <p className="text-sm font-medium">
                  {isEs ? 'Sin proyectos próximos' : 'No upcoming projects'}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {isEs ? 'Agrega fechas de inicio en tus estimados' : 'Set start dates in your estimates'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {upcomingProjects.map(e => {
                  const startDate = new Date(e.startDate + 'T12:00:00')
                  const daysAway = Math.round((startDate.getTime() - Date.now()) / 86400000)
                  return (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => openInEstimator(e, navigate)}
                      title={isEs ? 'Abrir en el estimador' : 'Open in estimator'}
                    >
                      <div className="shrink-0 w-10 h-10 bg-green-50 border border-green-200 rounded-lg flex flex-col items-center justify-center">
                        <p className="text-xs font-bold text-green-700 leading-none">
                          {format(startDate, 'MMM')}
                        </p>
                        <p className="text-base font-black text-green-800 leading-none">
                          {format(startDate, 'd')}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">
                          {clientMap[e.client_id ?? ''] ?? '—'}
                        </p>
                        <p className="text-xs text-gray-500 truncate capitalize">
                          {e.project_type?.replace(/-/g, ' ') ?? '—'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-gray-900">{fmt(e.total_quote)}</p>
                        <p className="text-xs text-green-600 font-medium">
                          {daysAway === 0 ? (isEs ? 'Hoy' : 'Today') :
                           daysAway === 1 ? (isEs ? 'Mañana' : 'Tomorrow') :
                           (isEs ? `en ${daysAway} días` : `in ${daysAway} days`)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Recent Estimates ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              {isEs ? 'Estimados Recientes' : 'Recent Estimates'}
            </h3>
            <button
              onClick={() => navigate('/estimator')}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-0.5"
            >
              {isEs ? 'Ver todos' : 'View all'} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentEstimates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText className="w-10 h-10 opacity-20 mb-2" />
              <p className="text-sm font-medium">
                {isEs ? 'Sin estimados aún' : 'No estimates yet'}
              </p>
              <button
                onClick={() => navigate('/estimator')}
                className="mt-3 flex items-center gap-1.5 text-xs bg-brand-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {isEs ? 'Crear primer estimado' : 'Create your first estimate'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {isEs ? 'Est #' : 'Est #'}
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {isEs ? 'Cliente' : 'Client'}
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                      {isEs ? 'Tipo' : 'Type'}
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                      {isEs ? 'Fecha' : 'Date'}
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {isEs ? 'Estado' : 'Status'}
                    </th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {isEs ? 'Total' : 'Total'}
                    </th>
                    <th className="w-12 py-2 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {recentEstimates.map(e => (
                    <tr
                      key={e.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition"
                    >
                      <td className="py-2.5 px-4 font-mono text-xs text-gray-400 cursor-pointer" onClick={() => openInEstimator(e, navigate)}>
                        {e.estimate_number ?? '—'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-gray-800 max-w-[120px] truncate cursor-pointer" onClick={() => openInEstimator(e, navigate)}>
                        {clientMap[e.client_id ?? ''] ?? '—'}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 capitalize hidden sm:table-cell cursor-pointer" onClick={() => openInEstimator(e, navigate)}>
                        {e.project_type?.replace(/-/g, ' ') ?? '—'}
                      </td>
                      <td className="py-2.5 px-4 text-gray-500 hidden md:table-cell whitespace-nowrap cursor-pointer" onClick={() => openInEstimator(e, navigate)}>
                        {format(new Date(e.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-2.5 px-4 cursor-pointer" onClick={() => openInEstimator(e, navigate)}>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[e.status]}`}>
                          {isEs
                            ? { draft: 'Borrador', sent: 'Enviado', accepted: 'Aceptado', declined: 'Rechazado' }[e.status]
                            : e.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-gray-900 cursor-pointer" onClick={() => openInEstimator(e, navigate)}>
                        {fmt(e.total_quote)}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {e.status === 'accepted' && (
                          <button
                            onClick={() => setPaymentModalEst(e)}
                            className={`text-xs px-2 py-0.5 rounded-lg font-medium transition-colors ${
                              e.balance_paid
                                ? 'text-green-600 bg-green-50 border border-green-200'
                                : 'text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100'
                            }`}
                            title={isEs ? 'Registrar pago' : 'Record payment'}
                          >
                            {e.balance_paid ? '✓ Paid' : '💰'}
                          </button>
                        )}
                        {e.status === 'draft' && (
                          <button
                            onClick={() => markAsSent(e)}
                            disabled={!!markingSent[e.id]}
                            className="text-xs px-2 py-0.5 rounded-lg font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
                            title={isEs ? 'Marcar como enviado' : 'Mark as sent'}
                          >
                            {markingSent[e.id] ? '⏳' : '📤'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pipeline Board ───────────────────────────────────────────────── */}
        {estimates.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-800">
                {isEs ? '📊 Pipeline de Estimados' : '📊 Estimate Pipeline'}
              </h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
              {pipeline.map(col => {
                const colors: Record<string, { header: string; badge: string; dot: string }> = {
                  draft:    { header: 'bg-gray-50',   badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
                  sent:     { header: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
                  accepted: { header: 'bg-green-50',  badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
                  declined: { header: 'bg-red-50',    badge: 'bg-red-100 text-red-600',     dot: 'bg-red-400' },
                }
                const c = colors[col.status]
                const label = isEs
                  ? { draft: 'Borrador', sent: 'Enviado', accepted: 'Aceptado', declined: 'Rechazado' }[col.status]
                  : col.status.charAt(0).toUpperCase() + col.status.slice(1)
                return (
                  <div key={col.status} className="flex flex-col">
                    <div className={`px-3 py-2.5 ${c.header} border-b border-gray-100`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                        <span className="text-xs font-semibold text-gray-700">{label}</span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-gray-900">{col.count}</span>
                        <span className="text-xs text-gray-500">{fmt(col.value)}</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50 flex-1">
                      {col.top.length === 0 ? (
                        <p className="text-xs text-gray-300 text-center py-4">—</p>
                      ) : (
                        col.top.map(e => (
                          <button
                            key={e.id}
                            onClick={() => openInEstimator(e, navigate)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 transition"
                          >
                            <p className="text-xs font-medium text-gray-700 truncate">
                              {clientMap[e.client_id ?? ''] ?? '—'}
                            </p>
                            <p className="text-[11px] text-gray-400 font-semibold">{fmt(e.total_quote)}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Revenue Insights ─────────────────────────────────────────────── */}
        {estimates.length > 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Project type breakdown */}
            {revenueByType.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="font-bold text-sm text-gray-800 mb-3">
                  {isEs ? '🏗 Ingresos por Tipo de Proyecto' : '🏗 Revenue by Project Type'}
                </h3>
                <div className="space-y-2">
                  {revenueByType.map(({ type, value, pct }) => (
                    <div key={type} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 capitalize font-medium">
                          {type.replace(/-/g, ' ')}
                        </span>
                        <span className="text-gray-800 font-bold">{fmt(value)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6-month trend */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="font-bold text-sm text-gray-800 mb-3">
                {isEs ? '📈 Estimados por Mes (6 meses)' : '📈 Estimates by Month (6 mo)'}
              </h3>
              <div className="flex items-end gap-2 h-28">
                {monthlyRevenue.map(({ label, value, pct }) => (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {value > 0 ? fmt(value).replace('$', '').replace(',000', 'k') : ''}
                    </span>
                    <div className="w-full bg-gray-100 rounded-t-md overflow-hidden" style={{ height: '80px' }}>
                      <div
                        className="w-full bg-brand-400 rounded-t-md transition-all duration-500 mt-auto"
                        style={{ height: `${Math.max(pct, value > 0 ? 4 : 0)}%`, marginTop: `${100 - Math.max(pct, value > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">{label}</span>
                  </div>
                ))}
              </div>
              {winRate !== null && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">{isEs ? 'Tasa de cierre general' : 'Overall close rate'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${winRate}%` }} />
                    </div>
                    <span className="font-bold text-green-700">{winRate}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: Calculator, label: isEs ? 'Nuevo Estimado' : 'New Estimate', path: '/estimator', color: 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100' },
            { icon: Users,      label: isEs ? 'Gestionar Clientes' : 'Manage Clients', path: '/crm', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
            { icon: BarChart2,  label: isEs ? 'Ver Reportes' : 'View Reports', path: '/reports', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
          ].map(({ icon: Icon, label, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 px-4 py-4 rounded-xl border font-semibold text-sm transition ${color}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </button>
          ))}
        </div>

      </div>

      {/* Quick Payment Modal */}
      {paymentModalEst && (
        <QuickPaymentModal
          estimateId={paymentModalEst.id}
          totalQuote={paymentModalEst.total_quote}
          estimateNumber={paymentModalEst.estimate_number ?? ''}
          onClose={() => {
            // Refresh the estimate row after saving to reflect new paid status
            supabase
              .from('estimates')
              .select('id, deposit_paid, deposit_amount, balance_paid, balance_paid_at')
              .eq('id', paymentModalEst.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setEstimates(prev => prev.map(e => e.id === data.id ? { ...e, ...data } : e))
                }
              })
            setPaymentModalEst(null)
          }}
        />
      )}
    </div>
  )
}
