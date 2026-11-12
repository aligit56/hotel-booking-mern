import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import HotelCard from '../components/HotelCard'
import { DestinationCredit, DestinationImage } from '../components/DestinationImage'

const heroImage = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2400&q=90'

const destinations = [
  {
    name: 'Islamabad',
    region: 'Capital calm · Margalla foothills',
    landmark: 'Faisal Mosque',
  },
  {
    name: 'Lahore',
    region: 'Culture, cuisine & old-city charm',
    landmark: 'Badshahi Mosque',
  },
  {
    name: 'Karachi',
    region: 'Coastal energy & city living',
    landmark: 'Mazar-e-Quaid',
  },
  {
    name: 'Murree',
    region: 'Pine air & hill-station escapes',
    landmark: 'Mall Road',
  },
  {
    name: 'Hunza',
    region: 'Valleys beneath the Karakoram',
    landmark: 'Attabad Lake',
  },
  {
    name: 'Skardu',
    region: 'Mountain gateways & wide horizons',
    landmark: 'Shangrila Lake',
  },
]

const benefits = [
  {
    icon: Wallet,
    title: 'Prices in PKR',
    description: 'Clear nightly rates in Pakistani rupees, so you can plan your trip with less guesswork.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    description: 'Private accounts and protected booking details keep your plans in the right hands.',
  },
  {
    icon: HeartHandshake,
    title: 'Hosts with control',
    description: 'Property owners manage their own listings, rooms, and reservations from one dashboard.',
  },
]

function DestinationCard({ destination }) {
  return (
    <article className="group relative isolate flex min-h-56 items-end overflow-hidden rounded-2xl bg-slate-900 p-5 text-white">
      <Link to={`/hotels?city=${encodeURIComponent(destination.name)}`} className="absolute inset-0 z-0" aria-label={`Explore stays in ${destination.name}`}>
        <DestinationImage
          city={destination.name}
          alt={`${destination.landmark} in ${destination.name}`}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
      </Link>
      <DestinationCredit city={destination.name} className="absolute right-2 top-2 z-10" />
      <div className="pointer-events-none relative z-10 flex w-full items-end">
        <div><h3 className="text-2xl font-semibold">{destination.name}</h3><p className="mt-1 text-sm text-white/80">{destination.region}</p></div>
        <ArrowRight size={20} className="mb-1 ml-auto transition group-hover:translate-x-1" />
      </div>
    </article>
  )
}

export default function Home() {
  const [hotels, setHotels] = useState([])
  const [reviews, setReviews] = useState([])
  const [hotelError, setHotelError] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [search, setSearch] = useState({ city: '', checkIn: '', checkOut: '', guests: '2' })
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/hotels?featured=true&limit=6')
      .then(({ data }) => setHotels(data.hotels))
      .catch((requestError) => setHotelError(requestError.response?.data?.message || 'Featured stays could not be loaded.'))
    api.get('/reviews/latest?limit=3')
      .then(({ data }) => setReviews(data.reviews))
      .catch((requestError) => setReviewError(requestError.response?.data?.message || 'Guest reviews could not be loaded.'))
  }, [])

  const searchStays = (event) => {
    event.preventDefault()
    const query = new URLSearchParams(Object.entries(search).filter(([, value]) => value))
    navigate(`/hotels?${query.toString()}`)
  }

  return (
    <main>
      <section className="relative isolate min-h-[620px] bg-slate-900">
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          <img src={heroImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/55 to-slate-900/10" />
        </div>
        <div className="mx-auto flex max-w-7xl flex-col justify-center px-5 pb-36 pt-24 text-white sm:pb-40 lg:min-h-[620px]">
          <p className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
            <Sparkles size={16} /> Explore Pakistan, stay your way
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            Your next story starts <span className="font-serif italic text-amber-200">here.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/80">
            Find a thoughtful city stay or a mountain escape, with prices shown in Pakistani rupees.
          </p>
          <div className="mt-9 flex flex-wrap gap-5 text-sm text-white/85">
            <span className="flex items-center gap-2"><ShieldCheck size={17} className="text-amber-200" /> Secure accounts</span>
            <span className="flex items-center gap-2"><Wallet size={17} className="text-amber-200" /> Straightforward PKR rates</span>
          </div>
        </div>
        <form onSubmit={searchStays} className="absolute bottom-0 left-1/2 z-10 grid w-[calc(100%-2.5rem)] max-w-6xl -translate-x-1/2 translate-y-1/2 gap-3 rounded-2xl bg-white p-4 shadow-2xl sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr_auto] lg:items-end lg:gap-4 lg:p-5">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Where to?
            <span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-slate-800">
              <MapPin size={17} className="text-amber-700" />
              <input value={search.city} onChange={(event) => setSearch({ ...search, city: event.target.value })} placeholder="City or destination" className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none placeholder:text-slate-400" />
            </span>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Check in
            <span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-slate-800">
              <CalendarDays size={17} className="text-amber-700" />
              <input type="date" value={search.checkIn} onChange={(event) => setSearch({ ...search, checkIn: event.target.value })} className="min-w-0 w-full bg-transparent text-sm font-normal outline-none" />
            </span>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Check out
            <span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-slate-800">
              <CalendarDays size={17} className="text-amber-700" />
              <input type="date" value={search.checkOut} onChange={(event) => setSearch({ ...search, checkOut: event.target.value })} className="min-w-0 w-full bg-transparent text-sm font-normal outline-none" />
            </span>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Guests
            <select value={search.guests} onChange={(event) => setSearch({ ...search, guests: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-800 outline-none focus:border-amber-600">
              {[1, 2, 3, 4, 5, 6].map((number) => <option key={number} value={number}>{number} {number === 1 ? 'guest' : 'guests'}</option>)}
            </select>
          </label>
          <button className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 font-semibold text-white hover:bg-amber-700">
            Search stays <ArrowRight size={17} />
          </button>
        </form>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 pt-40 sm:pt-36">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">A few of our favorites</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Places worth the journey</h2>
          </div>
          <Link to="/hotels" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-amber-700">Explore all stays <ArrowRight size={16} /></Link>
        </div>
        {hotelError && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{hotelError}</p>}
        {hotels.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{hotels.map((hotel) => <HotelCard key={hotel._id} hotel={hotel} />)}</div>
            {hotels.some((hotel) => hotel.isDemo) && <p className="mt-4 text-xs text-slate-500">Hotel names refer to real properties, but these academic demo listings are not affiliated with them and bookings here are not official hotel reservations. Rates and room availability are illustrative PKR values; credited destination photos are not hotel photography. Owners can upload photos they have permission to use.</p>}
          </>
        ) : !hotelError ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Featured stays are being prepared. Browse by destination or check back after demo listings are seeded.</div> : null}
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">Start with a place</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">A little inspiration from Pakistan</h2>
          <p className="mt-3 max-w-2xl text-slate-500">Browse real destinations, from lively city neighborhoods to the mountain north.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => <DestinationCard key={destination.name} destination={destination} />)}
        </div>
      </section>

      <section className="bg-white py-16">
        <div id="why-staywell" className="mx-auto max-w-7xl scroll-mt-24 px-5">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">Why Staywell</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The details make a difference.</h2>
            <p className="mt-3 leading-7 text-slate-500">A considered booking experience for guests and independent property owners.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-[#fbfaf8] p-6">
                <span className="inline-flex rounded-xl bg-amber-100 p-3 text-amber-800"><Icon size={21} /></span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto grid max-w-7xl scroll-mt-24 items-center gap-10 px-5 py-20 lg:grid-cols-2">
        <div className="relative">
          <img src="https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85" alt="A warm, welcoming mountain lodge interior" loading="lazy" className="h-[380px] w-full rounded-3xl object-cover sm:h-[480px]" />
          <div className="absolute -bottom-5 right-4 rounded-2xl bg-white p-4 shadow-xl sm:right-8 sm:p-5">
            <p className="text-2xl font-semibold text-slate-900">Made for</p>
            <p className="text-sm text-slate-500">the way Pakistan travels</p>
          </div>
        </div>
        <div className="py-4 lg:pl-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">About Staywell</p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">A more thoughtful way to find your stay.</h2>
          <p className="mt-5 leading-8 text-slate-600">Staywell brings travelers and property owners together in one straightforward place. Search by destination, compare room options, and keep your booking details close in your account.</p>
          <p className="mt-4 leading-8 text-slate-600">We’re building for Pakistan’s variety—from weekend city breaks to longer journeys into the north—with clear PKR pricing and tools that put hosts in control of their own listings.</p>
          <Link to="/hotels" className="mt-7 inline-flex items-center gap-2 font-semibold text-amber-800 hover:text-amber-950">Find a stay <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className="bg-[#f3f0e9] py-16">
        <div id="guest-reviews" className="mx-auto max-w-7xl scroll-mt-24 px-5">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-amber-800">Guest reviews</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Notes from real stays.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-600">Reviews are shared by guests with completed bookings. We don’t invent ratings or testimonials.</p>
          </div>
          {reviewError && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{reviewError}</p>}
          {reviews.length ? (
            <div className="grid gap-5 md:grid-cols-3">
              {reviews.map((review) => (
                <article key={review._id} className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-1 text-amber-600" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} className={index < review.rating ? 'fill-current' : 'text-slate-200'} />)}
                  </div>
                  <p className="mt-4 line-clamp-4 leading-7 text-slate-700">“{review.comment}”</p>
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <p className="font-semibold">{review.userId?.name || 'Staywell guest'}</p>
                    <p className="mt-1 text-sm text-slate-500">{review.hotelId?.name}{review.hotelId?.city ? ` · ${review.hotelId.city}` : ''}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : !reviewError && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
              <Star size={24} className="mx-auto text-amber-600" />
              <h3 className="mt-3 font-semibold">Guest reviews will appear here</h3>
              <p className="mt-2 text-sm text-slate-500">Once a guest completes a stay and leaves a review, we’ll share their verified feedback.</p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="overflow-hidden rounded-3xl bg-slate-900 px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200">For property owners</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Put your place on the map.</h2>
            <p className="mt-3 max-w-xl leading-7 text-white/70">Create an owner account, add your property and rooms, and manage guest reservations from your dashboard.</p>
          </div>
          <Link to="/register?role=owner" className="mt-7 inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-5 py-3.5 font-semibold text-slate-950 hover:bg-amber-400 lg:ml-8 lg:mt-0">
            List your property <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-4">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-700" />
          <p>Demo inventory is provided to preview the experience. Prices and room availability are illustrative PKR values, not live offers. Destination photos link to their Wikimedia Commons source and license; owners should upload only hotel photos they have permission to use.</p>
        </div>
      </section>
    </main>
  )
}
