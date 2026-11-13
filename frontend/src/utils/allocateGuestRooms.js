export default function allocateGuestRooms(availableRooms, guestCount) {
  if (!Number.isSafeInteger(guestCount) || guestCount < 1) return null

  const rooms = availableRooms
    .filter((room) => Number.isInteger(room.capacity) && room.capacity > 0
      && Number.isFinite(room.price) && room.price >= 0)
    .sort((left, right) => (
      left.price / left.capacity - right.price / right.capacity
      || right.capacity - left.capacity
      || left.price - right.price
      || String(left.roomId).localeCompare(String(right.roomId))
      || left.roomNumber - right.roomNumber
    ))

  let remainingGuests = guestCount
  const allocation = []
  for (const room of rooms) {
    if (remainingGuests === 0) break
    const assignedGuests = Math.min(room.capacity, remainingGuests)
    allocation.push({ ...room, guests: assignedGuests })
    remainingGuests -= assignedGuests
  }
  if (remainingGuests > 0) return null

  const totalPrice = allocation.reduce((sum, room) => sum + room.price, 0)
  const cheapestSingleRoom = rooms
    .filter((room) => room.capacity >= guestCount)
    .sort((left, right) => left.price - right.price)[0]
  if (cheapestSingleRoom && cheapestSingleRoom.price < totalPrice) {
    return [{ ...cheapestSingleRoom, guests: guestCount }]
  }
  return allocation
}
