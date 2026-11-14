import express from 'express'
import Booking from '../models/Booking.js'
import requireAuth from '../middleware/requireAuth.js'

const router = express.Router()

// Every booking route requires a valid sign-in token.
router.use(requireAuth)

// Return only bookings belonging to the signed-in user.
router.get('/', async (request, response) => {
  try {
    const bookings = await Booking.find({
      userId: request.userId,
    })
      .sort({ createdAt: -1 })
      .lean()

    return response.status(200).json({
      count: bookings.length,
      bookings,
    })
  } catch (error) {
    console.error('Failed to load bookings:', error.message)

    return response.status(500).json({
      status: 'error',
      message: 'Could not load appointment requests.',
    })
  }
})

// Save the new booking under the signed-in user's account.
router.post('/', async (request, response) => {
  const { service, shop, date, time, vehicle } = request.body ?? {}

  if (
    ![service, shop, date, time, vehicle].every(
      (value) => typeof value === 'string' && value.trim(),
    )
  ) {
    return response.status(400).json({
      status: 'error',
      message: 'Service, shop, date, time, and vehicle are required.',
    })
  }

  try {
    const booking = await Booking.create({
      userId: request.userId,
      service,
      shop,
      date,
      time,
      vehicle,
    })

    return response.status(201).json({
      message: 'Appointment request saved.',
      booking,
    })
  } catch (error) {
    if (error.name === 'ValidationError') {
      return response.status(400).json({
        status: 'error',
        message: 'The appointment details are not valid.',
      })
    }

    console.error('Failed to save booking:', error.message)

    return response.status(500).json({
      status: 'error',
      message: 'Could not save the appointment request.',
    })
  }
})

// Update a booking only if it belongs to the signed-in user.
router.patch('/:id', async (request, response) => {
  const { date, time, status } = request.body ?? {}
  const updates = {}

  if (status !== undefined) {
    if (status !== 'Cancelled') {
      return response.status(400).json({
        status: 'error',
        message: 'The only supported status update is cancellation.',
      })
    }

    updates.status = 'Cancelled'
  }

  if (date !== undefined || time !== undefined) {
    const validDate =
      typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    const validTime =
      typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)

    if (!validDate || !validTime) {
      return response.status(400).json({
        status: 'error',
        message: 'A valid date and time are both required to reschedule.',
      })
    }

    updates.date = date
    updates.time = time
  }

  if (Object.keys(updates).length === 0) {
    return response.status(400).json({
      status: 'error',
      message: 'Provide a cancellation or new appointment date and time.',
    })
  }

  try {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: request.params.id,
        userId: request.userId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      },
    )

    if (!booking) {
      return response.status(404).json({
        status: 'error',
        message: 'Booking not found.',
      })
    }

    return response.status(200).json({
      message: 'Booking updated.',
      booking,
    })
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return response.status(400).json({
        status: 'error',
        message: 'The booking ID or update details are not valid.',
      })
    }

    console.error('Failed to update booking:', error.message)

    return response.status(500).json({
      status: 'error',
      message: 'Could not update the booking.',
    })
  }
})

export default router