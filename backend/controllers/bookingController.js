const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const Hotel = require('../models/Hotel')
const Room = require('../models/Room')
const HttpError = require('../utils/HttpError')
const { releaseBookingRooms } = require('../utils/bookingRooms')

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
  const guests = Number(rawGuests)
  if (!Number.isSafeInteger(guests) || guests < 1) {
    throw new HttpError(400, 'Enter a positive whole number of guests.')
  }

  const requestedRooms = Array.isArray(req.body?.rooms)
    ? req.body.rooms
    : [{ roomId, roomNumber, guests }]
  if (!requestedRooms.length) throw new HttpError(400, 'At least one available room is required.')
  const selections = requestedRooms.map((selection) => {
    validId(selection?.roomId)
    const number = Number(selection.roomNumber)
    const assignedGuests = Number(selection.guests)
    if (!Number.isSafeInteger(number) || number < 1) {
      throw new HttpError(400, 'A valid room number is required.')
    }
    if (!Number.isSafeInteger(assignedGuests) || assignedGuests < 1) {
      throw new HttpError(400, 'Each room must be assigned at least one guest.')
    }
    return { roomId: selection.roomId, roomNumber: number, guests: assignedGuests }
  })
  const uniqueRooms = new Set(selections.map(({ roomId: selectedRoomId, roomNumber: number }) => `${selectedRoomId}:${number}`))
  if (uniqueRooms.size !== selections.length) throw new HttpError(400, 'A room can only be selected once.')
  if (selections.reduce((total, selection) => total + selection.guests, 0) !== guests) {
    throw new HttpError(400, 'Room guest assignments must add up to the total number of guests.')
  }

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

  const roomIds = [...new Set(selections.map((selection) => selection.roomId))]
  const [hotel, rooms] = await Promise.all([
    Hotel.findById(hotelId).select('_id'),
    Room.find({ _id: { $in: roomIds }, hotelId }),
  ])
  if (!hotel) throw new HttpError(404, 'The selected hotel was not found.')
  const roomsById = new Map(rooms.map((room) => [room.id, room]))
  const bookingRooms = selections.map((selection) => {
    const room = roomsById.get(selection.roomId)
    if (!room || !room.roomNumbers.some((item) => item.number === selection.roomNumber)) {
      throw new HttpError(404, 'A selected hotel room was not found.')
    }
    if (selection.guests > room.maxPeople) {
      throw new HttpError(400, `Room ${selection.roomNumber} cannot accommodate ${selection.guests} guests.`)
    }
    return { ...selection, price: room.price }
  })
  const totalCapacity = bookingRooms.reduce((total, selection) => (
    total + roomsById.get(selection.roomId).maxPeople
  ), 0)
  if (totalCapacity < guests) {
    throw new HttpError(400, 'The selected rooms cannot accommodate all guests.')
  }

  const dates = stayDates(checkIn, checkOut)
  const nights = dates.length
  const reservedRooms = []
  try {
    for (const selection of bookingRooms) {
      const reservation = await Room.findOneAndUpdate(
        {
          _id: selection.roomId,
          hotelId,
          roomNumbers: {
            $elemMatch: {
              number: selection.roomNumber,
              unavailableDates: { $not: { $elemMatch: { $in: dates } } },
            },
          },
        },
        { $addToSet: { 'roomNumbers.$.unavailableDates': { $each: dates } } },
        { returnDocument: 'after' },
      )
      if (!reservation) throw new HttpError(409, 'One or more selected rooms are no longer available for these dates.')
      reservedRooms.push(selection)
    }

    const booking = await Booking.create({
      userId: req.user.id,
      hotelId,
      roomId: bookingRooms[0].roomId,
      roomNumber: bookingRooms[0].roomNumber,
      rooms: bookingRooms.map(({ roomId: selectedRoomId, roomNumber: number, guests: assignedGuests }) => ({
        roomId: selectedRoomId,
        roomNumber: number,
        guests: assignedGuests,
      })),
      guests,
      checkIn,
      checkOut,
      totalPrice: bookingRooms.reduce((total, room) => total + room.price, 0) * nights,
    })
    return res.status(201).json({ booking })
  } catch (error) {
    await Promise.all(reservedRooms.map(({ roomId: selectedRoomId, roomNumber: number }) => Room.updateOne(
      { _id: selectedRoomId, 'roomNumbers.number': number },
      { $pull: { 'roomNumbers.$.unavailableDates': { $in: dates } } },
    )))
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
    .populate('rooms.roomId', 'title')
    .sort({ createdAt: -1 })
  return res.json({ bookings })
}

async function getBooking(req, res) {
  validId(req.params.id)
  const booking = await Booking.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('hotelId', 'name city photos isDemo ownerId')
    .populate('roomId', 'title')
    .populate('rooms.roomId', 'title')
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
    await releaseBookingRooms(booking, dates)
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
    await releaseBookingRooms(booking, stayDates(booking.checkIn, booking.checkOut))
  }
  await booking.deleteOne()
  return res.json({ message: 'Booking deleted.' })
}

module.exports = { createBooking, listBookings, getBooking, updateBooking, deleteBooking }
