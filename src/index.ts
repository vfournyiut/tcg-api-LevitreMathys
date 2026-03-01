import 'dotenv/config'

import * as http from "node:http"

import cors from 'cors'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

import { authRouter } from './auth/auth.route'
import { cardRouter } from './cards/card.route'
import { deckRouter } from './decks/deck.route'
import { env } from './env'

// Create Express app
export const app = express()
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    }
})

// Middlewares
app.use(
  cors({
    origin: true, // Autorise toutes les origines
    credentials: true,
  }),
)

app.use(express.json())

// Serve static files (Socket.io test client)
app.use(express.static('public'))

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'TCG Backend Server is running' })
})

app.use('/api/auth', authRouter)
app.use('/api', cardRouter)
app.use('/api/decks', deckRouter)

io.use((socket, next) => {
    const token = socket.handshake.auth.token

    if (!token) {
        return next(new Error('Authentication error: No token provided'))
    }

    try {
        next()
    } catch (err) {
        return next(new Error('Authentication error: Invalid token : ' + err))
    }
})

io.on('connection', (socket) => {
    console.log(`Un client s'est connecté: ${socket.id}`)

    socket.on('disconnect', () => {
        console.log(`Un client s'est déconnecté: ${socket.id}`)
    })
})

// Start server only if this file is run directly (not imported for tests)
if (require.main === module) {

  // Start server
  try {
    server.listen(env.PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`)
      console.log(
        `🧪 Socket.io Test Client available at http://localhost:${env.PORT}`,
      )
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}
