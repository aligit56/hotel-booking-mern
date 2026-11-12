const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const Hotel = require('../models/Hotel')
const Room = require('../models/Room')
const HttpError = require('../utils/HttpError')

function validId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record ID.')
}

function dateOnly(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function stayDates(checkIn, checkOut) {
  const dates = []
  for (let day = new Date(checkIn); day < checkOut; day.setUTCDate(day.getUTCDate() + 1)) {
    dates.push(new Date(day))
  }
  return dates
}

async function createBooking(req, res) {
  const {
    hotelId,
    roomId,
    roomNumber,
    guests: rawGuests = 1,
    checkIn: rawCheckIn,
    checkOut: rawCheckOut,
  } = req.body || {}
  validId(hotelId)
  validId(roomId)
  if (!Number.isInteger(Number(roomNumber)) || Number(roomNumber) < 1) {
    throw new HttpError(400, 'A valid room number is required.')
  }
  const guests = Number(rawGuests)
  if (!Number.isInteger(guests) || guests < 1) throw new HttpError(400, 'At least one guest is required.')

  const checkIn = rawCheckIn ? dateOnly(new Date(rawCheckIn)) : null
  const checkOut = rawCheckOut ? dateOnly(new Date(rawCheckOut)) : null
  if (!checkIn || !checkOut || Number.isNaN(checkIn.valueOf()) || Number.isNaN(checkOut.valueOf())) {
    throw new HttpError(400, 'Valid check-in and check-out dates are required.')
  }
  if (checkIn < dateOnly(new Date()) || checkOut <= checkIn) {
    throw new HttpError(400, 'Check-out must be after check-in and check-in cannot be in the past.')
  }
  if ((checkOut - checkIn) / 86400000 > 365) {
    throw new HttpError(400, 'A stay cannot be longer than 365 nights.')
  }

  const [hotel, room] = await Promise.all([
    Hotel.findById(hotelId).select('_id'),
    Room.findById(roomId),
  ])
  if (!hotel || !room || room.hotelId.toString() !== hotelId) {
    throw new HttpError(404, 'The selected hotel room was not found.')
  }
  if (guests > room.maxPeople) throw new HttpError(400, 'The selected room cannot accommodate that many guests.')

  const dates = stayDates(checkIn, checkOut)
  const nights = dates.length
  const reservation = await Room.findOneAndUpdate(
    {
      _id: roomId,
      hotelId,
      roomNumbers: {
        $elemMatch: {
          number: Number(roomNumber),
          unavailableDates: { $not: { $elemMatch: { $in: dates } } },
        },
      },
    },
    { $addToSet: { 'roomNumbers.$.unavailableDates': { $each: dates } } },
    { returnDocument: 'after' },
  )
  if (!reservation) throw new HttpError(409, 'That room is not available for the selected dates.')

  try {
    const booking = await Booking.create({
      userId: req.user.id,
      hotelId,
      roomId,
      roomNumber: Number(roomNumber),
      guests,
      checkIn,
      checkOut,
      totalPrice: room.price * nights,
    })
    return res.status(201).json({ booking })
  } catch (error) {
    await Room.updateOne(
      { _id: roomId, 'roomNumbers.number': Number(roomNumber) },
      { $pull: { 'roomNumbers.$.unavailableDates': { $in: dates } } },
    )
    throw error
  }
}

async function listBookings(req, res) {
  let filter = {}
  if (req.user.role === 'user') filter.userId = req.user.id
  if (req.user.role === 'owner') {
    const hotels = await Hotel.find({ ownerId: req.user.id }).select('_id')
    filter.hotelId = { $in: hotels.map((hotel) => hotel.id) }
  }
  if (req.query.status) filter.status = req.query.status
  const bookings = await Booking.find(filter)
    .populate('userId', 'name email')
    .populate('hotelId', 'name city photos isDemo')
    .populate('roomId', 'title')
    .sort({ createdAt: -1 })
  return res.json({ bookings })
}

async function getBooking(req, res) {
  validId(req.params.id)
  const booking = await Booking.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('hotelId', 'name city photos isDemo ownerId')
    .populate('roomId', 'title')
  if (!booking) throw new HttpError(404, 'Booking not found.')
  const ownerId = booking.hotelId.ownerId?.toString()
  if (
    req.user.role !== 'admin'
    && booking.userId.id !== req.user.id
    && !(req.user.role === 'owner' && ownerId === req.user.id)
  ) {
    throw new HttpError(403, 'You cannot view this booking.')
  }
  return res.json({ booking })
}

async function updateBooking(req, res) {
  validId(req.params.id)
  const booking = await Booking.findById(req.params.id)
  if (!booking) throw new HttpError(404, 'Booking not found.')

  const hotel = await Hotel.findById(booking.hotelId).select('ownerId')
  const isAdmin = req.user.role === 'admin'
  const isOwner = req.user.role === 'owner' && hotel?.ownerId.toString() === req.user.id
  const isBooker = booking.userId.toString() === req.user.id
  if (!isAdmin && !isOwner && !isBooker) throw new HttpError(403, 'You cannot update this booking.')

  const { status } = req.body || {}
  if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    throw new HttpError(400, 'A valid booking status is required.')
  }
  if (isBooker && !isAdmin && !isOwner && status !== 'cancelled') {
    throw new HttpError(403, 'Guests can only cancel their own bookings.')
  }
  if (booking.status === 'cancelled' && status !== 'cancelled') {
    throw new HttpError(409, 'A cancelled booking cannot be reactivated.')
  }

  if (status === 'cancelled' && booking.status !== 'cancelled') {
    const dates = stayDates(booking.checkIn, booking.checkOut)
    await Room.updateOne(
      { _id: booking.roomId, 'roomNumbers.number': booking.roomNumber },
      { $pull: { 'roomNumbers.$.unavailableDates': { $in: dates } } },
    )
  }
  booking.status = status
  await booking.save()
  return res.json({ booking })
}

async function deleteBooking(req, res) {
  validId(req.params.id)
  const booking = await Booking.findById(req.params.id)
  if (!booking) throw new HttpError(404, 'Booking not found.')
  const hotel = await Hotel.findById(booking.hotelId).select('ownerId')
  const canDelete = req.user.role === 'admin'
    || booking.userId.toString() === req.user.id
    || (req.user.role === 'owner' && hotel?.ownerId.toString() === req.user.id)
  if (!canDelete) throw new HttpError(403, 'You cannot delete this booking.')

  if (booking.status !== 'cancelled') {
    await Room.updateOne(
      { _id: booking.roomId, 'roomNumbers.number': booking.roomNumber },
      { $pull: { 'roomNumbers.$.unavailableDates': { $in: stayDates(booking.checkIn, booking.checkOut) } } },
    )
  }
  await booking.deleteOne()
  return res.json({ message: 'Booking deleted.' })
}

module.exports = { createBooking, listBookings, getBooking, updateBooking, deleteBooking }
