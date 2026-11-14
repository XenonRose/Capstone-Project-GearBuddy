import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import aiRoutes from './routes/aiRoutes.js'
import authRoutes from './routes/authRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js'
import osmShopRoutes from './routes/osmShopRoutes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000
const frontendOrigin =
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
const mongoUri = process.env.MONGODB_URI

app.use(
  cors({
    origin: frontendOrigin,
  }),
)

app.use(express.json())

app.get('/api/health', (request, response) => {
  response.status(200).json({
    status: 'ok',
    message: 'GearBuddy backend is running.',
    database:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

app.use('/api/ai', aiRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/shops', osmShopRoutes)
app.use('/api/bookings', bookingRoutes)

app.use((request, response) => {
  response.status(404).json({
    status: 'error',
    message: 'The requested API route was not found.',
  })
})

async function startServer() {
  if (!mongoUri) {
    console.error('MONGODB_URI is missing from the backend .env file.')
    process.exit(1)
  }

  try {
    await mongoose.connect(mongoUri)
    console.log('MongoDB connected successfully.')

    app.listen(port, () => {
      console.log(`GearBuddy backend is running at http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Could not connect to MongoDB.')
    console.error(error.message)
    process.exit(1)
  }
}

startServer()