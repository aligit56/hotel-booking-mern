import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../context/useAuth'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, authError } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="mx-auto max-w-7xl px-5 py-24 text-center text-slate-500">Checking your session…</div>
  }
  if (authError) {
    return <div className="mx-auto max-w-7xl px-5 py-24 text-center text-rose-700">{authError}</div>
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}
