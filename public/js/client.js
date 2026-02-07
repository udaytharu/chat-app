// Global variables
let currentUser = null;
let authToken = null;
let pollingInterval = null;
let lastMessageId = null;
let isPolling = false;

// DOM Elements
const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp');
const messageContainer = document.getElementById('chatContainer');
const sendButton = document.getElementById('sendButton');
const connectionStatus = document.getElementById('connectionStatus');
const statusDot = connectionStatus.querySelector('.status-dot');
const statusText = connectionStatus.querySelector('.status-text');

// Authentication elements
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

// Theme toggle elements
const themeSwitch = document.getElementById('checkbox');
const lightLabel = document.getElementById('lightLabel');
const darkLabel = document.getElementById('darkLabel');

// Sound for notifications
const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3');

// Format time functions
const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatTimeFromDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Update connection status
const updateConnectionStatus = (status, message) => {
    statusDot.className = 'status-dot';
    statusDot.classList.add(status);
    statusText.textContent = message;
};

// Append message to chat
const appendMessage = (data, isOwn = false, isSystem = false) => {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOwn ? 'right' : 'left'} ${isSystem ? 'system' : ''}`;
    messageElement.setAttribute('data-message-id', data.messageId || data._id);
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = isSystem ? data.message : `@${data.name}: ${data.message}`;
    
    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';
    
    const timestamp = document.createElement('span');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = formatTimeFromDate(data.timestamp);
    
    messageInfo.appendChild(timestamp);
    
    if (isOwn && !isSystem) {
        const messageActions = document.createElement('div');
        messageActions.className = 'message-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'message-action-btn edit-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Edit message';
        editBtn.addEventListener('click', () => editMessage(data.messageId));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'message-action-btn delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete message';
        deleteBtn.addEventListener('click', () => deleteMessage(data.messageId));
        
        messageActions.appendChild(editBtn);
        messageActions.appendChild(deleteBtn);
        messageElement.appendChild(messageActions);
    }
    
    messageElement.appendChild(messageContent);
    messageElement.appendChild(messageInfo);
    
    messageContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messageContainer.scrollTop = messageContainer.scrollHeight;
    
    // Play notification for incoming messages
    if (!isOwn && !isSystem) {
        audio.play().catch(e => console.log('Audio play failed:', e));
    }
};

// Authentication functions
const showError = (message) => {
    authError.textContent = message;
    authError.className = 'auth-error show';
    setTimeout(() => {
        authError.className = 'auth-error';
    }, 5000);
};

const showSuccess = (message) => {
    authError.textContent = message;
    authError.className = 'auth-error show success';
    setTimeout(() => {
        authError.className = 'auth-error';
    }, 3000);
};

const switchToRegister = () => {
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    authTitle.textContent = 'Create Account';
    authSubtitle.textContent = 'Join the chat community';
};

const switchToLogin = () => {
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    authTitle.textContent = 'Welcome Back';
    authSubtitle.textContent = 'Login to continue chatting';
};

const hideAuthModal = () => {
    authModal.classList.add('hidden');
    messageContainer.style.display = 'block';
    form.style.display = 'flex';
    startPolling();
};

// Password toggle functions
const togglePasswordVisibility = (input, toggleButton) => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    const icon = toggleButton.querySelector('i');
    icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    toggleButton.classList.toggle('active', isPassword);
};

// Message functions
const loadMessages = async () => {
    try {
        updateConnectionStatus('connecting', 'Loading messages...');
        const response = await fetch('/api/messages');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const messages = await response.json();
        
        if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            const latestMessageId = latestMessage.messageId || latestMessage._id;
            
            if (latestMessageId !== lastMessageId) {
                messageContainer.innerHTML = '';
                
                messages.forEach(msg => {
                    const isOwn = currentUser && msg.userId === currentUser.id;
                    const isSystem = msg.name === 'system';
                    appendMessage(msg, isOwn, isSystem);
                });
                
                lastMessageId = latestMessageId;
            }
        }
        
        updateConnectionStatus('connected', 'Connected');
    } catch (error) {
        console.error('Error loading messages:', error);
        updateConnectionStatus('disconnected', 'Connection error');
    }
};

const sendMessage = async (message) => {
    if (!currentUser || !authToken) {
        showError('Please login to send messages');
        return;
    }
    
    if (!message.trim()) {
        return;
    }
    
    try {
        const messageId = Date.now().toString();
        
        // Show message immediately
        appendMessage({
            messageId,
            userId: currentUser.id,
            name: currentUser.name,
            message: message,
            timestamp: new Date()
        }, true);
        
        // Send to server
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ 
                message, 
                messageId 
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send message');
        }
        
        messageInput.value = '';
        messageInput.focus();
        
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message: ' + error.message);
    }
};

const editMessage = async (messageId) => {
    const newText = prompt('Edit your message:', '');
    if (!newText || !newText.trim()) return;
    
    try {
        const response = await fetch(`/api/messages/${messageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ newText: newText.trim() })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }
        
        loadMessages(); // Reload messages
    } catch (error) {
        console.error('Error editing message:', error);
        showError('Failed to edit message: ' + error.message);
    }
};

const deleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
        const response = await fetch(`/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }
        
        loadMessages(); // Reload messages
    } catch (error) {
        console.error('Error deleting message:', error);
        showError('Failed to delete message: ' + error.message);
    }
};

// Polling functions
const startPolling = () => {
    if (isPolling) return;
    
    isPolling = true;
    loadMessages(); // Initial load
    
    // Poll every 2 seconds
    pollingInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadMessages();
        }
    }, 2000);
};

const stopPolling = () => {
    isPolling = false;
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
};

// Theme functions
const updateThemeLabels = (isDark) => {
    if (isDark) {
        lightLabel.classList.remove('active');
        darkLabel.classList.add('active');
    } else {
        lightLabel.classList.add('active');
        darkLabel.classList.remove('active');
    }
};

const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeLabels(newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
};

// Event Listeners
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
        sendMessage(message);
    }
});

// Password toggle event listeners
loginPasswordToggle.addEventListener('click', () => {
    togglePasswordVisibility(loginPasswordInput, loginPasswordToggle);
});

registerPasswordToggle.addEventListener('click', () => {
    togglePasswordVisibility(registerPasswordInput, registerPasswordToggle);
});

confirmPasswordToggle.addEventListener('click', () => {
    togglePasswordVisibility(confirmPasswordInput, confirmPasswordToggle);
});

// Authentication event listeners
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchToRegister();
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchToLogin();
});

// Login form handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            authToken = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showSuccess('Login successful!');
            setTimeout(() => hideAuthModal(), 1000);
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    }
});

// Register form handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = registerName.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const confirmPassword = confirmPassword.value;
    
    if (!name || !email || !password || !confirmPassword) {
        showError('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, confirmPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            authToken = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showSuccess('Registration successful!');
            setTimeout(() => hideAuthModal(), 1000);
        } else {
            showError(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Network error. Please try again.');
    }
});

// Theme toggle
themeSwitch.addEventListener('change', toggleTheme);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeSwitch.checked = savedTheme === 'dark';
    updateThemeLabels(savedTheme === 'dark');
    
    // Check for saved authentication
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
        // Verify token
        fetch('/api/verify', {
            headers: { 'Authorization': `Bearer ${savedToken}` }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Invalid token');
        })
        .then(data => {
            currentUser = data.user;
            authToken = savedToken;
            hideAuthModal();
        })
        .catch(() => {
            // Clear invalid tokens
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            authModal.classList.remove('hidden');
            messageContainer.style.display = 'none';
            form.style.display = 'none';
        });
    } else {
        authModal.classList.remove('hidden');
        messageContainer.style.display = 'none';
        form.style.display = 'none';
    }
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            updateConnectionStatus('disconnected', 'Tab hidden');
        } else if (currentUser && authToken) {
            updateConnectionStatus('connected', 'Connected');
            loadMessages();
        }
    });
    
    // Check server health on load
    fetch('/api/health')
        .then(response => response.json())
        .then(data => {
            console.log('Server health:', data);
        })
        .catch(error => {
            console.error('Health check failed:', error);
        });
});