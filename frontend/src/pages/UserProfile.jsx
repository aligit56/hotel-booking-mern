import { useEffect, useState } from 'react'
import { CalendarDays, MapPin, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import useAuth from '../context/useAuth'
import HotelImage from '../components/HotelImage'
import { DestinationCredit } from '../components/DestinationImage'
import Notice from '../components/Notice'
import { formatPKR } from '../utils/currency'
import bookingRoomSummary from '../utils/bookingRoomSummary'

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function UserProfile() {
  const { user, refreshUser } = useAuth()
  const [bookings, setBookings] = useState([])
  const [name, setName] = useState(user?.name || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadBookings = async () => {
    try {
      const { data } = await api.get('/bookings/mine')
      setBookings(data.bookings)
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your bookings could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    api.get('/bookings/mine')
      .then(({ data }) => {
        if (active) {
          setBookings(data.bookings)
          setError('')
          setLoading(false)
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Your bookings could not be loaded.')
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [])

  const updateName = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      await api.patch(`/users/${user._id}`, { name })
      await refreshUser()
      setNotice('Your profile has been updated.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your profile could not be updated.')
    }
  }

  const cancelBooking = async (bookingId) => {
    setError('')
    try {
      await api.patch(`/bookings/${bookingId}`, { status: 'cancelled' })
      setNotice('Your booking was cancelled.')
      await loadBookings()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The booking could not be cancelled.')
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">Your Staywell</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Hello, {user?.name.split(' ')[0]}</h1>
      <p className="mt-2 text-slate-500">Manage your profile and keep your upcoming plans close.</p>
      {(error || notice) && <div className="mt-6 max-w-3xl">{error ? <Notice>{error}</Notice> : <Notice tone="success">{notice}</Notice>}</div>}
      <div className="mt-9 grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3"><span className="rounded-full bg-amber-50 p-3 text-amber-700"><UserRound size={20} /></span><div><h2 className="font-semibold">Your profile</h2><p className="text-sm text-slate-500">{user?.email}</p></div></div>
          <form onSubmit={updateName} className="mt-6 space-y-3">
            <label className="block text-sm font-medium">Display name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-600" /></label>
            <button className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:border-slate-900">Save changes</button>
          </form>
        </aside>
        <section>
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-2xl font-semibold">Your stays</h2><p className="mt-1 text-sm text-slate-500">All your plans, past and future.</p></div><Link to="/hotels" className="text-sm font-semibold text-amber-700 hover:underline">Find a stay</Link></div>
          {loading ? <p className="py-12 text-center text-slate-500">Loading your stays…</p> : bookings.length ? <div className="space-y-4">
            {bookings.map((booking) => <article key={booking._id} className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[180px_1fr]">
              <div className="relative">
                <HotelImage hotel={booking.hotelId || { photos: [] }} alt={booking.hotelId?.isDemo ? `${booking.hotelId.city} destination view` : booking.hotelId?.name || 'Hotel'} className="h-36 w-full rounded-xl object-cover sm:h-full" />
                {booking.hotelId?.isDemo && !booking.hotelId.photos?.length && <DestinationCredit city={booking.hotelId.city} className="absolute bottom-1 right-1" />}
              </div>
              <div className="flex flex-col justify-between gap-5">
                <div className="flex flex-wrap justify-between gap-3"><div><p className="flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} />{booking.hotelId?.city}</p><h3 className="mt-1 text-lg font-semibold">{booking.hotelId?.name || 'Hotel'}</h3><p className="mt-1 text-sm text-slate-500">{bookingRoomSummary(booking)}</p></div><span className={`h-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${booking.status === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{booking.status}</span></div>
                <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4"><p className="flex items-center gap-2 text-sm text-slate-600"><CalendarDays size={15} />{formatDate(booking.checkIn)} – {formatDate(booking.checkOut)} <span className="font-semibold text-slate-900">{formatPKR(booking.totalPrice)}</span></p><div className="flex items-center gap-4">{booking.status === 'completed' && booking.hotelId?._id && <Link to={`/hotels/${booking.hotelId._id}#guest-review-form`} className="text-sm font-semibold text-amber-700 hover:underline">Review this stay</Link>}{['pending', 'confirmed'].includes(booking.status) && <><span className="text-sm text-slate-500">Review after your stay</span><button onClick={() => cancelBooking(booking._id)} className="text-sm font-semibold text-rose-700 hover:underline">Cancel booking</button></>}</div></div>
              </div>
            </article>)}
          </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><h3 className="font-semibold">Your next stay starts here.</h3><p className="mt-2 text-sm text-slate-500">You haven’t made a booking yet.</p><Link to="/hotels" className="mt-5 inline-flex rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Explore stays</Link></div>}
        </section>
      </div>
    </main>
  )
}
