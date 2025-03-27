// Create a configuration object
const config = {
    production: {
        serverUrl: 'https://your-render-app-url.com'
    },
    development: {
        serverUrl: 'http://localhost:8000'
    }
};

// Use the appropriate server URL
const isProduction = window.location.hostname !== 'localhost';
const serverUrl = isProduction 
    ? 'https://your-render-server-url.com' // You'll need to replace this with your actual server URL
    : 'http://localhost:8000';

// Initialize Socket.IO connection
const socket = io(serverUrl);

// DOM Elements
const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp');
const messageContainer = document.querySelector('.container');
const audio = new Audio('ting.mp3'); // Notification sound

// Theme switcher functionality
document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.querySelector('#checkbox');
    const currentTheme = localStorage.getItem('theme');

    // Check for saved theme preference
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (currentTheme === 'dark') {
            toggleSwitch.checked = true;
        }
    }

    // Function to switch theme
    function switchTheme(e) {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    }

    // Add event listener for theme switch
    toggleSwitch.addEventListener('change', switchTheme);
});

// Function to append messages to the chat container
const appendMessage = (message, position, messageId) => {
    const messageElement = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true // This will show time in 12-hour format with AM/PM
    });
    
    messageElement.innerHTML = `
        <div class="message-container">
            <div class="message-content">${message}</div>
            <div class="message-info">
                <span class="message-timestamp">${timestamp}</span>
            </div>
            <div class="message-hover-actions">
                <button class="hover-btn like-btn" title="Like">
                    <span class="like-icon">❤️</span>
                    <span class="like-count">0</span>
                </button>
                ${position === 'right' ? `
                    <button class="hover-btn unsend-btn" title="Unsend">
                        <span class="unsend-icon">🗑️</span>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    messageElement.classList.add('message', position);
    messageElement.dataset.messageId = messageId;
    messageContainer.append(messageElement);

    // Add event listeners
    const likeBtn = messageElement.querySelector('.like-btn');
    const unsendBtn = messageElement.querySelector('.unsend-btn');

    likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLike(messageId, likeBtn);
    });

    if (unsendBtn) {
        unsendBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            unsendMessage(messageId, messageElement);
        });
    }

    // Scroll to bottom
    messageContainer.scrollTop = messageContainer.scrollHeight;

    if (position === 'left') {
        audio.play();
    }
};

// Function to handle likes
const toggleLike = (messageId, likeBtn) => {
    const likeIcon = likeBtn.querySelector('.like-icon');
    const likeCount = likeBtn.querySelector('.like-count');
    const currentCount = parseInt(likeCount.textContent);
    
    if (likeBtn.classList.contains('liked')) {
        likeBtn.classList.remove('liked');
        likeIcon.textContent = '❤️';
        likeCount.textContent = currentCount - 1;
        socket.emit('unlike-message', messageId);
    } else {
        likeBtn.classList.add('liked');
        likeIcon.textContent = '❤️'; // Filled heart
        likeCount.textContent = currentCount + 1;
        socket.emit('like-message', messageId);
    }
};

// Function to handle unsend
const unsendMessage = (messageId, messageElement) => {
    if (confirm('Are you sure you want to unsend this message?')) {
        socket.emit('unsend-message', messageId);
        messageElement.remove();
    }
};

// Handle form submission with message ID
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();

    if (message) {
        const messageId = Date.now().toString(); // Generate unique ID
        appendMessage(`You: ${message}`, 'right', messageId);
        socket.emit('send', { message, messageId });
        messageInput.value = '';
    }
});

// Add socket listeners for likes and unsend
socket.on('message-liked', (data) => {
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        const likeBtn = messageElement.querySelector('.like-btn');
        const likeCount = likeBtn.querySelector('.like-count');
        likeCount.textContent = data.likes;
    }
});

socket.on('message-unliked', (data) => {
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        const likeBtn = messageElement.querySelector('.like-btn');
        const likeCount = likeBtn.querySelector('.like-count');
        likeCount.textContent = data.likes;
    }
});

socket.on('message-unsent', (messageId) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.remove();
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
    appendMessage(`${data.name}: ${data.message}`, 'left', data.messageId);
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

// this is for fun when someone copy text from web page then it will paste this emoji
document.addEventListener('copy', function(e) {
    e.clipboardData.setData('text/plain', '🖕'); // write what you want to paste, when someone copy text from web page
    e.preventDefault();
});