const jwt = require('jsonwebtoken')
const User = require('../models/User')
const HttpError = require('../utils/HttpError')

async function verifyToken(req, _res, next) {
  const authorization = req.headers.authorization
  const token = req.cookies?.token
    || (authorization?.startsWith('Bearer ') ? authorization.slice(7) : null)

  if (!token) return next(new HttpError(401, 'Authentication is required.'))

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.id).select('_id role')
    if (!user) return next(new HttpError(401, 'The account for this session no longer exists.'))

    req.user = { id: user.id, role: user.role }
    return next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next(new HttpError(401, 'Your session is invalid or has expired.'))
    }
    return next(error)
  }
}

function verifyUser(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Authentication is required.'))
  return next()
}

function verifyOwner(req, _res, next) {
  if (!req.user || !['owner', 'admin'].includes(req.user.role)) {
    return next(new HttpError(403, 'Owner access is required.'))
  }
  return next()
}

function verifyAdmin(req, _res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new HttpError(403, 'Administrator access is required.'))
  }
  return next()
}

module.exports = { verifyToken, verifyUser, verifyOwner, verifyAdmin }
