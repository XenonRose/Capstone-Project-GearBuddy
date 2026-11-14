import mongoose from 'mongoose'

const shopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      default: 'CO',
      trim: true,
    },
    zip: {
      type: String,
      required: true,
      trim: true,
    },
    services: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    hours: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

const Shop = mongoose.model('Shop', shopSchema)

export default Shop