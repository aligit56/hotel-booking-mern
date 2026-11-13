import { useEffect } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import useAuth from './context/useAuth'
import { ThemeProvider } from './context/ThemeContext'
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

function HashScroll() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) return undefined

    let attempts = 0
    let timeoutId
    const scrollToTarget = () => {
      const target = document.getElementById(hash.slice(1))
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (attempts < 40) {
        attempts += 1
        timeoutId = window.setTimeout(scrollToTarget, 50)
      }
    }

    scrollToTarget()
    return () => window.clearTimeout(timeoutId)
  }, [pathname, hash])

  return null
}

function FooterSectionLink({ section, children }) {
  const location = useLocation()
  const hash = `#${section}`

  return (
    <Link
      to={`/${hash}`}
      onClick={() => {
        if (location.pathname === '/' && location.hash === hash) {
          document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }}
      className="hover:text-amber-700"
    >
      {children}
    </Link>
  )
}

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
      <HashScroll />
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
            <FooterSectionLink section="about">About</FooterSectionLink>
            <FooterSectionLink section="why-staywell">Why Staywell</FooterSectionLink>
            <FooterSectionLink section="guest-reviews">Guest reviews</FooterSectionLink>
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
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
