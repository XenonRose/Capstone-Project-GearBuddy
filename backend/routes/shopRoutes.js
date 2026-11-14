import express from 'express'
import Shop from '../models/Shop.js'

const router = express.Router()

router.get('/', async (request, response) => {
  try {
    const shops = await Shop.find().sort({ name: 1 }).lean()

    response.status(200).json({
      count: shops.length,
      shops,
    })
  } catch (error) {
    console.error('Failed to load shops:', error.message)

    response.status(500).json({
      status: 'error',
      message: 'Could not load shops.',
    })
  }
})

export default router