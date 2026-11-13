import { useEffect, useState } from 'react'
import { Building2, CalendarDays, Users } from 'lucide-react'
import api from '../api/axios'
import Notice from '../components/Notice'
import { formatPKR } from '../utils/currency'
import bookingRoomSummary from '../utils/bookingRoomSummary'

const tabs = [
  { id: 'users', label: 'All users', icon: Users },
  { id: 'hotels', label: 'All hotels', icon: Building2 },
  { id: 'bookings', label: 'All bookings', icon: CalendarDays },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('users')
  const [records, setRecords] = useState([])
  const [loadedTab, setLoadedTab] = useState('')
  const loading = loadedTab !== tab
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadRecords = async (selectedTab = tab) => {
    const endpoint = { users: '/users', hotels: '/hotels?limit=50', bookings: '/bookings' }[selectedTab]
    try {
      const { data } = await api.get(endpoint)
      setRecords(data.users || data.hotels || data.bookings || [])
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Could not load ${selectedTab}.`)
    } finally {
      setLoadedTab(selectedTab)
    }
  }

  useEffect(() => {
    let active = true
    const endpoint = { users: '/users', hotels: '/hotels?limit=50', bookings: '/bookings' }[tab]
    api.get(endpoint)
      .then(({ data }) => {
        if (active) {
          setRecords(data.users || data.hotels || data.bookings || [])
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || `Could not load ${tab}.`)
      })
      .finally(() => {
        if (active) setLoadedTab(tab)
      })
    return () => { active = false }
  }, [tab])

  const removeRecord = async (record) => {
    const label = record.name || record.hotelId?.name || 'this record'
    if (!window.confirm(`Permanently delete ${label}?`)) return
    const path = { users: `/users/${record._id}`, hotels: `/hotels/${record._id}`, bookings: `/bookings/${record._id}` }[tab]
    try {
      await api.delete(path)
      setNotice(`${tab.slice(0, -1)} deleted.`)
      setLoadedTab('')
      await loadRecords(tab)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The record could not be deleted.')
    }
  }

  const updateBookingStatus = async (booking, status) => {
    setError('')
    setNotice('')
    try {
      await api.patch(`/bookings/${booking._id}`, { status })
      setNotice(`Booking status updated to ${status}.`)
      setLoadedTab('')
      await loadRecords('bookings')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The booking status could not be updated.')
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">Platform control</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Admin dashboard</h1>
      <p className="mt-2 text-slate-500">Manage accounts, properties, and bookings across Staywell.</p>
      {(error || notice) && <div className="mt-6 max-w-3xl">{error ? <Notice>{error}</Notice> : <Notice tone="success">{notice}</Notice>}</div>}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === id ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><Icon size={17} />{label}</button>)}
      </div>
      <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        {loading ? <p className="p-12 text-center text-slate-500">Loading {tab}…</p> : records.length ? (
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>
              {tab === 'users' && <><th className="px-5 py-4">Name</th><th className="px-5 py-4">Email</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Joined</th></>}
              {tab === 'hotels' && <><th className="px-5 py-4">Property</th><th className="px-5 py-4">City</th><th className="px-5 py-4">Owner</th><th className="px-5 py-4">Rating</th></>}
              {tab === 'bookings' && <><th className="px-5 py-4">Guest</th><th className="px-5 py-4">Property / room</th><th className="px-5 py-4">Dates</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Status</th></>}
              <th className="px-5 py-4">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => <tr key={record._id}>
                {tab === 'users' && <><td className="px-5 py-4 font-medium">{record.name}</td><td className="px-5 py-4">{record.email}</td><td className="px-5 py-4 capitalize">{record.role}</td><td className="px-5 py-4">{new Date(record.createdAt).toLocaleDateString()}</td></>}
                {tab === 'hotels' && <><td className="px-5 py-4 font-medium">{record.name}</td><td className="px-5 py-4">{record.city}</td><td className="px-5 py-4">{record.ownerId?.name || '—'}</td><td className="px-5 py-4">{Number(record.rating || 0).toFixed(1)}</td></>}
                {tab === 'bookings' && <><td className="px-5 py-4">{record.userId?.name || 'Guest'}<span className="block text-xs text-slate-500">{record.userId?.email}</span></td><td className="px-5 py-4">{record.hotelId?.name || 'Hotel'}<span className="block text-xs text-slate-500">{bookingRoomSummary(record)}</span></td><td className="px-5 py-4">{new Date(record.checkIn).toLocaleDateString()} – {new Date(record.checkOut).toLocaleDateString()}</td><td className="px-5 py-4 font-medium">{formatPKR(record.totalPrice)}</td><td className="px-5 py-4"><select disabled={record.status === 'cancelled'} aria-label={`Update booking status for ${record.userId?.name || 'guest'}`} value={record.status} onChange={(event) => updateBookingStatus(record, event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 capitalize disabled:cursor-not-allowed disabled:bg-slate-100"><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></td></>}
                <td className="px-5 py-4"><button onClick={() => removeRecord(record)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button></td>
              </tr>)}
            </tbody>
          </table>
        ) : <p className="p-12 text-center text-slate-500">No {tab} found.</p>}
      </section>
    </main>
  )
}
