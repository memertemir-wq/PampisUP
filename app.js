document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const USERS = {
        '0589': 'me',
        '2009': 'partner'
    };
    
    // Default Profiles
    const defaultProfiles = {
        'me': { name: 'Aşkım', avatar: '🦋' },
        'partner': { name: 'Pampiş', avatar: '❤️' }
    };

    let currentUser = localStorage.getItem('pampisUp_currentUser');
    
    // Initialize Profiles if not exist
    if (!localStorage.getItem('pampisUp_profiles')) {
        localStorage.setItem('pampisUp_profiles', JSON.stringify(defaultProfiles));
    }

    // Initialize Messages if not exist
    if (!localStorage.getItem('pampisUp_messages')) {
        localStorage.setItem('pampisUp_messages', JSON.stringify([]));
    }

    // Initialize Presence
    if (!localStorage.getItem('pampisUp_presence')) {
        localStorage.setItem('pampisUp_presence', JSON.stringify({ 'me': 0, 'partner': 0 }));
    }

    let pendingChatImage = null; // Stores Base64 of image to send

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

    // Chat Image Upload Elements
    const attachBtn = document.getElementById('attach-btn');
    const chatImageUpload = document.getElementById('chat-image-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    // Profile Modal Elements
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

    // --- Initialization ---
    function init() {
        if (currentUser) {
            showChat();
            loadProfileInfo();
            renderMessages();
            updateLastSeen();
            startHeartbeat();
        } else {
            showLogin();
        }
    }

    // --- UI Switches ---
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

    // --- Login Logic ---
    function handleLogin() {
        const pass = passwordInput.value.trim();
        if (USERS[pass]) {
            currentUser = USERS[pass];
            localStorage.setItem('pampisUp_currentUser', currentUser);
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

    // --- Image Compression Utility ---
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
                // Kompresyon: Kaliteyi hafif düşür, JPEG olarak kaydet
                callback(canvas.toDataURL('image/jpeg', 0.6)); 
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // --- Helper: Render Avatar ---
    function renderAvatar(avatarData, emojiEl, imgEl) {
        if (avatarData.startsWith('data:image/')) {
            emojiEl.classList.add('hidden');
            imgEl.src = avatarData;
            imgEl.classList.remove('hidden');
        } else {
            imgEl.classList.add('hidden');
            imgEl.src = '';
            emojiEl.textContent = avatarData;
            emojiEl.classList.remove('hidden');
        }
    }

    // --- Chat Logic ---
    function getProfiles() {
        return JSON.parse(localStorage.getItem('pampisUp_profiles'));
    }

    function getMessages() {
        return JSON.parse(localStorage.getItem('pampisUp_messages'));
    }

    function loadProfileInfo() {
        const profiles = getProfiles();
        const partnerId = currentUser === 'me' ? 'partner' : 'me';
        partnerNameEl.textContent = profiles[partnerId].name;
        renderAvatar(profiles[partnerId].avatar, partnerAvatarEmojiEl, partnerAvatarImgEl);
    }

    function markMessagesAsRead() {
        let messages = getMessages();
        let changed = false;
        messages = messages.map(msg => {
            if (msg.senderId !== currentUser && msg.status !== 'read') {
                changed = true;
                return { ...msg, status: 'read' };
            }
            return msg;
        });
        if (changed) {
            localStorage.setItem('pampisUp_messages', JSON.stringify(messages));
        }
    }

    function renderMessages() {
        markMessagesAsRead(); // Okunmamış mesajları okundu işaretle
        const messages = getMessages();
        chatMessages.innerHTML = '';
        
        const profiles = getProfiles();
        let lastDate = '';

        messages.forEach(msg => {
            const isMe = msg.senderId === currentUser;
            const profile = profiles[msg.senderId];
            
            // Format time
            const msgDate = new Date(msg.timestamp);
            const timeStr = msgDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            
            // Date separator
            const dateStr = msgDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
            if (dateStr !== lastDate) {
                const dateEl = document.createElement('div');
                dateEl.className = 'w-full flex justify-center my-4';
                dateEl.innerHTML = `<span class="bg-gray-100/80 backdrop-blur-md text-gray-500 text-xs font-semibold py-1.5 px-4 rounded-full shadow-sm border border-gray-200">${dateStr}</span>`;
                chatMessages.appendChild(dateEl);
                lastDate = dateStr;
            }

            // Tick Icon (Only for sender)
            let tickHtml = '';
            if (isMe) {
                if (msg.status === 'read') {
                    // Double Blue Tick (Read)
                    tickHtml = `<svg class="w-3.5 h-3.5 text-blue-400 inline-block ml-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path><path stroke-linecap="round" stroke-linejoin="round" d="M1 13l4 4M15 7l-4 4"></path></svg>`;
                } else {
                    // Single Gray Tick (Sent)
                    tickHtml = `<svg class="w-3 h-3 text-blue-200 inline-block ml-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>`;
                }
            }

            // Image attachment
            let imageHtml = '';
            if (msg.imageUrl) {
                imageHtml = `<img src="${msg.imageUrl}" class="w-full max-w-[240px] rounded-xl mb-2 object-cover border border-white/20">`;
            }

            // Message text (if any)
            let textHtml = '';
            if (msg.text) {
                textHtml = `<p class="text-[15px] leading-relaxed break-words whitespace-pre-wrap ${!isMe && !msg.imageUrl ? 'mt-1' : ''}">${msg.text}</p>`;
            }

            const bubble = document.createElement('div');
            bubble.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-3`;
            
            bubble.innerHTML = `
                <div class="message-bubble ${isMe ? 'message-sent' : 'message-received'} max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                    ${!isMe ? `<span class="text-[11px] font-semibold text-gray-500 mb-1 ml-1">${profile.name}</span>` : ''}
                    <div class="${isMe ? 'bg-gradient-to-br from-premiumBlue to-indigo-600 text-white rounded-2xl rounded-br-sm shadow-md shadow-blue-500/20' : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100'} p-2 relative group min-w-[80px]">
                        ${imageHtml}
                        <div class="px-2 pb-1 flex flex-col">
                            ${textHtml}
                            <div class="flex items-center justify-end mt-1 space-x-1">
                                <span class="text-[10px] ${isMe ? 'text-blue-100' : 'text-gray-400'} opacity-90">${timeStr}</span>
                                ${tickHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            chatMessages.appendChild(bubble);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- Message Input Logic ---
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        
        if (!text && !pendingChatImage) return;

        const messages = getMessages();
        messages.push({
            id: Date.now().toString(),
            senderId: currentUser,
            text: text,
            imageUrl: pendingChatImage,
            status: 'sent', // Initially sent
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('pampisUp_messages', JSON.stringify(messages));
        
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Clear pending image
        pendingChatImage = null;
        imagePreviewContainer.classList.add('hidden');
        imagePreview.src = '';
        chatImageUpload.value = '';

        renderMessages();
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

    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Submit on Enter
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            messageForm.dispatchEvent(new Event('submit'));
        }
    });

    // --- Presence & Heartbeat Logic ---
    let heartbeatInterval;
    function startHeartbeat() {
        if(heartbeatInterval) clearInterval(heartbeatInterval);
        const beat = () => {
            if(!currentUser) return;
            let presence = JSON.parse(localStorage.getItem('pampisUp_presence') || '{}');
            presence[currentUser] = Date.now();
            localStorage.setItem('pampisUp_presence', JSON.stringify(presence));
            updateLastSeen(presence); // update UI
        };
        beat();
        heartbeatInterval = setInterval(beat, 5000); // 5 sec
    }

    function updateLastSeen(presenceData = null) {
        const presence = presenceData || JSON.parse(localStorage.getItem('pampisUp_presence') || '{}');
        const partnerId = currentUser === 'me' ? 'partner' : 'me';
        const lastSeen = presence[partnerId];
        
        if (!lastSeen) {
            partnerLastSeenEl.textContent = 'Bağlantı yok';
            partnerOnlineIndicator.className = 'absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white';
            return;
        }

        const diff = Date.now() - lastSeen;
        if (diff < 12000) { // 12 seconds buffer
            partnerLastSeenEl.innerHTML = `Çevrimiçi <span class="w-1.5 h-1.5 rounded-full bg-premiumBlue animate-pulse inline-block mb-0.5 ml-0.5"></span>`;
            partnerLastSeenEl.className = 'text-xs text-premiumBlue font-medium flex items-center';
            partnerOnlineIndicator.className = 'absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white online-pulse';
        } else {
            const date = new Date(lastSeen);
            const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            
            // Check if today
            const today = new Date();
            const isToday = date.getDate() == today.getDate() && date.getMonth() == today.getMonth() && date.getFullYear() == today.getFullYear();
            
            const dateStr = isToday ? `Bugün ${timeStr}` : date.toLocaleDateString('tr-TR') + ` ${timeStr}`;
            
            partnerLastSeenEl.textContent = `Son görülme: ${dateStr}`;
            partnerLastSeenEl.className = 'text-xs text-gray-500 font-medium';
            partnerOnlineIndicator.className = 'absolute -bottom-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white';
        }
    }

    // --- Sync Across Tabs ---
    window.addEventListener('storage', (e) => {
        if (!currentUser) return;
        
        if (e.key === 'pampisUp_messages') {
            renderMessages();
        }
        if (e.key === 'pampisUp_profiles') {
            loadProfileInfo();
            renderMessages();
        }
        if (e.key === 'pampisUp_presence') {
            updateLastSeen(JSON.parse(e.newValue));
        }
    });

    // --- Profile Modal Logic ---
    let pendingProfileAvatar = null;

    function openProfile() {
        const profiles = getProfiles();
        const myProfile = profiles[currentUser];
        
        editName.value = myProfile.name;
        // Eğer avatar resimse inputu boşaltıp görseli gösteriyoruz, değilse text olarak gösteriyoruz
        if (myProfile.avatar.startsWith('data:image/')) {
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
    
    // Profil fotoğrafı yükleme tetikleyicisi
    profileAvatarPreviewContainer.addEventListener('click', () => {
        profileImageUpload.click();
    });

    profileImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            compressImage(file, 200, (compressedDataUrl) => { // 200px yeterli
                pendingProfileAvatar = compressedDataUrl;
                renderAvatar(compressedDataUrl, profileAvatarEmoji, profileAvatarImg);
                editAvatar.value = ''; // Emoji kutusunu temizle
            });
        }
    });

    // Eğer kullanıcı manuel olarak emoji yazarsa yüklenen resmi iptal et
    editAvatar.addEventListener('input', () => {
        if (editAvatar.value.trim().length > 0) {
            pendingProfileAvatar = null;
            renderAvatar(editAvatar.value, profileAvatarEmoji, profileAvatarImg);
        }
    });
    
    saveProfileBtn.addEventListener('click', () => {
        const profiles = getProfiles();
        profiles[currentUser].name = editName.value.trim() || profiles[currentUser].name;
        
        // Eğer bekleyen bir resim varsa onu kullan, yoksa inputtaki text/emojiyi kullan
        if (pendingProfileAvatar) {
            profiles[currentUser].avatar = pendingProfileAvatar;
        } else if (editAvatar.value.trim()) {
            profiles[currentUser].avatar = editAvatar.value.trim();
        }
        
        localStorage.setItem('pampisUp_profiles', JSON.stringify(profiles));
        loadProfileInfo();
        renderMessages();
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
