# 💬 Chat with Uday - Real-time Chat Application

<div align="center">

![Chat App Preview](https://img.shields.io/badge/Chat-App-blue?style=for-the-badge&logo=chat&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8+-black?style=for-the-badge&logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb&logoColor=white)

*A modern, secure, and feature-rich real-time chat application with authentication and persistent message storage.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-🚀%20Try%20It-ff6b6b?style=for-the-badge&logo=vercel&logoColor=white)](https://chat-app-7e73.onrender.com/)
[![Features](https://img.shields.io/badge/Features-✨%20View%20All-4ecdc4?style=for-the-badge)](#-features)
[![Installation](https://img.shields.io/badge/Installation-📦%20Get%20Started-45b7d1?style=for-the-badge)](#-installation)

</div>

---

## ✨ Features

### 🔐 **Secure Authentication**
- **User Registration & Login** with email/password
- **JWT Token Authentication** for secure sessions
- **Password Hashing** with bcrypt for security
- **Password Visibility Toggle** for better UX
- **Session Persistence** - stay logged in between visits

### 💬 **Real-time Chat**
- **Instant Messaging** with Socket.IO
- **Multiple Users** can chat simultaneously
- **Message History** - see previous conversations
- **User Presence** - know who's online
- **Join/Leave Notifications** when users enter/exit

### 🎨 **Modern UI/UX**
- **Dark Theme ** with smooth transitions
- **Responsive Design** - works on all devices
- **Beautiful Animations** and hover effects
- **Glass Morphism** design elements
- **Modern Typography** with Google Fonts

### 🔧 **Technical Features**
- **MongoDB Integration** for data persistence
- **Message Storage** with timestamps
- **Error Handling** with user-friendly messages
- **Health Check Endpoint** for monitoring
- **CORS Support** for cross-origin requests

---

## 🚀 Live Demo

**Experience the chat app live:** [https://chat-app-7e73.onrender.com/](https://chat-app-7e73.onrender.com/)

> 💡 **Try it out:** Register a new account or login to start chatting!

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="40" height="40"/>
<br/><b>Node.js</b>
</td>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" width="40" height="40"/>
<br/><b>Express.js</b>
</td>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/socketio/socketio-original.svg" width="40" height="40"/>
<br/><b>Socket.IO</b>
</td>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" width="40" height="40"/>
<br/><b>MongoDB</b>
</td>
<td align="center" width="20%">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" width="40" height="40"/>
<br/><b>JavaScript</b>
</td>
</tr>
</table>

### 📦 **Dependencies**
- **Backend**: Express.js, Socket.IO, Mongoose, bcryptjs, jsonwebtoken
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: MongoDB Atlas
- **Icons**: FontAwesome 6.0
- **Fonts**: Google Fonts (Inter, Poppins, Righteous)

---

## 📦 Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account
- Git

### 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/chat-app.git
   cd chat-app
   ```

2. **Navigate to the server directory**
   ```bash
   cd nodeServer
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure MongoDB**
   - Create a MongoDB Atlas cluster
   - Get your connection string
   - Update the `MONGODB_URI` in `nodeServer/index.js`

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open your browser**
   ```
   http://localhost:8000
   ```

### 🔧 Configuration

#### MongoDB Setup
1. Create a [MongoDB Atlas](https://www.mongodb.com/atlas) account
2. Create a new cluster
3. Get your connection string
4. Replace the connection string in `nodeServer/index.js`:
   ```javascript
   const MONGODB_URI = 'your-mongodb-connection-string';
   ```
5. Add your IP address to the whitelist in MongoDB Atlas

#### Environment Variables (Optional)
Create a `.env` file in the `nodeServer` directory:
```env
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
PORT=8000
```

---

## 📱 Usage

### 🔐 Authentication
1. **Register**: Create a new account with email and password
2. **Login**: Sign in with your credentials
3. **Stay Logged In**: Your session persists between visits

### 💬 Chatting
1. **Join Chat**: Automatically join after login
2. **Send Messages**: Type and press Enter or click Send
3. **See History**: View previous messages when joining
4. **User Presence**: See when users join or leave

### 🎨 Customization
- **Theme Toggle**: Switch between dark and light modes
- **Responsive**: Works on desktop, tablet, and mobile
- **Notifications**: Audio alerts for new messages

---

## 🏗️ Project Structure

```
chat-app/

├── 📁 public/
│   ├── 📁 css/
│   └── style.css              # Modern CSS with themes
│   ├── 📁 js/
│   └── client.js              # Frontend JavaScript
│   ├── index.html                 # Main HTML file
│   ├── ting.mp3                   # Notification sound
├── 📁 nodeServer/
│   ├── index.js               # Server and Socket.IO logic
│   ├── package.json           # Dependencies
│   └── 📁 node_modules/       # Installed packages
└── README.md                  # This file
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register` | Register a new user |
| `POST` | `/api/login` | Login user |
| `GET` | `/api/verify` | Verify JWT token |
| `GET` | `/api/health` | Check server health |

### Socket.IO Events
- `authenticate-and-join` - Join chat with authentication
- `send` - Send a message
- `chat-history` - Receive message history
- `user-joined` - User joined notification
- `left` - User left notification

---

## 🚀 Deployment

### Render.com (Recommended)
1. Connect your GitHub repository to Render
2. Set build command: `cd nodeServer && npm install`
3. Set start command: `cd nodeServer && npm start`
4. Add environment variables in Render dashboard

### Other Platforms
- **Heroku**: Use Heroku CLI and Procfile
- **Vercel**: Configure for Node.js backend
- **Railway**: Connect GitHub and deploy

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### 🐛 Bug Reports
Found a bug? Please create an issue with:
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Uday Raj Chaudhary**
- 🌐 Website: [udayrajchaudhary.com.np](https://www.udayrajchaudhary.com.np/)
- 💼 LinkedIn: [Uday Raj Chaudhary](https://linkedin.com/in/uday-raj-chaudhary)
- 🐙 GitHub: [@udaytharu813](https://github.com/udaytharu813)
- 📧 Email: contact@udayrajchaudhary.com.np

---

## 🙏 Acknowledgments

- **Socket.IO** team for the amazing real-time communication library
- **MongoDB** for the flexible database solution
- **FontAwesome** for the beautiful icons
- **Google Fonts** for the typography
- **Contributors** and users who provide feedback

---

<div align="center">

### ⭐ Star this repository if you found it helpful!

[![GitHub stars](https://img.shields.io/github/stars/udaytharu813/chat-app?style=social)](https://github.com/udaytharu813/chat-app/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/udaytharu813/chat-app?style=social)](https://github.com/udaytharu813/chat-app/network/members)
[![GitHub watchers](https://img.shields.io/github/watchers/udaytharu813/chat-app?style=social)](https://github.com/udaytharu813/chat-app/watchers)

**Made with ❤️ by [Uday Raj Chaudhary](https://www.udayrajchaudhary.com.np/)**


</div>

