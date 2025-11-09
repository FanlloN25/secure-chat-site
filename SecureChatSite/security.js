// Security measures for the chat site

// Input validation
function validateInput(input, type) {
    if (!input || typeof input !== 'string') return false;

    switch (type) {
        case 'nickname':
            return /^[a-zA-Z0-9_-]{1,20}$/.test(input);
        case 'password':
            return input.length >= 6 && input.length <= 20;
        case 'message':
            return input.length <= 500 && !/<script/i.test(input);
        default:
            return false;
    }
}

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10;

function checkRateLimit(identifier) {
    const now = Date.now();
    const userRequests = rateLimitMap.get(identifier) || [];

    // Remove old requests
    const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);

    if (recentRequests.length >= MAX_REQUESTS) {
        return false; // Rate limited
    }

    recentRequests.push(now);
    rateLimitMap.set(identifier, recentRequests);
    return true;
}

// Encryption utilities (simplified)
class SimpleEncryptor {
    static encrypt(text, key) {
        // Simple XOR encryption for demonstration
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result);
    }

    static decrypt(encryptedText, key) {
        try {
            const decoded = atob(encryptedText);
            let result = '';
            for (let i = 0; i < decoded.length; i++) {
                result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        } catch (e) {
            return null;
        }
    }
}

// Secure local storage
function secureSetItem(key, value) {
    const encrypted = SimpleEncryptor.encrypt(JSON.stringify(value), 'secureChatKey123');
    localStorage.setItem(key, encrypted);
}

function secureGetItem(key) {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;

    const decrypted = SimpleEncryptor.decrypt(encrypted, 'secureChatKey123');
    if (!decrypted) return null;

    try {
        return JSON.parse(decrypted);
    } catch (e) {
        return null;
    }
}

// Sanitize HTML
function sanitizeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// CSRF protection (simplified)
function generateCSRFToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Validate CSRF token
function validateCSRFToken(token) {
    return token === window.csrfToken;
}

// Secure WebRTC setup
function createSecurePeerConnection() {
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            // In production, use your own TURN servers
        ]
    };

    const pc = new RTCPeerConnection(configuration);

    // Add security checks
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            // Validate ICE candidate
            if (!validateICECandidate(event.candidate)) {
                console.warn('Invalid ICE candidate rejected');
                return;
            }
        }
    };

    return pc;
}

function validateICECandidate(candidate) {
    // Basic validation - in production, implement more thorough checks
    return candidate.candidate && candidate.candidate.length > 0;
}

// Secure data channel
function createSecureDataChannel(pc) {
    const dc = pc.createDataChannel('chat', {
        ordered: true,
        maxPacketLifeTime: 3000,
    });

    dc.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (validateMessage(data)) {
            handleSecureMessage(data);
        } else {
            console.warn('Invalid message rejected');
        }
    };

    return dc;
}

function validateMessage(message) {
    return message &&
           typeof message.type === 'string' &&
           message.type.length <= 50 &&
           (!message.content || typeof message.content === 'string');
}

function handleSecureMessage(message) {
    // Handle validated message
    console.log('Secure message received:', message);
}

// Export security functions
window.ChatSecurity = {
    validateInput,
    checkRateLimit,
    secureSetItem,
    secureGetItem,
    sanitizeHTML,
    generateCSRFToken,
    validateCSRFToken,
    createSecurePeerConnection,
    createSecureDataChannel
};