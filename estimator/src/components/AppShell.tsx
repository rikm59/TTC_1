import { type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Calculator, Users, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-4 shrink-0 no-print">
        <div className="flex items-center gap-2.5 mr-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center font-black text-white text-xs">
            TTC
          </div>
          <span className="font-bold text-gray-900 text-sm hidden sm:block">Top Trade Contractor</span>
        </div>

        <NavLink
          to="/estimator"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
            }`
          }
        >
          <Calculator className="w-4 h-4" />
          Estimator
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
          CRM
        </NavLink>

        <div className="ml-auto relative">
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
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Page content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
