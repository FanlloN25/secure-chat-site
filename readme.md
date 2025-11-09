# Secure Chat Site

A modern, secure chat application with voice calling capabilities.

## Features

- **Access Control**: Enter "грибочек" for user access or "fanllonbest" for admin access (case-insensitive)
- **User Registration/Login**: Persistent user accounts with local storage
- **Profile Management**: Change nickname and avatar
- **Friends System**: Add friends by nickname
- **Voice Calls**: WebRTC-based voice calling with mute functionality
- **Text Chat**: Real-time messaging during calls
- **Admin Features**: Listen to calls anonymously and view all friends lists
- **Security**: Input validation, rate limiting, encryption, and XSS protection
- **Modern UI**: Parallax background, gradients, and responsive design

## Security Measures

- Input validation and sanitization
- Rate limiting on access attempts
- Encrypted local storage
- CSRF protection
- Secure WebRTC connections
- XSS prevention

## Usage

1. Open `index.html` in a modern web browser
2. Enter access code ("грибочек" or "fanllonbest")
3. Register or login to your account
4. Add friends by nickname
5. Click "Call" to start voice calls
6. Use mute button during calls
7. Send text messages in chat

## Admin Features

When accessing with "fanllonbest":
- View all users' friends lists
- Listen to active calls anonymously

## Browser Requirements

- Modern browser with WebRTC support
- Microphone access for voice calls
- HTTPS recommended for production (WebRTC requires secure context)

## Development

Files:
- `index.html` - Main HTML structure
- `styles.css` - Modern styling with animations
- `script.js` - Main application logic
- `security.js` - Security utilities and validations
- `default-avatar.png` - Default user avatar