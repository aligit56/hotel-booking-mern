import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, Moon, Sun, X } from 'lucide-react'
import useAuth from '../context/useAuth'
import useTheme from '../context/useTheme'

const linkStyle = ({ isActive }) =>
  `text-sm font-medium transition hover:text-amber-700 ${isActive ? 'text-amber-700' : 'text-slate-600'}`

export default function Navbar() {
  const { user, loading, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSignOut = async () => {
    setError('')
    try {
      await signOut()
      setOpen(false)
      navigate('/')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not sign out. Please try again.')
    }
  }

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'owner' ? '/owner' : '/profile'

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="text-2xl font-bold tracking-tight text-slate-900">
          stay<span className="text-amber-600">well</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button type="button" className="rounded-lg p-2 text-slate-700 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        <nav className={`${open ? 'absolute left-0 right-0 top-full flex flex-col border-b border-slate-200 bg-white p-5 shadow-lg' : 'hidden'} gap-6 md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          <NavLink to="/hotels" className={linkStyle} onClick={() => setOpen(false)}>Explore stays</NavLink>
          {user ? (
            <>
              <NavLink to={dashboardPath} className={linkStyle} onClick={() => setOpen(false)}>
                {user.role === 'user' ? 'My stays' : 'Dashboard'}
              </NavLink>
              <span className="hidden text-sm text-slate-500 lg:inline">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={handleSignOut} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-900 hover:text-slate-900">
                Sign out
              </button>
            </>
          ) : !loading && (
            <>
              <NavLink to="/register?role=owner" className={linkStyle} onClick={() => setOpen(false)}>List your property</NavLink>
              <NavLink to="/login" className={linkStyle} onClick={() => setOpen(false)}>Log in</NavLink>
              <Link to="/register" onClick={() => setOpen(false)} className="rounded-full bg-slate-900 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-slate-700">
                Join Staywell
              </Link>
            </>
          )}
          {error && <span role="alert" className="text-sm text-rose-700">{error}</span>}
        </nav>
      </div>
    </header>
  )
}
