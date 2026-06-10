import { type ReactNode, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { Calculator, Users, LogOut, ChevronDown, ShieldAlert, Globe, BarChart2, LayoutDashboard, Bell } from 'lucide-react'
import TTCLogo from './TTCLogo'
import WebsiteInterestModal from './WebsiteInterestModal'
import { supabase } from '../lib/supabase'

interface AppNotification {
  id: string
  message: string
  type: 'accepted' | 'declined'
  seenAt?: number
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showWebsiteModal, setShowWebsiteModal] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [toasts, setToasts] = useState<AppNotification[]>([])
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const isAdmin = profile?.role === 'admin'
  const unreadCount = notifications.filter(n => !n.seenAt).length

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`estimates-notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'estimates', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status
          const oldStatus = (payload.old as { status?: string }).status
          if (newStatus === oldStatus) return
          if (newStatus !== 'accepted' && newStatus !== 'declined') return
          const data = payload.new as { data?: { client?: { name?: string }; estimateNumber?: string } }
          const clientName = data.data?.client?.name || 'Client'
          const estNum = data.data?.estimateNumber || ''
          const isAccepted = newStatus === 'accepted'
          const notif: AppNotification = {
            id: `${payload.new.id}-${Date.now()}`,
            message: isAccepted
              ? `✅ ${clientName} accepted${estNum ? ' #' + estNum : ''}`
              : `❌ ${clientName} declined${estNum ? ' #' + estNum : ''}`,
            type: isAccepted ? 'accepted' : 'declined',
          }
          setNotifications(prev => [notif, ...prev].slice(0, 20))
          setToasts(prev => [...prev, notif])
          const t = setTimeout(() => {
            setToasts(prev => prev.filter(n => n.id !== notif.id))
            toastTimers.current.delete(notif.id)
          }, 6000)
          toastTimers.current.set(notif.id, t)
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
      toastTimers.current.forEach(t => clearTimeout(t))
    }
  }, [user?.id])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-4 shrink-0 no-print">
        <div className="mr-4">
          <TTCLogo size={32} variant="full" darkText />
        </div>

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          {lang === 'es' ? 'Inicio' : 'Home'}
        </NavLink>

        <NavLink
          to="/estimator"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
            }`
          }
        >
          <Calculator className="w-4 h-4" />
          {t('nav.estimator')}
        </NavLink>

        <NavLink
          to="/crm"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
            }`
          }
        >
          <Users className="w-4 h-4" />
          {t('nav.crm')}
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
            }`
          }
        >
          <BarChart2 className="w-4 h-4" />
          {lang === 'es' ? 'Reportes' : 'Reports'}
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                isActive ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <ShieldAlert className="w-4 h-4" />
            {t('nav.admin')}
          </NavLink>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifications(prev => prev.map(n => ({ ...n, seenAt: n.seenAt ?? Date.now() })))
                navigate('/dashboard')
              }}
              className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition"
              title={lang === 'es' ? 'Notificaciones' : 'Notifications'}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="flex items-center gap-1.5 text-xs font-bold border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-full transition"
            title={t('nav.language')}
          >
            <Globe className="w-3.5 h-3.5" />
            {t('nav.language')}
          </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="hidden sm:block max-w-32 truncate">{user?.email}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  {isAdmin && (
                    <p className="text-xs font-semibold text-red-600 mt-0.5 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Admin
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.signOut')}
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      </nav>

      <div className="flex-1 overflow-auto relative">
        {children}

        {/* Floating "Need a Website?" button */}
        <button
          onClick={() => setShowWebsiteModal(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold text-sm px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all no-print"
        >
          <Globe className="w-4 h-4" />
          {t('appshell.needWebsite')}
        </button>
      </div>

      {showWebsiteModal && (
        <WebsiteInterestModal onClose={() => setShowWebsiteModal(false)} />
      )}

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 no-print">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-xs animate-slide-in ${
                toast.type === 'accepted'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => setToasts(prev => prev.filter(n => n.id !== toast.id))}
                className="text-gray-400 hover:text-gray-600 shrink-0 text-base leading-none"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
