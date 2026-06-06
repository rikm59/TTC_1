import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import CRMPage from './pages/CRMPage'
import App from './App'
import AppShell from './components/AppShell'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )
  if (!session) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function AppRouter() {
  const { session, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/estimator" replace /> : <LandingPage />} />
      <Route path="/estimator" element={
        <RequireAuth><AppShell><App /></AppShell></RequireAuth>
      } />
      <Route path="/crm" element={
        <RequireAuth><AppShell><CRMPage /></AppShell></RequireAuth>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
