import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


dotenv.config()
import authRoutes from "./routes/auth.js"
import reportRoutes from "./routes/reports.js"

const app = express()

app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"], credentials: true }))
app.use(express.json())

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/reports", reportRoutes)

app.get("/", (req, res) => {
  res.json({ message: "Medical AI server is Running" })
})

app.get("/health", (req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" })
})

const port = process.env.PORT || 5000
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/medical-ai"
process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-secret"

mongoose.connect(mongoUri)
  .then(() => {
    console.log("Connected to MongoDB")
  })
  .catch((err) => {
    console.log("MongoDB connection failed, continuing without database:", err.message)
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`)
    })
  })