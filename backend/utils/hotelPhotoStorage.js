const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

const hotelPhotoDirectory = path.join(__dirname, '..', 'uploads', 'hotels')
const publicPhotoPrefix = '/uploads/hotels/'
const photoExtensions = {
  'image/jpeg': { extension: 'jpg', matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  'image/png': { extension: 'png', matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  'image/webp': { extension: 'webp', matches: (buffer) => buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' },
}

function getPhotoExtension(contentType, buffer) {
  const image = photoExtensions[contentType]
  if (!image || !image.matches(buffer)) return null
  return image.extension
}

async function saveHotelPhoto(buffer, contentType) {
  const extension = getPhotoExtension(contentType, buffer)
  if (!extension) return null

  await fs.mkdir(hotelPhotoDirectory, { recursive: true })
  const filename = `${crypto.randomUUID()}.${extension}`
  await fs.writeFile(path.join(hotelPhotoDirectory, filename), buffer, { flag: 'wx' })
  return `${publicPhotoPrefix}${filename}`
}

async function removeStoredHotelPhoto(photo) {
  if (typeof photo !== 'string' || !photo.startsWith(publicPhotoPrefix)) return

  const filename = photo.slice(publicPhotoPrefix.length)
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename)) return

  try {
    await fs.unlink(path.join(hotelPhotoDirectory, filename))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

module.exports = { removeStoredHotelPhoto, saveHotelPhoto }
