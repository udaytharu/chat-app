const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();

// Server configuration
const server = http.createServer(app);
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

// Get the root directory (one level up from nodeServer)
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

console.log('🔍 Current directory (__dirname):', __dirname);
console.log('🔍 Root directory:', rootDir);
console.log('🔍 Public directory:', publicDir);

// Check if public directory exists
if (fs.existsSync(publicDir)) {
    console.log('✅ Public directory found');
    console.log('📄 Files in public:', fs.readdirSync(publicDir));
} else {
    console.log('❌ Public directory NOT found at:', publicDir);
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://udaytharu813_db_user:C3gkHEbI9SwOus7R@clusterchat.p0wyapu.mongodb.net/chat-app?retryWrites=true&w=majority';

// Connect to MongoDB
const connectToDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 10000,
        });
        console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
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
            by: { type: String, required: true },
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
    'https://chat-app-fog9.onrender.com/',
    'https://chat-app-fog9.onrender.com/',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8000'
];

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('CORS blocked:', origin);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-2024';

// Trust proxy
app.set('trust proxy', 1);

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

// Serve static files from the public directory (one level up)
app.use(express.static(publicDir, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Root route
app.get('/', (req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(`
            <h1>❌ index.html not found</h1>
            <p>Looking for: ${indexPath}</p>
            <p>Public directory: ${publicDir}</p>
            <p>Files in public: ${fs.existsSync(publicDir) ? fs.readdirSync(publicDir).join(', ') : 'Directory not found'}</p>
            <p>API is working: <a href="/api/test">/api/test</a></p>
        `);
    }
});

// Authentication Routes
app.post('/api/register', async (req, res) => {
    try {
        console.log('Registration attempt from:', req.headers.origin);

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                error: 'Database connection not available. Please try again later.' 
            });
        }

        const { name, email, password, confirmPassword } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();
        console.log('User registered successfully:', email);

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
        
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        console.log('Login attempt from:', req.headers.origin);

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                error: 'Database connection not available. Please try again later.' 
            });
        }

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

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
        status: 'ok',
        database: dbStates[dbStatus],
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        paths: {
            rootDir: rootDir,
            publicDir: publicDir,
            publicExists: fs.existsSync(publicDir),
            indexHtmlExists: fs.existsSync(path.join(publicDir, 'index.html'))
        }
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working!',
        serverTime: new Date().toISOString(),
        origin: req.headers.origin || 'No origin header'
    });
});

// Socket.IO setup
const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowUpgrades: true,
    cookie: false
});

const users = {};
const authenticatedUsers = new Map();

io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    socket.on('authenticate-and-join', async (token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const { userId, name, email } = decoded;
            
            console.log(`Authenticated user joined: ${name} (${email})`);
            
            const existingSocketId = Array.from(authenticatedUsers.entries())
                .find(([_, userInfo]) => userInfo.userId === userId)?.[0];
            
            if (existingSocketId && existingSocketId !== socket.id) {
                const existingSocket = io.sockets.sockets.get(existingSocketId);
                if (existingSocket) {
                    existingSocket.emit('authentication-error', 'Another session started with this account');
                    existingSocket.disconnect(true);
                }
                delete users[existingSocketId];
                authenticatedUsers.delete(existingSocketId);
            }
            
            users[socket.id] = name;
            authenticatedUsers.set(socket.id, { userId, name, email });
            
            socket.broadcast.emit('user-joined', name);
            socket.emit('active-users', Object.values(users));
            socket.emit('authentication-success', { name, email, userId });
            
            try {
                const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
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

    socket.on('send', async (payload) => {
        if (!payload || !payload.message) {
            socket.emit('error', 'Message cannot be empty.');
            return;
        }
        
        const senderName = users[socket.id];
        const authInfo = authenticatedUsers.get(socket.id);
        
        if (!senderName || !authInfo) {
            socket.emit('error', 'You are not authenticated.');
            return;
        }
        
        const { message, messageId } = payload;
        
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
            
            const broadcastMessage = {
                message: message.trim(),
                name: senderName,
                userId: authInfo.userId,
                timestamp: new Date().toISOString(),
                messageId: finalMessageId
            };
            
            socket.broadcast.emit('receive', broadcastMessage);
            socket.emit('message-sent', broadcastMessage);
            
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('error', 'Failed to save message. Please try again.');
        }
    });

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

            const alreadyReacted = (msg.reactions || []).some(r => r.by === authInfo.userId && r.emoji === reaction);
            if (alreadyReacted) {
                return;
            }

            msg.reactions.push({ 
                emoji: reaction, 
                by: authInfo.userId,
                at: new Date()
            });
            await msg.save();
            
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
            
            io.emit('message-deleted', { 
                messageId,
                deletedBy: authInfo.name 
            });
        } catch (error) {
            console.error('Error deleting message:', error);
            socket.emit('error', 'Failed to delete message.');
        }
    });

    socket.on('get-active-users', () => {
        socket.emit('active-users', Object.values(users));
    });

    socket.on('disconnect', (reason) => {
        const userName = users[socket.id];
        const userInfo = authenticatedUsers.get(socket.id);
        
        console.log(`User disconnected: ${userName || 'Unknown'} (${socket.id}), reason: ${reason}`);
        
        if (userName) {
            delete users[socket.id];
            authenticatedUsers.delete(socket.id);
            
            socket.broadcast.emit('left', userName);
            io.emit('active-users', Object.values(users));
        }
    });
});

// Start server
server.listen(PORT, HOST, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Serving static files from: ${publicDir}`);
    console.log(`📊 Health check: /api/health`);
    console.log(`🔗 Test endpoint: /api/test`);
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

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});