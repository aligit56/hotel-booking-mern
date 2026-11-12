const mongoose = require('mongoose')
const Room = require('../models/Room')
const Hotel = require('../models/Hotel')
const Booking = require('../models/Booking')
const HttpError = require('../utils/HttpError')

function validId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record ID.')
}

async function requireManageAccess(hotelId, user) {
  const hotel = await Hotel.findById(hotelId).select('ownerId')
  if (!hotel) throw new HttpError(404, 'Hotel not found.')
  if (user.role !== 'admin' && hotel.ownerId.toString() !== user.id) {
    throw new HttpError(403, 'You can only manage rooms for your own hotels.')
  }
  return hotel
}

async function listRooms(req, res) {
  const filter = {}
  if (req.query.hotelId) {
    validId(req.query.hotelId)
    filter.hotelId = req.query.hotelId
  }
  if (req.user?.role === 'admin' && req.query.ownerId) {
    const hotels = await Hotel.find({ ownerId: req.query.ownerId }).select('_id')
    filter.hotelId = { $in: hotels.map((hotel) => hotel.id) }
  }
  const rooms = await Room.find(filter).sort({ createdAt: -1 })
  return res.json({ rooms })
}

async function getRoom(req, res) {
  validId(req.params.id)
  const room = await Room.findById(req.params.id)
  if (!room) throw new HttpError(404, 'Room not found.')
  return res.json({ room })
}

async function createRoom(req, res) {
  const body = req.body || {}
  validId(body.hotelId)
  await requireManageAccess(body.hotelId, req.user)
  const roomData = { ...body }
  delete roomData.demoKey
  const room = await Room.create(roomData)
  return res.status(201).json({ room })
}

async function updateRoom(req, res) {
  validId(req.params.id)
  const room = await Room.findById(req.params.id)
  if (!room) throw new HttpError(404, 'Room not found.')
  await requireManageAccess(room.hotelId, req.user)

  const updates = { ...(req.body || {}) }
  delete updates.hotelId
  delete updates.demoKey
  if (updates.roomNumbers !== undefined) {
    if (!Array.isArray(updates.roomNumbers) || updates.roomNumbers.length === 0) {
      throw new HttpError(400, 'At least one room number is required.')
    }
    const numbers = updates.roomNumbers.map((item) => Number(item.number))
    if (numbers.some((number) => !Number.isInteger(number) || number < 1) || new Set(numbers).size !== numbers.length) {
      throw new HttpError(400, 'Room numbers must be unique positive integers.')
    }
    const bookedNumbers = await Booking.distinct('roomNumber', {
      roomId: room.id,
      status: { $ne: 'cancelled' },
    })
    if (bookedNumbers.some((number) => !numbers.includes(number))) {
      throw new HttpError(409, 'Room numbers with existing bookings cannot be removed.')
    }
    const previousNumbers = new Map(room.roomNumbers.map((item) => [item.number, item.unavailableDates]))
    updates.roomNumbers = updates.roomNumbers.map(({ number }) => ({
      number: Number(number),
      unavailableDates: previousNumbers.get(Number(number)) || [],
    }))
  }
  Object.assign(room, updates)
  await room.save()
  return res.json({ room })
}

async function deleteRoom(req, res) {
  validId(req.params.id)
  const room = await Room.findById(req.params.id)
  if (!room) throw new HttpError(404, 'Room not found.')
  await requireManageAccess(room.hotelId, req.user)
  await Booking.deleteMany({ roomId: room.id })
  await room.deleteOne()
  return res.json({ message: 'Room and its bookings were deleted.' })
}

module.exports = { listRooms, getRoom, createRoom, updateRoom, deleteRoom }
