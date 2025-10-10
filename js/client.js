// Initialize Socket.IO connection with automatic URL detection
// This works for both local development and Render deployment
const socket = io(window.location.origin, {
    transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    upgrade: true,
    rememberUpgrade: true
});

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
const appendMessage = (message, position, timestamp = null, messageId = null) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', position);
    if (messageId) {
        messageElement.setAttribute('data-message-id', messageId);
    }

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
    
    // Create message actions container
    const messageActions = document.createElement('div');
    messageActions.classList.add('message-actions');
    
    // Add action buttons
    const reactBtn = document.createElement('button');
    reactBtn.classList.add('message-action-btn', 'react-btn');
    const HEART_URL = 'https://cdn3.emoji.gg/emojis/minecraftheart.png';
    reactBtn.innerHTML = '<img src="'+HEART_URL+'" alt="heart" class="reaction-emoji-btn" />';
    reactBtn.addEventListener('click', () => toggleHeartReaction(messageElement, HEART_URL));
    
    const editBtn = document.createElement('button');
    editBtn.classList.add('message-action-btn', 'edit-btn');
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    editBtn.addEventListener('click', () => editMessage(messageElement));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('message-action-btn', 'delete-btn');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener('click', () => deleteMessage(messageElement));
    
    // Only show edit and delete for own messages
    if (position === 'right' && currentUser) {
        messageActions.appendChild(reactBtn);
        messageActions.appendChild(editBtn);
        messageActions.appendChild(deleteBtn);
    } else {
        messageActions.appendChild(reactBtn);
    }
    
    // Append content, info, and actions to message element
    messageElement.appendChild(messageContent);
    messageElement.appendChild(messageInfo);
    messageElement.appendChild(messageActions);
    
    messageContainer.append(messageElement);

    // Scroll to the bottom of the chat container
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Play notification sound for incoming messages
    if (position === 'left') {
        audio.play();
    }
};

// Message action functions
const showReactionMenu = (messageElement) => {
    const reactions = ['😀', '😂', '😍', '👍', '👎', '❤️', '🔥', '🎉'];
    
    // Remove existing reaction menu if any
    const existingMenu = document.querySelector('.reaction-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const reactionMenu = document.createElement('div');
    reactionMenu.classList.add('reaction-menu');
    reactionMenu.style.cssText = `
        position: absolute;
        top: -50px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 8px;
        display: flex;
        gap: 8px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.2);
        z-index: 1000;
        animation: fadeInUp 0.3s ease;
    `;
    
    reactions.forEach(reaction => {
        const reactionBtn = document.createElement('button');
        reactionBtn.textContent = reaction;
        reactionBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 1.5rem;
            padding: 8px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        reactionBtn.addEventListener('click', () => {
            // Simple per-message cooldown (500ms) to avoid rapid-fire emits
            const cooldownKey = `react-cooldown-${messageElement.getAttribute('data-message-id')}`;
            const now = Date.now();
            const last = parseInt(messageElement.getAttribute(cooldownKey) || '0', 10);
            if (now - last < 500) {
                return; // ignore rapid repeat clicks
            }
            messageElement.setAttribute(cooldownKey, String(now));
            addReaction(messageElement, reaction);
            reactionMenu.remove();
        });
        
        reactionBtn.addEventListener('mouseenter', () => {
            reactionBtn.style.transform = 'scale(1.2)';
            reactionBtn.style.background = 'rgba(0, 0, 0, 0.1)';
        });
        
        reactionBtn.addEventListener('mouseleave', () => {
            reactionBtn.style.transform = 'scale(1)';
            reactionBtn.style.background = 'none';
        });
        
        reactionMenu.appendChild(reactionBtn);
    });
    
    messageElement.style.position = 'relative';
    messageElement.appendChild(reactionMenu);
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!messageElement.contains(e.target)) {
                reactionMenu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
};

const addReaction = (messageElement, reaction, shouldEmit = true) => {
    // When initiated locally, only emit to server and let the single
    // server broadcast update the UI to avoid duplicate additions.
    if (shouldEmit) {
        const messageId = messageElement.getAttribute('data-message-id');
        if (messageId) {
            socket.emit('add-reaction', { messageId, reaction });
        }
        return;
    }

    const messageContent = messageElement.querySelector('.message-content');
    const existingReactions = messageElement.querySelector('.message-reactions');

    const createReactionNode = (value) => {
        const isUrl = typeof value === 'string' && /^https?:\/\//.test(value);
        if (isUrl) {
            const img = document.createElement('img');
            img.src = value;
            img.alt = 'reaction';
            img.className = 'reaction-emoji';
            return img;
        }
        const span = document.createElement('span');
        span.textContent = value;
        span.style.cssText = `
            display: inline-block;
            font-size: 1.2rem;
        `;
        return span;
    };

    if (existingReactions) {
        const node = createReactionNode(reaction);
        node.style.animation = 'reactionPop 0.3s ease';
        node.style.marginLeft = '8px';
        existingReactions.appendChild(node);
    } else {
        const reactionsContainer = document.createElement('div');
        reactionsContainer.classList.add('message-reactions');
        reactionsContainer.style.cssText = `
            margin-top: 8px;
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        `;

        const node = createReactionNode(reaction);
        node.style.animation = 'reactionPop 0.3s ease';
        reactionsContainer.appendChild(node);
        messageElement.appendChild(reactionsContainer);
    }
};

// Toggle heart reaction: if already reacted by current user, remove; else add
const toggleHeartReaction = (messageElement, heartUrl) => {
    const messageId = messageElement.getAttribute('data-message-id');
    const reactionsContainer = messageElement.querySelector('.message-reactions');
    // Identify a heart reaction node we can remove (first match is enough for local UX)
    let heartNode = null;
    if (reactionsContainer) {
        heartNode = Array.from(reactionsContainer.querySelectorAll('img.reaction-emoji'))
            .find(img => img.src === heartUrl);
    }

    if (heartNode) {
        // Remove locally and notify server via a generic 'remove-reaction' if available; else resend edit
        heartNode.remove();
        if (messageId) {
            // Best-effort unreact event; if server lacks it, this will be ignored
            socket.emit('remove-reaction', { messageId, reaction: heartUrl });
        }
        return;
    }

    // No heart present → add it
    addReaction(messageElement, heartUrl);
};

const editMessage = (messageElement) => {
    const messageContent = messageElement.querySelector('.message-content');
    const originalText = messageContent.textContent;
    
    // Create input field
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = originalText;
    editInput.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        border: 2px solid var(--color-blue-300);
        border-radius: 8px;
        background: var(--input-bg);
        color: var(--text-color);
        font-size: 1rem;
        outline: none;
    `;
    
    // Replace content with input
    messageContent.innerHTML = '';
    messageContent.appendChild(editInput);
    editInput.focus();
    editInput.select();
    
    const saveEdit = () => {
        const newText = editInput.value.trim();
        if (newText && newText !== originalText) {
            if (currentUser && currentUser.name) {
                messageContent.textContent = `@${currentUser.name}: ${newText}`;
            } else {
                messageContent.textContent = newText;
            }
            
            // Emit edit to server
            const messageId = messageElement.getAttribute('data-message-id');
            if (messageId) {
                socket.emit('edit-message', { messageId, newText });
            }
        } else {
            messageContent.textContent = originalText;
        }
    };
    
    const cancelEdit = () => {
        messageContent.textContent = originalText;
    };
    
    editInput.addEventListener('blur', saveEdit);
    editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
};

const deleteMessage = (messageElement) => {
    if (confirm('Are you sure you want to delete this message?')) {
        // Add deletion animation
        messageElement.style.animation = 'messageDelete 0.3s ease forwards';
        
        setTimeout(() => {
            messageElement.remove();
            
            // Emit deletion to server
            const messageId = messageElement.getAttribute('data-message-id');
            if (messageId) {
                socket.emit('delete-message', { messageId });
            }
        }, 300);
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
                const messageId = Date.now().toString(); // Simple ID generation
                appendMessage(`@${currentUser.name}: ${message}`, 'right', null, messageId); // Display user's message
                socket.emit('send', { message, messageId }); // Send message to the server
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
    // Always show auth modal first - remove auto-login
    // Clear any existing tokens to force fresh login
                localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    
    // Show auth modal
    authModal.classList.remove('hidden');
    document.querySelector('.container').style.display = 'none';
    document.querySelector('#send-container').style.display = 'none';
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
        const id = msg.messageId || msg._id;
        appendMessage(`@${msg.name}: ${msg.message}`, isOwnMessage ? 'right' : 'left', msg.timestamp, id);
    });
});

// When a new user joins
socket.on('user-joined', (name) => {
    appendMessage(`${name} joined the chat`, 'right');
});

// When a message is received
socket.on('receive', (data) => {
    appendMessage(`@${data.name}: ${data.message}`, 'left', data.timestamp, data.messageId);
});

// Handle message reactions
socket.on('reaction-added', (data) => {
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        // Apply reaction without emitting back to server to prevent loops
        addReaction(messageElement, data.reaction, false);
    }
});

// Handle message edits
socket.on('message-edited', (data) => {
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        const messageContent = messageElement.querySelector('.message-content');
        messageContent.textContent = `@${data.name}: ${data.newText}`;
    }
});

// Handle message deletions
socket.on('message-deleted', (data) => {
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        messageElement.style.animation = 'messageDelete 0.3s ease forwards';
        setTimeout(() => {
            messageElement.remove();
        }, 300);
    }
});

// When a user leaves
socket.on('left', (name) => {
    appendMessage(`${name} left the chat`, 'left');
});

// Handle connection errors
socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    updateConnectionStatus('disconnected', 'Connection Error');
    showError('Unable to connect to the chat server. Please check your internet connection and try again.');
});

// Handle reconnection attempts
socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Reconnection attempt ${attemptNumber}`);
    updateConnectionStatus('connecting', `Reconnecting... (${attemptNumber})`);
});

// Handle reconnection success
socket.on('reconnect', (attemptNumber) => {
    console.log(`Reconnected after ${attemptNumber} attempts`);
    updateConnectionStatus('connected', 'Connected');
    // Re-authenticate if we have a token
    if (authToken) {
        authenticateUser(authToken);
    }
});

// Handle successful connection
socket.on('connect', () => {
    console.log('Connected to server:', socket.id);
    updateConnectionStatus('connected', 'Connected');
});

// Handle disconnection
socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    updateConnectionStatus('disconnected', 'Disconnected');
    
    if (reason === 'io server disconnect') {
        showError('Server disconnected. Please refresh the page.');
    } else if (reason === 'io client disconnect') {
        showError('Connection lost. Please check your internet connection.');
    }    appendMessage('You have been disconnected from the chat.', 'error');
});


document.addEventListener('DOMContentLoaded', () => {
    const themeSwitch = document.getElementById('checkbox');
    const lightLabel = document.getElementById('lightLabel');
    const darkLabel = document.getElementById('darkLabel');
    
    // Function to update theme labels
    const updateThemeLabels = (isDark) => {
        if (isDark) {
            lightLabel.classList.remove('active');
            darkLabel.classList.add('active');
        } else {
            lightLabel.classList.add('active');
            darkLabel.classList.remove('active');
        }
    };
    
    // Function to toggle theme
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Update labels
        updateThemeLabels(newTheme === 'dark');
        
        // Save theme preference to localStorage
        localStorage.setItem('theme', newTheme);
        
        // Add a subtle animation effect
        document.body.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    };
    
    // Event listener for theme switch
    themeSwitch.addEventListener('change', toggleTheme);
    
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeSwitch.checked = savedTheme === 'dark';
        updateThemeLabels(savedTheme === 'dark');
    } else {
        // Default to light theme if no preference is saved
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeLabels(false);
    }
});