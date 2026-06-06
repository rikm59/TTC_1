import { useState, useEffect, useCallback } from 'react'
import { supabase, type AdminUser, type AuditLog } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import {
  Users, DollarSign, TrendingUp, UserCheck, Shield,
  Search, RefreshCw, RotateCcw, Ban, ChevronRight,
  AlertCircle, CheckCircle, Clock, Activity, BarChart3,
  ShieldAlert,
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

export default function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'overview' | 'users' | 'billing' | 'audit'>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [confirmTarget, setConfirmTarget] = useState<{ user: AdminUser; type: 'reset' | 'ban' | 'unban' } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

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

  useEffect(() => {
    Promise.all([loadStats(), loadUsers(), loadAuditLog()]).finally(() => setLoading(false))
  }, [loadStats, loadUsers, loadAuditLog])

  const handleRefresh = () => {
    Promise.all([loadStats(), loadUsers(), loadAuditLog()])
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

  const TABS = [
    { key: 'overview' as const, label: 'Overview',   icon: BarChart3 },
    { key: 'users'    as const, label: 'Users',      icon: Users },
    { key: 'billing'  as const, label: 'Billing',    icon: DollarSign },
    { key: 'audit'    as const, label: 'Audit Log',  icon: Shield },
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
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                tab === key
                  ? 'border-red-600 text-red-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
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
