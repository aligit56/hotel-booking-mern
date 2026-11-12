const express = require('express')
const hotels = require('../controllers/hotelController')
const { verifyToken, verifyOwner } = require('../middleware/verifyToken')

const router = express.Router()

router.get('/', hotels.listHotels)
router.get('/owner', verifyToken, verifyOwner, hotels.listOwnerHotels)
router.get('/:id', hotels.getHotel)
router.post('/', verifyToken, verifyOwner, hotels.createHotel)
router.patch('/:id', verifyToken, verifyOwner, hotels.updateHotel)
router.post('/:id/photos', verifyToken, verifyOwner, express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: '5mb',
}), hotels.uploadHotelPhoto)
router.delete('/:id/photos', verifyToken, verifyOwner, hotels.deleteHotelPhoto)
router.delete('/:id', verifyToken, verifyOwner, hotels.deleteHotel)

module.exports = router
