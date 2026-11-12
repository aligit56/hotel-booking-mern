const mongoose = require('mongoose')
const Hotel = require('../models/Hotel')
const Room = require('../models/Room')
const HttpError = require('../utils/HttpError')
const { removeStoredHotelPhoto, saveHotelPhoto } = require('../utils/hotelPhotoStorage')

const maxHotelPhotos = 5

function validId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record ID.')
}

async function listHotels(req, res) {
  const match = {}
  if (req.query.city) {
    const city = String(req.query.city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    match.city = new RegExp(city, 'i')
  }
  if (req.query.featured === 'true') match.featured = true
  if (req.query.minRating) match.rating = { $gte: Number(req.query.minRating) }
  if (req.query.ownerId && req.user?.role === 'admin') match.ownerId = req.query.ownerId

  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1)
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 50)
  const hotels = await Hotel.aggregate([
    { $match: match },
    { $sort: { featured: -1, rating: -1, createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        let: { ownerId: '$ownerId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$ownerId'] } } },
          { $project: { name: 1 } },
        ],
        as: 'ownerInfo',
      },
    },
    { $set: { ownerId: { $first: '$ownerInfo' } } },
    { $unset: 'ownerInfo' },
    {
      $lookup: {
        from: 'rooms',
        let: { hotelId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$hotelId', '$$hotelId'] } } },
          { $group: { _id: null, minPrice: { $min: '$price' } } },
        ],
        as: 'priceInfo',
      },
    },
    { $set: { minPrice: { $ifNull: [{ $first: '$priceInfo.minPrice' }, null] } } },
    { $unset: ['priceInfo', 'demoKey'] },
  ])
  const total = await Hotel.countDocuments(match)
  return res.json({ hotels, page, pages: Math.ceil(total / limit), total })
}

async function getHotel(req, res) {
  validId(req.params.id)
  const hotel = await Hotel.findById(req.params.id).populate('ownerId', 'name')
  if (!hotel) throw new HttpError(404, 'Hotel not found.')
  return res.json({ hotel })
}

async function listOwnerHotels(req, res) {
  const filter = req.user.role === 'admin' && req.query.ownerId
    ? { ownerId: req.query.ownerId }
    : { ownerId: req.user.id }
  const hotels = await Hotel.find(filter).sort({ createdAt: -1 })
  return res.json({ hotels })
}

async function createHotel(req, res) {
  const body = { ...(req.body || {}) }
  delete body.isDemo
  delete body.demoKey
  delete body.photos
  const hotel = await Hotel.create({ ...body, ownerId: req.user.id, isDemo: false })
  return res.status(201).json({ hotel })
}

async function updateHotel(req, res) {
  validId(req.params.id)
  const hotel = await Hotel.findById(req.params.id)
  if (!hotel) throw new HttpError(404, 'Hotel not found.')
  if (req.user.role !== 'admin' && hotel.ownerId.toString() !== req.user.id) {
    throw new HttpError(403, 'You can only manage your own hotels.')
  }

  const updates = { ...req.body }
  delete updates.ownerId
  delete updates.isDemo
  delete updates.demoKey
  delete updates.photos
  Object.assign(hotel, updates)
  await hotel.save()
  return res.json({ hotel })
}

async function uploadHotelPhoto(req, res) {
  validId(req.params.id)
  if (!Buffer.isBuffer(req.body)) throw new HttpError(415, 'Upload a JPEG, PNG, or WebP image.')

  const hotel = await Hotel.findById(req.params.id)
  if (!hotel) throw new HttpError(404, 'Hotel not found.')
  if (req.user.role !== 'admin' && hotel.ownerId.toString() !== req.user.id) {
    throw new HttpError(403, 'You can only manage your own hotels.')
  }
  if (hotel.photos.length >= maxHotelPhotos) {
    throw new HttpError(400, `A property can have at most ${maxHotelPhotos} photos.`)
  }

  const photo = await saveHotelPhoto(req.body, req.get('content-type'))
  if (!photo) throw new HttpError(415, 'The uploaded file is not a valid JPEG, PNG, or WebP image.')

  try {
    hotel.photos.push(photo)
    await hotel.save()
  } catch (error) {
    await removeStoredHotelPhoto(photo)
    throw error
  }

  return res.status(201).json({ photo, hotel })
}

async function deleteHotelPhoto(req, res) {
  validId(req.params.id)
  const hotel = await Hotel.findById(req.params.id)
  if (!hotel) throw new HttpError(404, 'Hotel not found.')
  if (req.user.role !== 'admin' && hotel.ownerId.toString() !== req.user.id) {
    throw new HttpError(403, 'You can only manage your own hotels.')
  }

  const photo = req.body?.photo
  const photoIndex = hotel.photos.indexOf(photo)
  if (photoIndex === -1) throw new HttpError(404, 'Photo not found on this property.')

  hotel.photos.splice(photoIndex, 1)
  await hotel.save()
  await removeStoredHotelPhoto(photo)
  return res.json({ hotel })
}

async function deleteHotel(req, res) {
  validId(req.params.id)
  const hotel = await Hotel.findById(req.params.id)
  if (!hotel) throw new HttpError(404, 'Hotel not found.')
  if (req.user.role !== 'admin' && hotel.ownerId.toString() !== req.user.id) {
    throw new HttpError(403, 'You can only manage your own hotels.')
  }

  const rooms = await Room.find({ hotelId: hotel.id }).select('_id')
  const roomIds = rooms.map((room) => room.id)
  await Promise.all([
    Room.deleteMany({ hotelId: hotel.id }),
    require('../models/Booking').deleteMany({ hotelId: hotel.id }),
    require('../models/Review').deleteMany({ hotelId: hotel.id }),
    require('../models/Booking').deleteMany({ roomId: { $in: roomIds } }),
  ])
  await hotel.deleteOne()
  await Promise.all(hotel.photos.map(removeStoredHotelPhoto))
  return res.json({ message: 'Hotel and its rooms, bookings, and reviews were deleted.' })
}

module.exports = {
  listHotels,
  getHotel,
  listOwnerHotels,
  createHotel,
  updateHotel,
  uploadHotelPhoto,
  deleteHotelPhoto,
  deleteHotel,
}
