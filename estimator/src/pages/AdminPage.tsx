import { useState, useEffect, useCallback } from 'react'
import { supabase, type AdminUser, type AuditLog, type WebInterest } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import {
  Users, DollarSign, TrendingUp, UserCheck, Shield,
  Search, RefreshCw, RotateCcw, Ban, ChevronRight,
  AlertCircle, CheckCircle, Clock, Activity, BarChart3,
  ShieldAlert, Globe, ExternalLink, Pencil, X,
} from 'lucide-react'

interface Stats {
  totalUsers: number
  newThisMonth: number
  plans: { free: number; pro: number; enterprise: number }
  statuses: { active: number; trialing: number; past_due: number; canceled: number; inactive: number }
}

const PLAN_PRICES: Record<string, number> = { free: 0, pro: 49, enterprise: 149 }

async function callAdmin(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...params },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

function Spinner() {
  return <div className="w-7 h-7 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
}

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    pro: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${colors[plan] ?? 'bg-gray-100 text-gray-600'}`}>
      {plan}
    </span>
  )
}

function SubStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; label: string }> = {
    active:   { color: 'bg-green-100 text-green-700',   label: 'Active' },
    trialing: { color: 'bg-blue-100 text-blue-700',     label: 'Trial' },
    past_due: { color: 'bg-yellow-100 text-yellow-700', label: 'Past Due' },
    canceled: { color: 'bg-red-100 text-red-600',       label: 'Canceled' },
    inactive: { color: 'bg-gray-100 text-gray-500',     label: 'Inactive' },
  }
  const cfg = configs[status] ?? configs.inactive
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    reset_password: 'bg-blue-50 text-blue-700',
    toggle_ban: 'bg-red-50 text-red-700',
    list_users: 'bg-gray-100 text-gray-600',
    get_stats: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[action] ?? 'bg-gray-100 text-gray-600'}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

function isBanned(u: AdminUser) {
  return !!u.banned_until && new Date(u.banned_until) > new Date()
}

function LeadStatusBadge({ status }: { status: WebInterest['status'] }) {
  const cfg: Record<WebInterest['status'], { color: string; label: string }> = {
    new:         { color: 'bg-blue-100 text-blue-700',   label: 'New' },
    contacted:   { color: 'bg-yellow-100 text-yellow-700', label: 'Contacted' },
    in_progress: { color: 'bg-purple-100 text-purple-700', label: 'In Progress' },
    completed:   { color: 'bg-green-100 text-green-700',   label: 'Completed' },
    declined:    { color: 'bg-red-100 text-red-600',       label: 'Declined' },
  }
  const { color, label } = cfg[status]
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
}

export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'overview' | 'users' | 'billing' | 'audit' | 'leads'>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [webLeads, setWebLeads] = useState<WebInterest[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [confirmTarget, setConfirmTarget] = useState<{ user: AdminUser; type: 'reset' | 'ban' | 'unban' } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [expandedLead, setExpandedLead] = useState<string | null>(null)

  // Edit drawer state
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [editPlan, setEditPlan] = useState('free')
  const [editRole, setEditRole] = useState('user')
  const [editStatus, setEditStatus] = useState('inactive')
  const [editOnboarding, setEditOnboarding] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  const openEdit = (u: AdminUser) => {
    setEditTarget(u)
    setEditPlan(u.profile?.plan ?? 'free')
    setEditRole(u.profile?.role ?? 'user')
    setEditStatus(u.profile?.subscription_status ?? 'inactive')
    setEditOnboarding(u.profile?.onboarding_complete ?? false)
  }

  const handleUpdateUser = async () => {
    if (!editTarget) return
    setEditLoading(true)
    try {
      await callAdmin('update_user', {
        userId: editTarget.id,
        plan: editPlan,
        role: editRole,
        subscriptionStatus: editStatus,
        onboardingComplete: editOnboarding,
      })
      showToast(`${editTarget.email} updated successfully`)
      await Promise.all([loadUsers(), loadStats()])
      setEditTarget(null)
    } catch (e) {
      showToast(`Error: ${(e as Error).message}`, false)
    }
    setEditLoading(false)
  }

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const loadStats = useCallback(async () => {
    const data = await callAdmin('get_stats')
    setStats(data)
  }, [])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    const data = await callAdmin('list_users', { perPage: 200 })
    setUsers((data.users ?? []) as AdminUser[])
    setUsersLoading(false)
  }, [])

  const loadAuditLog = useCallback(async () => {
    const { data } = await supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setAuditLogs(data as AuditLog[])
  }, [])

  const loadWebLeads = useCallback(async () => {
    setLeadsLoading(true)
    const { data } = await supabase
      .from('web_interest')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setWebLeads(data as WebInterest[])
    setLeadsLoading(false)
  }, [])

  const updateLeadStatus = async (id: string, status: WebInterest['status']) => {
    await supabase.from('web_interest').update({ status }).eq('id', id)
    setWebLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  useEffect(() => {
    Promise.all([loadStats(), loadUsers(), loadAuditLog(), loadWebLeads()]).finally(() => setLoading(false))
  }, [loadStats, loadUsers, loadAuditLog, loadWebLeads])

  const handleRefresh = () => {
    Promise.all([loadStats(), loadUsers(), loadAuditLog(), loadWebLeads()])
  }

  const handleConfirm = async () => {
    if (!confirmTarget) return
    const { user: target, type } = confirmTarget
    setActionLoading(true)
    try {
      if (type === 'reset') {
        await callAdmin('reset_password', { email: target.email })
        showToast(`Password reset email sent to ${target.email}`)
      } else if (type === 'ban') {
        await callAdmin('toggle_ban', { userId: target.id, banned: true })
        showToast(`${target.email} suspended`)
        await loadUsers()
      } else if (type === 'unban') {
        await callAdmin('toggle_ban', { userId: target.id, banned: false })
        showToast(`${target.email} reinstated`)
        await loadUsers()
      }
      await loadAuditLog()
    } catch (e) {
      showToast(`Error: ${(e as Error).message}`, false)
    }
    setActionLoading(false)
    setConfirmTarget(null)
  }

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      u.email.toLowerCase().includes(q) ||
      (u.profile?.full_name ?? '').toLowerCase().includes(q) ||
      (u.profile?.company_name ?? '').toLowerCase().includes(q)
    const matchPlan = planFilter === 'all' || u.profile?.plan === planFilter
    return matchSearch && matchPlan
  })

  const mrr = stats
    ? (stats.plans.pro * PLAN_PRICES.pro) + (stats.plans.enterprise * PLAN_PRICES.enterprise)
    : 0

  const newLeadsCount = webLeads.filter(l => l.status === 'new').length
  const TABS: { key: 'overview' | 'users' | 'billing' | 'audit' | 'leads'; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'overview', label: 'Overview',   icon: BarChart3 },
    { key: 'users',    label: 'Users',      icon: Users },
    { key: 'billing',  label: 'Billing',    icon: DollarSign },
    { key: 'audit',    label: 'Audit Log',  icon: Shield },
    { key: 'leads',    label: 'Web Leads',  icon: Globe, badge: newLeadsCount },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white flex items-center gap-2 transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok
            ? <CheckCircle className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                confirmTarget.type === 'ban' ? 'bg-red-100' :
                confirmTarget.type === 'unban' ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                {confirmTarget.type === 'reset' && <RotateCcw className="w-5 h-5 text-blue-600" />}
                {confirmTarget.type === 'ban' && <Ban className="w-5 h-5 text-red-600" />}
                {confirmTarget.type === 'unban' && <CheckCircle className="w-5 h-5 text-green-600" />}
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {confirmTarget.type === 'reset' && 'Send Password Reset'}
                {confirmTarget.type === 'ban' && 'Suspend User'}
                {confirmTarget.type === 'unban' && 'Reinstate User'}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              {confirmTarget.type === 'reset' && `A password reset email will be sent to ${confirmTarget.user.email}.`}
              {confirmTarget.type === 'ban' && `${confirmTarget.user.email} will be blocked from signing in immediately.`}
              {confirmTarget.type === 'unban' && `${confirmTarget.user.email} will be able to sign in again.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleConfirm}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition ${
                  confirmTarget.type === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                  confirmTarget.type === 'unban' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                {actionLoading ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Drawer ── */}
      {editTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditTarget(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="font-bold text-gray-900">Edit User</h2>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-52">{editTarget.email}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Avatar + email */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {editTarget.email[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{editTarget.profile?.full_name || editTarget.profile?.business_name || '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{editTarget.email}</p>
                </div>
              </div>

              {/* Plan */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['free', 'pro', 'enterprise'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setEditPlan(p)}
                      className={`py-2 rounded-xl border-2 text-sm font-semibold capitalize transition ${
                        editPlan === p
                          ? p === 'free' ? 'border-gray-500 bg-gray-50 text-gray-700'
                          : p === 'pro' ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['user', 'admin'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setEditRole(r)}
                      className={`py-2 rounded-xl border-2 text-sm font-semibold capitalize transition ${
                        editRole === r
                          ? r === 'admin' ? 'border-red-500 bg-red-50 text-red-700' : 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {r === 'admin' ? '🛡 Admin' : '👤 User'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subscription Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subscription Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Onboarding */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Onboarding Complete</p>
                  <p className="text-xs text-gray-400 mt-0.5">Disable to force wizard on next login</p>
                </div>
                <button
                  onClick={() => setEditOnboarding(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${editOnboarding ? 'bg-brand-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editOnboarding ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200">
              <button
                onClick={handleUpdateUser}
                disabled={editLoading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {editLoading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  : 'Save Changes'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Admin Command Center</h1>
              <p className="text-xs text-gray-500">Signed in as {user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                tab === key
                  ? 'border-red-600 text-red-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {badge != null && badge > 0 && (
                <span className="ml-0.5 bg-red-600 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={Users}     label="Total Users"     value={stats.totalUsers}          color="bg-blue-50 text-blue-600" />
              <StatCard icon={UserCheck} label="New This Month"  value={stats.newThisMonth}        color="bg-green-50 text-green-600" />
              <StatCard icon={TrendingUp} label="Active Plans"   value={stats.statuses.active}     sub="subscriptions" color="bg-purple-50 text-purple-600" />
              <StatCard icon={DollarSign} label="Est. MRR"       value={`$${mrr.toLocaleString()}`} sub="monthly recurring" color="bg-emerald-50 text-emerald-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Users by Plan</h3>
                <div className="space-y-3">
                  {(['enterprise', 'pro', 'free'] as const).map(plan => {
                    const count = stats.plans[plan]
                    const pct = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0
                    return (
                      <div key={plan}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium capitalize">{plan}</span>
                          <span className="text-gray-500">{count} users</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              plan === 'enterprise' ? 'bg-purple-500' :
                              plan === 'pro' ? 'bg-blue-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Subscription Statuses</h3>
                <div className="space-y-2.5">
                  {Object.entries(stats.statuses).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <SubStatusBadge status={status} />
                      <span className="text-sm font-semibold text-gray-700">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email, or company…"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {usersLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Spinner />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left">
                        <th className="px-4 py-3 font-semibold text-gray-600">User</th>
                        <th className="px-4 py-3 font-semibold text-gray-600">Plan</th>
                        <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 font-semibold text-gray-600">Joined</th>
                        <th className="px-4 py-3 font-semibold text-gray-600">Last Sign In</th>
                        <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map(u => {
                        const banned = isBanned(u)
                        return (
                          <tr key={u.id} className={`hover:bg-gray-50 transition ${banned ? 'opacity-60' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                                  {u.email[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 leading-tight">
                                    {u.profile?.full_name || u.profile?.company_name || '—'}
                                  </div>
                                  <div className="text-gray-400 text-xs">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <PlanBadge plan={u.profile?.plan ?? 'free'} />
                            </td>
                            <td className="px-4 py-3">
                              {banned
                                ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Suspended</span>
                                : <SubStatusBadge status={u.profile?.subscription_status ?? 'inactive'} />}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                              {format(new Date(u.created_at), 'MMM d, yyyy')}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                              {u.last_sign_in_at ? format(new Date(u.last_sign_in_at), 'MMM d, yyyy') : 'Never'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEdit(u)}
                                  title="Edit user"
                                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setConfirmTarget({ user: u, type: 'reset' })}
                                  title="Send password reset email"
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                {banned ? (
                                  <button
                                    onClick={() => setConfirmTarget({ user: u, type: 'unban' })}
                                    title="Reinstate user"
                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setConfirmTarget({ user: u, type: 'ban' })}
                                    title="Suspend user"
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                )}
                                {u.profile?.stripe_customer_id && (
                                  <a
                                    href={`https://dashboard.stripe.com/customers/${u.profile.stripe_customer_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="View in Stripe"
                                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                  >
                                    <DollarSign className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-gray-400 text-sm">No users match your search.</div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
        )}

        {/* ── BILLING ──────────────────────────────────────────── */}
        {tab === 'billing' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={DollarSign}    label="Est. MRR"     value={`$${mrr.toLocaleString()}`}   sub="monthly recurring revenue" color="bg-emerald-50 text-emerald-600" />
              <StatCard icon={CheckCircle}   label="Active Subs"  value={stats.statuses.active}        color="bg-green-50 text-green-600" />
              <StatCard icon={Clock}         label="Trialing"     value={stats.statuses.trialing}      color="bg-blue-50 text-blue-600" />
              <StatCard icon={AlertCircle}   label="Past Due"     value={stats.statuses.past_due}      color="bg-yellow-50 text-yellow-600" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Paying Users</h3>
                <p className="text-xs text-gray-400 mt-0.5">Pro and Enterprise subscribers</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left">
                      <th className="px-4 py-3 font-semibold text-gray-600">User</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Plan</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">MRR</th>
                      <th className="px-4 py-3 font-semibold text-gray-600">Stripe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users
                      .filter(u => u.profile?.plan && u.profile.plan !== 'free')
                      .sort((a, b) =>
                        PLAN_PRICES[b.profile?.plan ?? 'free'] - PLAN_PRICES[a.profile?.plan ?? 'free'])
                      .map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {u.profile?.company_name || u.profile?.full_name || '—'}
                            </div>
                            <div className="text-gray-400 text-xs">{u.email}</div>
                          </td>
                          <td className="px-4 py-3"><PlanBadge plan={u.profile?.plan ?? 'free'} /></td>
                          <td className="px-4 py-3">
                            <SubStatusBadge status={u.profile?.subscription_status ?? 'inactive'} />
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-700">
                            ${PLAN_PRICES[u.profile?.plan ?? 'free']}/mo
                          </td>
                          <td className="px-4 py-3">
                            {u.profile?.stripe_customer_id ? (
                              <a
                                href={`https://dashboard.stripe.com/customers/${u.profile.stripe_customer_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-brand-600 hover:underline flex items-center gap-0.5"
                              >
                                View <ChevronRight className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {users.filter(u => u.profile?.plan && u.profile.plan !== 'free').length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">No paying users yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── WEB LEADS ────────────────────────────────────────── */}
        {tab === 'leads' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Website Interest Leads</h2>
                <p className="text-xs text-gray-400 mt-0.5">Submissions from the "Need a Website?" form</p>
              </div>
              <button
                onClick={loadWebLeads}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            {leadsLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner /></div>
            ) : webLeads.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-20 text-center">
                <Globe className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No leads yet</p>
                <p className="text-xs text-gray-400 mt-1">Website interest submissions will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {webLeads.map(lead => (
                  <div key={lead.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                      onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {lead.business_name || 'Unnamed Business'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {lead.business_email || lead.business_phone || '—'} · {format(new Date(lead.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={lead.status}
                          onChange={e => { e.stopPropagation(); updateLeadStatus(lead.id, e.target.value as WebInterest['status']) }}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-200"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="declined">Declined</option>
                        </select>
                        <LeadStatusBadge status={lead.status} />
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedLead === lead.id ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {expandedLead === lead.id && (
                      <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Contact Info</h4>
                          <p><span className="text-gray-400">Business:</span> {lead.business_name || '—'}</p>
                          <p><span className="text-gray-400">Email:</span> {lead.business_email || '—'}</p>
                          <p><span className="text-gray-400">Phone:</span> {lead.business_phone || '—'}</p>
                          <p><span className="text-gray-400">Address:</span> {lead.business_address || '—'}</p>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Website Preferences</h4>
                          <p><span className="text-gray-400">Style:</span> {lead.style || '—'}</p>
                          <p><span className="text-gray-400">Budget:</span> {lead.budget || '—'}</p>
                          <p><span className="text-gray-400">Timeline:</span> {lead.timeline || '—'}</p>
                          <p><span className="text-gray-400">Used existing details:</span> {lead.use_existing ? 'Yes' : 'No'}</p>
                        </div>
                        {lead.colors?.length > 0 && (
                          <div className="sm:col-span-2">
                            <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Colors</h4>
                            <div className="flex gap-2 flex-wrap">
                              {lead.colors.map((c, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
                                  <div className="w-4 h-4 rounded-full border border-gray-300" style={{ background: c }} />
                                  <span className="text-xs text-gray-600">{c}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {lead.details && (
                          <div className="sm:col-span-2">
                            <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">Special Details</h4>
                            <p className="text-gray-600 text-xs leading-relaxed bg-white border border-gray-200 rounded-lg p-3">{lead.details}</p>
                          </div>
                        )}
                        {lead.logo_url && (
                          <div>
                            <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Logo</h4>
                            <a href={lead.logo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                              <ExternalLink className="w-3 h-3" /> View Logo
                            </a>
                          </div>
                        )}
                        {lead.photo_urls?.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Photos ({lead.photo_urls.length})</h4>
                            <div className="flex gap-2 flex-wrap">
                              {lead.photo_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                                  <ExternalLink className="w-3 h-3" /> Photo {i + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── AUDIT LOG ────────────────────────────────────────── */}
        {tab === 'audit' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Admin Audit Log</h3>
                <p className="text-xs text-gray-400 mt-0.5">All privileged admin actions are permanently recorded</p>
              </div>
              <Activity className="w-5 h-5 text-gray-300" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">Timestamp</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Admin</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Action</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{log.admin_email}</td>
                      <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{log.target_email ?? '—'}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                        No admin actions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
