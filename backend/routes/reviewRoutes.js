const express = require('express')
const reviews = require('../controllers/reviewController')
const { verifyToken, verifyUser, verifyAdmin } = require('../middleware/verifyToken')

const router = express.Router()

router.get('/latest', reviews.listLatestReviews)
router.get('/hotel/:hotelId', reviews.listReviews)
router.get('/:id', reviews.getReview)
router.post('/', verifyToken, verifyUser, reviews.createReview)
router.patch('/:id', verifyToken, verifyUser, reviews.updateReview)
router.delete('/:id', verifyToken, verifyUser, reviews.deleteReview)

module.exports = router
