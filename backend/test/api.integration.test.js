process.env.JWT_SECRET ||= 'local-test-secret-at-least-32-characters-long'

const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const mongoose = require('mongoose')
const { app } = require('../server')
const User = require('../models/User')
const Hotel = require('../models/Hotel')
const Room = require('../models/Room')
const Booking = require('../models/Booking')
const Review = require('../models/Review')
const { seedDemoData } = require('../scripts/seedDemoData')

const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/hotel_booking_test'
const tag = `${Date.now()}-${Math.random().toString(16).slice(2)}`
const emails = {
  owner: `owner-${tag}@example.test`,
  guest: `guest-${tag}@example.test`,
  admin: `admin-${tag}@example.test`,
}

let server
let baseUrl
let hotelId

before(async () => {
  await mongoose.connect(mongoUri)
  await User.create({ name: 'Integration Admin', email: emails.admin, password: 'TemporaryPass123!', role: 'admin' })
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}/api`
})

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  const demoHotelIds = await Hotel.find({ demoKey: { $exists: true } }).distinct('_id')
  if (demoHotelIds.length) {
    await Promise.all([
      Booking.deleteMany({ hotelId: { $in: demoHotelIds } }),
      Review.deleteMany({ hotelId: { $in: demoHotelIds } }),
      Room.deleteMany({ hotelId: { $in: demoHotelIds } }),
      Hotel.deleteMany({ _id: { $in: demoHotelIds } }),
    ])
  }
  if (hotelId) {
    await Promise.all([
      Booking.deleteMany({ hotelId }),
      Review.deleteMany({ hotelId }),
      Room.deleteMany({ hotelId }),
      Hotel.deleteOne({ _id: hotelId }),
    ])
  }
  await User.deleteMany({ email: { $in: Object.values(emails) } })
  if (mongoose.connection.readyState) await mongoose.disconnect()
})

async function request(path, { method = 'GET', body } = {}, cookie) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (cookie) headers.Cookie = cookie
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { response, data: text ? JSON.parse(text) : null }
}

async function uploadRequest(path, body, contentType, cookie) {
  const headers = { 'Content-Type': contentType }
  if (cookie) headers.Cookie = cookie
  const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body })
  const text = await response.text()
  return { response, data: text ? JSON.parse(text) : null }
}

function getCookie(response) {
  const value = response.headers.getSetCookie?.()[0] || response.headers.get('set-cookie')
  assert.ok(value, 'Expected the API to set an authentication cookie.')
  return value.split(';')[0]
}

test('role-protected hotel booking lifecycle works end to end', async () => {
  let result = await request('/users')
  assert.equal(result.response.status, 401)

  result = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Integration Owner',
      email: emails.owner,
      password: 'TemporaryPass123!',
      role: 'owner',
    },
  })
  assert.equal(result.response.status, 201)
  const ownerId = result.data.user._id
  const ownerCookie = getCookie(result.response)

  result = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Integration Guest',
      email: emails.guest,
      password: 'TemporaryPass123!',
    },
  })
  assert.equal(result.response.status, 201)
  const guestCookie = getCookie(result.response)

  result = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Untrusted Admin',
      email: `bad-${tag}@example.test`,
      password: 'TemporaryPass123!',
      role: 'admin',
    },
  })
  assert.equal(result.response.status, 400)

  result = await request('/hotels', {
    method: 'POST',
    body: {
      name: 'Integration Hotel',
      type: 'Boutique hotel',
      city: 'Test City',
      address: '1 Test Street',
      title: 'A test stay',
      desc: 'A temporary integration property.',
      photos: ['https://example.test/not-an-owner-upload.jpg'],
      isDemo: true,
      demoKey: 'owner-supplied-demo-key',
    },
  }, ownerCookie)
  assert.equal(result.response.status, 201)
  assert.equal(result.data.hotel.isDemo, false, 'Public owners cannot create trusted demo inventory.')
  assert.equal(result.data.hotel.demoKey, undefined, 'Demo keys must not be returned or client-assigned.')
  assert.deepEqual(result.data.hotel.photos, [], 'Owners must add photos through the validated upload endpoint.')
  hotelId = result.data.hotel._id
  result = await request(`/hotels/${hotelId}/photos`)
  assert.equal(result.response.status, 404, 'The previous paid venue-photo lookup is not available.')

  const smallPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN6sAAAAASUVORK5CYII=', 'base64')
  result = await uploadRequest(`/hotels/${hotelId}/photos`, smallPng, 'image/png', guestCookie)
  assert.equal(result.response.status, 403, 'Guests cannot upload property photos.')
  result = await uploadRequest(`/hotels/${hotelId}/photos`, Buffer.from('not an image'), 'image/png', ownerCookie)
  assert.equal(result.response.status, 415, 'Image content must match its declared format.')
  result = await uploadRequest(`/hotels/${hotelId}/photos`, smallPng, 'image/png', ownerCookie)
  assert.equal(result.response.status, 201)
  const uploadedPhoto = result.data.photo
  assert.match(uploadedPhoto, /^\/uploads\/hotels\/[0-9a-f-]{36}\.png$/)
  const uploadedImage = await fetch(`${baseUrl.replace(/\/api$/, '')}${uploadedPhoto}`)
  assert.equal(uploadedImage.status, 200, 'Uploaded photos should be served from the local uploads directory.')
  assert.match(uploadedImage.headers.get('content-type'), /image\/png/)
  result = await request(`/hotels/${hotelId}/photos`, { method: 'DELETE', body: { photo: uploadedPhoto } }, ownerCookie)
  assert.equal(result.response.status, 200)
  assert.deepEqual(result.data.hotel.photos, [])

  result = await request('/rooms', {
    method: 'POST',
    body: {
      hotelId,
      title: 'Test suite',
      price: 125,
      maxPeople: 2,
      desc: 'Temporary room.',
      roomNumbers: [{ number: 101 }],
    },
  }, ownerCookie)
  assert.equal(result.response.status, 201)
  const roomId = result.data.room._id

  const checkIn = new Date(Date.now() + 10 * 86400000)
  checkIn.setUTCHours(0, 0, 0, 0)
  const checkOut = new Date(checkIn)
  checkOut.setUTCDate(checkOut.getUTCDate() + 2)
  const bookingBody = {
    hotelId,
    roomId,
    roomNumber: 101,
    guests: 2,
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
  }

  result = await request('/bookings', { method: 'POST', body: bookingBody }, guestCookie)
  assert.equal(result.response.status, 201)
  assert.equal(result.data.booking.totalPrice, 250)
  const firstBookingId = result.data.booking._id

  result = await request('/bookings', { method: 'POST', body: bookingBody }, guestCookie)
  assert.equal(result.response.status, 409, 'Overlapping dates must not be double-booked.')

  result = await request(`/bookings/${firstBookingId}`, {
    method: 'PATCH',
    body: { status: 'cancelled' },
  }, guestCookie)
  assert.equal(result.response.status, 200)

  result = await request('/bookings', { method: 'POST', body: bookingBody }, guestCookie)
  assert.equal(result.response.status, 201, 'Cancelling must release the booked dates.')
  const secondBookingId = result.data.booking._id

  result = await request(`/bookings/${secondBookingId}`, {
    method: 'PATCH',
    body: { status: 'completed' },
  }, ownerCookie)
  assert.equal(result.response.status, 200)

  result = await request('/reviews', {
    method: 'POST',
    body: { hotelId, rating: 5, comment: 'A great integration stay.' },
  }, guestCookie)
  assert.equal(result.response.status, 201)
  assert.equal((await Hotel.findById(hotelId)).rating, 5)
  result = await request('/reviews/latest?limit=3')
  assert.equal(result.response.status, 200)
  assert.ok(result.data.reviews.some((review) => review.hotelId?._id === hotelId))

  result = await request('/auth/login', {
    method: 'POST',
    body: { email: emails.admin, password: 'TemporaryPass123!' },
  })
  assert.equal(result.response.status, 200)
  const adminCookie = getCookie(result.response)
  result = await request('/hotels?limit=50', {}, adminCookie)
  assert.ok(result.data.hotels.some(
    (hotel) => hotel._id === hotelId && hotel.ownerId?.name === 'Integration Owner',
  ))
  const adminUser = await User.findOne({ email: emails.admin }).select('_id role')
  const seedResult = await seedDemoData(adminUser._id)
  assert.deepEqual(seedResult, { createdHotels: 12, createdRooms: 12, total: 12 })
  assert.deepEqual(await seedDemoData(adminUser._id), { createdHotels: 0, createdRooms: 0, total: 12 })
  const sampleHotel = await Hotel.findOne({ name: 'Islamabad Serena Hotel' })
  assert.ok(sampleHotel)
  await Hotel.updateOne({ _id: sampleHotel._id }, { $set: { photos: ['/uploads/hotels/seed-preserved.jpg'] } })
  assert.deepEqual(await seedDemoData(adminUser._id), { createdHotels: 0, createdRooms: 0, total: 12 })
  assert.deepEqual((await Hotel.findById(sampleHotel._id)).photos, ['/uploads/hotels/seed-preserved.jpg'], 'Reseeding must not erase owner-uploaded photos.')
  await Hotel.updateOne({ _id: sampleHotel._id }, { $set: { photos: [] } })
  await Hotel.updateOne({ _id: sampleHotel._id }, { $set: { name: 'Old placeholder name' } })
  await Room.updateOne({ hotelId: sampleHotel._id }, { $set: { price: 1 } })
  assert.deepEqual(await seedDemoData(adminUser._id), { createdHotels: 0, createdRooms: 0, total: 12 })
  assert.equal((await Hotel.findById(sampleHotel._id)).name, 'Islamabad Serena Hotel')
  assert.equal((await Room.findOne({ hotelId: sampleHotel._id })).price, 86000)
  const demoHotels = await Hotel.find({ isDemo: true })
  const demoRooms = await Room.find({ demoKey: { $exists: true } })
  assert.equal(demoHotels.length, 12)
  assert.equal(demoRooms.length, 12)
  for (const city of ['Islamabad', 'Lahore', 'Karachi', 'Murree', 'Hunza', 'Skardu']) {
    assert.equal(demoHotels.filter((hotel) => hotel.city === city).length, 2, `${city} should have two sample hotels.`)
  }
  assert.ok(demoHotels.some((hotel) => hotel.name === 'Islamabad Serena Hotel'))
  assert.ok(demoHotels.some((hotel) => hotel.name === 'Pearl Continental Hotel Lahore'))
  assert.ok(demoHotels.some((hotel) => hotel.name === 'Mövenpick Hotel Karachi'))
  assert.ok(demoHotels.every((hotel) => hotel.photos.length === 0), 'Seeded destination photos must not be stored as hotel-owner photos.')
  assert.ok(demoRooms.every((room) => room.price >= 10000))
  assert.equal((await User.findById(adminUser._id)).role, 'admin', 'Seeding must not change the admin role.')

  result = await request(`/users/${ownerId}`, { method: 'DELETE' }, adminCookie)
  assert.equal(result.response.status, 200)
  assert.equal(await Hotel.exists({ _id: hotelId }), null, 'Removing an owner must remove their property data.')
  hotelId = null
})
