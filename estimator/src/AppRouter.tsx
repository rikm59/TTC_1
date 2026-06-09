import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import CRMPage from './pages/CRMPage'
import ReportsPage from './pages/ReportsPage'
import AdminPage from './pages/AdminPage'
import OnboardingPage from './pages/OnboardingPage'
import App from './App'
import AppShell from './components/AppShell'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )
}

function RequireAuthOnly({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, profileLoading } = useAuth()
  if (loading || profileLoading) return <Spinner />
  if (!session) return <Navigate to="/" replace />
  if (!profile?.onboarding_complete) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/" replace />
  if (profile?.role !== 'admin') return <Navigate to="/estimator" replace />
  return <>{children}</>
}

export default function AppRouter() {
  const { session, loading } = useAuth()

  if (loading) return <Spinner />

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/estimator" replace /> : <LandingPage />} />
      <Route path="/estimator" element={
        <RequireAuth><AppShell><App /></AppShell></RequireAuth>
      } />
      <Route path="/crm" element={
        <RequireAuth><AppShell><CRMPage /></AppShell></RequireAuth>
      } />
      <Route path="/reports" element={
        <RequireAuth><AppShell><ReportsPage /></AppShell></RequireAuth>
      } />
      <Route path="/onboarding" element={
        <RequireAuthOnly><OnboardingPage /></RequireAuthOnly>
      } />
      <Route path="/admin" element={
        <RequireAdmin><AppShell><AdminPage /></AppShell></RequireAdmin>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
