import { Building2 } from 'lucide-react'
import api from '../api/axios'
import { DestinationImage } from './DestinationImage'

function resolvePhotoUrl(photo) {
  return photo.startsWith('/uploads/')
    ? new URL(photo, api.defaults.baseURL).href
    : photo
}

export default function HotelImage({ hotel, alt, className = '' }) {
  const photo = hotel.photos?.[0]
  if (photo) {
    return <img src={resolvePhotoUrl(photo)} alt={alt} loading="lazy" className={className} />
  }
  if (hotel.isDemo) {
    return <DestinationImage city={hotel.city} alt={`${hotel.city} destination view`} className={className} />
  }

  return (
    <div role="img" aria-label={`${alt}. No property photo has been added.`} className={`flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-600 text-white ${className}`}>
      <span className="text-center text-sm font-medium"><Building2 size={26} className="mx-auto mb-2 text-amber-200" />Photos not added yet</span>
    </div>
  )
}
