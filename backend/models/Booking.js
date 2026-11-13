const mongoose = require('mongoose')

const bookedRoomSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    roomNumber: { type: Number, required: true },
    guests: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    roomNumber: { type: Number, required: true },
    rooms: { type: [bookedRoomSchema], default: [] },
    guests: { type: Number, required: true, min: 1, default: 1 },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    totalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'confirmed',
      index: true,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Booking', bookingSchema)
