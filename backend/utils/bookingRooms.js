const Room = require('../models/Room')

function roomsForBooking(booking) {
  return booking.rooms?.length
    ? booking.rooms
    : [{ roomId: booking.roomId, roomNumber: booking.roomNumber, guests: booking.guests }]
}

async function releaseBookingRooms(booking, dates) {
  await Promise.all(roomsForBooking(booking).map(({ roomId, roomNumber }) => Room.updateOne(
    { _id: roomId, 'roomNumbers.number': roomNumber },
    { $pull: { 'roomNumbers.$.unavailableDates': { $in: dates } } },
  )))
}

module.exports = { releaseBookingRooms, roomsForBooking }
