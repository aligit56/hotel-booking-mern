const express = require('express')
const rooms = require('../controllers/roomController')
const { verifyToken, verifyOwner } = require('../middleware/verifyToken')

const router = express.Router()

router.get('/', rooms.listRooms)
router.get('/:id', rooms.getRoom)
router.post('/', verifyToken, verifyOwner, rooms.createRoom)
router.patch('/:id', verifyToken, verifyOwner, rooms.updateRoom)
router.delete('/:id', verifyToken, verifyOwner, rooms.deleteRoom)

module.exports = router
