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

    // --- DOM Elements ---
    const loginScreen = document.getElementById('login-screen');
    const chatScreen = document.getElementById('chat-screen');
    const passwordInput = document.getElementById('password-input');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');

    const chatMessages = document.getElementById('chat-messages');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    
    const partnerNameEl = document.getElementById('partner-name');
    const partnerAvatarEl = document.getElementById('partner-avatar');

    // Profile Modal Elements
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const editName = document.getElementById('edit-name');
    const editAvatar = document.getElementById('edit-avatar');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Initialization ---
    function init() {
        if (currentUser) {
            showChat();
            loadProfileInfo();
            renderMessages();
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
            passwordInput.classList.add('border-cuteRed');
            setTimeout(() => passwordInput.classList.remove('border-cuteRed'), 2000);
        }
    }

    loginBtn.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

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
        partnerAvatarEl.textContent = profiles[partnerId].avatar;
    }

    function renderMessages() {
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
            
            // Simple date separator
            const dateStr = msgDate.toLocaleDateString('tr-TR');
            if (dateStr !== lastDate) {
                const dateEl = document.createElement('div');
                dateEl.className = 'w-full flex justify-center my-4';
                dateEl.innerHTML = `<span class="bg-gray-100/80 backdrop-blur-md text-gray-500 text-xs font-semibold py-1.5 px-4 rounded-full shadow-sm border border-gray-200">${dateStr}</span>`;
                chatMessages.appendChild(dateEl);
                lastDate = dateStr;
            }

            const bubble = document.createElement('div');
            bubble.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-3`;
            
            bubble.innerHTML = `
                <div class="message-bubble ${isMe ? 'message-sent' : 'message-received'} max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                    ${!isMe ? `<span class="text-[11px] font-semibold text-gray-500 mb-1 ml-1">${profile.name}</span>` : ''}
                    <div class="${isMe ? 'bg-gradient-to-br from-premiumBlue to-indigo-600 text-white rounded-2xl rounded-br-sm shadow-md shadow-blue-500/20' : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100'} px-4 py-2.5 relative group">
                        <p class="text-[15px] leading-relaxed break-words whitespace-pre-wrap">${msg.text}</p>
                        <span class="text-[10px] ${isMe ? 'text-blue-100' : 'text-gray-400'} float-right mt-2 ml-4 opacity-80">${timeStr}</span>
                    </div>
                </div>
            `;
            chatMessages.appendChild(bubble);
        });

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text) return;

        const messages = getMessages();
        messages.push({
            id: Date.now().toString(),
            senderId: currentUser,
            text: text,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('pampisUp_messages', JSON.stringify(messages));
        
        messageInput.value = '';
        messageInput.style.height = 'auto'; // reset textarea height
        renderMessages();
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    // Submit on Enter (without shift)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            messageForm.dispatchEvent(new Event('submit'));
        }
    });

    // --- Sync Across Tabs (Real-time Simulation) ---
    window.addEventListener('storage', (e) => {
        if (e.key === 'pampisUp_messages' && currentUser) {
            renderMessages();
        }
        if (e.key === 'pampisUp_profiles' && currentUser) {
            loadProfileInfo();
            renderMessages();
        }
    });

    // --- Profile Modal Logic ---
    function openProfile() {
        const profiles = getProfiles();
        const myProfile = profiles[currentUser];
        editName.value = myProfile.name;
        editAvatar.value = myProfile.avatar;
        
        profileModal.classList.remove('hidden');
        // Small delay to allow display:block to apply before animating opacity
        setTimeout(() => profileModal.classList.add('modal-active'), 10);
    }

    function closeProfile() {
        profileModal.classList.remove('modal-active');
        setTimeout(() => profileModal.classList.add('hidden'), 300); // match duration
    }

    profileBtn.addEventListener('click', openProfile);
    closeProfileBtn.addEventListener('click', closeProfile);
    
    saveProfileBtn.addEventListener('click', () => {
        const profiles = getProfiles();
        profiles[currentUser].name = editName.value.trim() || profiles[currentUser].name;
        profiles[currentUser].avatar = editAvatar.value.trim() || profiles[currentUser].avatar;
        
        localStorage.setItem('pampisUp_profiles', JSON.stringify(profiles));
        loadProfileInfo();
        renderMessages();
        closeProfile();
    });

    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('pampisUp_currentUser');
        closeProfile();
        showLogin();
    });

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => console.log('SW registered'))
                .catch(err => console.log('SW registration failed', err));
        });
    }

    // Start App
    init();
});
