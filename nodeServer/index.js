const io = require('socket.io')(8000, {
    cors: {
        origin: '*', // Allow connections from any origin (adjust for production) 
    },
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
        users[socket.id] = name; // Store user with their socket ID

        // Broadcast to all clients except the sender
        socket.broadcast.emit('user-joined', name);

        // Send the list of active users to the new user
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

        // Broadcast the message to all clients except the sender
    //     socket.broadcast.emit('receive', {
    //         message,
    //         name: senderName,
    //         timestamp: new Date().toLocaleTimeString(), // Add timestamp
    //     });
    // });

    // Event: When a user disconnects
    socket.on('disconnect', () => {
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
});

// Log when the server starts
console.log('Server is running on port 8000');







