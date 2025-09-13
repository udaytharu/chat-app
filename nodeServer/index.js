const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://udaytharu813_db_user:C3gkHEbI9SwOus7R@clusterchat.p0wyapu.mongodb.net/';

mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('✅ Connected to MongoDB successfully');
})
.catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check if your IP address is whitelisted in MongoDB Atlas');
    console.log('2. Verify your connection string is correct');
    console.log('3. Make sure your cluster is running');
    console.log('4. Check your network connection');
});

// Message Schema
const messageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Secret (in production, use environment variable)
const JWT_SECRET = 'your-secret-key-change-in-production';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Serve static files (HTML, CSS, JS, audio) from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// Authentication Routes
// Register
app.post('/api/register', async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
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
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
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
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

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
        timestamp: new Date().toISOString()
    });
});

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Start the server
const server = app.listen(process.env.PORT || 8000, () => {
    console.log('Server is running on port', process.env.PORT || 8000);
});

// Attach Socket.IO to the server
const io = require('socket.io')(server, {
    cors: { origin: '*' }
});

const users = {}; // Store active users
const authenticatedUsers = new Map(); // Store authenticated users with their socket IDs

// Event: When a new client connects
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Event: When a user authenticates and joins the chat
    socket.on('authenticate-and-join', async (token) => {
        try {
            // Verify JWT token
            const decoded = jwt.verify(token, JWT_SECRET);
            const { userId, name, email } = decoded;
            
            console.log(`Authenticated user joined: ${name} (${email})`);
            
            // Store user information
            users[socket.id] = name;
            authenticatedUsers.set(socket.id, { userId, name, email });
            
            socket.broadcast.emit('user-joined', name);
            socket.emit('active-users', Object.values(users));
            socket.emit('authentication-success', { name, email });
            
            // Load chat history for the authenticated user
            try {
                const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
                socket.emit('chat-history', messages);
            } catch (error) {
                console.error('Error loading chat history:', error);
            }
            
        } catch (error) {
            console.error('Authentication error:', error);
            socket.emit('authentication-error', 'Invalid or expired token');
        }
    });

    // Event: When a user sends a message
    socket.on('send', async (message) => {
        if (!message) {
            socket.emit('error', 'Message cannot be empty.');
            return;
        }
        const senderName = users[socket.id];
        if (!senderName) {
            socket.emit('error', 'You are not registered in the chat.');
            return;
        }
        
        console.log(`Message from ${senderName}: ${message}`);
        
        // Save message to MongoDB
        try {
            const newMessage = new Message({
                name: senderName,
                message: message,
                timestamp: new Date()
            });
            await newMessage.save();
            console.log('Message saved to database');
        } catch (error) {
            console.error('Error saving message:', error);
        }
        
        // Broadcast message to all other clients
        socket.broadcast.emit('receive', {
            message,
            name: senderName,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    // Event: When a user disconnects
    socket.on('disconnect', () => {
        const userName = users[socket.id];
        const userInfo = authenticatedUsers.get(socket.id);
        
        if (userName) {
            console.log(`${userName} left the chat`);
            delete users[socket.id];
            authenticatedUsers.delete(socket.id);
            socket.broadcast.emit('left', userName);
            io.emit('active-users', Object.values(users));
        }
    });

    // Event: Handle errors
    socket.on('error', (error) => {
        console.error(`Socket error: ${error}`);
        socket.emit('error', 'An error occurred. Please try again.');
    });
});