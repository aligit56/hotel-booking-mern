function errorHandler(error, _req, res, _next) {
  let status = error.status || 500
  let message = status >= 500 ? 'An unexpected server error occurred.' : error.message

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    status = 400
    message = error.message
  } else if (error.code === 11000) {
    status = 409
    message = 'A record with that value already exists.'
  }

  if (status >= 500) console.error(error)
  return res.status(status).json({ message })
}

module.exports = errorHandler
