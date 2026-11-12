require('dotenv').config()

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const path = require('node:path')
const errorHandler = require('./middleware/errorHandler')
const HttpError = require('./utils/HttpError')

const app = express()
const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.disable('x-powered-by')
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)
app.use(cors({
  origin(origin, callback) {
    if (!origin || clientOrigins.includes(origin)) return callback(null, true)
    return callback(new HttpError(403, 'This origin is not allowed by CORS.'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  dotfiles: 'deny',
  fallthrough: false,
  index: false,
  maxAge: '1d',
}))

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/hotels', require('./routes/hotelRoutes'))
app.use('/api/rooms', require('./routes/roomRoutes'))
app.use('/api/bookings', require('./routes/bookingRoutes'))
app.use('/api/reviews', require('./routes/reviewRoutes'))

app.use((req, _res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`)
  error.status = 404
  next(error)
})
app.use(errorHandler)

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a secret of at least 32 characters.')
  }
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel_booking_db')
  const port = Number(process.env.PORT) || 5000
  return app.listen(port, () => console.log(`Hotel booking API listening on port ${port}`))
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start the hotel booking API:', error)
    process.exitCode = 1
  })
}

module.exports = { app, start }
