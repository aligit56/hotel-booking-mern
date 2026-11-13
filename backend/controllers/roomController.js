const mongoose = require('mongoose')
const Room = require('../models/Room')
const Hotel = require('../models/Hotel')
const Booking = require('../models/Booking')
const HttpError = require('../utils/HttpError')
const { releaseBookingRooms, roomsForBooking } = require('../utils/bookingRooms')

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
  if (updates.maxPeople !== undefined) {
    const maxPeople = Number(updates.maxPeople)
    if (!Number.isInteger(maxPeople) || maxPeople < 1 || maxPeople > 30) {
      throw new HttpError(400, 'Room capacity must be between 1 and 30 guests.')
    }
    const existingBookings = await Booking.find({
      status: { $ne: 'cancelled' },
      $or: [{ roomId: room.id }, { 'rooms.roomId': room.id }],
    }).select('roomId roomNumber rooms guests')
    const hasOverCapacityBooking = existingBookings.some((booking) => roomsForBooking(booking)
      .some((selection) => selection.roomId.toString() === room.id
        && selection.guests > maxPeople))
    if (hasOverCapacityBooking) {
      throw new HttpError(409, 'Room capacity cannot be reduced below an existing booking allocation.')
    }
  }
  if (updates.roomNumbers !== undefined) {
    if (!Array.isArray(updates.roomNumbers) || updates.roomNumbers.length === 0) {
      throw new HttpError(400, 'At least one room number is required.')
    }
    const numbers = updates.roomNumbers.map((item) => Number(item.number))
    if (numbers.some((number) => !Number.isInteger(number) || number < 1) || new Set(numbers).size !== numbers.length) {
      throw new HttpError(400, 'Room numbers must be unique positive integers.')
    }
    const removedNumbers = room.roomNumbers
      .map((item) => item.number)
      .filter((number) => !numbers.includes(number))
    const bookingForRemovedNumber = removedNumbers.length ? await Booking.exists({
      status: { $ne: 'cancelled' },
      $or: [
        { roomId: room.id, roomNumber: { $in: removedNumbers } },
        { rooms: { $elemMatch: { roomId: room.id, roomNumber: { $in: removedNumbers } } } },
      ],
    }) : null
    if (bookingForRemovedNumber) {
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
  const bookings = await Booking.find({
    $or: [{ roomId: room.id }, { 'rooms.roomId': room.id }],
  })
  await Promise.all(bookings
    .filter((booking) => booking.status !== 'cancelled')
    .map((booking) => {
      const dates = []
      for (let day = new Date(booking.checkIn); day < booking.checkOut; day.setUTCDate(day.getUTCDate() + 1)) {
        dates.push(new Date(day))
      }
      return releaseBookingRooms(booking, dates)
    }))
  await Booking.deleteMany({ _id: { $in: bookings.map((booking) => booking._id) } })
  await room.deleteOne()
  return res.json({ message: 'Room and its bookings were deleted.' })
}

module.exports = { listRooms, getRoom, createRoom, updateRoom, deleteRoom }
