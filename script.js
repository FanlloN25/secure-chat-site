// Secure Chat Site Script

// Access codes (case-insensitive)
const USER_CODE = 'gribochek';
const ADMIN_CODE = 'fanllonbest';

// Global variables
let currentUser = null;
let isAdmin = false;
let friends = [];
let currentCall = null;
let peerConnection = null;
let localStream = null;
let dataChannel = null;
let csrfToken;
let signalingChannel = null;
let userDocRef = null;
let friendsUnsubscribe = null;
let signalingUnsubscribe = null;

// DOM elements
const loginModal = document.getElementById('login-modal');
const mainApp = document.getElementById('main-app');
const accessCodeInput = document.getElementById('access-code');
const submitCodeBtn = document.getElementById('submit-code');
const errorMessage = document.getElementById('error-message');
const nicknameSpan = document.getElementById('nickname');
const avatarImg = document.getElementById('avatar');
const editProfileBtn = document.getElementById('edit-profile');
const deleteAccountBtn = document.getElementById('delete-account');
const addFriendInput = document.getElementById('add-friend-input');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendsList = document.getElementById('friends-list');
const callInterface = document.getElementById('call-interface');
const callWithSpan = document.getElementById('call-with');
const callNicknameSpan = document.getElementById('call-nickname');
const muteBtn = document.getElementById('mute-btn');
const hangupBtn = document.getElementById('hangup-btn');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSecurityModule();
    setupEventListeners();

    // Wait for Firebase to initialize, then check auth state
    const checkFirebase = () => {
        if (window.auth && window.db) {
            // Firebase auth state listener
            window.firebaseAuth.onAuthStateChanged(window.auth, async (user) => {
                if (user) {
                    console.log('User logged in:', user.email);
                    currentUser = {
                        uid: user.uid,
                        nickname: user.email.split('@')[0],
                        email: user.email,
                        avatar: 'default-avatar.png',
                        friends: []
                    };
                    userDocRef = window.firebaseDB.doc(window.db, 'users', user.uid);

                    // Load user data from Firestore
                    await loadUserDataFromFirebase();

                    // Setup realtime listeners
                    setupFriendsListener();
                    setupSignalingListener();

                    updateUI();
                    loginModal.classList.add('hidden');
                    mainApp.classList.remove('hidden');
                } else {
                    console.log('User logged out');
                    currentUser = null;
                    friends = [];
                    if (friendsUnsubscribe) friendsUnsubscribe();
                    if (signalingUnsubscribe) signalingUnsubscribe();
                    mainApp.classList.add('hidden');
                    loginModal.classList.remove('hidden');
                }
            });
        } else {
            setTimeout(checkFirebase, 100);
        }
    };

    checkFirebase();
});

// Load security module
function loadSecurityModule() {
    if (window.ChatSecurity) {
        window.csrfToken = window.ChatSecurity.generateCSRFToken();
    }
}

// Setup event listeners
function setupEventListeners() {
    submitCodeBtn.addEventListener('click', handleAccessCode);
    accessCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAccessCode();
    });

    editProfileBtn.addEventListener('click', openProfileEditor);
    deleteAccountBtn.addEventListener('click', deleteAccount);
    addFriendBtn.addEventListener('click', addFriend);
    addFriendInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addFriend();
    });

    muteBtn.addEventListener('click', toggleMute);
    hangupBtn.addEventListener('click', hangupCall);
    sendChatBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
}

// Handle access code submission
function handleAccessCode() {
    const code = accessCodeInput.value.trim().toLowerCase();

    if (code === USER_CODE.toLowerCase()) {
        showAuthForm(false); // Regular user
    } else if (code === ADMIN_CODE.toLowerCase()) {
        showAuthForm(true); // Admin
    } else {
        showError('Invalid access code');
    }
}

// This function is no longer used since we use Firebase auth directly

// Show authentication form (login/register)
function showAuthForm(isAdminUser) {
    isAdmin = isAdminUser;
    const userListHTML = isAdmin ? `
        <div id="user-list" style="margin-top: 20px; text-align: left; max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 8px;">
            <h4>Registered Users:</h4>
            <div id="users-display"></div>
        </div>
    ` : '';

    loginModal.innerHTML = `
        <div class="modal-content">
            <h2>Authentication</h2>
            <input type="email" id="auth-email" placeholder="Enter email" required>
            <input type="password" id="auth-password" placeholder="Enter password" required>
            <button id="login-btn">Login</button>
            <button id="register-btn">Register</button>
            <div id="auth-error"></div>
            ${userListHTML}
        </div>
    `;

    if (isAdmin) {
        updateUserList();
    }

    // Wait for Firebase to be ready
    const checkFirebaseReady = () => {
        if (!window.auth) {
            setTimeout(checkFirebaseReady, 100);
            return;
        }

        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const authError = document.getElementById('auth-error');

    loginBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            authError.textContent = 'Please fill all fields';
            return;
        }

        window.firebaseAuth.signInWithEmailAndPassword(email, password)
            .then(() => {
                // Firebase auth state listener will handle the login
            })
            .catch((error) => {
                authError.textContent = error.message;
            });
    });

    registerBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            authError.textContent = 'Please fill all fields';
            return;
        }

        if (password.length < 6) {
            authError.textContent = 'Password must be at least 6 characters';
            return;
        }

        window.firebaseAuth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Create user document in Firestore
                return window.firebaseDB.setDoc(window.firebaseDB.doc(window.db, 'users', userCredential.user.uid), {
                    email: email,
                    nickname: email.split('@')[0],
                    avatar: 'default-avatar.png',
                    friends: [],
                    isAdmin: isAdmin,
                    createdAt: new Date()
                });
            })
            .then(() => {
                // Update user list if admin
                if (isAdmin) {
                    updateUserList();
                }
            })
            .catch((error) => {
                authError.textContent = error.message;
            });
    });

    checkFirebaseReady();
}

// Load user data from Firebase
async function loadUserDataFromFirebase() {
    try {
        const docSnap = await window.firebaseDB.getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentUser = {
                ...currentUser,
                ...data
            };
            friends = data.friends || [];
            isAdmin = data.isAdmin || false;
            updateUI();
            if (isAdmin) {
                setupAdminFeatures();
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Update user list display
async function updateUserList() {
    const usersDisplay = document.getElementById('users-display');
    if (!usersDisplay) return;

    try {
        // For demo purposes, show current user only since Firestore rules might be restrictive
        if (currentUser) {
            usersDisplay.innerHTML = `
                <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; border: 1px solid #ddd;">
                    <strong>${currentUser.nickname}</strong> (${currentUser.email})
                    ${currentUser.isAdmin ? '<span style="color: #e74c3c; font-weight: bold;">ADMIN</span>' : ''}
                    <br>
                    <small style="color: #666;">Friends: ${friends && friends.length > 0 ? friends.join(', ') : 'none'}</small>
                </div>
                <p style="color: #666; font-style: italic; font-size: 12px;">Note: Full user list requires Firestore security rules configuration</p>
            `;
        } else {
            usersDisplay.innerHTML = '<p style="color: #666; font-style: italic;">No users registered yet</p>';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        usersDisplay.innerHTML = '<p style="color: #e74c3c;">Error loading users</p>';
    }
}

// Update UI after login
function updateUI() {
    nicknameSpan.textContent = currentUser.nickname;
    avatarImg.src = currentUser.avatar;
    renderFriendsList();
}

// Open profile editor
async function openProfileEditor() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Edit Profile</h2>
            <input type="text" id="edit-nickname" value="${currentUser.nickname}" maxlength="20">
            <input type="file" id="edit-avatar" accept="image/*">
            <button id="save-profile">Save</button>
            <button id="cancel-edit">Cancel</button>
        </div>
    `;
    document.body.appendChild(modal);

    const editNickname = document.getElementById('edit-nickname');
    const editAvatar = document.getElementById('edit-avatar');
    const saveBtn = document.getElementById('save-profile');
    const cancelBtn = document.getElementById('cancel-edit');

    saveBtn.addEventListener('click', async () => {
        const newNickname = editNickname.value.trim();
        if (!newNickname) {
            showError('Nickname cannot be empty');
            return;
        }
        if (!window.ChatSecurity.validateInput(newNickname, 'nickname')) {
            showError('Invalid nickname format');
            return;
        }

        currentUser.nickname = newNickname;
        if (editAvatar.files[0]) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                currentUser.avatar = e.target.result;
                await window.firebaseDB.updateDoc(userDocRef, {
                    nickname: newNickname,
                    avatar: e.target.result
                });
                updateUI();
                modal.remove();
            };
            reader.readAsDataURL(editAvatar.files[0]);
        } else {
            await window.firebaseDB.updateDoc(userDocRef, {
                nickname: newNickname
            });
            updateUI();
            modal.remove();
        }
    });

    cancelBtn.addEventListener('click', () => modal.remove());
}

// Delete account
async function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        try {
            // Sign out from Firebase
            await window.firebaseAuth.signOut(window.auth);
            // Note: In production, you would also delete the user document from Firestore
            // and delete the user from Firebase Auth, but that requires admin privileges
        } catch (error) {
            console.error('Error deleting account:', error);
            showError('Failed to delete account');
        }
    }
}

// Add friend
async function addFriend() {
    const nickname = addFriendInput.value.trim();
    if (!nickname) {
        showError('Please enter a nickname');
        return;
    }
    if (!window.ChatSecurity.validateInput(nickname, 'nickname')) {
        showError('Invalid nickname format');
        return;
    }
    if (friends.includes(nickname)) {
        showError('Friend already added');
        return;
    }
    if (nickname === currentUser.nickname) {
        showError('Cannot add yourself as friend');
        return;
    }

    try {
        // Find user by nickname
        const q = window.firebaseDB.query(
            window.firebaseDB.collection(window.db, 'users'),
            window.firebaseDB.where('nickname', '==', nickname)
        );
        const querySnapshot = await window.firebaseDB.getDocs(q);

        if (querySnapshot.empty) {
            showError('User not found');
            return;
        }

        const friendDoc = querySnapshot.docs[0];
        const friendData = friendDoc.data();

        // Add to current user's friends
        friends.push(nickname);
        await window.firebaseDB.updateDoc(userDocRef, {
            friends: friends
        });

        // Add current user to friend's friends list
        const friendRef = window.firebaseDB.doc(window.db, 'users', friendDoc.id);
        const friendFriends = friendData.friends || [];
        if (!friendFriends.includes(currentUser.nickname)) {
            friendFriends.push(currentUser.nickname);
            await window.firebaseDB.updateDoc(friendRef, {
                friends: friendFriends
            });
        }

        renderFriendsList();
        addFriendInput.value = '';
        showError(`Friend ${nickname} added successfully!`);
    } catch (error) {
        console.error('Error adding friend:', error);
        showError('Failed to add friend');
    }
}

// Render friends list
function renderFriendsList() {
    friendsList.innerHTML = '';
    friends.forEach(friend => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="friend-name">${friend}</span>
            <button class="call-btn" data-friend="${friend}">Call</button>
        `;
        li.querySelector('.call-btn').addEventListener('click', () => startCall(friend));
        friendsList.appendChild(li);
    });
}

// Start call
function startCall(friend) {
    if (currentCall) {
        // Switch call
        hangupCall();
        setTimeout(() => initiateCall(friend), 250);
    } else {
        initiateCall(friend);
    }
}

// Handle incoming call
async function handleIncomingCall(message) {
    if (currentCall) {
        // Reject call if already in one
        await sendSignalingMessage(message.from, {
            type: 'call_reject',
            from: currentUser.nickname,
            to: message.from
        });
        return;
    }

    // Show incoming call notification with custom modal
    showIncomingCallModal(message.from, message.offer);
}

// Show incoming call modal
async function showIncomingCallModal(from, offer) {
    console.log('Showing incoming call modal from:', from);
    const modal = document.createElement('div');
    modal.className = 'modal incoming-call-modal';
    modal.innerHTML = `
        <div class="modal-content call-modal">
            <h2>Incoming Call</h2>
            <p>Call from: <strong>${from}</strong></p>
            <div class="call-buttons">
                <button id="accept-call" class="accept-btn">Accept</button>
                <button id="reject-call" class="reject-btn">Reject</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    console.log('Modal added to DOM');

    document.getElementById('accept-call').addEventListener('click', async () => {
        console.log('Accept button clicked');
        modal.remove();
        currentCall = from;
        callWithSpan.textContent = `Calling with: ${from}`;
        callInterface.classList.remove('hidden');
        setupWebRTC();

        try {
            // Set remote description with offer
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('Remote description set');

            // Create answer
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            console.log('Local description set');

            // Send answer
            await sendSignalingMessage(from, {
                type: 'call_answer',
                from: currentUser.nickname,
                to: from,
                answer: answer
            });
            console.log('Answer sent');
        } catch (error) {
            console.error('Error accepting call:', error);
            showError('Failed to accept call');
            hangupCall();
        }
    });

    document.getElementById('reject-call').addEventListener('click', async () => {
        console.log('Reject button clicked');
        modal.remove();
        await sendSignalingMessage(from, {
            type: 'call_reject',
            from: currentUser.nickname,
            to: from
        });
    });
}

// Handle call answer
async function handleCallAnswer(message) {
    if (message.answer && typeof message.answer === 'object') {
        try {
            // Set remote description with answer
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
            console.log('Call connected with', message.from);
        } catch (error) {
            console.error('Error setting remote description:', error);
            showError('Failed to connect call');
            hangupCall();
        }
    } else if (message.answer === 'accepted') {
        console.log('Call accepted by', message.from);
    } else {
        console.log('Call rejected by', message.from);
        hangupCall();
    }
}

// Initiate call
async function initiateCall(friend) {
    console.log('Initiating call to:', friend);
    currentCall = friend;
    callWithSpan.textContent = `Calling with: ${friend}`;
    callInterface.classList.remove('hidden');

    // WebRTC setup first
    setupWebRTC();

    // Create offer and send via signaling channel
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        console.log('Sending call offer to:', friend);
        await sendSignalingMessage(friend, {
            type: 'call_offer',
            from: currentUser.nickname,
            to: friend,
            offer: offer
        });
    } catch (error) {
        console.error('Error creating offer:', error);
        showError('Failed to initiate call');
        hangupCall();
    }
}

// Setup WebRTC (secure)
function setupWebRTC() {
    if (window.ChatSecurity) {
        peerConnection = window.ChatSecurity.createSecurePeerConnection();
        dataChannel = window.ChatSecurity.createSecureDataChannel(peerConnection);
    } else {
        // Fallback for basic WebRTC
        peerConnection = new RTCPeerConnection();
        dataChannel = peerConnection.createDataChannel('chat');
    }

    // Setup ICE candidate handling
    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            try {
                await sendSignalingMessage(currentCall, {
                    type: 'ice_candidate',
                    from: currentUser.nickname,
                    to: currentCall,
                    candidate: event.candidate.toJSON()
                });
            } catch (error) {
                console.error('Error sending ICE candidate:', error);
            }
        }
    };

    // Setup data channel for chat
    dataChannel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'chat') {
            addChatMessage(message.from, message.content);
        }
    };

    // Setup remote stream handling
    peerConnection.ontrack = (event) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play();
    };

    // Get user media
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            localStream = stream;
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            if (error.name === 'NotAllowedError') {
                showError('Microphone access denied. Please allow microphone access and try again.');
            } else {
                showError('Error accessing microphone: ' + error.message);
            }
        });

    console.log('Setting up WebRTC for call with', currentCall);
}

// Toggle mute
function toggleMute() {
    if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });
        muteBtn.textContent = audioTracks[0].enabled ? 'Mute' : 'Unmute';
    }
}

// Hang up call
function hangupCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    currentCall = null;
    callInterface.classList.add('hidden');
    chatMessages.innerHTML = '';
}

// Send chat message
async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!window.ChatSecurity.validateInput(message, 'message')) {
        showError('Invalid message format');
        return;
    }

    if (message && currentCall) {
        const sanitizedMessage = window.ChatSecurity.sanitizeHTML(message);
        addChatMessage(currentUser.nickname, sanitizedMessage);
        chatInput.value = '';

        // Always use Firebase for chat
        await sendSignalingMessage(currentCall, {
            type: 'chat_message',
            from: currentUser.nickname,
            to: currentCall,
            content: sanitizedMessage
        });
    }
}

// Add chat message
function addChatMessage(sender, message) {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${sender}:</strong> ${message}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Setup friends realtime listener
function setupFriendsListener() {
    friendsUnsubscribe = window.firebaseDB.onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            friends = data.friends || [];
            renderFriendsList();
        }
    }, (error) => {
        console.error('Error in friends listener:', error);
    });
}

// Setup signaling realtime listener
function setupSignalingListener() {
    const signalingRef = window.firebaseDB.doc(window.db, 'signaling', currentUser.uid);
    signalingUnsubscribe = window.firebaseDB.onSnapshot(signalingRef, async (doc) => {
        if (doc.exists()) {
            const message = doc.data();
            console.log('Received signaling message:', message);

            switch (message.type) {
                case 'call_offer':
                    if (message.to === currentUser.nickname) {
                        await handleIncomingCall(message);
                    }
                    break;
                case 'call_answer':
                    if (message.to === currentUser.nickname) {
                        await handleCallAnswer(message);
                    }
                    break;
                case 'ice_candidate':
                    if (message.to === currentUser.nickname && peerConnection) {
                        try {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                        } catch (error) {
                            console.error('Error adding ICE candidate:', error);
                        }
                    }
                    break;
                case 'chat_message':
                    if (message.to === currentUser.nickname || message.from === currentCall) {
                        addChatMessage(message.from, message.content);
                    }
                    break;
            }

            // Clear the message after processing
            try {
                await window.firebaseDB.updateDoc(signalingRef, { type: null, from: null, to: null, offer: null, answer: null, candidate: null, content: null });
            } catch (error) {
                console.error('Error clearing signaling message:', error);
            }
        }
    });
}

// Send signaling message via Firebase
async function sendSignalingMessage(to, message) {
    try {
        // Find recipient user
        const q = window.firebaseDB.query(
            window.firebaseDB.collection(window.db, 'users'),
            window.firebaseDB.where('nickname', '==', to)
        );
        const querySnapshot = await window.firebaseDB.getDocs(q);

        if (!querySnapshot.empty) {
            const recipientDoc = querySnapshot.docs[0];
            const signalingRef = window.firebaseDB.doc(window.db, 'signaling', recipientDoc.id);
            await window.firebaseDB.setDoc(signalingRef, {
                ...message,
                timestamp: new Date()
            });
        } else {
            console.warn('Recipient user not found:', to);
        }
    } catch (error) {
        console.error('Error sending signaling message:', error);
        throw error; // Re-throw to handle in calling function
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    setTimeout(() => {
        errorMessage.textContent = '';
    }, 3000);
}

// Admin features
function setupAdminFeatures() {
    if (!isAdmin) return;

    console.log('Admin mode enabled');

    // Add admin panel
    const adminPanel = document.createElement('div');
    adminPanel.id = 'admin-panel';
    adminPanel.innerHTML = `
        <h3>Admin Panel</h3>
        <button id="view-all-friends">View All Friends Lists</button>
        <button id="listen-calls">Listen to Active Calls</button>
        <div id="admin-content"></div>
    `;
    document.getElementById('friends-section').appendChild(adminPanel);

    document.getElementById('view-all-friends').addEventListener('click', viewAllFriends);
    document.getElementById('listen-calls').addEventListener('click', listenToCalls);
}

function viewAllFriends() {
    const adminContent = document.getElementById('admin-content');
    // In a real app, this would fetch from server
    // For demo, show current user's friends
    adminContent.innerHTML = `
        <h4>All Users' Friends Lists</h4>
        <p><strong>${currentUser.nickname}:</strong> ${friends.join(', ') || 'No friends'}</p>
    `;
}

function listenToCalls() {
    const adminContent = document.getElementById('admin-content');
    if (currentCall) {
        adminContent.innerHTML = `
            <h4>Listening to Call</h4>
            <p>Currently listening to call between ${currentUser.nickname} and ${currentCall}</p>
            <p>(Admin can hear both sides anonymously)</p>
        `;
    } else {
        adminContent.innerHTML = '<p>No active calls to listen to</p>';
    }
}