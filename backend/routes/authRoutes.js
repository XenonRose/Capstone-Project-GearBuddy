import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = express.Router()

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function createToken(userId) {
  return jwt.sign(
    { sub: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  )
}

function formatUser(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
  }
}

router.post('/signup', async (request, response) => {
  const fullName =
    typeof request.body?.fullName === 'string'
      ? request.body.fullName.trim()
      : ''
  const email =
    typeof request.body?.email === 'string'
      ? request.body.email.trim().toLowerCase()
      : ''
  const password =
    typeof request.body?.password === 'string'
      ? request.body.password
      : ''

  if (!process.env.JWT_SECRET) {
    return response.status(500).json({
      status: 'error',
      message: 'Account sign-in is not configured on the server.',
    })
  }

  if (!fullName || fullName.length > 100) {
    return response.status(400).json({
      status: 'error',
      message: 'Enter a name with no more than 100 characters.',
    })
  }

  if (!emailPattern.test(email) || email.length > 254) {
    return response.status(400).json({
      status: 'error',
      message: 'Enter a valid email address.',
    })
  }

  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({
      status: 'error',
      message: 'Password must be at least 8 characters and no more than 72 bytes.',
    })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({
      fullName,
      email,
      passwordHash,
    })
    const token = createToken(user._id)

    return response.status(201).json({
      message: 'Account created successfully.',
      token,
      user: formatUser(user),
    })
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({
        status: 'error',
        message: 'An account with that email already exists.',
      })
    }

    if (error.name === 'ValidationError') {
      return response.status(400).json({
        status: 'error',
        message: 'The account details are not valid.',
      })
    }

    console.error('Failed to create account:', error.message)

    return response.status(500).json({
      status: 'error',
      message: 'Could not create the account.',
    })
  }
})

router.post('/signin', async (request, response) => {
  const email =
    typeof request.body?.email === 'string'
      ? request.body.email.trim().toLowerCase()
      : ''
  const password =
    typeof request.body?.password === 'string'
      ? request.body.password
      : ''

  if (!process.env.JWT_SECRET) {
    return response.status(500).json({
      status: 'error',
      message: 'Account sign-in is not configured on the server.',
    })
  }

  if (!email || !password) {
    return response.status(400).json({
      status: 'error',
      message: 'Enter your email address and password.',
    })
  }

  try {
    const user = await User.findOne({ email }).select('+passwordHash')

    if (!user) {
      return response.status(401).json({
        status: 'error',
        message: 'Email or password is incorrect.',
      })
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash,
    )

    if (!passwordMatches) {
      return response.status(401).json({
        status: 'error',
        message: 'Email or password is incorrect.',
      })
    }

    const token = createToken(user._id)

    return response.status(200).json({
      message: 'Signed in successfully.',
      token,
      user: formatUser(user),
    })
  } catch (error) {
    console.error('Failed to sign in:', error.message)

    return response.status(500).json({
      status: 'error',
      message: 'Could not sign in.',
    })
  }
})

export default router