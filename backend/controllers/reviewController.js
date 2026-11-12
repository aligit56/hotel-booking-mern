const mongoose = require('mongoose')
const Review = require('../models/Review')
const Hotel = require('../models/Hotel')
const Booking = require('../models/Booking')
const HttpError = require('../utils/HttpError')

function validId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid record ID.')
}

async function updateHotelRating(hotelId) {
  const [result] = await Review.aggregate([
    { $match: { hotelId: new mongoose.Types.ObjectId(hotelId) } },
    { $group: { _id: '$hotelId', rating: { $avg: '$rating' } } },
  ])
  await Hotel.updateOne({ _id: hotelId }, { rating: result ? Math.round(result.rating * 10) / 10 : 0 })
}

async function listReviews(req, res) {
  validId(req.params.hotelId)
  const reviews = await Review.find({ hotelId: req.params.hotelId })
    .populate('userId', 'name')
    .sort({ createdAt: -1 })
  return res.json({ reviews })
}

async function listLatestReviews(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 4, 1), 12)
  const reviews = await Review.find()
    .populate('userId', 'name')
    .populate('hotelId', 'name city photos')
    .sort({ createdAt: -1 })
    .limit(limit)
  return res.json({ reviews })
}

async function getReview(req, res) {
  validId(req.params.id)
  const review = await Review.findById(req.params.id).populate('userId', 'name')
  if (!review) throw new HttpError(404, 'Review not found.')
  return res.json({ review })
}

async function createReview(req, res) {
  const { hotelId, rating, comment } = req.body || {}
  validId(hotelId)
  if (!await Hotel.exists({ _id: hotelId })) throw new HttpError(404, 'Hotel not found.')
  const stayed = await Booking.exists({
    userId: req.user.id,
    hotelId,
    status: 'completed',
  })
  if (!stayed) throw new HttpError(403, 'A completed stay is required before reviewing this hotel.')
  const review = await Review.create({ userId: req.user.id, hotelId, rating, comment })
  await updateHotelRating(hotelId)
  return res.status(201).json({ review })
}

async function updateReview(req, res) {
  validId(req.params.id)
  const review = await Review.findById(req.params.id)
  if (!review) throw new HttpError(404, 'Review not found.')
  if (req.user.role !== 'admin' && review.userId.toString() !== req.user.id) {
    throw new HttpError(403, 'You can only update your own review.')
  }
  const body = req.body || {}
  for (const key of ['rating', 'comment']) {
    if (body[key] !== undefined) review[key] = body[key]
  }
  await review.save()
  await updateHotelRating(review.hotelId)
  return res.json({ review })
}

async function deleteReview(req, res) {
  validId(req.params.id)
  const review = await Review.findById(req.params.id)
  if (!review) throw new HttpError(404, 'Review not found.')
  if (req.user.role !== 'admin' && review.userId.toString() !== req.user.id) {
    throw new HttpError(403, 'You can only delete your own review.')
  }
  await review.deleteOne()
  await updateHotelRating(review.hotelId)
  return res.json({ message: 'Review deleted.' })
}

module.exports = { listReviews, listLatestReviews, getReview, createReview, updateReview, deleteReview }
