const express = require('express')
const auth = require('../controllers/authController')
const { verifyToken, verifyUser, verifyAdmin } = require('../middleware/verifyToken')
const HttpError = require('../utils/HttpError')

const router = express.Router()
router.use(verifyToken, verifyUser)

router.get('/', verifyAdmin, auth.listUsers)
router.get('/:id', (req, _res, next) => {
  if (req.user.role === 'admin' || req.user.id === req.params.id) return next()
  return next(new HttpError(403, 'You can only view your own account.'))
}, auth.getUser)
router.patch('/:id', auth.updateUser)
router.delete('/:id', auth.deleteUser)

module.exports = router
