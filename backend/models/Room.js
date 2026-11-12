const mongoose = require('mongoose')

const roomNumberSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, min: 1 },
    unavailableDates: [{ type: Date }],
  },
  { _id: false },
)

const roomSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    price: { type: Number, required: true, min: 0 },
    maxPeople: { type: Number, required: true, min: 1, max: 30 },
    desc: { type: String, required: true, trim: true, maxlength: 3000 },
    demoKey: { type: String, trim: true, unique: true, sparse: true, select: false },
    roomNumbers: { type: [roomNumberSchema], required: true, validate: {
      validator: (rooms) => rooms.length > 0
        && new Set(rooms.map((room) => room.number)).size === rooms.length,
      message: 'At least one unique room number is required.',
    } },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Room', roomSchema)
