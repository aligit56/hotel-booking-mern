import { useState } from 'react'
import { Camera } from 'lucide-react'
import { getDestinationPhoto } from '../utils/destinationPhotos'

export function DestinationImage({ city, alt, className = '' }) {
  const photo = getDestinationPhoto(city)
  const [failedUrl, setFailedUrl] = useState('')

  if (!photo || failedUrl === photo.imageUrl) {
    return (
      <div role="img" aria-label={`${alt}. Destination photo unavailable.`} className={`flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-amber-900 p-5 text-center text-white ${className}`}>
        <span><Camera size={24} className="mx-auto text-amber-200" /><span className="mt-2 block text-sm font-medium">{city} destination photo</span></span>
      </div>
    )
  }

  return <img src={photo.imageUrl} alt={alt} loading="lazy" className={className} onError={() => setFailedUrl(photo.imageUrl)} />
}

export function DestinationCredit({ city, className = '' }) {
  const photo = getDestinationPhoto(city)
  if (!photo) return null

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1 rounded bg-white/90 px-2 py-1 text-[10px] leading-4 text-slate-700 ${className}`}>
      Photo: <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline" aria-label={`${photo.landmark} photo by ${photo.author}; view Wikimedia Commons source`}>{photo.author}</a>
      · <a href={photo.licenseUrl} target="_blank" rel="noreferrer" className="hover:underline">{photo.license}</a>
      · resized for display
    </span>
  )
}
