import { Link } from 'react-router-dom'

export default function NotFound() {
  return <main className="mx-auto flex min-h-[65vh] max-w-7xl flex-col items-center justify-center px-5 text-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">404 · off the map</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">We couldn’t find that page.</h1><p className="mt-3 text-slate-500">Let’s get you back to somewhere lovely.</p><Link to="/" className="mt-7 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700">Back to home</Link></main>
}
