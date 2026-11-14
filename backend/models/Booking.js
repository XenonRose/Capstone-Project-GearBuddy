import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    service: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    shop: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    time: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    vehicle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  },
)

const Booking =
  mongoose.models.Booking || mongoose.model('Booking', bookingSchema)

export default Booking