import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../context/useAuth'
import Notice from '../components/Notice'

function dashboardPath(user) {
  if (user.role === 'admin') return '/admin'
  if (user.role === 'owner') return '/owner'
  return '/profile'
}

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await signIn(form)
      const destination = typeof location.state?.from === 'string'
        ? location.state.from
        : location.state?.from?.pathname || dashboardPath(user)
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto grid min-h-[72vh] max-w-7xl items-center gap-12 px-5 py-12 lg:grid-cols-2">
      <div className="hidden overflow-hidden rounded-3xl bg-slate-900 lg:block">
        <div className="relative min-h-[560px]">
          <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=85" alt="Warm hotel lounge" className="absolute inset-0 h-full w-full object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
          <div className="absolute bottom-10 left-10 max-w-md text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">Welcome back</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">Your next favorite place is waiting.</h1>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">Sign in to Staywell</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Good to have you back.</h2>
        <p className="mt-2 text-slate-500">Pick up where your next journey begins.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          {error && <Notice>{error}</Notice>}
          <label className="block text-sm font-medium text-slate-700">Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-100" /></label>
          <label className="block text-sm font-medium text-slate-700">Password<input required type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-amber-600 focus:ring-4 focus:ring-amber-100" /></label>
          <button disabled={busy} className="w-full rounded-xl bg-slate-900 px-5 py-3.5 font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">Don’t have an account? <Link to="/register" className="font-semibold text-amber-700 hover:underline">Create one</Link></p>
      </div>
    </main>
  )
}
