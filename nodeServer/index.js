const PORT = process.env.PORT || 8000;
const io = require('socket.io')(PORT, {
    cors: {
        origin: "https://yourusername.github.io",
        methods: ["GET", "POST"]
    }
});

const users = {}; // Store active users
const messages = new Map(); // Store messages with their likes

// Event: When a new client connects
io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // Event: When a new user joins the chat
    socket.on('new-user-joined', (name) => {
        console.log('User joined:', name);
        if (!name) {
            socket.emit('error', 'Name is required to join the chat.');
            return;
        }

        users[socket.id] = name; // Store user with their socket ID

        // Broadcast to all clients except the sender
        socket.broadcast.emit('user-joined', name);

        // Send the list of active users to the new user
        socket.emit('active-users', Object.values(users));
    });

    // Event: When a user sends a message
    socket.on('send', (message) => {
        console.log('Message received:', message);
        if (!message) {
            socket.emit('error', 'Message cannot be empty.');
            return;
        }

        const senderName = users[socket.id];
        if (!senderName) {
            socket.emit('error', 'You are not registered in the chat.');
            return;
        }

        // Store message data
        messages.set(message.messageId, {
            message: message.message,
            sender: socket.id,
            likes: 0,
            likedBy: new Set()
        });

        socket.broadcast.emit('receive', {
            message: message.message,
            name: senderName,
            messageId: message.messageId,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    // Event: When a user disconnects
    socket.on('disconnect', () => {
        console.log('User disconnected:', users[socket.id]);
        const userName = users[socket.id];
        if (userName) {
            console.log(`${userName} left the chat`);
            delete users[socket.id]; // Remove user from the list

            // Broadcast to all clients that the user has left
            socket.broadcast.emit('left', userName);

            // Update the list of active users for all clients
            io.emit('active-users', Object.values(users));
        }
    });

    // Event: Handle errors
    socket.on('error', (error) => {
        console.error(`Socket error: ${error}`);
        socket.emit('error', 'An error occurred. Please try again.');
    });

    // Handle likes
    socket.on('like-message', (messageId) => {
        const message = messages.get(messageId);
        if (message && !message.likedBy.has(socket.id)) {
            message.likes++;
            message.likedBy.add(socket.id);
            io.emit('message-liked', { messageId, likes: message.likes });
        }
    });

    // Handle unlikes
    socket.on('unlike-message', (messageId) => {
        const message = messages.get(messageId);
        if (message && message.likedBy.has(socket.id)) {
            message.likes--;
            message.likedBy.delete(socket.id);
            io.emit('message-unliked', { messageId, likes: message.likes });
        }
    });

    // Handle unsend
    socket.on('unsend-message', (messageId) => {
        const message = messages.get(messageId);
        if (message && message.sender === socket.id) {
            messages.delete(messageId);
            io.emit('message-unsent', messageId);
        }
    });
});

// Log when the server starts
console.log('Server is running on port', PORT);







