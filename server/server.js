const WebSocket = require('ws')
const mysql = require('mysql2/promise')
const readline = require('readline')
require('dotenv').config()

const wss = new WebSocket.Server({ port: process.env.SERVER_PORT || 8000 })

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

// Create messages table if it doesn't exist
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection()
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_created_at (created_at)
            )
        `)
        connection.release()
        console.log('Database table initialized successfully')
    } catch (error) {
        console.error('Error initializing database:', error)
        process.exit(1)
    }
}

// Save message to database
async function saveMessage(sender, message) {
    try {
        const connection = await pool.getConnection()
        await connection.execute(
            'INSERT INTO messages (sender, message, created_at) VALUES (?, ?, NOW())',
            [sender, message]
        )
        connection.release()
        console.log(`Message saved: ${sender}: ${message}`)
    } catch (error) {
        console.error('Database error:', error)
    }
}

// Load messages from database
async function loadMessages() {
    try {
        const connection = await pool.getConnection()
        const [rows] = await connection.execute(
            'SELECT sender, message, created_at FROM messages ORDER BY created_at DESC LIMIT 50'
        )
        connection.release()
        return rows.reverse()
    } catch (error) {
        console.error('Database error:', error)
        return []
    }
}

wss.on('connection', async (ws) => {
    console.log(`New client connected, Total clients: ${wss.clients.size}`)
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'system',
        message: 'Hi client, welcome to this server'
    }))

    // Send previous messages to new client
    const previousMessages = await loadMessages()
    previousMessages.forEach(msg => {
        ws.send(JSON.stringify({
            type: 'history',
            sender: msg.sender,
            message: msg.message,
            timestamp: msg.created_at
        }))
    })

    ws.on('message', async (data) => {
        try {
            const msgData = JSON.parse(data)
            console.log(`Message from client: ${msgData.message}`)
            
            // Save to database
            await saveMessage('client', msgData.message)

            // Broadcast to all clients
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'message',
                        sender: 'client',
                        message: msgData.message,
                        timestamp: new Date()
                    }))
                }
            })
        } catch (error) {
            console.error('Error processing message:', error)
        }
    })

    ws.on('close', () => {
        console.log(`Client disconnected, Total clients: ${wss.clients.size}`)
    })
})

// Server console input for broadcasting
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

rl.on('line', async (input) => {
    if (input.trim()) {
        console.log(`Broadcasting: ${input}`)
        
        // Save server message to database
        await saveMessage('server', input)

        // Broadcast to all clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'message',
                    sender: 'server',
                    message: input,
                    timestamp: new Date()
                }))
            }
        })
    }
})

// Initialize database and start server testing again
async function startServer() {
    await initializeDatabase()
    console.log(`WebSocket server running on port ${process.env.SERVER_PORT || 8000}`)
}

startServer()