import express from "express"
import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../models/User.js"

const router = express.Router()
const memoryUsers = []

const isMongoAvailable = () => mongoose.connection.readyState === 1 && Boolean(mongoose.connection.db)

const isMongoUnavailableError = (error) => {
  if (!error) return false
  const message = error.message || ""
  return (
    error.name === "MongooseError" || error.name === "MongoServerSelectionError" || error.name === "MongoNetworkError"
  ) && /buffering timed out|ECONNREFUSED|topology|server selection|connection/i.test(message)
}

const createUserRecord = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10)
  return {
    _id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: userData.name,
    email: userData.email,
    password: hashedPassword,
    phone: userData.phone || "",
    createdAt: new Date()
  }
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    if (isMongoAvailable()) {
      try {
        const existingUser = await User.findOne({ email })
        if (existingUser) {
          return res.status(400).json({ message: 'User already exists' })
        }

        const user = new User({ name, email, password, phone })
        await user.save()

        const token = jwt.sign(
          { userId: user._id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        )

        return res.status(201).json({
          message: 'Signup successful',
          token,
          user: { id: user._id, name: user.name, email: user.email, phone: user.phone }
        })
      } catch (error) {
        if (!isMongoUnavailableError(error)) {
          throw error
        }
        console.warn('MongoDB unavailable during signup, falling back to memory store:', error.message)
      }
    }

    const existingMemoryUser = memoryUsers.find((user) => user.email === email)
    if (existingMemoryUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const user = await createUserRecord({ name, email, password, phone })
    memoryUsers.push(user)

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone }
    })

  } catch (error) {
    console.error('Error during signup:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    if (isMongoAvailable()) {
      try {
        const user = await User.findOne({ email })
        if (!user) {
          return res.status(400).json({ message: 'Invalid email or password' })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid email or password' })
        }

        const token = jwt.sign(
          { userId: user._id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        )

        return res.status(200).json({
          message: 'Login successful',
          token,
          user: { id: user._id, name: user.name, email: user.email, phone: user.phone }
        })
      } catch (error) {
        if (!isMongoUnavailableError(error)) {
          throw error
        }
        console.warn('MongoDB unavailable during login, falling back to memory store:', error.message)
      }
    }

    const user = memoryUsers.find((item) => item.email === email)
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' })
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone }
    })

  } catch (error) {
    console.error('Error during login:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router