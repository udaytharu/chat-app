const express = require('express');
const path = require('path');
const app = express();

// Serve static files (HTML, CSS, JS, audio) from the parent directory
app.use(express.static(path.join(__dirname, '..')));

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

// Event: When a new client connects
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Event: When a new user joins the chat
    socket.on('new-user-joined', (name) => {
        if (!name) {
            socket.emit('error', 'Name is required to join the chat.');
            return;
        }
        console.log(`New user joined: ${name}`);
        users[socket.id] = name;
        socket.broadcast.emit('user-joined', name);
        socket.emit('active-users', Object.values(users));
    });

    // Event: When a user sends a message
    socket.on('send', (message) => {
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
        socket.broadcast.emit('receive', {
            message,
            name: senderName,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    // Event: When a user disconnects
    socket.on('disconnect', () => {
        const userName = users[socket.id];
        if (userName) {
            console.log(`${userName} left the chat`);
            delete users[socket.id];
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