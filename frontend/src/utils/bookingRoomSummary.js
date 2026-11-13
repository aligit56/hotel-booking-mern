export default function bookingRoomSummary(booking) {
  const rooms = booking.rooms?.length
    ? booking.rooms
    : [{ roomId: booking.roomId, roomNumber: booking.roomNumber, guests: booking.guests }]
  return rooms.map((room) => (
    `${room.roomId?.title || 'Room'} #${room.roomNumber} · ${room.guests} ${room.guests === 1 ? 'guest' : 'guests'}`
  )).join(', ')
}
