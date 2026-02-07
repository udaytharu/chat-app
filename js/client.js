// Initialize Socket.IO connection with automatic URL detection
const socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
});

// Authentication variables
let currentUser = null;
let authToken = null;
let isAuthenticated = false;

// DOM Elements
const form = document.getElementById('send-container');
const messageInput = document.getElementById('messageInp');
const messageContainer = document.querySelector('.container');
const audio = new Audio('ting.mp3');
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

// Connection status element
const connectionStatus = document.createElement('div');
connectionStatus.id = 'connection-status';
connectionStatus.innerHTML = `
    <span class="status-dot"></span>
    <span class="status-text">Connecting...</span>
`;
document.body.appendChild(connectionStatus);

// Function to update connection status
const updateConnectionStatus = (status, message) => {
    const statusDot = connectionStatus.querySelector('.status-dot');
    const statusText = connectionStatus.querySelector('.status-text');
    
    connectionStatus.className = '';
    connectionStatus.classList.add(status);
    
    statusDot.className = 'status-dot';
    statusDot.classList.add(status);
    statusText.textContent = message;
    
    if (status === 'connected') {
        setTimeout(() => {
            connectionStatus.classList.add('hidden');
        }, 2000);
    } else {
        connectionStatus.classList.remove('hidden');
    }
};

// Function to format time
const formatTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

// Function to format time from Date object
const formatTimeFromDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// Function to format date for edited timestamp
const formatEditedAt = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `edited at ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// Function to append messages to the chat container
const appendMessage = (data, position = 'left', messageId = null) => {
    // Extract data
    const { name, message, timestamp, userId, editedAt } = data;
    const displayName = name || 'Unknown';
    const displayMessage = message || '';
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', position);
    
    if (messageId) {
        messageElement.setAttribute('data-message-id', messageId);
    }
    if (userId) {
        messageElement.setAttribute('data-user-id', userId);
    }
    
    // Create message content container
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.textContent = `@${displayName}: ${displayMessage}`;
    
    // Create message info container
    const messageInfo = document.createElement('div');
    messageInfo.classList.add('message-info');
    
    // Add timestamp
    const timestampElement = document.createElement('span');
    timestampElement.classList.add('message-timestamp');
    timestampElement.textContent = timestamp ? formatTimeFromDate(timestamp) : formatTime();
    messageInfo.appendChild(timestampElement);
    
    // Add edited indicator if message was edited
    if (editedAt) {
        const editedElement = document.createElement('span');
        editedElement.classList.add('message-edited');
        editedElement.textContent = formatEditedAt(editedAt);
        editedElement.title = `Edited at ${new Date(editedAt).toLocaleString()}`;
        messageInfo.appendChild(editedElement);
    }
    
    // Create message actions container (only for authenticated users)
    const messageActions = document.createElement('div');
    messageActions.classList.add('message-actions');
    
    // Check if this is current user's message
    const isOwnMessage = isAuthenticated && currentUser && userId === currentUser.id;
    
    if (isAuthenticated) {
        // Add reaction button for all authenticated users
        const reactBtn = document.createElement('button');
        reactBtn.classList.add('message-action-btn', 'react-btn');
        reactBtn.innerHTML = '<i class="fas fa-smile"></i>';
        reactBtn.title = 'Add reaction';
        reactBtn.addEventListener('click', () => showReactionMenu(messageElement));
        messageActions.appendChild(reactBtn);
        
        // Add edit and delete buttons only for own messages
        if (isOwnMessage) {
            const editBtn = document.createElement('button');
            editBtn.classList.add('message-action-btn', 'edit-btn');
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Edit message';
            editBtn.addEventListener('click', () => editMessage(messageElement));
            messageActions.appendChild(editBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('message-action-btn', 'delete-btn');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete message';
            deleteBtn.addEventListener('click', () => deleteMessage(messageElement));
            messageActions.appendChild(deleteBtn);
        } else {
            // Add report button for others' messages
            // const reportBtn = document.createElement('button');
            // reportBtn.classList.add('message-action-btn', 'report-btn');
            // reportBtn.innerHTML = '<i class="fas fa-flag"></i>';
            // reportBtn.title = 'Report message';
            // reportBtn.addEventListener('click', () => {
            //     showError('Report feature coming soon!');
            // });
            // messageActions.appendChild(reportBtn);
        }
    }
    
    // Append all elements
    messageElement.appendChild(messageContent);
    messageElement.appendChild(messageInfo);
    messageElement.appendChild(messageActions);
    
    messageContainer.appendChild(messageElement);
    
    // Scroll to bottom and play sound for incoming messages
    messageContainer.scrollTop = messageContainer.scrollHeight;
    if (position === 'left') {
        audio.play();
    }
    
    return messageElement;
};

// Message action functions
const showReactionMenu = (messageElement) => {
    if (!isAuthenticated) {
        showError('Please login to add reactions');
        return;
    }
    
    const reactions = ['😀', '😂', '😍', '👍', '👎', '❤️', '🔥', '🎉'];
    
    // Remove existing reaction menu
    const existingMenu = document.querySelector('.reaction-menu');
    if (existingMenu) existingMenu.remove();
    
    const messageRect = messageElement.getBoundingClientRect();
    const reactionMenu = document.createElement('div');
    reactionMenu.className = 'reaction-menu';
    
    reactions.forEach(reaction => {
        const reactionBtn = document.createElement('button');
        reactionBtn.textContent = reaction;
        reactionBtn.className = 'reaction-option';
        
        reactionBtn.addEventListener('click', () => {
            const messageId = messageElement.getAttribute('data-message-id');
            if (messageId) {
                socket.emit('add-reaction', { messageId, reaction });
            }
            reactionMenu.remove();
        });
        
        reactionMenu.appendChild(reactionBtn);
    });
    
    document.body.appendChild(reactionMenu);
    
    // Position the menu
    const menuRect = reactionMenu.getBoundingClientRect();
    const top = messageRect.top - menuRect.height - 10;
    const left = Math.min(
        messageRect.left + messageRect.width / 2 - menuRect.width / 2,
        window.innerWidth - menuRect.width - 10
    );
    
    reactionMenu.style.top = `${Math.max(10, top)}px`;
    reactionMenu.style.left = `${Math.max(10, left)}px`;
    
    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!reactionMenu.contains(e.target) && !messageElement.contains(e.target)) {
                reactionMenu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
};

const addReaction = (messageElement, reaction) => {
    const existingReactions = messageElement.querySelector('.message-reactions');
    const reactionSpan = document.createElement('span');
    reactionSpan.className = 'reaction-emoji';
    reactionSpan.textContent = reaction;
    reactionSpan.style.animation = 'reactionPop 0.3s ease';
    
    if (existingReactions) {
        existingReactions.appendChild(reactionSpan);
    } else {
        const reactionsContainer = document.createElement('div');
        reactionsContainer.className = 'message-reactions';
        reactionsContainer.appendChild(reactionSpan);
        messageElement.appendChild(reactionsContainer);
    }
};

const editMessage = (messageElement) => {
    if (!isAuthenticated) {
        showError('Please login to edit messages');
        return;
    }
    
    const messageContent = messageElement.querySelector('.message-content');
    const originalText = messageContent.textContent.replace(/^@[^:]+: /, '');
    
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = originalText;
    editInput.className = 'message-edit-input';
    
    messageContent.innerHTML = '';
    messageContent.appendChild(editInput);
    editInput.focus();
    editInput.select();
    
    const saveEdit = () => {
        const newText = editInput.value.trim();
        if (newText && newText !== originalText) {
            const messageId = messageElement.getAttribute('data-message-id');
            if (messageId) {
                socket.emit('edit-message', { messageId, newText });
            }
        } else {
            messageContent.textContent = `@${currentUser.name}: ${originalText}`;
        }
    };
    
    const cancelEdit = () => {
        messageContent.textContent = `@${currentUser.name}: ${originalText}`;
    };
    
    editInput.addEventListener('blur', saveEdit);
    editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') cancelEdit();
    });
};

const deleteMessage = (messageElement) => {
    if (!isAuthenticated) {
        showError('Please login to delete messages');
        return;
    }
    
    if (confirm('Are you sure you want to delete this message?')) {
        messageElement.style.animation = 'messageDelete 0.3s ease forwards';
        
        setTimeout(() => {
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
    
    if (message && isAuthenticated) {
        const messageId = Date.now().toString();
        appendMessage({
            name: currentUser.name,
            message: message,
            userId: currentUser.id
        }, 'right', messageId);
        
        socket.emit('send', { message, messageId });
        messageInput.value = '';
        
        // Button animation
        sendButton.classList.add('sending');
        setTimeout(() => sendButton.classList.remove('sending'), 300);
    } else if (!isAuthenticated) {
        showError('Please login to send messages');
    }
});

// Authentication Functions
const showError = (message) => {
    authError.textContent = message;
    authError.className = 'auth-error show';
    setTimeout(() => {
        authError.classList.remove('show');
    }, 5000);
};

const showSuccess = (message) => {
    authError.textContent = message;
    authError.className = 'auth-success show';
    setTimeout(() => {
        authError.classList.remove('show');
    }, 3000);
};

const hideAuthModal = () => {
    authModal.classList.add('hidden');
    document.querySelector('.container').style.display = 'block';
    document.querySelector('#send-container').style.display = 'flex';
    messageInput.focus();
};

const authenticateUser = (token) => {
    authToken = token;
    localStorage.setItem('authToken', token);
    socket.emit('authenticate-and-join', token);
};

// Event Listeners
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    authTitle.textContent = 'Create Account';
    authSubtitle.textContent = 'Join the chat community';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    authTitle.textContent = 'Welcome Back';
    authSubtitle.textContent = 'Login to continue chatting';
});

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            isAuthenticated = true;
            showSuccess('Login successful!');
            setTimeout(() => {
                hideAuthModal();
                authenticateUser(data.token);
            }, 1000);
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Register Form Handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, confirmPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            isAuthenticated = true;
            showSuccess('Registration successful!');
            setTimeout(() => {
                hideAuthModal();
                authenticateUser(data.token);
            }, 1000);
        } else {
            showError(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Network error. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    const savedToken = localStorage.getItem('authToken');
    
    if (savedToken) {
        try {
            const response = await fetch('/api/verify', {
                headers: { 'Authorization': `Bearer ${savedToken}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                isAuthenticated = true;
                hideAuthModal();
                authenticateUser(savedToken);
                return;
            }
        } catch (error) {
            console.log('Token verification failed:', error);
        }
    }
    
    // Show auth modal if no valid token
    authModal.classList.remove('hidden');
    document.querySelector('.container').style.display = 'none';
    document.querySelector('#send-container').style.display = 'none';
});

// Socket.IO Event Listeners
socket.on('authentication-success', (userData) => {
    console.log('Authentication successful:', userData);
    currentUser = { ...currentUser, ...userData };
    isAuthenticated = true;
    
    // Add user info to header
    const header = document.querySelector('header');
    if (header && !document.getElementById('user-info')) {
        const userInfo = document.createElement('div');
        userInfo.id = 'user-info';
        userInfo.innerHTML = `
            <span class="user-name">${userData.name}</span>
            <button id="logout-btn" class="logout-btn">
                <i class="fas fa-sign-out-alt"></i>
            </button>
        `;
        header.appendChild(userInfo);
        
        document.getElementById('logout-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('authToken');
                socket.disconnect();
                window.location.reload();
            }
        });
    }
});

socket.on('chat-history', (messages) => {
    messageContainer.innerHTML = '';
    
    messages.forEach(msg => {
        const isOwnMessage = isAuthenticated && currentUser && msg.userId === currentUser.id;
        const position = isOwnMessage ? 'right' : 'left';
        const messageElement = appendMessage(msg, position, msg.messageId);
        
        // Add existing reactions
        if (msg.reactions && msg.reactions.length > 0) {
            msg.reactions.forEach(reaction => {
                addReaction(messageElement, reaction.emoji);
            });
        }
    });
});

socket.on('receive', (data) => {
    const isOwnMessage = isAuthenticated && currentUser && data.userId === currentUser.id;
    if (!isOwnMessage) {
        appendMessage(data, 'left', data.messageId);
    }
});

socket.on('message-sent', (data) => {
    // Update timestamp on our sent message
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        const timestampElement = messageElement.querySelector('.message-timestamp');
        if (timestampElement) {
            timestampElement.textContent = formatTimeFromDate(data.timestamp);
        }
    }
});

socket.on('reaction-added', (data) => {
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        addReaction(messageElement, data.reaction);
    }
});

socket.on('message-edited', (data) => {
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        const messageContent = messageElement.querySelector('.message-content');
        const messageInfo = messageElement.querySelector('.message-info');
        
        messageContent.textContent = `@${data.name}: ${data.newText}`;
        
        let editedElement = messageElement.querySelector('.message-edited');
        if (!editedElement) {
            editedElement = document.createElement('span');
            editedElement.className = 'message-edited';
            messageInfo.appendChild(editedElement);
        }
        editedElement.textContent = formatEditedAt(data.editedAt);
    }
});

socket.on('message-deleted', (data) => {
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        messageElement.style.animation = 'messageDelete 0.3s ease forwards';
        setTimeout(() => messageElement.remove(), 300);
    }
});

socket.on('user-joined', (name) => {
    const joinElement = document.createElement('div');
    joinElement.className = 'system-message';
    joinElement.textContent = `${name} joined the chat`;
    messageContainer.appendChild(joinElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;
});

socket.on('left', (name) => {
    const leaveElement = document.createElement('div');
    leaveElement.className = 'system-message';
    leaveElement.textContent = `${name} left the chat`;
    messageContainer.appendChild(leaveElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;
});

socket.on('authentication-error', (error) => {
    console.error('Authentication error:', error);
    showError('Authentication failed. Please login again.');
    localStorage.removeItem('authToken');
    authModal.classList.remove('hidden');
    isAuthenticated = false;
});

// Connection events
socket.on('connect', () => {
    console.log('Connected to server');
    updateConnectionStatus('connected', 'Connected');
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    updateConnectionStatus('disconnected', 'Disconnected');
    if (reason === 'io server disconnect') {
        showError('Server disconnected. Reconnecting...');
    }
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    updateConnectionStatus('error', 'Connection Error');
    showError('Unable to connect to server');
});

socket.on('reconnect_attempt', (attempt) => {
    console.log('Reconnection attempt:', attempt);
    updateConnectionStatus('connecting', `Reconnecting... (${attempt})`);
});

socket.on('reconnect', (attempt) => {
    console.log('Reconnected after', attempt, 'attempts');
    updateConnectionStatus('connected', 'Connected');
    showSuccess('Reconnected!');
    if (authToken) {
        socket.emit('authenticate-and-join', authToken);
    }
});

// Add CSS
const addStyles = () => {
    const styles = `
        /* Connection Status */
        #connection-status {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 8px;
            background: var(--card-bg);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 1000;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            border: 1px solid var(--border-color);
        }
        
        #connection-status.hidden {
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
        }
        
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        
        .status-dot.connected { background: #4CAF50; box-shadow: 0 0 8px #4CAF50; }
        .status-dot.connecting { background: #FF9800; box-shadow: 0 0 8px #FF9800; animation: pulse 1.5s infinite; }
        .status-dot.disconnected { background: #F44336; box-shadow: 0 0 8px #F44336; }
        .status-dot.error { background: #F44336; box-shadow: 0 0 8px #F44336; animation: pulse 1s infinite; }
        
        .status-text {
            font-size: 0.9rem;
            color: var(--text-color);
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        /* User Info */
        #user-info {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-left: auto;
        }
        
        .user-name {
            font-weight: 500;
            color: var(--text-color);
        }
        
        .logout-btn {
            background: rgba(244, 67, 54, 0.1);
            border: 1px solid rgba(244, 67, 54, 0.2);
            color: #F44336;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .logout-btn:hover {
            background: rgba(244, 67, 54, 0.2);
            transform: scale(1.1);
        }
        
        /* Message Actions */
        .message-actions {
            display: none;
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: var(--card-bg);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            padding: 5px;
            gap: 5px;
        }
        
        .message:hover .message-actions {
            display: flex;
        }
        
        .message-action-btn {
            background: transparent;
            border: none;
            color: var(--text-color-secondary);
            width: 32px;
            height: 32px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .message-action-btn:hover {
            background: var(--hover-bg);
            color: var(--text-color);
        }
        
        .react-btn:hover { color: #FF9800; }
        .edit-btn:hover { color: #2196F3; }
        .delete-btn:hover { color: #F44336; }
        .report-btn:hover { color: #9C27B0; }
        
        /* Reaction Menu */
        .reaction-menu {
            position: fixed;
            background: var(--card-bg);
            border-radius: 20px;
            padding: 8px;
            display: flex;
            gap: 8px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            border: 1px solid var(--border-color);
            z-index: 1001;
            backdrop-filter: blur(10px);
        }
        
        .reaction-option {
            background: none;
            border: none;
            font-size: 1.5rem;
            padding: 8px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .reaction-option:hover {
            transform: scale(1.2);
            background: var(--hover-bg);
        }
        
        /* Message Reactions */
        .message-reactions {
            margin-top: 5px;
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
            padding: 4px;
        }
        
        .reaction-emoji {
            font-size: 1.2rem;
            animation: reactionPop 0.3s ease;
        }
        
        @keyframes reactionPop {
            0% { transform: scale(0); }
            70% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
        
        /* System Messages */
        .system-message {
            text-align: center;
            color: var(--text-color-secondary);
            font-style: italic;
            margin: 10px 0;
            padding: 5px;
            font-size: 0.9rem;
        }
        
        /* Edit Input */
        .message-edit-input {
            width: 100%;
            padding: 8px 12px;
            border: 2px solid var(--color-blue-300);
            border-radius: 8px;
            background: var(--input-bg);
            color: var(--text-color);
            font-size: 1rem;
            outline: none;
        }
        
        /* Message Delete Animation */
        @keyframes messageDelete {
            0% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.5); }
        }
        
        /* Auth Messages */
        .auth-error {
            background: rgba(244, 67, 54, 0.1) !important;
            border-color: rgba(244, 67, 54, 0.2) !important;
            color: #F44336 !important;
        }
        
        .auth-success {
            background: rgba(76, 175, 80, 0.1) !important;
            border-color: rgba(76, 175, 80, 0.2) !important;
            color: #4CAF50 !important;
        }
        
        /* Fix for message background text issue */
        .message-content {
            word-break: break-word;
            white-space: pre-wrap;
            padding-right: 40px;
        }
        
        .message.right .message-content {
            padding-right: 40px;
        }
        
        .message.left .message-content {
            padding-right: 40px;
        }
        
        /* Fix message positioning */
        .message {
            position: relative;
            margin: 10px 0;
            padding: 10px 15px;
            border-radius: 15px;
            max-width: 70%;
            word-wrap: break-word;
        }
        
        .message.right {
            align-self: flex-end;
            background: var(--message-right-bg);
            color: var(--message-right-color);
        }
        
        .message.left {
            align-self: flex-start;
            background: var(--message-left-bg);
            color: var(--message-left-color);
        }
        
        .message-info {
            font-size: 0.8rem;
            color: var(--text-color-secondary);
            margin-top: 5px;
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .message-edited {
            font-style: italic;
            opacity: 0.8;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
};

// Initialize styles
addStyles();
