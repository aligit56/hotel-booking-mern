require('dotenv').config()

const mongoose = require('mongoose')
const User = require('../models/User')
const Hotel = require('../models/Hotel')
const Room = require('../models/Room')

const demoStays = [
  {
    key: 'islamabad-margalla',
    name: 'Islamabad Serena Hotel',
    type: 'Luxury hotel',
    city: 'Islamabad',
    address: 'Khayaban-e-Suhrawardy, G-5/1, Islamabad',
    distance: 4,
    title: 'A landmark stay beside the Margalla foothills',
    desc: 'A city hotel in central Islamabad.',
    photos: [],
    featured: true,
    roomTitle: 'Deluxe king room',
    roomPrice: 86000,
    roomDesc: 'King room for up to two guests.',
    maxPeople: 2,
    roomNumbers: [101, 102, 103],
  },
  {
    key: 'lahore-gulberg',
    name: 'Pearl Continental Hotel Lahore',
    type: 'Luxury hotel',
    city: 'Lahore',
    address: 'Shahrah-e-Quaid-e-Azam, Lahore, Punjab',
    distance: 2,
    title: 'A central Lahore stay near the city’s historic heart',
    desc: 'A hotel near Lahore’s historic center.',
    photos: [],
    featured: true,
    roomTitle: 'Deluxe room',
    roomPrice: 52000,
    roomDesc: 'Double room for up to two guests.',
    maxPeople: 2,
    roomNumbers: [201, 202, 203],
  },
  {
    key: 'karachi-clifton',
    name: 'Mövenpick Hotel Karachi',
    type: 'Luxury hotel',
    city: 'Karachi',
    address: 'Club Road, Karachi, Sindh',
    distance: 3,
    title: 'An upscale city stay in central Karachi',
    desc: 'A hotel on Club Road in central Karachi.',
    photos: [],
    featured: true,
    roomTitle: 'Superior room',
    roomPrice: 65000,
    roomDesc: 'Room for up to three guests.',
    maxPeople: 3,
    roomNumbers: [301, 302, 303],
  },
  {
    key: 'murree-kashmir-point',
    name: 'Pearl Continental Hotel Bhurban',
    type: 'Mountain resort',
    city: 'Murree',
    address: 'Bhurban, Murree Hills, Punjab',
    distance: 1,
    title: 'A mountain resort above the Murree hills',
    desc: 'A mountain resort in the Murree hills.',
    photos: [],
    featured: true,
    roomTitle: 'Mountain-view room',
    roomPrice: 78000,
    roomDesc: 'Double room for up to two guests.',
    maxPeople: 2,
    roomNumbers: [11, 12, 13],
  },
  {
    key: 'hunza-karimabad',
    name: 'Hunza Serena Inn',
    type: 'Mountain inn',
    city: 'Hunza',
    address: 'Karimabad, Hunza, Gilgit-Baltistan',
    distance: 2,
    title: 'A valley-side stay in historic Karimabad',
    desc: 'An inn in Karimabad, Hunza.',
    photos: [],
    featured: true,
    roomTitle: 'Valley-view double',
    roomPrice: 48000,
    roomDesc: 'Double room for up to two guests.',
    maxPeople: 2,
    roomNumbers: [21, 22, 23],
  },
  {
    key: 'skardu-city',
    name: 'Shangrila Resort Skardu',
    type: 'Mountain resort',
    city: 'Skardu',
    address: 'Lower Kachura Lake, Skardu, Gilgit-Baltistan',
    distance: 3,
    title: 'A lakeside resort in the Skardu mountains',
    desc: 'A resort near Lower Kachura Lake in Skardu.',
    photos: [],
    featured: true,
    roomTitle: 'Lakeside room',
    roomPrice: 50000,
    roomDesc: 'Double room for up to two guests.',
    maxPeople: 2,
    roomNumbers: [31, 32, 33],
  },
  {
    key: 'islamabad-ramada',
    name: 'Ramada by Wyndham Islamabad',
    type: 'Hotel',
    city: 'Islamabad',
    address: 'Club Road, Islamabad Capital Territory',
    distance: 5,
    title: 'Contemporary comfort near Rawal Lake',
    desc: 'A hotel near Rawal Lake in Islamabad.',
    photos: [],
    featured: false,
    roomTitle: 'Deluxe room',
    roomPrice: 42000,
    roomDesc: 'Double room for up to two guests.',
    maxPeople: 2,
    roomNumbers: [401, 402, 403],
  },
  {
    key: 'lahore-avari',
    name: 'Avari Lahore',
    type: 'Luxury hotel',
    city: 'Lahore',
    address: '87 Shahrah-e-Quaid-e-Azam, Lahore, Punjab',
    distance: 2,
    title: 'A polished city stay along the Mall',
    desc: 'A hotel on Shahrah-e-Quaid-e-Azam in Lahore.',
    photos: [],
    featured: false,
    roomTitle: 'Executive room',
    roomPrice: 46000,
    roomDesc: 'Double room for up to two guests.',
    maxPeople: 2,
    roomNumbers: [501, 502, 503],
  },
  {
    key: 'karachi-avari-towers',
    name: 'Avari Towers Karachi',
    type: 'Luxury hotel',
    city: 'Karachi',
    address: 'Fatima Jinnah Road, Karachi, Sindh',
    distance: 2,
    title: 'A city-center base with skyline views',
    desc: 'A hotel on Fatima Jinnah Road in Karachi.',
    photos: [],
    featured: false,
    roomTitle: 'Deluxe city-view room',
    roomPrice: 52000,
    roomDesc: 'Double room for up to two guests.',
    maxPeople: 2,
    roomNumbers: [601, 602, 603],
  },
  {
    key: 'murree-lockwood',
    name: 'Lockwood Hotel Murree',
    type: 'Mountain hotel',
    city: 'Murree',
    address: 'Kashmir Point, Murree, Punjab',
    distance: 1,
    title: 'A classic hill-station base among the pines',
    desc: 'A hotel near Kashmir Point in Murree.',
    photos: [],
    featured: false,
    roomTitle: 'Pine-view double',
    roomPrice: 36000,
    roomDesc: 'Double room for up to two guests.',
    maxPeople: 2,
    roomNumbers: [41, 42, 43],
  },
  {
    key: 'hunza-luxus',
    name: 'Luxus Hunza Attabad Lake Resort',
    type: 'Lake resort',
    city: 'Hunza',
    address: 'Attabad Lake, Gojal, Hunza, Gilgit-Baltistan',
    distance: 25,
    title: 'A lakeside escape in the Hunza valley',
    desc: 'A resort near Attabad Lake in Hunza.',
    photos: [],
    featured: false,
    roomTitle: 'Lake-view room',
    roomPrice: 68000,
    roomDesc: 'Double room for up to two guests.',
    maxPeople: 2,
    roomNumbers: [51, 52, 53],
  },
  {
    key: 'skardu-shigar-fort',
    name: 'Serena Shigar Fort',
    type: 'Heritage hotel',
    city: 'Skardu',
    address: 'Shigar Valley, Gilgit-Baltistan',
    distance: 32,
    title: 'A heritage stay in a restored mountain fort',
    desc: 'A heritage stay in Shigar Valley.',
    photos: [],
    featured: false,
    roomTitle: 'Heritage double room',
    roomPrice: 85000,
    roomDesc: 'Double room for up to two guests.',
    maxPeople: 2,
    roomNumbers: [61, 62, 63],
  },
]

async function findDemoOwner() {
  const demoOwnerName = process.env.DEMO_OWNER_NAME?.trim()
  const demoOwnerEmail = process.env.DEMO_OWNER_EMAIL?.trim().toLowerCase()
  const demoOwnerPassword = process.env.DEMO_OWNER_PASSWORD
  if (demoOwnerName || demoOwnerEmail || demoOwnerPassword) {
    if (!demoOwnerName || !demoOwnerEmail || !demoOwnerPassword || demoOwnerPassword.length < 8) {
      throw new Error('Set DEMO_OWNER_NAME, DEMO_OWNER_EMAIL, and DEMO_OWNER_PASSWORD (at least 8 characters) together.')
    }

    const existingOwner = await User.findOne({ email: demoOwnerEmail }).select('_id role')
    if (existingOwner) {
      if (existingOwner.role !== 'owner' && existingOwner.role !== 'admin') {
        throw new Error('DEMO_OWNER_EMAIL belongs to an account that is not a property owner.')
      }
      return existingOwner
    }
    return User.create({
      name: demoOwnerName,
      email: demoOwnerEmail,
      password: demoOwnerPassword,
      role: 'owner',
    })
  }

  const configuredEmail = process.env.DEMO_DATA_OWNER_EMAIL?.trim().toLowerCase()
  if (configuredEmail) {
    const owner = await User.findOne({
      email: configuredEmail,
      role: { $in: ['owner', 'admin'] },
    }).select('_id')
    if (!owner) throw new Error('DEMO_DATA_OWNER_EMAIL must match an existing owner or administrator.')
    return owner
  }

  const eligibleOwners = await User.find({ role: { $in: ['owner', 'admin'] } }).select('_id').limit(2)
  if (eligibleOwners.length !== 1) {
    throw new Error(
      'Create one property-owner or administrator account first, or set DEMO_DATA_OWNER_EMAIL to select an existing one.',
    )
  }
  return eligibleOwners[0]
}

async function seedDemoData(ownerId) {
  const admin = await User.findById(ownerId).select('_id role')
  if (!admin || !['owner', 'admin'].includes(admin.role)) {
    throw new Error('Demo properties must belong to an existing owner or administrator account.')
  }

  let createdHotels = 0
  let createdRooms = 0

  for (const stay of demoStays) {
    const hotel = {
      ownerId: admin._id,
      demoKey: stay.key,
      isDemo: true,
      name: stay.name,
      type: stay.type,
      city: stay.city,
      address: stay.address,
      distance: stay.distance,
      title: stay.title,
      desc: stay.desc,
      rating: 0,
      featured: stay.featured,
    }

    const hotelResult = await Hotel.updateOne(
      { demoKey: stay.key },
      { $set: hotel },
      { upsert: true, runValidators: true },
    )
    createdHotels += hotelResult.upsertedCount

    const savedHotel = await Hotel.findOne({ demoKey: stay.key }).select('_id')
    if (!savedHotel) throw new Error(`Could not load seeded property: ${stay.key}`)

    const roomResult = await Room.updateOne(
      { demoKey: `${stay.key}-room` },
      {
        $set: {
          hotelId: savedHotel._id,
          title: stay.roomTitle,
          price: stay.roomPrice,
          maxPeople: stay.maxPeople,
          desc: stay.roomDesc,
        },
        $setOnInsert: {
          demoKey: `${stay.key}-room`,
          roomNumbers: stay.roomNumbers.map((number) => ({ number })),
        },
      },
      { upsert: true, runValidators: true },
    )
    createdRooms += roomResult.upsertedCount
  }

  return { createdHotels, createdRooms, total: demoStays.length }
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotel_booking_db')
  const owner = await findDemoOwner()
  const result = await seedDemoData(owner._id)
  console.log(
    `Property inventory ready: ${result.createdHotels} new properties and ${result.createdRooms} new room types (${result.total} total listings).`,
  )
  console.log('Seeded rates are illustrative PKR values; destination images are licensed and attributed, and owners can upload authorized property photos.')
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Unable to seed demo properties:', error.message)
      process.exitCode = 1
    })
    .finally(async () => {
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
    })
}

module.exports = { demoStays, findDemoOwner, seedDemoData }
