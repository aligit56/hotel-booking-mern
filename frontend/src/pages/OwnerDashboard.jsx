import { useEffect, useState } from 'react'
import { Building2, CalendarDays, Plus, Trash2 } from 'lucide-react'
import api from '../api/axios'
import HotelImage from '../components/HotelImage'
import { DestinationCredit } from '../components/DestinationImage'
import Notice from '../components/Notice'
import { formatPKR } from '../utils/currency'

const emptyHotel = { name: '', type: 'Boutique hotel', city: '', address: '', distance: '', title: '', desc: '', featured: false }
const emptyRoom = { title: '', price: '', maxPeople: '2', desc: '', roomNumbers: '' }

async function fetchDashboardData() {
  const [{ data: hotelData }, { data: bookingData }] = await Promise.all([
    api.get('/hotels/owner'),
    api.get('/bookings/owner'),
  ])
  const roomEntries = await Promise.all(hotelData.hotels.map(async (hotel) => {
    const { data } = await api.get('/rooms', { params: { hotelId: hotel._id } })
    return [hotel._id, data.rooms]
  }))
  return { hotels: hotelData.hotels, bookings: bookingData.bookings, rooms: Object.fromEntries(roomEntries) }
}

export default function OwnerDashboard() {
  const [hotels, setHotels] = useState([])
  const [rooms, setRooms] = useState({})
  const [bookings, setBookings] = useState([])
  const [hotelForm, setHotelForm] = useState(emptyHotel)
  const [roomForms, setRoomForms] = useState({})
  const [editingHotel, setEditingHotel] = useState('')
  const [editingRoom, setEditingRoom] = useState('')
  const [uploadingHotelId, setUploadingHotelId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  const loadDashboard = async () => {
    try {
      const result = await fetchDashboardData()
      setError('')
      setHotels(result.hotels)
      setRooms(result.rooms)
      setBookings(result.bookings)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your owner dashboard could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchDashboardData()
      .then((result) => {
        if (active) {
          setError('')
          setHotels(result.hotels)
          setRooms(result.rooms)
          setBookings(result.bookings)
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Your owner dashboard could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const saveHotel = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const body = {
      ...hotelForm,
      distance: Number(hotelForm.distance) || 0,
      featured: Boolean(hotelForm.featured),
    }
    try {
      if (editingHotel) await api.patch(`/hotels/${editingHotel}`, body)
      else await api.post('/hotels', body)
      setHotelForm(emptyHotel)
      setEditingHotel('')
      setNotice(editingHotel ? 'Property updated.' : 'Property created.')
      await loadDashboard()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The property could not be saved.')
    }
  }

  const editHotel = (hotel) => {
    setEditingHotel(hotel._id)
    setHotelForm({
      name: hotel.name,
      type: hotel.type,
      city: hotel.city,
      address: hotel.address,
      distance: hotel.distance || '',
      title: hotel.title,
      desc: hotel.desc,
      featured: hotel.featured || false,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const uploadHotelPhotos = async (event, hotel) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    const remainingSlots = 5 - (hotel.photos?.length || 0)
    if (files.length > remainingSlots) {
      setError(`This property can accept ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'}.`)
      return
    }

    setError('')
    setNotice('')
    setUploadingHotelId(hotel._id)
    try {
      for (const file of files) {
        await api.post(`/hotels/${hotel._id}/photos`, file, {
          headers: { 'Content-Type': file.type },
        })
      }
      setNotice('Property photos uploaded.')
      await loadDashboard()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'A property photo could not be uploaded. Any earlier uploads were saved.')
      await loadDashboard()
    } finally {
      setUploadingHotelId('')
    }
  }

  const removeHotelPhoto = async (hotelId, photo) => {
    try {
      await api.delete(`/hotels/${hotelId}/photos`, { data: { photo } })
      setNotice('Property photo removed.')
      await loadDashboard()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The property photo could not be removed.')
    }
  }

  const removeHotel = async (hotelId) => {
    if (!window.confirm('Delete this property, its rooms, bookings, and reviews?')) return
    try {
      await api.delete(`/hotels/${hotelId}`)
      setNotice('Property and related records deleted.')
      await loadDashboard()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The property could not be deleted.')
    }
  }

  const saveRoom = async (event, hotelId) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const form = roomForms[hotelId] || emptyRoom
    const body = {
      title: form.title,
      price: Number(form.price),
      maxPeople: Number(form.maxPeople),
      desc: form.desc,
      roomNumbers: form.roomNumbers.split(',').map((number) => Number(number.trim())).filter(Number.isInteger).map((number) => ({ number })),
    }
    try {
      if (editingRoom) await api.patch(`/rooms/${editingRoom}`, body)
      else await api.post('/rooms', { ...body, hotelId })
      setRoomForms({ ...roomForms, [hotelId]: emptyRoom })
      setEditingRoom('')
      setNotice(editingRoom ? 'Room updated.' : 'Room created.')
      await loadDashboard()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The room could not be saved.')
    }
  }

  const startRoomEdit = (hotelId, room) => {
    setEditingRoom(room._id)
    setRoomForms({
      ...roomForms,
      [hotelId]: {
        title: room.title,
        price: room.price,
        maxPeople: room.maxPeople,
        desc: room.desc,
        roomNumbers: room.roomNumbers.map((item) => item.number).join(', '),
      },
    })
  }

  const removeRoom = async (roomId) => {
    if (!window.confirm('Delete this room and its bookings?')) return
    try {
      await api.delete(`/rooms/${roomId}`)
      setNotice('Room deleted.')
      await loadDashboard()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The room could not be deleted.')
    }
  }

  const changeBookingStatus = async (bookingId, status) => {
    try {
      await api.patch(`/bookings/${bookingId}`, { status })
      setNotice(`Booking marked ${status}.`)
      await loadDashboard()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The booking status could not be updated.')
    }
  }

  if (loading) return <main className="mx-auto max-w-7xl px-5 py-20 text-center text-slate-500">Loading your properties…</main>

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">Owner studio</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Your properties</h1><p className="mt-2 text-slate-500">Create thoughtful stays and keep an eye on every reservation.</p></div><div className="flex gap-3"><span className="rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-slate-200"><strong>{hotels.length}</strong> properties</span><span className="rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-slate-200"><strong>{bookings.length}</strong> bookings</span></div></div>
      {(error || notice) && <div className="mt-6 max-w-3xl">{error ? <Notice>{error}</Notice> : <Notice tone="success">{notice}</Notice>}</div>}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3"><span className="rounded-xl bg-amber-50 p-3 text-amber-700"><Plus size={19} /></span><div><h2 className="text-xl font-semibold">{editingHotel ? 'Update your property' : 'Add a property'}</h2><p className="text-sm text-slate-500">Share the details guests need to find their next stay. Room prices are entered in PKR.</p></div></div>
        <form onSubmit={saveHotel} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input required placeholder="Property name" value={hotelForm.name} onChange={(event) => setHotelForm({ ...hotelForm, name: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-amber-600" />
          <input required placeholder="Type (hotel, resort...)" value={hotelForm.type} onChange={(event) => setHotelForm({ ...hotelForm, type: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-amber-600" />
          <input required placeholder="City" value={hotelForm.city} onChange={(event) => setHotelForm({ ...hotelForm, city: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-amber-600" />
          <input required placeholder="Street address" value={hotelForm.address} onChange={(event) => setHotelForm({ ...hotelForm, address: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-amber-600" />
          <input type="number" min="0" step="0.1" placeholder="Distance from city center (km)" value={hotelForm.distance} onChange={(event) => setHotelForm({ ...hotelForm, distance: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-amber-600" />
          <input required placeholder="Listing headline" value={hotelForm.title} onChange={(event) => setHotelForm({ ...hotelForm, title: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-amber-600" />
          <textarea required rows="3" placeholder="Tell guests what makes this place special" value={hotelForm.desc} onChange={(event) => setHotelForm({ ...hotelForm, desc: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-amber-600 sm:col-span-2" />
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" checked={hotelForm.featured} onChange={(event) => setHotelForm({ ...hotelForm, featured: event.target.checked })} className="h-4 w-4 accent-amber-600" />
            Feature this property on the homepage
          </label>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3"><button className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">{editingHotel ? 'Save property' : 'Create property'}</button>{editingHotel && <button type="button" onClick={() => { setEditingHotel(''); setHotelForm(emptyHotel) }} className="text-sm font-semibold text-slate-600">Cancel edit</button>}</div>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold"><Building2 size={22} /> Your listings</h2>
        {hotels.length ? <div className="space-y-6">{hotels.map((hotel) => {
          const roomForm = roomForms[hotel._id] || emptyRoom
          return <article key={hotel._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="grid sm:grid-cols-[240px_1fr]">
              <div className="relative min-h-48">
                <HotelImage hotel={hotel} alt={hotel.isDemo && !hotel.photos?.length ? `${hotel.city} destination view` : hotel.name} className="h-48 w-full object-cover sm:h-full" />
                {hotel.isDemo && !hotel.photos?.length && <DestinationCredit city={hotel.city} className="absolute bottom-2 right-2" />}
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap justify-between gap-4"><div><p className="text-sm text-slate-500">{hotel.city} · {hotel.type}</p><h3 className="mt-1 text-xl font-semibold">{hotel.name}</h3><p className="mt-1 max-w-2xl text-sm text-slate-500">{hotel.title}</p>{hotel.isDemo && <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Sample property</span>}</div><div className="flex items-start gap-2"><button onClick={() => editHotel(hotel)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-slate-900">Edit property</button><button onClick={() => removeHotel(hotel._id)} aria-label={`Delete ${hotel.name}`} className="rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"><Trash2 size={17} /></button></div></div>
                <div className="mt-4">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-900">
                    {uploadingHotelId === hotel._id ? 'Uploading…' : 'Upload property photos'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploadingHotelId === hotel._id || (hotel.photos?.length || 0) >= 5} onChange={(event) => uploadHotelPhotos(event, hotel)} className="sr-only" />
                  </label>
                  <p className="mt-1 text-xs text-slate-500">Up to 5 JPEG, PNG, or WebP images total; 5 MB each. Upload only photos you own or have permission to use.</p>
                  {hotel.photos?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{hotel.photos.map((photo) => <div key={photo} className="relative h-16 w-20 overflow-hidden rounded-lg bg-slate-100"><img src={photo.startsWith('/uploads/') ? new URL(photo, api.defaults.baseURL).href : photo} alt={`${hotel.name} uploaded photo`} className="h-full w-full object-cover" /><button type="button" onClick={() => removeHotelPhoto(hotel._id, photo)} aria-label="Remove property photo" className="absolute right-1 top-1 rounded bg-white/90 p-1 text-rose-700"><Trash2 size={13} /></button></div>)}</div>}
                </div>
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="mb-3 flex items-center justify-between"><h4 className="font-semibold">Rooms <span className="text-sm font-normal text-slate-500">({rooms[hotel._id]?.length || 0})</span></h4></div>
                  {rooms[hotel._id]?.length ? <div className="mb-4 space-y-2">{rooms[hotel._id].map((room) => <div key={room._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3"><div><p className="text-sm font-semibold">{room.title} <span className="font-normal text-slate-500">· {formatPKR(room.price)}/night · {room.maxPeople} guests · #{room.roomNumbers.map((number) => number.number).join(', ')}</span></p></div><div className="flex gap-3"><button onClick={() => startRoomEdit(hotel._id, room)} className="text-sm font-semibold text-slate-600 hover:text-amber-700">Edit</button><button onClick={() => removeRoom(room._id)} className="text-sm font-semibold text-rose-700 hover:underline">Delete</button></div></div>)}</div> : <p className="mb-4 text-sm text-slate-500">No rooms listed yet.</p>}
                  <form onSubmit={(event) => saveRoom(event, hotel._id)} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <input required placeholder="Room name" value={roomForm.title} onChange={(event) => setRoomForms({ ...roomForms, [hotel._id]: { ...roomForm, title: event.target.value } })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-amber-600" />
                    <input required type="number" min="1" step="1" placeholder="Price/night (PKR)" value={roomForm.price} onChange={(event) => setRoomForms({ ...roomForms, [hotel._id]: { ...roomForm, price: event.target.value } })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-amber-600" />
                    <input required type="number" min="1" max="30" placeholder="Max guests" value={roomForm.maxPeople} onChange={(event) => setRoomForms({ ...roomForms, [hotel._id]: { ...roomForm, maxPeople: event.target.value } })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-amber-600" />
                    <input required placeholder="Room numbers (e.g. 101,102)" value={roomForm.roomNumbers} onChange={(event) => setRoomForms({ ...roomForms, [hotel._id]: { ...roomForm, roomNumbers: event.target.value } })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-amber-600" />
                    <div className="flex gap-2"><input required placeholder="Short description" value={roomForm.desc} onChange={(event) => setRoomForms({ ...roomForms, [hotel._id]: { ...roomForm, desc: event.target.value } })} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-amber-600" /><button className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700">{editingRoom ? 'Save' : 'Add'}</button></div>
                  </form>
                </div>
              </div>
            </div>
          </article>
        })}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Your first property will appear here once you add it above.</div>}
      </section>

      <section className="mt-12">
        <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold"><CalendarDays size={22} /> Property bookings</h2>
        {bookings.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Guest</th><th className="px-5 py-4">Property / room</th><th className="px-5 py-4">Dates</th><th className="px-5 py-4">Total (PKR)</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Update</th></tr></thead><tbody className="divide-y divide-slate-100">{bookings.map((booking) => <tr key={booking._id}><td className="px-5 py-4 font-medium">{booking.userId?.name || 'Guest'}<span className="block text-xs font-normal text-slate-500">{booking.userId?.email}</span></td><td className="px-5 py-4">{booking.hotelId?.name}<span className="block text-xs text-slate-500">{booking.roomId?.title} · #{booking.roomNumber}</span></td><td className="px-5 py-4">{new Date(booking.checkIn).toLocaleDateString()} – {new Date(booking.checkOut).toLocaleDateString()}</td><td className="px-5 py-4 font-semibold">{formatPKR(booking.totalPrice)}</td><td className="px-5 py-4 capitalize">{booking.status}</td><td className="px-5 py-4">{['pending', 'confirmed'].includes(booking.status) && <select value={booking.status} onChange={(event) => changeBookingStatus(booking._id, event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>}</td></tr>)}</tbody></table></div> : <p className="rounded-xl bg-white p-8 text-center text-slate-500 ring-1 ring-slate-200">No bookings for your properties yet.</p>}
      </section>
    </main>
  )
}
