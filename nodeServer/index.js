const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Added CORS
const app = express();

// MongoDB connection - Use environment variable in production
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://udaytharu813_db_user:C3gkHEbI9SwOus7R@clusterchat.p0wyapu.mongodb.net/';

// Connect to MongoDB with better error handling
const connectToDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Check if your IP address is whitelisted in MongoDB Atlas');
        console.log('2. Verify your connection string is correct');
        console.log('3. Make sure your cluster is running');
        console.log('4. Check your network connection');
        
        // Try to reconnect after 5 seconds
        setTimeout(connectToDatabase, 5000);
    }
};

connectToDatabase();

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});

// Message Schema
const messageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    reactions: [
        {
            emoji: { type: String, required: true },
            by: { type: String, required: true }, // userId of reactor
            at: { type: Date, default: Date.now }
        }
    ],
    editedAt: {
        type: Date,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Message = mongoose.model('Message', messageSchema);

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

// CORS Configuration
const allowedOrigins = [
    'https://chat-app-black-psi-43.vercel.app',
    'http://localhost:3000',
    'http://localhost:8000',
    'http://127.0.0.1:5500' // For local HTML file testing
];

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
            console.warn('CORS blocked:', origin);
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Production optimizations
if (process.env.NODE_ENV === 'production') {
    console.log('🔒 Running in production mode');
    app.set('trust proxy', 1); // Trust first proxy
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err.message);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Serve static files (HTML, CSS, JS, audio) from the parent directory
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

// Authentication Routes
// Register
app.post('/api/register', async (req, res) => {
    try {
        console.log('Registration attempt from:', req.headers.origin);
        console.log('Registration body:', { ...req.body, password: '[HIDDEN]', confirmPassword: '[HIDDEN]' });

        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            console.error('Database not connected, state:', mongoose.connection.readyState);
            return res.status(503).json({ 
                error: 'Database connection not available. Please try again later.' 
            });
        }

        const { name, email, password, confirmPassword } = req.body;

        // Validation
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();
        console.log('User registered successfully:', email);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ error: errors.join(', ') });
        }
        
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        console.log('Login attempt from:', req.headers.origin);
        console.log('Login body:', { ...req.body, password: '[HIDDEN]' });

        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            console.error('Database not connected, state:', mongoose.connection.readyState);
            return res.status(503).json({ 
                error: 'Database connection not available. Please try again later.' 
            });
        }

        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            console.log('Login failed: User not found for email:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('Login failed: Invalid password for email:', email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Login successful for:', email);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Verify token
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    const dbStates = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    
    res.json({
        status: dbStatus === 1 ? 'healthy' : 'unhealthy',
        database: dbStates[dbStatus],
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime()
    });
});

// Additional test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working!',
        serverTime: new Date().toISOString(),
        origin: req.headers.origin || 'No origin header'
    });
});

// Serve index.html for the root route and all other routes for SPA
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        // Don't serve HTML for API routes
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`✅ CORS enabled for origins:`, allowedOrigins);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

// Attach Socket.IO to the server
const io = require('socket.io')(server, {
    cors: { 
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true, // Allow Engine.IO v3 clients
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

const users = {}; // Store active users
const authenticatedUsers = new Map(); // Store authenticated users with their socket IDs

// Event: When a new client connects
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id} from ${socket.handshake.headers.origin || 'unknown origin'}`);

    // Event: When a user authenticates and joins the chat
    socket.on('authenticate-and-join', async (token) => {
        try {
            console.log('Authentication attempt for socket:', socket.id);
            
            // Verify JWT token
            const decoded = jwt.verify(token, JWT_SECRET);
            const { userId, name, email } = decoded;
            
            console.log(`Authenticated user joined: ${name} (${email})`);
            
            // Check if user is already connected with a different socket
            const existingSocketId = Array.from(authenticatedUsers.entries())
                .find(([_, userInfo]) => userInfo.userId === userId)?.[0];
            
            if (existingSocketId && existingSocketId !== socket.id) {
                // Disconnect the previous socket for this user
                const existingSocket = io.sockets.sockets.get(existingSocketId);
                if (existingSocket) {
                    console.log(`Disconnecting previous session for user: ${name}`);
                    existingSocket.emit('authentication-error', 'Another session started with this account');
                    existingSocket.disconnect(true);
                }
                // Clean up the old session
                delete users[existingSocketId];
                authenticatedUsers.delete(existingSocketId);
            }
            
            // Store user information
            users[socket.id] = name;
            authenticatedUsers.set(socket.id, { userId, name, email });
            
            // Notify others
            socket.broadcast.emit('user-joined', name);
            
            // Send active users list to the new user
            socket.emit('active-users', Object.values(users));
            
            // Send authentication success
            socket.emit('authentication-success', { 
                name, 
                email,
                userId 
            });
            
            // Load chat history for the authenticated user
            try {
                const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
                // Ensure every message has a messageId in the payload
                const normalized = messages.map(m => ({
                    _id: m._id,
                    messageId: m.messageId || m._id.toString(),
                    userId: m.userId,
                    name: m.name,
                    message: m.message,
                    reactions: m.reactions || [],
                    editedAt: m.editedAt || null,
                    timestamp: m.timestamp
                }));
                socket.emit('chat-history', normalized);
            } catch (error) {
                console.error('Error loading chat history:', error);
            }
            
        } catch (error) {
            console.error('Authentication error:', error.message);
            socket.emit('authentication-error', 'Invalid or expired token. Please login again.');
        }
    });

    // Event: When a user sends a message
    socket.on('send', async (payload) => {
        // payload: { message, messageId }
        if (!payload || !payload.message) {
            socket.emit('error', 'Message cannot be empty.');
            return;
        }
        const senderName = users[socket.id];
        if (!senderName) {
            socket.emit('error', 'You are not registered in the chat.');
            return;
        }
        const authInfo = authenticatedUsers.get(socket.id);
        if (!authInfo) {
            socket.emit('error', 'Authentication required.');
            return;
        }
        
        const { message, messageId } = payload;
        console.log(`Message from ${senderName}: ${message}`);
        
        // Save message to MongoDB
        try {
            const generatedId = new mongoose.Types.ObjectId().toString();
            const finalMessageId = messageId || generatedId;
            const newMessage = new Message({
                messageId: finalMessageId,
                userId: authInfo.userId,
                name: senderName,
                message: message.trim(),
                timestamp: new Date()
            });
            await newMessage.save();
            console.log('Message saved to database with ID:', finalMessageId);
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('error', 'Failed to save message. Please try again.');
            return;
        }
        
        // Broadcast message to all other clients
        const broadcastMessage = {
            message: message.trim(),
            name: senderName,
            userId: authInfo.userId,
            timestamp: new Date().toISOString(),
            messageId: messageId || new mongoose.Types.ObjectId().toString()
        };
        
        socket.broadcast.emit('receive', broadcastMessage);
        socket.emit('message-sent', broadcastMessage); // Confirm to sender
    });

    // Event: Add reaction to a message (prevent duplicates from same user)
    socket.on('add-reaction', async ({ messageId, reaction }) => {
        try {
            const authInfo = authenticatedUsers.get(socket.id);
            if (!authInfo) {
                socket.emit('error', 'Authentication required.');
                return;
            }
            
            const msg = await Message.findOne({ messageId });
            if (!msg) {
                socket.emit('error', 'Message not found.');
                return;
            }

            // If the same user already added the same reaction, ignore
            const alreadyReacted = (msg.reactions || []).some(r => r.by === authInfo.userId && r.emoji === reaction);
            if (alreadyReacted) {
                console.log(`User ${authInfo.name} already reacted with ${reaction} to message ${messageId}`);
                return; // prevent duplicate flood
            }

            msg.reactions.push({ 
                emoji: reaction, 
                by: authInfo.userId,
                at: new Date()
            });
            await msg.save();
            
            console.log(`Reaction ${reaction} added to message ${messageId} by ${authInfo.name}`);
            
            io.emit('reaction-added', { 
                messageId, 
                reaction, 
                by: authInfo.userId,
                byName: authInfo.name,
                at: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error adding reaction:', error);
            socket.emit('error', 'Failed to add reaction.');
        }
    });

    // Event: Edit a message (only owner)
    socket.on('edit-message', async ({ messageId, newText }) => {
        try {
            const authInfo = authenticatedUsers.get(socket.id);
            if (!authInfo) {
                socket.emit('error', 'Authentication required.');
                return;
            }
            
            const msg = await Message.findOne({ messageId });
            if (!msg) {
                socket.emit('error', 'Message not found.');
                return;
            }
            
            if (msg.userId !== authInfo.userId) {
                socket.emit('error', 'You can only edit your own messages.');
                return;
            }
            
            if (!newText || newText.trim() === '') {
                socket.emit('error', 'Message cannot be empty.');
                return;
            }
            
            msg.message = newText.trim();
            msg.editedAt = new Date();
            await msg.save();
            
            console.log(`Message ${messageId} edited by ${authInfo.name}`);
            
            io.emit('message-edited', { 
                messageId, 
                newText: newText.trim(), 
                name: msg.name,
                userId: msg.userId,
                editedAt: msg.editedAt 
            });
        } catch (error) {
            console.error('Error editing message:', error);
            socket.emit('error', 'Failed to edit message.');
        }
    });

    // Event: Delete a message (only owner)
    socket.on('delete-message', async ({ messageId }) => {
        try {
            const authInfo = authenticatedUsers.get(socket.id);
            if (!authInfo) {
                socket.emit('error', 'Authentication required.');
                return;
            }
            
            const msg = await Message.findOne({ messageId });
            if (!msg) {
                socket.emit('error', 'Message not found.');
                return;
            }
            
            if (msg.userId !== authInfo.userId) {
                socket.emit('error', 'You can only delete your own messages.');
                return;
            }
            
            await Message.deleteOne({ messageId });
            
            console.log(`Message ${messageId} deleted by ${authInfo.name}`);
            
            io.emit('message-deleted', { 
                messageId,
                deletedBy: authInfo.name 
            });
        } catch (error) {
            console.error('Error deleting message:', error);
            socket.emit('error', 'Failed to delete message.');
        }
    });

    // Event: Get active users
    socket.on('get-active-users', () => {
        socket.emit('active-users', Object.values(users));
    });

    // Event: When a user disconnects
    socket.on('disconnect', (reason) => {
        const userName = users[socket.id];
        const userInfo = authenticatedUsers.get(socket.id);
        
        console.log(`User disconnected: ${userName || 'Unknown'} (${socket.id}), reason: ${reason}`);
        
        if (userName) {
            console.log(`${userName} left the chat`);
            delete users[socket.id];
            authenticatedUsers.delete(socket.id);
            
            socket.broadcast.emit('left', userName);
            io.emit('active-users', Object.values(users));
            console.log(`Active users count: ${Object.keys(users).length}`);
        }
    });

    // Event: Handle errors
    socket.on('error', (error) => {
        console.error(`Socket error from ${socket.id}: ${error}`);
        socket.emit('error', 'An error occurred. Please try again.');
    });
});
