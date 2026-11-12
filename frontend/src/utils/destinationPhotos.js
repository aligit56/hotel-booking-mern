const commonsFile = (title) => encodeURIComponent(title.replaceAll(' ', '_'))

export const destinationPhotos = [
  {
    city: 'Islamabad',
    landmark: 'Faisal Mosque',
    title: 'Faisal Mosque islamabad 10.jpg',
    author: 'Fawad4real (Fawad Javed)',
    image: 'islamabad.jpg',
  },
  {
    city: 'Lahore',
    landmark: 'Badshahi Mosque',
    title: 'Badshahi Mosque Sunset.jpg',
    author: 'Muddiii',
    image: 'lahore.jpg',
  },
  {
    city: 'Karachi',
    landmark: 'Mazar-e-Quaid',
    title: 'Mazar-e-Quaid Karachi.jpg',
    author: 'Furqanlw',
    image: 'karachi.jpg',
  },
  {
    city: 'Murree',
    landmark: 'Murree hill station',
    title: 'Murree hill station,Pakistan.jpeg',
    author: 'Maha murtaza',
    image: 'murree.jpg',
  },
  {
    city: 'Hunza',
    landmark: 'Attabad Lake',
    title: 'Attabad Lake, Hunza Pakistan.jpg',
    author: 'Hassanzealous',
    image: 'hunza.jpg',
  },
  {
    city: 'Skardu',
    landmark: 'Shangrila Resort',
    title: 'Shangrila Resort - Skardu - Gilgit Baltistan - Pakistan.jpg',
    author: 'Waseem Abbas',
    image: 'skardu.jpg',
  },
].map((photo) => ({
  ...photo,
  imageUrl: `/images/destinations/${photo.image}`,
  sourceUrl: `https://commons.wikimedia.org/wiki/File:${commonsFile(photo.title)}`,
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  license: 'CC BY-SA 4.0',
}))

export function getDestinationPhoto(city) {
  return destinationPhotos.find((photo) => photo.city.toLowerCase() === String(city || '').toLowerCase())
}
