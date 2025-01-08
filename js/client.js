// Initialize Socket.IO connection
const socket = io('http://localhost:8000');

// DOM Elements
const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp');
const messageContainer = document.querySelector('.container');
const audio = new Audio('ting.mp3'); // Notification sound

// Function to append messages to the chat container
const appendMessage = (message, position) => {
    const messageElement = document.createElement('div');
    messageElement.innerText = message;
    messageElement.classList.add('message', position); // Add both 'message' and position classes
    messageContainer.append(messageElement);

    // Scroll to the bottom of the chat container
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Play notification sound for incoming messages
    if (position === 'left') {
        audio.play();
    }
};

// Handle form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();

    if (message) {
        appendMessage(`You: ${message}`, 'right'); // Display user's message
        socket.emit('send', message); // Send message to the server
        messageInput.value = ''; // Clear input field
    }
});

// Prompt user for their name
const userName = prompt('Enter your name to join:');
if (userName) {
    socket.emit('new-user-joined', userName); // Notify server of new user
} else {
    alert('Name is required to join the chat.'); // Handle empty name input
}

// Socket.IO Event Listeners

// When a new user joins
socket.on('user-joined', (name) => {
    appendMessage(`${name} joined the chat`, 'right');
});

// When a message is received
socket.on('receive', (data) => {
    appendMessage(`${data.name}: ${data.message}`, 'left');
});

// When a user leaves
socket.on('left', (name) => {
    appendMessage(`${name} left the chat`, 'left');
});

// Handle connection errors
socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    appendMessage('Unable to connect to the chat server. Please try again later.', 'error');
});

// Handle disconnection
socket.on('disconnect', () => {
    appendMessage('You have been disconnected from the chat.', 'error');
});