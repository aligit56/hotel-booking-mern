import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import HotelCard from '../components/HotelCard'

export default function HotelList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [hotels, setHotels] = useState([])
  const [loadedQuery, setLoadedQuery] = useState(null)
  const [error, setError] = useState('')
  const [city, setCity] = useState(searchParams.get('city') || '')
  const queryKey = searchParams.toString()
  const loading = loadedQuery !== queryKey

  useEffect(() => {
    let active = true
    api.get('/hotels', { params: { city: searchParams.get('city') || undefined, limit: 50 } })
      .then(({ data }) => {
        if (active) {
          setHotels(data.hotels)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Stays could not be loaded.')
      })
      .finally(() => {
        if (active) setLoadedQuery(queryKey)
      })
    return () => { active = false }
  }, [queryKey, searchParams])

  const submitSearch = (event) => {
    event.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (city.trim()) next.set('city', city.trim())
    else next.delete('city')
    setSearchParams(next)
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <div className="mb-9 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">Find your place</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Explore stays</h1>
          <p className="mt-2 text-slate-500">{searchParams.get('city') ? `Discovering places in ${searchParams.get('city')}` : 'A collection of places to feel at home.'}</p>
        </div>
        <form onSubmit={submitSearch} className="flex w-full max-w-md gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Search a city" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" />
          <button className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"><Search size={16} /> Search</button>
        </form>
      </div>
      {error && <p role="alert" className="mb-6 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>}
      {loading ? <p className="py-16 text-center text-slate-500">Finding thoughtful stays…</p> : hotels.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{hotels.map((hotel) => <HotelCard key={hotel._id} hotel={hotel} query={searchParams.toString()} />)}</div>
      ) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center"><h2 className="text-xl font-semibold">No stays found just yet</h2><p className="mt-2 text-slate-500">Try another destination or check back soon.</p></div>}
    </main>
  )
}
