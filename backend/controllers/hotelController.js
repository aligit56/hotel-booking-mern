const mongoose = require('mongoose')
const Hotel = require('../models/Hotel')
const Room = require('../models/Room')
const HttpError = require('../utils/HttpError')
const { removeStoredHotelPhoto, saveHotelPhoto } = require('../utils/hotelPhotoStorage')
const allocateGuestRooms = require('../utils/allocateGuestRooms')

const maxHotelPhotos = 5

function validId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record ID.')
}

function requestedCalendarDates(checkInValue, checkOutValue) {
  if (!checkInValue && !checkOutValue) return []
  if (!checkInValue || !checkOutValue) {
    throw new HttpError(400, 'Check-in and check-out dates must be provided together.')
  }

  const toDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? date : null
  }
  const checkIn = toDate(checkInValue)
  const checkOut = toDate(checkOutValue)
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    throw new HttpError(400, 'Valid check-in and check-out dates are required.')
  }

  const nights = (checkOut - checkIn) / 86400000
  if (nights > 365) throw new HttpError(400, 'A stay cannot be longer than 365 nights.')

  return Array.from({ length: nights }, (_, index) => {
    const date = new Date(checkIn)
    date.setUTCDate(date.getUTCDate() + index)
    return date
  })
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

  const guestCount = req.query.guests === undefined || req.query.guests === ''
    ? null
    : Number(req.query.guests)
  if (guestCount !== null && (!Number.isSafeInteger(guestCount) || guestCount < 1)) {
    throw new HttpError(400, 'Guest count must be a positive whole number.')
  }
  const requestedDates = requestedCalendarDates(req.query.checkIn, req.query.checkOut)
  const roomInventoryPipeline = [
    { $match: { $expr: { $eq: ['$hotelId', '$$hotelId'] } } },
    { $unwind: '$roomNumbers' },
  ]
  if (requestedDates.length) {
    roomInventoryPipeline.push({
      $match: {
        $expr: {
          $eq: [
            {
              $size: {
                $setIntersection: [
                  { $ifNull: ['$roomNumbers.unavailableDates', []] },
                  requestedDates,
                ],
              },
            },
            0,
          ],
        },
      },
    })
  }
  roomInventoryPipeline.push({
    $project: {
      _id: 0,
      roomId: '$_id',
      roomNumber: '$roomNumbers.number',
      title: 1,
      price: 1,
      capacity: '$maxPeople',
    },
  })

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
        pipeline: roomInventoryPipeline,
        as: 'roomOptions',
      },
    },
    { $unset: 'demoKey' },
  ])
  for (const hotel of hotels) {
    const availableRooms = hotel.roomOptions || []
    if (guestCount === null) {
      hotel.minPrice = availableRooms.length
        ? availableRooms.reduce((price, room) => Math.min(price, room.price), Infinity)
        : null
    } else {
      const allocation = allocateGuestRooms(availableRooms, guestCount)
      hotel.minPrice = allocation
        ? allocation.reduce((total, room) => total + room.price, 0)
        : null
    }
    delete hotel.roomOptions
  }
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
