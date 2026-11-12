const express = require('express')
const auth = require('../controllers/authController')
const { verifyToken, verifyUser, verifyAdmin } = require('../middleware/verifyToken')

const router = express.Router()

router.post('/register', auth.register)
router.post('/login', auth.login)
router.post('/logout', auth.logout)
router.get('/me', verifyToken, verifyUser, auth.getMe)

module.exports = router
