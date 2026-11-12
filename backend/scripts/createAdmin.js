require('dotenv').config()

const mongoose = require('mongoose')
const User = require('../models/User')

async function createAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 8 characters in backend/.env.')
  }

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel_booking_db')
  const email = ADMIN_EMAIL.trim().toLowerCase()
  if (await User.exists({ email })) throw new Error(`An account already exists for ${email}.`)

  const admin = await User.create({ name: ADMIN_NAME, email, password: ADMIN_PASSWORD, role: 'admin' })
  console.log(`Administrator account created: ${admin.email}`)
}

createAdmin()
  .catch((error) => {
    console.error('Unable to create the administrator:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
  })
