import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import useAuth from './context/useAuth'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminDashboard from './pages/AdminDashboard'
import Home from './pages/Home'
import HotelDetails from './pages/HotelDetails'
import HotelList from './pages/HotelList'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import OwnerDashboard from './pages/OwnerDashboard'
import Register from './pages/Register'
import UserProfile from './pages/UserProfile'

function DashboardRedirect() {
  const { user } = useAuth()
  if (user?.role === 'admin') return <Navigate to="/admin" replace />
  if (user?.role === 'owner') return <Navigate to="/owner" replace />
  return <Navigate to="/profile" replace />
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-[#fbfaf8] text-slate-900">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hotels" element={<HotelList />} />
        <Route path="/hotels/:id" element={<HotelDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute roles={['user']}><UserProfile /></ProtectedRoute>} />
        <Route path="/owner" element={<ProtectedRoute roles={['owner']}><OwnerDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="mt-20 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/" className="font-semibold tracking-tight text-slate-800">stay<span className="text-amber-600">well</span></Link>
            <p className="mt-1">Thoughtful stays, wherever you’re headed.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <Link to="/#about" className="hover:text-amber-700">About</Link>
            <Link to="/#why-staywell" className="hover:text-amber-700">Why Staywell</Link>
            <Link to="/#guest-reviews" className="hover:text-amber-700">Guest reviews</Link>
            <Link to="/register?role=owner" className="hover:text-amber-700">List your property</Link>
          </nav>
          <p>© Staywell</p>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
