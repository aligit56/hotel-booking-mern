const mongoose = require('mongoose')

const hotelSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, required: true, trim: true, maxlength: 60 },
    city: { type: String, required: true, trim: true, maxlength: 100, index: true },
    address: { type: String, required: true, trim: true, maxlength: 250 },
    distance: { type: Number, min: 0, default: 0 },
    photos: [{ type: String, trim: true }],
    title: { type: String, required: true, trim: true, maxlength: 160 },
    desc: { type: String, required: true, trim: true, maxlength: 5000 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    featured: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    demoKey: { type: String, trim: true, unique: true, sparse: true, select: false },
  },
  { timestamps: true },
)

hotelSchema.index({ city: 'text', name: 'text', title: 'text' })

module.exports = mongoose.model('Hotel', hotelSchema)
