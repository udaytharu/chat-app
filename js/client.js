// Initialize Socket.IO connection
const socket = io('http://localhost:8000');

// Authentication variables
let currentUser = null;
let authToken = null;

// DOM Elements
const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp');
const messageContainer = document.querySelector('.container');
const audio = new Audio('ting.mp3'); // Notification sound
const sendButton = document.querySelector('.btn');

// Authentication DOM Elements
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const authError = document.getElementById('authError');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');

// Password toggle elements
const loginPasswordToggle = document.getElementById('loginPasswordToggle');
const registerPasswordToggle = document.getElementById('registerPasswordToggle');
const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
const loginPasswordInput = document.getElementById('loginPassword');
const registerPasswordInput = document.getElementById('registerPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

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

// Function to format time from Date object
const formatTimeFromDate = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Function to append messages to the chat container
const appendMessage = (message, position, timestamp = null) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', position);

    // Create message content container
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.innerText = message;

    // Create message info container for timestamp
    const messageInfo = document.createElement('div');
    messageInfo.classList.add('message-info');
    
    const timestampElement = document.createElement('span');
    timestampElement.classList.add('message-timestamp');
    timestampElement.innerText = timestamp ? formatTimeFromDate(timestamp) : formatTime();
    
    messageInfo.appendChild(timestampElement);
    
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
            if (currentUser) {
                appendMessage(`${currentUser.name}: ${message}`, 'right'); // Display user's message
                socket.emit('send', message); // Send message to the server
                messageInput.value = ''; // Clear input field
                sendButton.classList.remove('sending');
            }
        }, 300);
    }
});

// Authentication Functions
const showError = (message) => {
    authError.textContent = message;
    authError.classList.add('show');
    setTimeout(() => {
        authError.classList.remove('show');
    }, 5000);
};

const showSuccess = (message) => {
    authError.textContent = message;
    authError.style.background = 'rgba(76, 175, 80, 0.1)';
    authError.style.color = '#4caf50';
    authError.style.borderColor = 'rgba(76, 175, 80, 0.2)';
    authError.classList.add('show');
    setTimeout(() => {
        authError.classList.remove('show');
        authError.style.background = '';
        authError.style.color = '';
        authError.style.borderColor = '';
    }, 3000);
};

const resetPasswordVisibility = () => {
    // Reset all password inputs to hidden
    loginPasswordInput.type = 'password';
    registerPasswordInput.type = 'password';
    confirmPasswordInput.type = 'password';
    
    // Reset all toggle buttons to eye icon
    loginPasswordToggle.querySelector('i').className = 'fas fa-eye';
    registerPasswordToggle.querySelector('i').className = 'fas fa-eye';
    confirmPasswordToggle.querySelector('i').className = 'fas fa-eye';
    
    // Remove active class from all toggles
    loginPasswordToggle.classList.remove('active');
    registerPasswordToggle.classList.remove('active');
    confirmPasswordToggle.classList.remove('active');
};

const switchToRegister = () => {
    resetPasswordVisibility();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    authTitle.textContent = 'Create Account';
    authSubtitle.textContent = 'Join the chat community';
};

const switchToLogin = () => {
    resetPasswordVisibility();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    authTitle.textContent = 'Welcome Back';
    authSubtitle.textContent = 'Login to continue chatting';
};

const hideAuthModal = () => {
    authModal.classList.add('hidden');
    // Show chat interface
    document.querySelector('.container').style.display = 'block';
    document.querySelector('#send-container').style.display = 'flex';
};

const authenticateUser = async (token) => {
    authToken = token;
    localStorage.setItem('authToken', token);
    socket.emit('authenticate-and-join', token);
};

// Password Toggle Functions
const togglePasswordVisibility = (input, toggleButton) => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    
    const icon = toggleButton.querySelector('i');
    if (isPassword) {
        icon.className = 'fas fa-eye-slash';
        toggleButton.classList.add('active');
    } else {
        icon.className = 'fas fa-eye';
        toggleButton.classList.remove('active');
    }
};

// Password Toggle Event Listeners
loginPasswordToggle.addEventListener('click', () => {
    togglePasswordVisibility(loginPasswordInput, loginPasswordToggle);
});

registerPasswordToggle.addEventListener('click', () => {
    togglePasswordVisibility(registerPasswordInput, registerPasswordToggle);
});

confirmPasswordToggle.addEventListener('click', () => {
    togglePasswordVisibility(confirmPasswordInput, confirmPasswordToggle);
});

// Keyboard support for password toggles (Enter and Space keys)
const handleToggleKeyPress = (event, input, toggleButton) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        togglePasswordVisibility(input, toggleButton);
    }
};

loginPasswordToggle.addEventListener('keydown', (e) => {
    handleToggleKeyPress(e, loginPasswordInput, loginPasswordToggle);
});

registerPasswordToggle.addEventListener('keydown', (e) => {
    handleToggleKeyPress(e, registerPasswordInput, registerPasswordToggle);
});

confirmPasswordToggle.addEventListener('keydown', (e) => {
    handleToggleKeyPress(e, confirmPasswordInput, confirmPasswordToggle);
});

// Authentication Event Listeners
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchToRegister();
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchToLogin();
});

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showSuccess('Login successful!');
            setTimeout(() => {
                hideAuthModal();
                authenticateUser(data.token);
            }, 1000);
        } else {
            if (response.status === 503) {
                showError('Database connection not available. Please try again later.');
            } else {
                showError(data.error || 'Login failed');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    }
});

// Register Form Handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password, confirmPassword }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showSuccess('Registration successful!');
            setTimeout(() => {
                hideAuthModal();
                authenticateUser(data.token);
            }, 1000);
        } else {
            if (response.status === 503) {
                showError('Database connection not available. Please try again later.');
            } else {
                showError(data.error || 'Registration failed');
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Network error. Please try again.');
    }
});

// Check for existing authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
        // Verify token with server
        fetch('/api/verify', {
            headers: {
                'Authorization': `Bearer ${savedToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                authToken = savedToken;
                hideAuthModal();
                authenticateUser(savedToken);
            } else {
                localStorage.removeItem('authToken');
            }
        })
        .catch(() => {
            localStorage.removeItem('authToken');
        });
    }
});

// Socket.IO Event Listeners

// Socket.IO Event Listeners
socket.on('authentication-success', (userData) => {
    console.log('Authentication successful:', userData);
});

socket.on('authentication-error', (error) => {
    console.error('Authentication error:', error);
    showError('Authentication failed. Please login again.');
    localStorage.removeItem('authToken');
    authModal.classList.remove('hidden');
});

// When chat history is loaded
socket.on('chat-history', (messages) => {
    // Clear existing messages
    messageContainer.innerHTML = '';
    
    // Display historical messages
    messages.forEach(msg => {
        const isOwnMessage = currentUser && msg.name === currentUser.name;
        appendMessage(`${msg.name}: ${msg.message}`, isOwnMessage ? 'right' : 'left', msg.timestamp);
    });
});

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