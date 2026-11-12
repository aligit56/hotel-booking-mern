const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/User')
const Hotel = require('../models/Hotel')
const Room = require('../models/Room')
const Booking = require('../models/Booking')
const Review = require('../models/Review')
const HttpError = require('../utils/HttpError')

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
})

function createToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

function sendUser(res, user, status = 200) {
  return res.status(status).json({ user: user.toJSON() })
}

async function register(req, res) {
  const { name, email, password, role = 'user' } = req.body || {}
  if (
    typeof name !== 'string'
    || typeof email !== 'string'
    || typeof password !== 'string'
    || !name.trim()
    || !email.trim()
    || !password
  ) {
    throw new HttpError(400, 'Name, email, and password are required.')
  }
  if (!['user', 'owner'].includes(role)) {
    throw new HttpError(400, 'New accounts can only be registered as a user or owner.')
  }
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.')

  const user = await User.create({ name, email, password, role })
  res.cookie('token', createToken(user), cookieOptions())
  return sendUser(res, user, 201)
}

async function login(req, res) {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new HttpError(400, 'Email and password are required.')
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')
  if (!user || !(await user.comparePassword(password))) {
    throw new HttpError(401, 'Email or password is incorrect.')
  }

  res.cookie('token', createToken(user), cookieOptions())
  return sendUser(res, user)
}

function logout(_req, res) {
  return res.clearCookie('token', { ...cookieOptions(), maxAge: undefined }).json({ message: 'Signed out.' })
}

async function getMe(req, res) {
  const user = await User.findById(req.user.id)
  if (!user) throw new HttpError(404, 'User not found.')
  return sendUser(res, user)
}

async function listUsers(_req, res) {
  const users = await User.find().sort({ createdAt: -1 })
  return res.json({ users })
}

async function getUser(req, res) {
  const user = await User.findById(req.params.id)
  if (!user) throw new HttpError(404, 'User not found.')
  return sendUser(res, user)
}

async function updateUser(req, res) {
  const isAdmin = req.user.role === 'admin'
  const isSelf = req.user.id === req.params.id
  if (!isAdmin && !isSelf) throw new HttpError(403, 'You can only update your own account.')

  const allowed = isAdmin
    ? ['name', 'email', 'password', 'role']
    : ['name', 'email', 'password']
  const body = req.body || {}
  const updates = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }
  if (updates.password !== undefined && (typeof updates.password !== 'string' || updates.password.length < 8)) {
    throw new HttpError(400, 'Password must be at least 8 characters.')
  }
  if (updates.role && !['user', 'owner', 'admin'].includes(updates.role)) {
    throw new HttpError(400, 'Invalid account role.')
  }

  const user = await User.findById(req.params.id)
  if (!user) throw new HttpError(404, 'User not found.')
  Object.assign(user, updates)
  await user.save()
  return sendUser(res, user)
}

async function deleteUser(req, res) {
  const isAdmin = req.user.role === 'admin'
  const isSelf = req.user.id === req.params.id
  if (!isAdmin && !isSelf) throw new HttpError(403, 'You can only delete your own account.')

  const user = await User.findById(req.params.id)
  if (!user) throw new HttpError(404, 'User not found.')
  const ownedHotels = await Hotel.find({ ownerId: user.id }).select('_id')
  const hotelIds = ownedHotels.map((hotel) => hotel._id)
  const userBookings = await Booking.find({ userId: user.id })
  const ownedHotelIds = new Set(hotelIds.map(String))
  await Promise.all(userBookings
    .filter((booking) => booking.status !== 'cancelled' && !ownedHotelIds.has(booking.hotelId.toString()))
    .map((booking) => {
      const dates = []
      for (let day = new Date(booking.checkIn); day < booking.checkOut; day.setUTCDate(day.getUTCDate() + 1)) {
        dates.push(new Date(day))
      }
      return Room.updateOne(
        { _id: booking.roomId, 'roomNumbers.number': booking.roomNumber },
        { $pull: { 'roomNumbers.$.unavailableDates': { $in: dates } } },
      )
    }))

  const reviewsByUser = await Review.find({ userId: user.id, hotelId: { $nin: hotelIds } }).select('hotelId')
  const affectedHotelIds = [...new Set(reviewsByUser.map((review) => review.hotelId.toString()))]
  await Promise.all([
    Booking.deleteMany({ $or: [{ userId: user.id }, { hotelId: { $in: hotelIds } }] }),
    Review.deleteMany({ $or: [{ userId: user.id }, { hotelId: { $in: hotelIds } }] }),
    Room.deleteMany({ hotelId: { $in: hotelIds } }),
    Hotel.deleteMany({ _id: { $in: hotelIds } }),
  ])
  await Promise.all(affectedHotelIds.map(async (hotelId) => {
    const [result] = await Review.aggregate([
      { $match: { hotelId: new mongoose.Types.ObjectId(hotelId) } },
      { $group: { _id: '$hotelId', rating: { $avg: '$rating' } } },
    ])
    await Hotel.updateOne({ _id: hotelId }, { rating: result ? Math.round(result.rating * 10) / 10 : 0 })
  }))
  await user.deleteOne()
  if (isSelf) res.clearCookie('token', { ...cookieOptions(), maxAge: undefined })
  return res.json({ message: 'User deleted.' })
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
}
