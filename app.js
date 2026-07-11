document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 🔥 FIREBASE VERİTABANI BAĞLANTISI 🔥
    // ==========================================
    const firebaseConfig = {
        apiKey: "AIzaSyDPPvwqpAVC_6cqb0p2hrOaRkB023sO65w",
        authDomain: "pampisup.firebaseapp.com",
        databaseURL: "https://pampisup-default-rtdb.firebaseio.com",
        projectId: "pampisup",
        storageBucket: "pampisup.firebasestorage.app",
        messagingSenderId: "1011672061391",
        appId: "1:1011672061391:web:d478321ef0fb92a34f2eba"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();
    const msgsRef = db.ref('pampisUp/messages');
    const profilesRef = db.ref('pampisUp/profiles');
    const presenceRef = db.ref('pampisUp/presence');
    const storiesRef = db.ref('pampisUp/stories');

    // --- State & Config ---
    const USERS = {
        '0589': 'me',
        '2009': 'partner'
    };
    
    let messagesObj = {}; 
    let storiesObj = {};
    let profiles = {
        'me': { name: 'Aşkım', avatar: '🦋' },
        'partner': { name: 'Pampiş', avatar: '❤️' }
    };
    let presenceData = { 'me': 0, 'partner': 0 };

    let currentUser = localStorage.getItem('pampisUp_currentUser');
    let pendingChatImage = null;
    let isSending = false;
    let replyingToId = null;

    // --- DOM Elements ---
    const loginScreen = document.getElementById('login-screen');
    const chatScreen = document.getElementById('chat-screen');
    const passwordInput = document.getElementById('password-input');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    const chatMessages = document.getElementById('chat-messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    const partnerNameEl = document.getElementById('partner-name');
    const partnerAvatarEmojiEl = document.getElementById('partner-avatar-emoji');
    const partnerAvatarImgEl = document.getElementById('partner-avatar-img');
    const partnerOnlineIndicator = document.getElementById('partner-online-indicator');
    const partnerLastSeenEl = document.getElementById('partner-last-seen');

    const attachBtn = document.getElementById('attach-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const chatImageUpload = document.getElementById('chat-image-upload');
    const cameraUpload = document.getElementById('camera-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    // Reply Elements
    const replyPreviewContainer = document.getElementById('reply-preview-container');
    const replyPreviewName = document.getElementById('reply-preview-name');
    const replyPreviewText = document.getElementById('reply-preview-text');
    const closeReplyBtn = document.getElementById('close-reply-btn');

    // Stories Elements
    const openStoriesMenuBtn = document.getElementById('open-stories-menu-btn');
    const storiesMenuModal = document.getElementById('stories-menu-modal');
    const storiesMenuContent = document.getElementById('stories-menu-content');
    const closeStoriesMenuBtn = document.getElementById('close-stories-menu-btn');
    const storiesUnseenIndicator = document.getElementById('stories-unseen-indicator');
    
    const addStoryBtn = document.getElementById('add-story-btn');
    const storyUploadInput = document.getElementById('story-upload-input');
    const storiesContainer = document.getElementById('stories-container');
    const myStoryAvatarPreview = document.getElementById('my-story-avatar-preview');
    
    const storyModal = document.getElementById('story-modal');
    const storyModalImg = document.getElementById('story-modal-img');
    const storyTapLeft = document.getElementById('story-tap-left');
    const storyTapRight = document.getElementById('story-tap-right');
    const closeStoryBtn = document.getElementById('close-story-btn');
    const deleteStoryBtn = document.getElementById('delete-story-btn');
    const storyProgressContainer = document.getElementById('story-progress-container');

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
    const themeBtn = document.getElementById('theme-btn');

    // --- Koyu Tema (Dark Mode) ---
    let isDarkMode = localStorage.getItem('pampisUp_theme') === 'dark';
    function applyTheme() {
        const moon = document.getElementById('theme-icon-moon');
        const sun = document.getElementById('theme-icon-sun');
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            moon.classList.add('hidden');
            sun.classList.remove('hidden');
            document.getElementById('theme-color-meta').content = '#0f172a';
        } else {
            document.documentElement.classList.remove('dark');
            sun.classList.add('hidden');
            moon.classList.remove('hidden');
            document.getElementById('theme-color-meta').content = '#2563eb';
        }
    }
    applyTheme();

    themeBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        localStorage.setItem('pampisUp_theme', isDarkMode ? 'dark' : 'light');
        applyTheme();
    });

    // --- Firebase Dinleyicileri (Gerçek Zamanlı) ---
    function setupRealtimeListeners() {
        msgsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            messagesObj = data || {};
            renderMessages();
        });

        profilesRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if(data.me) profiles.me = data.me;
                if(data.partner) profiles.partner = data.partner;
                loadProfileInfo();
                renderMessages();
                renderStories();
            }
        });

        presenceRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if(data.me) presenceData.me = data.me;
                if(data.partner) presenceData.partner = data.partner;
                updateLastSeen();
            }
        });

        storiesRef.on('value', (snapshot) => {
            const data = snapshot.val();
            storiesObj = data || {};
            renderStories();
        });
    }

    // --- Initialization ---
    function init() {
        if (currentUser) {
            showChat();
            setupRealtimeListeners();
            loadProfileInfo();
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
            profilesRef.child(currentUser).set(profiles[currentUser]);
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

    // --- Utilities ---
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

    function formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    // --- Reply Feature ---
    function startReplying(msg) {
        replyingToId = msg.id;
        const isMe = msg.senderId === currentUser;
        replyPreviewName.textContent = isMe ? profiles[currentUser].name : profiles[msg.senderId].name;
        replyPreviewText.textContent = msg.text ? msg.text : '📷 Fotoğraf';
        replyPreviewContainer.classList.remove('hidden');
        messageInput.focus();
    }

    closeReplyBtn.addEventListener('click', () => {
        replyingToId = null;
        replyPreviewContainer.classList.add('hidden');
    });

    // --- Message Rendering ---
    function renderMessages() {
        const prevScrollHeight = chatMessages.scrollHeight;
        const isScrolledToBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 50;

        chatMessages.innerHTML = '';
        const partnerId = currentUser === 'me' ? 'partner' : 'me';
        const partnerProfile = profiles[partnerId];

        const msgsArray = Object.values(messagesObj).filter(m => m && m.id).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        msgsArray.forEach(msg => {
            const isMe = msg.senderId === currentUser;
            const msgEl = document.createElement('div');
            msgEl.className = `flex ${isMe ? 'justify-end' : 'justify-start'} animate-bubbleIn relative group transition-transform duration-200`;

            let avatarHtml = '';
            if (!isMe) {
                if (partnerProfile.avatar.startsWith('data:image/')) {
                    avatarHtml = `<img src="${partnerProfile.avatar}" class="w-8 h-8 rounded-full object-cover shadow-sm self-end mr-2 shrink-0">`;
                } else {
                    avatarHtml = `<div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center text-lg shadow-sm self-end mr-2 shrink-0">${partnerProfile.avatar}</div>`;
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
                    <span class="ml-2 text-[10px] ${isRead ? 'text-blue-200' : 'text-blue-400'} flex">
                        ${isRead ? 
                            `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7M5 18l4 4L19 12" style="transform:translateY(-2px)"/></svg>` : 
                            `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`
                        }
                    </span>
                `;
            } else if (msg.status !== 'read') {
                msgsRef.child(msg.id).update({ status: 'read' });
            }

            const bubbleClass = isMe 
                ? 'bg-gradient-to-br from-premiumBlue to-blue-500 text-white rounded-2xl rounded-br-sm shadow-md'
                : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-2xl rounded-bl-sm shadow-sm';

            // Check if this message is replying to another message
            let replyHtml = '';
            if (msg.replyTo && messagesObj[msg.replyTo]) {
                const repliedMsg = messagesObj[msg.replyTo];
                const repliedIsMe = repliedMsg.senderId === currentUser;
                const repliedName = repliedIsMe ? 'Sen' : profiles[repliedMsg.senderId].name;
                const repliedText = repliedMsg.text ? repliedMsg.text : '📷 Fotoğraf';
                
                replyHtml = `
                    <div class="mb-1.5 p-2 bg-black/10 dark:bg-white/10 rounded-lg border-l-4 border-white/50 cursor-pointer" onclick="document.getElementById('msg-${msg.replyTo}').scrollIntoView({behavior:'smooth'})">
                        <span class="block text-[11px] font-bold ${isMe ? 'text-blue-100' : 'text-premiumBlue dark:text-blue-400'}">${repliedName}</span>
                        <span class="block text-xs truncate ${isMe ? 'text-blue-50' : 'text-gray-500 dark:text-gray-300'}">${repliedText}</span>
                    </div>
                `;
            }

            msgEl.id = `msg-${msg.id}`;
            msgEl.innerHTML = `
                ${avatarHtml}
                <div class="max-w-[75%] px-4 py-2 ${bubbleClass}">
                    ${replyHtml}
                    ${imageHtml}
                    ${msg.text ? `<p class="text-[15px] leading-relaxed break-words whitespace-pre-wrap">${msg.text}</p>` : ''}
                    <div class="flex items-center justify-end mt-1 space-x-1 opacity-80">
                        <span class="text-[10px] font-medium tracking-wide ${isMe ? 'text-blue-50' : 'text-gray-400 dark:text-gray-400'}">${formatTime(msg.timestamp)}</span>
                        ${statusHtml}
                    </div>
                </div>
            `;
            
            // Swipe to Reply Logic
            let touchStartX = 0;
            let currentTranslate = 0;
            
            msgEl.addEventListener('touchstart', e => {
                touchStartX = e.touches[0].clientX;
                msgEl.style.transition = 'none';
            }, {passive: true});
            
            msgEl.addEventListener('touchmove', e => {
                const touchX = e.touches[0].clientX;
                const diff = touchX - touchStartX;
                if (diff > 0 && diff < 80) {
                    currentTranslate = diff;
                    msgEl.style.transform = `translateX(${diff}px)`;
                }
            }, {passive: true});

            msgEl.addEventListener('touchend', e => {
                msgEl.style.transition = 'transform 0.2s ease-out';
                msgEl.style.transform = 'translateX(0)';
                if (currentTranslate > 50) {
                    startReplying(msg);
                }
                currentTranslate = 0;
            }, {passive: true});

            chatMessages.appendChild(msgEl);
        });

        if (isScrolledToBottom || prevScrollHeight === 0) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // --- Sending Messages (Fixed Double Send) ---
    function submitMessage() {
        if (isSending) return;
        const text = messageInput.value.trim();
        if (!text && !pendingChatImage) return;

        isSending = true;

        const msgId = Date.now().toString();
        const newMsg = {
            id: msgId,
            senderId: currentUser,
            text: text,
            imageUrl: pendingChatImage || '',
            status: 'sent',
            timestamp: new Date().toISOString()
        };

        if (replyingToId) {
            newMsg.replyTo = replyingToId;
        }

        msgsRef.child(msgId).set(newMsg).then(() => {
            isSending = false;
        }).catch(() => {
            isSending = false;
        });
        
        // Reset Inputs
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        pendingChatImage = null;
        imagePreviewContainer.classList.add('hidden');
        imagePreview.src = '';
        chatImageUpload.value = '';
        cameraUpload.value = '';

        // Reset Reply
        replyingToId = null;
        replyPreviewContainer.classList.add('hidden');

        // Optimistic scroll
        setTimeout(() => chatMessages.scrollTop = chatMessages.scrollHeight, 50);
    }

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitMessage();
    });

    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Sadece Enter'ı yakala, mobildeki Go/Return tuşunu ayırt etmek zordur, 
    // masaüstü veya klavyeli cihazlar için Enter tuşu ile gönderim sağlar.
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitMessage();
        }
    });

    // --- Image & Camera Upload Logic ---
    attachBtn.addEventListener('click', () => {
        chatImageUpload.click();
    });

    cameraBtn.addEventListener('click', () => {
        cameraUpload.click();
    });

    function handleImageSelection(e) {
        const file = e.target.files[0];
        if (file) {
            compressImage(file, 800, (compressedDataUrl) => {
                pendingChatImage = compressedDataUrl;
                imagePreview.src = compressedDataUrl;
                imagePreviewContainer.classList.remove('hidden');
            });
        }
    }

    chatImageUpload.addEventListener('change', handleImageSelection);
    cameraUpload.addEventListener('change', handleImageSelection);

    removeImageBtn.addEventListener('click', () => {
        pendingChatImage = null;
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
        chatImageUpload.value = '';
        cameraUpload.value = '';
    });

    // --- Stories Logic ---
    function openStoriesMenu() {
        storiesMenuModal.classList.remove('hidden');
        // Give a tiny delay for browser to register display:block before transitioning opacity
        setTimeout(() => {
            storiesMenuModal.classList.remove('opacity-0');
            storiesMenuContent.classList.remove('translate-y-full');
        }, 10);
    }

    function closeStoriesMenu() {
        storiesMenuModal.classList.add('opacity-0');
        storiesMenuContent.classList.add('translate-y-full');
        setTimeout(() => {
            storiesMenuModal.classList.add('hidden');
        }, 300);
    }

    openStoriesMenuBtn.addEventListener('click', openStoriesMenu);
    closeStoriesMenuBtn.addEventListener('click', closeStoriesMenu);
    
    // Close modal if clicked outside
    storiesMenuModal.addEventListener('click', (e) => {
        if (e.target === storiesMenuModal) {
            closeStoriesMenu();
        }
    });

    addStoryBtn.addEventListener('click', () => {
        storyUploadInput.click();
    });

    storyUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Compress less for stories
            compressImage(file, 1000, (dataUrl) => {
                const storyId = Date.now().toString();
                storiesRef.child(storyId).set({
                    id: storyId,
                    senderId: currentUser,
                    imageUrl: dataUrl,
                    timestamp: new Date().toISOString()
                });
                storyUploadInput.value = '';
            });
        }
    });

    let currentStoryList = [];
    let currentStoryIndex = 0;
    let storyProgressInterval;

    function renderStories() {
        storiesContainer.innerHTML = '';
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;
        
        let activeStories = Object.values(storiesObj).filter(s => {
            const timeDiff = now - new Date(s.timestamp).getTime();
            if (timeDiff > ONE_DAY) {
                storiesRef.child(s.id).remove();
                return false;
            }
            return true;
        });

        let groupedStories = { 'me': [], 'partner': [] };
        activeStories.forEach(s => {
            if(groupedStories[s.senderId]) groupedStories[s.senderId].push(s);
        });

        // My Story Button Preview
        if (groupedStories[currentUser].length > 0) {
            const latestMyStory = groupedStories[currentUser][groupedStories[currentUser].length - 1];
            myStoryAvatarPreview.src = latestMyStory.imageUrl;
            myStoryAvatarPreview.classList.remove('hidden');
        } else {
            myStoryAvatarPreview.classList.add('hidden');
        }

        // Partner Stories
        const partnerId = currentUser === 'me' ? 'partner' : 'me';
        if (groupedStories[partnerId].length > 0) {
            const partnerStoryBubble = document.createElement('div');
            partnerStoryBubble.className = "flex flex-col items-center space-y-1.5 cursor-pointer shrink-0";
            
            let viewedStories = JSON.parse(localStorage.getItem('pampisUp_viewedStories') || '[]');
            const allViewed = groupedStories[partnerId].every(s => viewedStories.includes(s.id));
            
            // Handle unseen indicator on the top header button
            if (!allViewed) {
                storiesUnseenIndicator.classList.remove('hidden');
            } else {
                storiesUnseenIndicator.classList.add('hidden');
            }

            const ringColor = allViewed ? 'border-gray-300 dark:border-gray-600' : 'border-premiumRed';

            let avatarContent = profiles[partnerId].avatar.startsWith('data:image/') 
                ? `<img src="${profiles[partnerId].avatar}" class="w-full h-full object-cover">`
                : `<span class="text-2xl">${profiles[partnerId].avatar}</span>`;

            partnerStoryBubble.innerHTML = `
                <div class="w-16 h-16 rounded-full border-[3px] ${ringColor} p-0.5 shadow-sm">
                    <div class="w-full h-full rounded-full bg-blue-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
                        ${avatarContent}
                    </div>
                </div>
                <span class="text-[11px] font-semibold text-gray-800 dark:text-gray-200">${profiles[partnerId].name}</span>
            `;

            partnerStoryBubble.addEventListener('click', () => {
                openStoryModal(groupedStories[partnerId], partnerId);
            });
            storiesContainer.appendChild(partnerStoryBubble);
        } else {
            storiesUnseenIndicator.classList.add('hidden');
        }
        
        // Also allow clicking 'Sen' to view own stories
        const senText = addStoryBtn.querySelector('span');
        senText.onclick = (e) => {
            if (groupedStories[currentUser].length > 0) {
                e.stopPropagation();
                openStoryModal(groupedStories[currentUser], currentUser);
            }
        };
    }

    function openStoryModal(storyList, ownerId) {
        currentStoryList = storyList.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
        currentStoryIndex = 0;
        
        document.getElementById('story-modal-name').textContent = profiles[ownerId].name;
        const avatarContainer = document.getElementById('story-modal-avatar-container');
        if (profiles[ownerId].avatar.startsWith('data:image/')) {
            avatarContainer.innerHTML = `<img src="${profiles[ownerId].avatar}" class="w-full h-full object-cover">`;
        } else {
            avatarContainer.innerHTML = profiles[ownerId].avatar;
        }

        if (ownerId === currentUser) {
            deleteStoryBtn.classList.remove('hidden');
        } else {
            deleteStoryBtn.classList.add('hidden');
        }

        storyModal.classList.remove('hidden');
        setTimeout(() => storyModal.classList.remove('opacity-0'), 10);
        showStory(currentStoryIndex);
    }

    function showStory(index) {
        if (index < 0 || index >= currentStoryList.length) {
            closeStory();
            return;
        }
        const story = currentStoryList[index];
        storyModalImg.src = story.imageUrl;
        
        const date = new Date(story.timestamp);
        const diffHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
        document.getElementById('story-modal-time').textContent = diffHours > 0 ? `${diffHours}s` : 'Az önce';

        if (story.senderId !== currentUser) {
            let viewed = JSON.parse(localStorage.getItem('pampisUp_viewedStories') || '[]');
            if(!viewed.includes(story.id)) {
                viewed.push(story.id);
                localStorage.setItem('pampisUp_viewedStories', JSON.stringify(viewed));
                renderStories();
            }
        }

        renderStoryProgress(index);
        
        clearInterval(storyProgressInterval);
        let progress = 0;
        const activeBar = document.getElementById(`story-prog-${index}`);
        storyProgressInterval = setInterval(() => {
            progress += 2; 
            if(activeBar) activeBar.style.width = `${progress}%`;
            if (progress >= 100) {
                clearInterval(storyProgressInterval);
                showStory(index + 1);
            }
        }, 100);
    }

    function renderStoryProgress(activeIndex) {
        storyProgressContainer.innerHTML = '';
        currentStoryList.forEach((_, i) => {
            const barBg = document.createElement('div');
            barBg.className = "flex-1 h-1 bg-white/30 rounded-full overflow-hidden";
            const barFill = document.createElement('div');
            barFill.id = `story-prog-${i}`;
            barFill.className = "h-full bg-white transition-all duration-100 ease-linear";
            
            if (i < activeIndex) barFill.style.width = '100%';
            else if (i === activeIndex) barFill.style.width = '0%';
            else barFill.style.width = '0%';

            barBg.appendChild(barFill);
            storyProgressContainer.appendChild(barBg);
        });
    }

    storyTapRight.addEventListener('click', () => {
        clearInterval(storyProgressInterval);
        showStory(++currentStoryIndex);
    });

    storyTapLeft.addEventListener('click', () => {
        clearInterval(storyProgressInterval);
        showStory(--currentStoryIndex);
    });

    function closeStory() {
        clearInterval(storyProgressInterval);
        storyModal.classList.add('opacity-0');
        setTimeout(() => {
            storyModal.classList.add('hidden');
            storyModalImg.src = '';
        }, 300);
    }

    closeStoryBtn.addEventListener('click', closeStory);

    deleteStoryBtn.addEventListener('click', () => {
        if (confirm("Bu hikayeyi silmek istiyor musun?")) {
            const storyId = currentStoryList[currentStoryIndex].id;
            storiesRef.child(storyId).remove();
            closeStory();
        }
    });

    // --- Presence ---
    let heartbeatInterval;
    function startHeartbeat() {
        if(heartbeatInterval) clearInterval(heartbeatInterval);
        const beat = () => {
            if(!currentUser) return;
            presenceRef.child(currentUser).set(Date.now());
        };
        beat();
        heartbeatInterval = setInterval(beat, 5000);
    }

    function updateLastSeen() {
        const partnerId = currentUser === 'me' ? 'partner' : 'me';
        const lastSeen = presenceData[partnerId];
        
        if (!lastSeen) {
            partnerLastSeenEl.textContent = 'Bağlantı bekleniyor...';
            partnerOnlineIndicator.className = 'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gray-400 rounded-full border-2 border-white dark:border-slate-800';
            return;
        }

        const diff = Date.now() - lastSeen;
        if (diff < 15000) { 
            partnerLastSeenEl.innerHTML = `Çevrimiçi <span class="w-1.5 h-1.5 rounded-full bg-premiumBlue animate-pulse inline-block mb-0.5 ml-0.5"></span>`;
            partnerLastSeenEl.className = 'text-[11px] text-premiumBlue font-medium flex items-center';
            partnerOnlineIndicator.className = 'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-800 online-pulse';
        } else {
            const date = new Date(lastSeen);
            const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            
            const today = new Date();
            const isToday = date.getDate() == today.getDate() && date.getMonth() == today.getMonth() && date.getFullYear() == today.getFullYear();
            
            const dateStr = isToday ? `Bugün ${timeStr}` : date.toLocaleDateString('tr-TR') + ` ${timeStr}`;
            
            partnerLastSeenEl.textContent = `Son görülme: ${dateStr}`;
            partnerLastSeenEl.className = 'text-[11px] text-gray-500 dark:text-gray-400 font-medium';
            partnerOnlineIndicator.className = 'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gray-400 rounded-full border-2 border-white dark:border-slate-800';
        }
    }

    setInterval(() => { if(currentUser) updateLastSeen(); }, 10000);

    // --- Profile ---
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
        
        profilesRef.child(currentUser).set({
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

    // Start
    init();
});
