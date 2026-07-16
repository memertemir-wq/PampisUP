import re

with open('/home/mertemir/Masaüstü/FADİME/pampisUp/app.js', 'r') as f:
    content = f.read()

# 1. Fix sendBtn events
content = re.sub(
    r"sendBtn\.addEventListener\('mousedown',.*?preventDefault\(\)\);",
    r"// sendBtn mousedown fixed",
    content, flags=re.DOTALL
)
content = re.sub(
    r"sendBtn\.addEventListener\('touchstart',.*?preventDefault\(\), \{passive: false\}\);",
    r"// sendBtn touchstart fixed",
    content, flags=re.DOTALL
)

# 2. Add Notification Permission in init()
init_replacement = """
    function init() {
        if (currentUser) {
            if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                Notification.requestPermission();
            }
            showChat();
            setupRealtimeListeners();
            loadProfileInfo();
            startHeartbeat();
        } else {
            showLogin();
        }
    }
"""
content = re.sub(r"function init\(\) \{[\s\S]*?showLogin\(\);\n\s*\}", init_replacement.strip(), content)

# 3. Add showNotification function
notification_func = """
    function showNotification(title, body) {
        if (Notification.permission === 'granted' && document.hidden) {
            new Notification(title, { body: body, icon: 'https://cdn-icons-png.flaticon.com/512/833/833472.png' });
        }
    }
"""
content = content.replace("// --- Reply Feature ---", notification_func + "\n    // --- Reply Feature ---")

# 4. Refactor Firebase listeners to incremental
realtime_old = """        msgsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            messagesObj = data || {};
            renderMessages();
        });"""

realtime_new = """        msgsRef.once('value', (snapshot) => {
            const data = snapshot.val();
            messagesObj = data || {};
            renderMessages();
            
            // Sonraki mesajları dinle
            msgsRef.on('child_added', (snap) => {
                const msg = snap.val();
                if (!messagesObj[msg.id]) {
                    messagesObj[msg.id] = msg;
                    renderSingleMessage(msg);
                    if (msg.senderId !== currentUser) {
                        showNotification(profiles[msg.senderId].name, msg.text || '📷 Fotoğraf gönderdi');
                    }
                }
            });
            msgsRef.on('child_changed', (snap) => {
                const msg = snap.val();
                messagesObj[msg.id] = msg;
                const oldEl = document.getElementById('msg-' + msg.id);
                if(oldEl) {
                    const tempDiv = document.createElement('div');
                    renderMessageIntoContainer(msg, tempDiv);
                    oldEl.innerHTML = tempDiv.firstChild.innerHTML;
                    setupMessageEvents(msg, oldEl);
                }
            });
        });"""
content = content.replace(realtime_old, realtime_new)

# 5. Extract single message render logic
render_refactor = """
    function setupMessageEvents(msg, msgEl) {
        let touchStartX = 0;
        let touchStartY = 0;
        let currentTranslate = 0;
        let isScrolling = false;
        let isSwiping = false;
        let pressTimer = null;
        
        msgEl.addEventListener('touchstart', e => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isScrolling = false;
            isSwiping = false;
            msgEl.style.transition = 'none';
            pressTimer = setTimeout(() => {
                if (!isScrolling && !isSwiping) {
                    openReactionMenu(msg.id);
                    if (navigator.vibrate) navigator.vibrate(50);
                }
            }, 400);
        }, {passive: true});
        
        msgEl.addEventListener('touchmove', e => {
            if (isScrolling) return;
            const diffX = e.touches[0].clientX - touchStartX;
            const diffY = e.touches[0].clientY - touchStartY;
            if (!isSwiping && !isScrolling) {
                if (Math.abs(diffY) > 10) { isScrolling = true; clearTimeout(pressTimer); return; }
                if (Math.abs(diffX) > 10) { isSwiping = true; clearTimeout(pressTimer); }
            }
            if (isSwiping && diffX > 0 && diffX < 80) {
                currentTranslate = diffX;
                msgEl.style.transform = `translateX(${diffX}px)`;
            }
        }, {passive: true});

        msgEl.addEventListener('touchend', e => {
            clearTimeout(pressTimer);
            msgEl.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            msgEl.style.transform = 'translateX(0)';
            if (currentTranslate > 40) startReplying(msg);
            currentTranslate = 0;
        }, {passive: true});
    }

    function renderMessageIntoContainer(msg, container) {
        const isMe = msg.senderId === currentUser;
        const partnerId = currentUser === 'me' ? 'partner' : 'me';
        const partnerProfile = profiles[partnerId];

        const msgEl = document.createElement('div');
        msgEl.className = `flex ${isMe ? 'justify-end' : 'justify-start'} animate-bubbleIn relative group transition-transform duration-200 mb-4`;
        msgEl.id = `msg-${msg.id}`;

        let avatarHtml = '';
        if (!isMe) {
            avatarHtml = partnerProfile.avatar.startsWith('data:image/') 
                ? `<img src="${partnerProfile.avatar}" class="w-8 h-8 rounded-full object-cover shadow-sm self-end mr-2 shrink-0">`
                : `<div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center text-lg shadow-sm self-end mr-2 shrink-0">${partnerProfile.avatar}</div>`;
        }

        let imageHtml = msg.imageUrl ? `<img src="${msg.imageUrl}" class="w-full rounded-lg mb-2 cursor-pointer border border-white/20">` : '';
        let statusHtml = '';
        if (isMe) {
            const isRead = msg.status === 'read';
            statusHtml = `<span class="ml-2 text-[10px] ${isRead ? 'text-blue-200' : 'text-blue-400'} flex">` + 
                (isRead ? `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7M5 18l4 4L19 12" style="transform:translateY(-2px)"/></svg>` 
                        : `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`) + `</span>`;
        } else if (msg.status !== 'read') {
            msgsRef.child(msg.id).update({ status: 'read' });
        }

        const bubbleClass = isMe ? 'bg-gradient-to-br from-premiumBlue to-blue-500 text-white rounded-2xl rounded-br-sm shadow-md' : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-2xl rounded-bl-sm shadow-sm';

        let replyHtml = '';
        if (msg.replyTo && messagesObj[msg.replyTo]) {
            const rMsg = messagesObj[msg.replyTo];
            const rName = rMsg.senderId === currentUser ? 'Sen' : profiles[rMsg.senderId].name;
            replyHtml = `<div class="mb-1.5 p-2 bg-black/10 dark:bg-white/10 rounded-lg border-l-4 border-white/50 cursor-pointer" onclick="document.getElementById('msg-${msg.replyTo}').scrollIntoView({behavior:'smooth'})">
                <span class="block text-[11px] font-bold ${isMe ? 'text-blue-100' : 'text-premiumBlue dark:text-blue-400'}">${rName}</span>
                <span class="block text-xs truncate ${isMe ? 'text-blue-50' : 'text-gray-500 dark:text-gray-300'}">${rMsg.text || '📷 Fotoğraf'}</span></div>`;
        }

        let reactionsHtml = '';
        if (msg.reactions) {
            const reacts = Object.values(msg.reactions);
            if (reacts.length > 0) {
                const rCounts = {};
                reacts.forEach(r => rCounts[r] = (rCounts[r] || 0) + 1);
                const badges = Object.entries(rCounts).map(([e, c]) => `<span class="inline-flex items-center space-x-0.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full px-1.5 py-0.5 text-xs shadow-sm"><span>${e}</span>${c > 1 ? `<span class="text-[10px] text-gray-500 ml-0.5">${c}</span>` : ''}</span>`).join('');
                reactionsHtml = `<div class="absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} flex space-x-1 z-10">${badges}</div>`;
            }
        }

        msgEl.innerHTML = `${avatarHtml}<div class="max-w-[75%] px-4 py-2 ${bubbleClass} relative">${replyHtml}${imageHtml}${msg.text ? `<p class="text-[15px] leading-relaxed break-words whitespace-pre-wrap relative z-0">${msg.text}</p>` : ''}<div class="flex items-center justify-end mt-1 space-x-1 opacity-80 relative z-0"><span class="text-[10px] font-medium tracking-wide ${isMe ? 'text-blue-50' : 'text-gray-400'}">${formatTime(msg.timestamp)}</span>${statusHtml}</div>${reactionsHtml}</div>`;
        
        setupMessageEvents(msg, msgEl);
        container.appendChild(msgEl);
    }

    function renderSingleMessage(msg) {
        const isScrolledToBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 100;
        renderMessageIntoContainer(msg, chatMessages);
        if (isScrolledToBottom) {
            setTimeout(() => chatMessages.scrollTop = chatMessages.scrollHeight, 50);
        }
    }

    function renderMessages() {
        chatMessages.innerHTML = '';
        const msgsArray = Object.values(messagesObj).filter(m => m && m.id).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        msgsArray.forEach(msg => renderMessageIntoContainer(msg, chatMessages));
        setTimeout(() => chatMessages.scrollTop = chatMessages.scrollHeight, 50);
    }
"""

content = re.sub(r"    function renderMessages\(\) \{[\s\S]*?if \(isScrolledToBottom \|\| prevScrollHeight === 0\) \{\n            chatMessages\.scrollTop = chatMessages\.scrollHeight;\n        \}\n    \}", render_refactor.strip(), content)

# Remove `renderMessages();` inside profilesRef since it recreates the entire DOM on profile change (which is annoying).
content = content.replace("loadProfileInfo();\n                renderMessages();\n                renderStories();", "loadProfileInfo();\n                renderStories();")


# 6. Enhance WebRTC
stun_servers = """
    const servers = {
        iceServers: [
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302'] }
        ]
    };
"""
content = re.sub(r"const servers = \{[\s\S]*?\};", stun_servers.strip(), content)

ring_logic = """
    const ringAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    ringAudio.loop = true;

    async function handleIncomingCall(data, partnerId) {
        currentCallType = data.callType || 'video';
        openCallUI(partnerId, 'incoming');
        showNotification("Arama Geliyor!", profiles[partnerId].name + " seni arıyor.");
        ringAudio.play().catch(e=>console.log(e));
        
        acceptCallBtn.onclick = async () => {
            ringAudio.pause();
            ringAudio.currentTime = 0;
            // ... original accept logic
"""
content = content.replace("async function handleIncomingCall(data, partnerId) {\n        currentCallType = data.callType || 'video';\n        openCallUI(partnerId, 'incoming');\n        \n        acceptCallBtn.onclick = async () => {", ring_logic)

content = content.replace("function endCallUI() {", "function endCallUI() {\n        ringAudio.pause();\n        ringAudio.currentTime = 0;")


# Write changes
with open('/home/mertemir/Masaüstü/FADİME/pampisUp/app.js', 'w') as f:
    f.write(content)
