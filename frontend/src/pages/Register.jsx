import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import useAuth from '../context/useAuth'
import Notice from '../components/Notice'

function dashboardPath(role) {
  return role === 'owner' ? '/owner' : '/profile'
}

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState(() => ({
    name: '',
    email: '',
    password: '',
    role: searchParams.get('role') === 'owner' ? 'owner' : 'user',
  }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await signUp(form)
      navigate(dashboardPath(user.role), { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create your account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[72vh] max-w-7xl items-center justify-center px-5 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">Join Staywell</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{form.role === 'owner' ? 'Bring your place to Staywell.' : 'Make room for a better trip.'}</h1>
        <p className="mt-2 text-slate-500">{form.role === 'owner' ? 'Create your property-owner account to add rooms and manage reservations.' : 'Create an account to find and book your next stay.'}</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          {error && <Notice>{error}</Notice>}
          <label className="block text-sm font-medium text-slate-700">Full name<input required maxLength={100} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100" /></label>
          <label className="block text-sm font-medium text-slate-700">Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100" /></label>
          <label className="block text-sm font-medium text-slate-700">Password <span className="font-normal text-slate-500">(at least 8 characters)</span><input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100" /></label>
          <label className="block text-sm font-medium text-slate-700">I’m joining as<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100"><option value="user">A traveler</option><option value="owner">A property owner</option></select></label>
          <button disabled={busy} className="w-full rounded-xl bg-amber-600 px-5 py-3.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{busy ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-semibold text-amber-700 hover:underline">Sign in</Link></p>
      </div>
    </main>
  )
}
