// Initialize Socket.IO connection
const socket = io('http://localhost:8000');

// DOM Elements
const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp');
const messageContainer = document.querySelector('.container');
const audio = new Audio('ting.mp3'); // Notification sound
const sendButton = document.querySelector('.btn');

// Add typing indicator to heading
const heading = document.querySelector('h1');
const typingIndicator = document.createElement('div');
typingIndicator.className = 'typing-indicator';
for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    typingIndicator.appendChild(dot);
}
heading.appendChild(typingIndicator);

// Add chat bubble emoji to heading
const chatBubble = document.createElement('span');
chatBubble.textContent = '💬';
chatBubble.style.marginRight = '10px';
heading.insertBefore(chatBubble, heading.firstChild);

// Add ripple effect to button
sendButton.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    this.appendChild(ripple);

    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    ripple.addEventListener('animationend', () => {
        ripple.remove();
    });
});

// Function to format time
const formatTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Function to append messages to the chat container
const appendMessage = (message, position) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', position);

    // Create message content container
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.innerText = message;

    // Create message info container for timestamp
    const messageInfo = document.createElement('div');
    messageInfo.classList.add('message-info');
    
    const timestamp = document.createElement('span');
    timestamp.classList.add('message-timestamp');
    timestamp.innerText = formatTime();
    
    messageInfo.appendChild(timestamp);
    
    // Append content and info to message element
    messageElement.appendChild(messageContent);
    messageElement.appendChild(messageInfo);
    
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
        // Trigger paper plane animation
        const sendButton = document.querySelector('.btn');
        sendButton.classList.add('sending');
        
        // Add a small delay to show the animation
        setTimeout(() => {
            appendMessage(`You: ${message}`, 'right'); // Display user's message
            socket.emit('send', message); // Send message to the server
            messageInput.value = ''; // Clear input field
            sendButton.classList.remove('sending');
        }, 300);
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


document.addEventListener('DOMContentLoaded', () => {
    const themeSwitch = document.getElementById('checkbox');
    
    // Function to toggle theme
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Save theme preference to localStorage
        localStorage.setItem('theme', newTheme);
    };
    
    // Event listener for theme switch
    themeSwitch.addEventListener('change', toggleTheme);
    
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeSwitch.checked = savedTheme === 'dark';
    } else {
        // Default to light theme if no preference is saved
        document.documentElement.setAttribute('data-theme', 'light');
    }
});