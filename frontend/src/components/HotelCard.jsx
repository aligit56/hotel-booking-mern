import { ArrowUpRight, MapPin, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatPKR } from '../utils/currency'
import HotelImage from './HotelImage'
import { DestinationCredit } from './DestinationImage'

export default function HotelCard({ hotel, query = '' }) {
  const guestCount = new URLSearchParams(query).get('guests')
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Link to={`/hotels/${hotel._id}${query ? `?${query}` : ''}`} className="absolute inset-0 z-0" aria-label={`View ${hotel.name}`}>
          <HotelImage hotel={hotel} alt={hotel.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        </Link>
        <div className="pointer-events-none absolute inset-0 z-[1]">
          {hotel.featured && <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold tracking-wide text-slate-800">GUEST FAVORITE</span>}
          <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-sm font-semibold text-slate-800">
            {Number(hotel.rating || 0) > 0
              ? <><Star size={14} className="fill-amber-400 text-amber-400" /> {Number(hotel.rating).toFixed(1)}</>
              : 'No reviews'}
          </span>
        </div>
      </div>
      {hotel.isDemo && !hotel.photos?.length && <div className="px-5 pt-3"><DestinationCredit city={hotel.city} className="bg-transparent px-0 py-0 text-slate-500" /></div>}
      <Link to={`/hotels/${hotel._id}${query ? `?${query}` : ''}`} className="block">
        <div className="p-5">
          <div className="mb-2 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin size={14} /> {hotel.city} <span className="px-1">·</span> {hotel.type}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{hotel.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{hotel.title || hotel.desc}</p>
            </div>
            <ArrowUpRight size={19} className="mt-1 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-700" />
          </div>
          <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">{guestCount ? `For ${guestCount} ${guestCount === '1' ? 'guest' : 'guests'}` : 'Nightly rate'}</p>
            <p className="text-right text-sm font-semibold text-slate-900">
              {hotel.minPrice == null ? (guestCount ? 'No rooms available' : 'See rooms') : formatPKR(hotel.minPrice)}
              {hotel.minPrice != null && <span className="font-normal text-slate-500"> / night</span>}
            </p>
          </div>
        </div>
      </Link>
    </article>
  )
}
