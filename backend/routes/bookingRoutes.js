const express = require('express')
const bookings = require('../controllers/bookingController')
const { verifyToken, verifyUser, verifyAdmin } = require('../middleware/verifyToken')

const router = express.Router()
router.use(verifyToken, verifyUser)

router.get('/', verifyAdmin, bookings.listBookings)
router.get('/mine', bookings.listBookings)
router.get('/owner', bookings.listBookings)
router.get('/:id', bookings.getBooking)
router.post('/', bookings.createBooking)
router.patch('/:id', bookings.updateBooking)
router.delete('/:id', bookings.deleteBooking)

module.exports = router
