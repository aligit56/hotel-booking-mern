import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, MapPin, Star } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import useAuth from '../context/useAuth'
import Notice from '../components/Notice'
import HotelImage from '../components/HotelImage'
import { DestinationCredit } from '../components/DestinationImage'
import { formatPKR } from '../utils/currency'
import allocateGuestRooms from '../utils/allocateGuestRooms'

export default function HotelDetails() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [hotel, setHotel] = useState(null)
  const [rooms, setRooms] = useState([])
  const [reviews, setReviews] = useState([])
  const [completedBookings, setCompletedBookings] = useState([])
  const [reviewForm, setReviewForm] = useState({ rating: '5', comment: '' })
  const [reviewBusy, setReviewBusy] = useState(false)
  const [dates, setDates] = useState({ checkIn: searchParams.get('checkIn') || '', checkOut: searchParams.get('checkOut') || '' })
  const [guests, setGuests] = useState(() => {
    const requestedGuests = Number(searchParams.get('guests'))
    return Number.isSafeInteger(requestedGuests) && requestedGuests >= 1
      ? String(requestedGuests)
      : '2'
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const userId = user?._id

  useEffect(() => {
    Promise.all([
      api.get(`/hotels/${id}`),
      api.get('/rooms', { params: { hotelId: id } }),
      api.get(`/reviews/hotel/${id}`),
    ]).then(([hotelResponse, roomResponse, reviewResponse]) => {
      setHotel(hotelResponse.data.hotel)
      setRooms(roomResponse.data.rooms)
      setReviews(reviewResponse.data.reviews)
      const currentReview = reviewResponse.data.reviews.find((review) => review.userId?._id === userId)
      setReviewForm(currentReview
        ? { rating: String(currentReview.rating), comment: currentReview.comment }
        : { rating: '5', comment: '' })
    }).catch((requestError) => setError(requestError.response?.data?.message || 'This stay could not be loaded.'))
      .finally(() => setLoading(false))
  }, [id, userId])

  useEffect(() => {
    if (!userId) return
    api.get('/bookings/mine')
      .then(({ data }) => setCompletedBookings(data.bookings))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Your booking history could not be checked.'))
  }, [id, userId])

  const hasCompletedStay = Boolean(userId && completedBookings.some(
    (booking) => booking.userId?._id === userId
      && booking.hotelId?._id === id
      && booking.status === 'completed',
  ))

  const roomChoices = useMemo(() => rooms
    .flatMap((room) => room.roomNumbers.map((number) => {
      const unavailable = number.unavailableDates?.some((day) => {
        const date = new Date(day).toISOString().slice(0, 10)
        return dates.checkIn && dates.checkOut && date >= dates.checkIn && date < dates.checkOut
      })
      return unavailable ? null : {
        roomId: room._id,
        roomNumber: number.number,
        title: room.title,
        price: Number(room.price),
        capacity: Number(room.maxPeople),
      }
    }))
    .filter(Boolean), [rooms, dates])

  const guestCount = Number(guests)
  const validGuestCount = Number.isSafeInteger(guestCount) && guestCount >= 1
  const roomAllocation = useMemo(
    () => allocateGuestRooms(roomChoices, guestCount),
    [roomChoices, guestCount],
  )
  const availableCapacity = roomChoices.reduce((total, room) => total + room.capacity, 0)
  const startingPrice = roomAllocation
    ? roomAllocation.reduce((total, room) => total + room.price, 0)
    : null
  const nights = dates.checkIn && dates.checkOut
    ? Math.max(0, (new Date(`${dates.checkOut}T00:00:00Z`) - new Date(`${dates.checkIn}T00:00:00Z`)) / 86400000)
    : 0

  const reserve = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!user) {
      navigate('/login', { state: { from: `/hotels/${id}` } })
      return
    }
    if (!validGuestCount || !roomAllocation || !dates.checkIn || !dates.checkOut || nights < 1) {
      setError('Enter a valid guest count, choose dates, and make sure enough rooms are available.')
      return
    }
    setBusy(true)
    try {
      const { data } = await api.post('/bookings', {
        hotelId: id,
        guests: guestCount,
        rooms: roomAllocation.map(({ roomId, roomNumber, guests: assignedGuests }) => ({
          roomId,
          roomNumber,
          guests: assignedGuests,
        })),
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
      })
      setNotice(`Your stay is reserved in ${data.booking.rooms.length} ${data.booking.rooms.length === 1 ? 'room' : 'rooms'}.`)
      const bookedRoomIds = new Set(data.booking.rooms.map((room) => `${room.roomId}:${room.roomNumber}`))
      setRooms((currentRooms) => currentRooms.map((room) => ({
        ...room,
        roomNumbers: room.roomNumbers.map((number) => (
          bookedRoomIds.has(`${room._id}:${number.number}`)
            ? {
              ...number,
              unavailableDates: [
                ...(number.unavailableDates || []),
                ...Array.from({ length: nights }, (_, index) => {
                  const date = new Date(`${dates.checkIn}T00:00:00Z`)
                  date.setUTCDate(date.getUTCDate() + index)
                  return date.toISOString()
                }),
              ],
            }
            : number
        )),
      })))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The booking could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  const ownReview = reviews.find((review) => review.userId?._id === user?._id)

  const saveReview = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setReviewBusy(true)
    try {
      const { data } = ownReview
        ? await api.patch(`/reviews/${ownReview._id}`, reviewForm)
        : await api.post('/reviews', { hotelId: id, ...reviewForm })
      if (ownReview) {
        setReviews(reviews.map((review) => review._id === ownReview._id ? { ...review, ...data.review, userId: review.userId } : review))
      } else {
        setReviews([{ ...data.review, userId: { _id: user._id, name: user.name } }, ...reviews])
      }
      setNotice('Thanks for sharing your stay.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your review could not be saved.')
    } finally {
      setReviewBusy(false)
    }
  }

  if (loading) return <main className="mx-auto max-w-7xl px-5 py-20 text-center text-slate-500">Loading this stay…</main>
  if (error && !hotel) return <main className="mx-auto max-w-7xl px-5 py-20"><Notice>{error}</Notice></main>
  if (!hotel) return null

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={15} /> {hotel.city}, {hotel.address}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{hotel.name}</h1>
          <p className="mt-2 text-slate-500">{hotel.title}</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-slate-800">{Number(hotel.rating || 0) > 0 ? <><Star size={16} className="fill-amber-400 text-amber-400" /> {Number(hotel.rating).toFixed(1)}</> : 'No reviews'} <span className="font-normal text-slate-500">({reviews.length} reviews)</span></span>
      </div>
      {hotel.isDemo && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">Rates and availability are illustrative. A booking here does not reserve a room at the named hotel.</p>}
      <div className="relative grid gap-3 overflow-hidden rounded-2xl sm:grid-cols-2">
        {hotel.photos?.length ? hotel.photos.slice(0, 3).map((photo, index) => (
          <figure key={photo} className={index > 0 ? 'hidden sm:block' : 'sm:row-span-2'}>
            <HotelImage hotel={{ ...hotel, photos: [photo] }} alt={`${hotel.name} photo ${index + 1}`} className={`w-full object-cover ${index === 0 ? 'h-[320px] sm:h-[500px]' : 'h-[244px]'}`} />
          </figure>
        )) : (
          <HotelImage hotel={hotel} alt={`${hotel.city} destination view`} className="h-[320px] w-full rounded-2xl object-cover sm:col-span-2 sm:h-[500px]" />
        )}
        {hotel.isDemo && !hotel.photos?.length && <DestinationCredit city={hotel.city} className="absolute bottom-2 right-2" />}
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_390px]">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">{hotel.type} · {hotel.distance ? `${hotel.distance} km from center` : 'A special place to stay'}</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">{hotel.title}</h2>
          <p className="mt-4 whitespace-pre-line leading-8 text-slate-600">{hotel.desc}</p>
          <div className="my-8 h-px bg-slate-200" />
          <h2 className="text-2xl font-semibold">Rooms for your stay</h2>
          {roomAllocation?.length ? <div className="mt-5 space-y-3">
            {roomAllocation.map((allocation) => {
              const room = rooms.find((item) => item._id === allocation.roomId)
              return <div key={`${allocation.roomId}:${allocation.roomNumber}`} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div><h3 className="font-semibold">{allocation.title} · Room #{allocation.roomNumber}</h3><p className="mt-1 text-sm text-slate-500">{room?.desc}</p><p className="mt-2 text-xs text-slate-500">{allocation.guests} {allocation.guests === 1 ? 'guest' : 'guests'} · Capacity {allocation.capacity}</p></div>
                <p className="font-semibold">{formatPKR(allocation.price)} <span className="font-normal text-slate-500">/ night</span></p>
              </div>
            </div>
            })}
          </div> : <p className="mt-4 text-slate-500">{rooms.length
            ? roomChoices.length
              ? `Available rooms can accommodate up to ${availableCapacity} guests${dates.checkIn && dates.checkOut ? ' on these dates' : ''}.`
              : `No rooms are available${dates.checkIn && dates.checkOut ? ' on these dates' : ''}.`
            : 'No rooms are currently listed.'}</p>}
          <div className="my-8 h-px bg-slate-200" />
          <h2 className="text-2xl font-semibold">Guest notes</h2>
          <div className="mt-5 space-y-4">
            {reviews.length ? reviews.map((review) => <article key={review._id} className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex justify-between gap-3"><p className="font-semibold">{review.userId?.name || 'Guest'}</p><span className="flex items-center gap-1 text-sm"><Star size={14} className="fill-amber-400 text-amber-400" /> {review.rating}</span></div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>
            </article>) : <p className="text-slate-500">No reviews yet—be the first to share your experience after your stay.</p>}
          </div>
          {hasCompletedStay && <form id="guest-review-form" onSubmit={saveReview} className="mt-5 scroll-mt-24 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold">{ownReview ? 'Update your review' : 'Share your stay'}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr]">
              <label className="text-sm font-medium text-slate-700">Your rating<select value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"><option value="5">5 — Excellent</option><option value="4">4 — Great</option><option value="3">3 — Good</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label>
              <label className="text-sm font-medium text-slate-700">A few words about your stay<textarea required maxLength={2000} rows="3" value={reviewForm.comment} onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-amber-600" /></label>
            </div>
            <button disabled={reviewBusy} className="mt-3 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{reviewBusy ? 'Saving…' : 'Publish review'}</button>
          </form>}
        </section>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-28">
          <p className="text-sm text-slate-500">{startingPrice === null ? 'Availability' : `Starting rate for ${guests} ${Number(guests) === 1 ? 'guest' : 'guests'}`}</p>
          <p className="mt-1 text-3xl font-semibold">{startingPrice === null ? 'No rooms available' : <>{formatPKR(startingPrice)} <span className="text-base font-normal text-slate-500">/ night</span></>}</p>
          <form onSubmit={reserve} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-600">Check-in<span className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 p-2.5"><CalendarDays size={15} className="text-amber-700" /><input required type="date" value={dates.checkIn} onChange={(event) => setDates({ ...dates, checkIn: event.target.value })} className="w-full min-w-0 text-xs outline-none" /></span></label>
              <label className="text-xs font-semibold text-slate-600">Check-out<span className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 p-2.5"><CalendarDays size={15} className="text-amber-700" /><input required type="date" value={dates.checkOut} onChange={(event) => setDates({ ...dates, checkOut: event.target.value })} className="w-full min-w-0 text-xs outline-none" /></span></label>
            </div>
            <label className="block text-xs font-semibold text-slate-600">Guests<input required min="1" step="1" type="number" inputMode="numeric" value={guests} onChange={(event) => setGuests(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-normal outline-none" /></label>
            {roomAllocation?.length ? <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
              <p className="font-semibold">{roomAllocation.length} {roomAllocation.length === 1 ? 'room' : 'rooms'} for {guestCount} {guestCount === 1 ? 'guest' : 'guests'}</p>
              {roomAllocation.map((room) => <p key={`${room.roomId}:${room.roomNumber}`} className="flex justify-between gap-3 text-slate-500"><span>{room.title} · #{room.roomNumber} · {room.guests} {room.guests === 1 ? 'guest' : 'guests'}</span><span>{formatPKR(room.price)}/night</span></p>)}
              {nights > 0 && <div className="flex justify-between border-t border-slate-100 pt-3"><span className="text-slate-500">{formatPKR(startingPrice)} × {nights} nights</span><strong>{formatPKR(startingPrice * nights)}</strong></div>}
            </div> : validGuestCount ? <p className="text-sm text-slate-500">{roomChoices.length
              ? `Available rooms can accommodate up to ${availableCapacity} guests for these dates.`
              : 'No rooms are available for these dates.'}</p> : <p className="text-sm text-rose-700">Enter a positive whole number of guests.</p>}
            <p className="text-xs text-slate-500">All rates are shown in Pakistani rupees (PKR).</p>
            {error && <Notice>{error}</Notice>}
            {notice && <Notice tone="success">{notice}</Notice>}
            <button disabled={busy || !roomAllocation || !dates.checkIn || !dates.checkOut || nights < 1} className="w-full rounded-xl bg-amber-600 px-5 py-3.5 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Reserving…' : user ? 'Reserve your stay' : 'Sign in to reserve'}</button>
            <p className="text-center text-xs text-slate-500">You won’t be charged yet.</p>
          </form>
          {!user && <p className="mt-4 text-center text-sm text-slate-500">New to Staywell? <Link to="/register" className="font-semibold text-amber-700 hover:underline">Create an account</Link></p>}
        </aside>
      </div>
    </main>
  )
}
