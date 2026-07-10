document.addEventListener('DOMContentLoaded', () => {
    // --- Gun.js Database Setup ---
    // Public peer relay for syncing over the internet (no backend needed!)
    const peers = ['https://relay.peer.ooo/gun'];
    const gun = Gun(peers);
    // A unique, hard-to-guess room ID for privacy
    const db = gun.get('pampisup-secret-chat-room-v3-unique');
    const db_msgs = db.get('messages');
    const db_profiles = db.get('profiles');
    const db_presence = db.get('presence');

    // --- State & Config ---
    const USERS = {
        '0589': 'me',
        '2009': 'partner'
    };
    
    // In-Memory Data (Synced via Gun)
    let messagesObj = {}; 
    let profiles = {
        'me': { name: 'Aşkım', avatar: '🦋' },
        'partner': { name: 'Pampiş', avatar: '❤️' }
    };
    let presenceData = { 'me': 0, 'partner': 0 };

    let currentUser = localStorage.getItem('pampisUp_currentUser');
    let pendingChatImage = null;

    // --- DOM Elements ---
    const loginScreen = document.getElementById('login-screen');
    const chatScreen = document.getElementById('chat-screen');
    const passwordInput = document.getElementById('password-input');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    const chatMessages = document.getElementById('chat-messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    
    // Header Elements
    const partnerNameEl = document.getElementById('partner-name');
    const partnerAvatarEmojiEl = document.getElementById('partner-avatar-emoji');
    const partnerAvatarImgEl = document.getElementById('partner-avatar-img');
    const partnerOnlineIndicator = document.getElementById('partner-online-indicator');
    const partnerLastSeenEl = document.getElementById('partner-last-seen');

    // Chat Image Upload
    const attachBtn = document.getElementById('attach-btn');
    const chatImageUpload = document.getElementById('chat-image-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    // Profile Modal
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const editName = document.getElementById('edit-name');
    const editAvatar = document.getElementById('edit-avatar');
    const profileAvatarPreviewContainer = document.getElementById('profile-avatar-preview-container');
    const profileAvatarEmoji = document.getElementById('profile-avatar-emoji');
    const profileAvatarImg = document.getElementById('profile-avatar-img');
    const profileImageUpload = document.getElementById('profile-image-upload');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Gun.js Listeners ---
    function setupRealtimeListeners() {
        // Listen for new/updated messages
        db_msgs.map().on((msg, id) => {
            if (msg) {
                messagesObj[id] = msg;
                debouncedRenderMessages();
            }
        });

        // Listen for profile updates
        db_profiles.map().on((profile, id) => {
            if (profile && (id === 'me' || id === 'partner')) {
                profiles[id] = { name: profile.name, avatar: profile.avatar };
                loadProfileInfo();
                debouncedRenderMessages();
            }
        });

        // Listen for presence (partner online status)
        db_presence.map().on((time, id) => {
            if (time && (id === 'me' || id === 'partner')) {
                presenceData[id] = time;
                updateLastSeen();
            }
        });
    }

    let renderTimeout;
    function debouncedRenderMessages() {
        clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
            renderMessages();
        }, 50); // small delay to batch renders
    }

    // --- Initialization ---
    function init() {
        if (currentUser) {
            showChat();
            setupRealtimeListeners();
            loadProfileInfo();
            renderMessages();
            startHeartbeat();
        } else {
            showLogin();
        }
    }

    function showLogin() {
        loginScreen.classList.remove('hidden');
        chatScreen.classList.add('hidden');
        passwordInput.value = '';
        loginError.classList.add('hidden');
    }

    function showChat() {
        loginScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        chatScreen.classList.add('flex');
    }

    function handleLogin() {
        const pass = passwordInput.value.trim();
        if (USERS[pass]) {
            currentUser = USERS[pass];
            localStorage.setItem('pampisUp_currentUser', currentUser);
            // On fresh login, publish our profile to Gun so partner sees us
            db_profiles.get(currentUser).put(profiles[currentUser]);
            init();
        } else {
            loginError.classList.remove('hidden');
            passwordInput.classList.add('border-premiumRed');
            setTimeout(() => passwordInput.classList.remove('border-premiumRed'), 2000);
        }
    }

    loginBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // --- Image Compression ---
    function compressImage(file, maxWidth, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                callback(canvas.toDataURL('image/jpeg', 0.6)); 
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function renderAvatar(avatarData, emojiEl, imgEl) {
        if (avatarData && avatarData.startsWith('data:image/')) {
            emojiEl.classList.add('hidden');
            imgEl.src = avatarData;
            imgEl.classList.remove('hidden');
        } else {
            imgEl.classList.add('hidden');
            imgEl.src = '';
            emojiEl.textContent = avatarData || '🦋';
            emojiEl.classList.remove('hidden');
        }
    }

    function loadProfileInfo() {
        const partnerId = currentUser === 'me' ? 'partner' : 'me';
        const partnerProfile = profiles[partnerId];
        partnerNameEl.textContent = partnerProfile.name;
        renderAvatar(partnerProfile.avatar, partnerAvatarEmojiEl, partnerAvatarImgEl);
    }

    // --- Message Rendering ---
    function formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    function renderMessages() {
        chatMessages.innerHTML = '';
        const partnerId = currentUser === 'me' ? 'partner' : 'me';
        const partnerProfile = profiles[partnerId];

        // Convert messages object to array and sort by timestamp
        const msgsArray = Object.values(messagesObj).filter(m => m && m.id).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        msgsArray.forEach(msg => {
            const isMe = msg.senderId === currentUser;
            const msgEl = document.createElement('div');
            msgEl.className = `flex ${isMe ? 'justify-end' : 'justify-start'} animate-bubbleIn`;

            let avatarHtml = '';
            if (!isMe) {
                if (partnerProfile.avatar.startsWith('data:image/')) {
                    avatarHtml = `<img src="${partnerProfile.avatar}" class="w-8 h-8 rounded-full object-cover shadow-sm self-end mr-2">`;
                } else {
                    avatarHtml = `<div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-lg shadow-sm self-end mr-2">${partnerProfile.avatar}</div>`;
                }
            }

            let imageHtml = '';
            if (msg.imageUrl && msg.imageUrl.length > 10) {
                imageHtml = `<img src="${msg.imageUrl}" class="w-full rounded-lg mb-2 cursor-pointer border border-white/20">`;
            }
            
            let statusHtml = '';
            if (isMe) {
                const isRead = msg.status === 'read';
                statusHtml = `
                    <span class="ml-2 text-[10px] ${isRead ? 'text-blue-500' : 'text-gray-400'} flex">
                        ${isRead ? 
                            `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7M5 18l4 4L19 12" style="transform:translateY(-2px)"/></svg>` : 
                            `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`
                        }
                    </span>
                `;
            } else if (msg.status !== 'read') {
                // If partner's message is not read, mark it read via Gun!
                db_msgs.get(msg.id).get('status').put('read');
            }

            const bubbleClass = isMe 
                ? 'bg-gradient-to-br from-premiumBlue to-blue-500 text-white rounded-2xl rounded-br-sm shadow-md'
                : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm';

            msgEl.innerHTML = `
                ${avatarHtml}
                <div class="max-w-[75%] px-4 py-2 ${bubbleClass}">
                    ${imageHtml}
                    ${msg.text ? `<p class="text-sm md:text-base leading-relaxed break-words">${msg.text}</p>` : ''}
                    <div class="flex items-center justify-end mt-1 space-x-1 opacity-80">
                        <span class="text-[10px] font-medium tracking-wide ${isMe ? 'text-blue-50' : 'text-gray-400'}">${formatTime(msg.timestamp)}</span>
                        ${statusHtml}
                    </div>
                </div>
            `;
            chatMessages.appendChild(msgEl);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- Sending Messages ---
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        
        if (!text && !pendingChatImage) return;

        const msgId = Date.now().toString();
        const newMsg = {
            id: msgId,
            senderId: currentUser,
            text: text,
            imageUrl: pendingChatImage || '',
            status: 'sent',
            timestamp: new Date().toISOString()
        };

        // Publish to Realtime DB
        db_msgs.get(msgId).put(newMsg);
        
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        pendingChatImage = null;
        imagePreviewContainer.classList.add('hidden');
        imagePreview.src = '';
        chatImageUpload.value = '';
    });

    // --- Chat Image Upload Logic ---
    attachBtn.addEventListener('click', () => {
        chatImageUpload.click();
    });

    chatImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            compressImage(file, 800, (compressedDataUrl) => {
                pendingChatImage = compressedDataUrl;
                imagePreview.src = compressedDataUrl;
                imagePreviewContainer.classList.remove('hidden');
            });
        }
    });

    removeImageBtn.addEventListener('click', () => {
        pendingChatImage = null;
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
        chatImageUpload.value = '';
    });

    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            messageForm.dispatchEvent(new Event('submit'));
        }
    });

    // --- Presence (Online Status) Logic ---
    let heartbeatInterval;
    function startHeartbeat() {
        if(heartbeatInterval) clearInterval(heartbeatInterval);
        const beat = () => {
            if(!currentUser) return;
            // Ping DB with current time
            db_presence.get(currentUser).put(Date.now());
            updateLastSeen(); 
        };
        beat();
        heartbeatInterval = setInterval(beat, 5000); // 5 sec
    }

    function updateLastSeen() {
        const partnerId = currentUser === 'me' ? 'partner' : 'me';
        const lastSeen = presenceData[partnerId];
        
        if (!lastSeen) {
            partnerLastSeenEl.textContent = 'Bağlantı bekleniyor...';
            partnerOnlineIndicator.className = 'absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white';
            return;
        }

        const diff = Date.now() - lastSeen;
        if (diff < 15000) { // 15 seconds buffer for online status
            partnerLastSeenEl.innerHTML = `Çevrimiçi <span class="w-1.5 h-1.5 rounded-full bg-premiumBlue animate-pulse inline-block mb-0.5 ml-0.5"></span>`;
            partnerLastSeenEl.className = 'text-xs text-premiumBlue font-medium flex items-center';
            partnerOnlineIndicator.className = 'absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white online-pulse';
        } else {
            const date = new Date(lastSeen);
            const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            
            const today = new Date();
            const isToday = date.getDate() == today.getDate() && date.getMonth() == today.getMonth() && date.getFullYear() == today.getFullYear();
            
            const dateStr = isToday ? `Bugün ${timeStr}` : date.toLocaleDateString('tr-TR') + ` ${timeStr}`;
            
            partnerLastSeenEl.textContent = `Son görülme: ${dateStr}`;
            partnerLastSeenEl.className = 'text-xs text-gray-500 font-medium';
            partnerOnlineIndicator.className = 'absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white';
        }
    }

    // Trigger local update occasionally in case partner goes offline and no network events fire
    setInterval(() => { if(currentUser) updateLastSeen(); }, 10000);

    // --- Profile Modal Logic ---
    let pendingProfileAvatar = null;

    function openProfile() {
        const myProfile = profiles[currentUser];
        editName.value = myProfile.name;
        
        if (myProfile.avatar && myProfile.avatar.startsWith('data:image/')) {
            editAvatar.value = '';
            pendingProfileAvatar = myProfile.avatar;
        } else {
            editAvatar.value = myProfile.avatar;
            pendingProfileAvatar = null;
        }
        
        renderAvatar(myProfile.avatar, profileAvatarEmoji, profileAvatarImg);
        
        profileModal.classList.remove('hidden');
        setTimeout(() => profileModal.classList.add('modal-active'), 10);
    }

    function closeProfile() {
        profileModal.classList.remove('modal-active');
        setTimeout(() => profileModal.classList.add('hidden'), 300);
    }

    profileBtn.addEventListener('click', openProfile);
    closeProfileBtn.addEventListener('click', closeProfile);
    
    profileAvatarPreviewContainer.addEventListener('click', () => {
        profileImageUpload.click();
    });

    profileImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            compressImage(file, 200, (compressedDataUrl) => {
                pendingProfileAvatar = compressedDataUrl;
                renderAvatar(compressedDataUrl, profileAvatarEmoji, profileAvatarImg);
                editAvatar.value = '';
            });
        }
    });

    editAvatar.addEventListener('input', () => {
        if (editAvatar.value.trim().length > 0) {
            pendingProfileAvatar = null;
            renderAvatar(editAvatar.value, profileAvatarEmoji, profileAvatarImg);
        }
    });
    
    saveProfileBtn.addEventListener('click', () => {
        const newName = editName.value.trim() || profiles[currentUser].name;
        let newAvatar = profiles[currentUser].avatar;
        
        if (pendingProfileAvatar) {
            newAvatar = pendingProfileAvatar;
        } else if (editAvatar.value.trim()) {
            newAvatar = editAvatar.value.trim();
        }
        
        // Publish to Gun.js
        db_profiles.get(currentUser).put({
            name: newName,
            avatar: newAvatar
        });

        closeProfile();
    });

    logoutBtn.addEventListener('click', () => {
        if(heartbeatInterval) clearInterval(heartbeatInterval);
        currentUser = null;
        localStorage.removeItem('pampisUp_currentUser');
        closeProfile();
        showLogin();
    });

    // Start App
    init();
});
