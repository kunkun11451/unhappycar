// 聊天系统模块
(function() {
    const state = {
        playerSeat: null, // 当前玩家座位 (1-4)
        currentChannel: null, // 当前选中频道
        channels: [], // 可见频道列表
        messages: {}, // 各频道消息 {channelId: [{playerId, playerName, message, timestamp}]}
        unreadCounts: {}, // 未读消息计数 {channelId: count}
        isVisible: false, // 聊天面板是否可见
        roomId: null,
        notificationsEnabled: false, // 是否开启通知
        notificationPermission: 'default' // 通知权限状态
    };

    const CACHE_KEY_PREFIX = 'unhappycar_chat_';
    const CACHE_EXPIRY_HOURS = 5;

    // 缓存管理函数
    function saveChatToCache() {
        if (!state.roomId) return;
        
        const cacheData = {
            messages: state.messages,
            timestamp: Date.now(),
            roomId: state.roomId
        };
        
        try {
            localStorage.setItem(CACHE_KEY_PREFIX + state.roomId, JSON.stringify(cacheData));
        } catch (e) {
            console.warn('保存聊天记录到缓存失败:', e);
        }
    }

    // 从缓存加载聊天记录
    function loadChatFromCache(roomId) {
        if (!roomId) return null;
        
        try {
            const cacheData = localStorage.getItem(CACHE_KEY_PREFIX + roomId);
            if (!cacheData) return null;
            
            const parsed = JSON.parse(cacheData);
            const now = Date.now();
            const expiry = parsed.timestamp + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
            
            // 检查是否过期
            if (now > expiry) {
                localStorage.removeItem(CACHE_KEY_PREFIX + roomId);
                return null;
            }
            
            return parsed.messages;
        } catch (e) {
            console.warn('从缓存加载聊天记录失败:', e);
            return null;
        }
    }

    // 清除指定房间的聊天缓存
    function clearChatCache(roomId) {
        if (!roomId) return;
        try {
            localStorage.removeItem(CACHE_KEY_PREFIX + roomId);
        } catch (e) {
            console.warn('清除聊天缓存失败:', e);
        }
    }

    // 清理所有过期的聊天缓存
    function cleanExpiredChatCaches() {
        try {
            const now = Date.now();
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(CACHE_KEY_PREFIX)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        const expiry = data.timestamp + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
                        if (now > expiry) {
                            keysToRemove.push(key);
                        }
                    } catch (e) {
                        // 损坏的数据也删除
                        keysToRemove.push(key);
                    }
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn('清理过期聊天缓存失败:', e);
        }
    }

    // 通知相关函数
    function initNotificationSettings() {
        // 检查浏览器通知权限
        if ('Notification' in window) {
            state.notificationPermission = Notification.permission;
            
            // 从localStorage读取用户的通知偏好
            const savedPreference = localStorage.getItem('unhappycar_notifications_enabled');
            if (savedPreference !== null) {
                state.notificationsEnabled = savedPreference === 'true';
            }
        } else {
            state.notificationsEnabled = false;
            console.warn('此浏览器不支持通知功能');
        }
        updateNotificationUI();
    }

    function updateNotificationUI() {
        const toggleBtn = document.getElementById('notificationToggle');
        const icon = document.getElementById('notificationIcon');
        
        if (!toggleBtn || !icon) return;

        if (state.notificationsEnabled && state.notificationPermission === 'granted') {
            toggleBtn.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
            toggleBtn.style.borderColor = 'rgba(76, 175, 80, 0.5)';
            icon.textContent = '🔔';
        } else {
            toggleBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            toggleBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            icon.textContent = '🔕';
        }
    }

    async function toggleNotifications() {
        if (!('Notification' in window)) {
            alert('此浏览器不支持通知功能');
            return;
        }

        if (state.notificationPermission === 'denied') {
            alert('通知权限已被拒绝，请在浏览器设置中手动开启通知权限');
            return;
        }

        if (state.notificationsEnabled) {
            // 关闭通知
            state.notificationsEnabled = false;
            localStorage.setItem('unhappycar_notifications_enabled', 'false');
        } else {
            // 开启通知
            if (state.notificationPermission === 'default') {
                try {
                    const permission = await Notification.requestPermission();
                    state.notificationPermission = permission;
                    
                    if (permission === 'granted') {
                        state.notificationsEnabled = true;
                        localStorage.setItem('unhappycar_notifications_enabled', 'true');
                        
                        // 显示测试通知
                        showNotification('通知已开启', '您将收到新消息的通知', 'test');
                    } else {
                        alert('需要通知权限才能开启消息通知');
                    }
                } catch (e) {
                    console.error('请求通知权限失败:', e);
                    alert('请求通知权限失败');
                }
            } else if (state.notificationPermission === 'granted') {
                state.notificationsEnabled = true;
                localStorage.setItem('unhappycar_notifications_enabled', 'true');
            }
        }
        
        updateNotificationUI();
    }

    function showNotification(title, body, tag = null) {
        if (!state.notificationsEnabled || state.notificationPermission !== 'granted') {
            return;
        }

        // 检查页面是否在后台
        if (!document.hidden) {
            return; // 页面在前台时不显示通知
        }

        try {
            const notification = new Notification(title, {
                body: body,
                icon: '/favicon.ico', // 可以设置应用图标
                tag: tag,
                requireInteraction: false,
                silent: false
            });

            // 点击通知时聚焦到页面
            notification.onclick = function() {
                window.focus();
                notification.close();
            };

            // 5秒后自动关闭
            setTimeout(() => {
                notification.close();
            }, 5000);
        } catch (e) {
            console.error('显示通知失败:', e);
        }
    }

    // 根据玩家座位获取可见频道
    function getVisibleChannels(playerSeat) {
        const channels = [];
        
        switch(playerSeat) {
            case 1: // 1P
                channels.push(
                    {id: '123', name: '1P 2P 3P的频道', players: [1,2,3]},
                    {id: '124', name: '1P 2P 4P的频道', players: [1,2,4]},
                    {id: '134', name: '1P 3P 4P的频道', players: [1,3,4]}
                );
                break;
            case 2: // 2P
                channels.push(
                    {id: '123', name: '1P 2P 3P的频道', players: [1,2,3]},
                    {id: '124', name: '1P 2P 4P的频道', players: [1,2,4]},
                    {id: '234', name: '2P 3P 4P的频道', players: [2,3,4]}
                );
                break;
            case 3: // 3P
                channels.push(
                    {id: '123', name: '1P 2P 3P的频道', players: [1,2,3]},
                    {id: '134', name: '1P 3P 4P的频道', players: [1,3,4]},
                    {id: '234', name: '2P 3P 4P的频道', players: [2,3,4]}
                );
                break;
            case 4: // 4P
                channels.push(
                    {id: '124', name: '1P 2P 4P的频道', players: [1,2,4]},
                    {id: '134', name: '1P 3P 4P的频道', players: [1,3,4]},
                    {id: '234', name: '2P 3P 4P的频道', players: [2,3,4]}
                );
                break;
        }
        
        return channels;
    }

    // 创建聊天UI
    function createChatUI() {
        // 创建遮罩层
        const chatOverlay = document.createElement('div');
        chatOverlay.id = 'chatOverlay';
        chatOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: opacity 0.3s ease;
            display: none;
        `;

        // 创建弹窗
        const chatContainer = document.createElement('div');
        chatContainer.id = 'chatContainer';
        chatContainer.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 0;
            max-width: 450px;
            width: 90%;
            height: 70vh;
            max-height: 600px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transform: scale(0.8);
            transition: transform 0.3s ease;
            position: relative;
            display: flex;
            flex-direction: column;
            color: white;
            font-family: 'Microsoft YaHei', Arial, sans-serif;
        `;

        // 聊天头部
        const chatHeader = document.createElement('div');
        chatHeader.style.cssText = `
            padding: 20px;
            padding-bottom: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            flex-shrink: 0;
        `;
        
        const title = document.createElement("h2");
        title.textContent = "💬 聊天频道";
        title.style.cssText = `
            color: white;
            font-size: 22px;
            font-weight: bold;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        `;
        chatHeader.appendChild(title);

        // 通知按钮
        const notificationToggle = document.createElement("button");
        notificationToggle.id = "notificationToggle";
        notificationToggle.title = "开启/关闭消息通知";
        notificationToggle.style.cssText = `
            position: absolute;
            top: 15px;
            left: 15px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            font-size: 18px;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        notificationToggle.innerHTML = `<span id="notificationIcon">🔕</span>`;
        chatHeader.appendChild(notificationToggle);


        // 关闭按钮
        const closeButton = document.createElement("button");
        closeButton.id = "chatCloseBtn";
        closeButton.innerHTML = "✕";
        closeButton.style.cssText = `
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            font-size: 18px;
            font-weight: bold;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeButton.addEventListener("mouseover", () => {
            closeButton.style.background = "rgba(255, 255, 255, 0.25)";
            closeButton.style.transform = "rotate(90deg) scale(1.1)";
        });
        closeButton.addEventListener("mouseout", () => {
            closeButton.style.background = "rgba(255, 255, 255, 0.15)";
            closeButton.style.transform = "rotate(0deg) scale(1)";
        });
        chatHeader.appendChild(closeButton);

        // 频道选择
        const channelSelectorContainer = document.createElement('div');
        channelSelectorContainer.style.cssText = `
            padding: 15px 20px;
            flex-shrink: 0;
        `;
        const channelSelect = document.createElement('select');
        channelSelect.id = 'channelSelect';
        channelSelect.style.cssText = `
            width: 100%;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            background: rgba(20, 20, 20, 0.5);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 14px;
            box-sizing: border-box;
            transition: all 0.3s ease;
        `;
        channelSelectorContainer.appendChild(channelSelect);

        // 消息列表
        const messageList = document.createElement('div');
        messageList.id = 'messageList';
        messageList.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 0 20px 10px;
        `;

        // 输入区域
        const inputArea = document.createElement('div');
        inputArea.style.cssText = `
            padding: 15px 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            flex-shrink: 0;
        `;
        
        const inputWrapper = document.createElement('div');
        inputWrapper.style.cssText = `display:flex;gap:10px;align-items:center;`;
        const messageInput = document.createElement('input');
        messageInput.id = "messageInput";
        messageInput.type = "text";
        messageInput.placeholder = "输入消息...";
    messageInput.maxLength = 200;
        messageInput.style.cssText = `
            flex: 1;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 14px;
            box-sizing: border-box;
            transition: all 0.3s ease;
        `;
        inputWrapper.appendChild(messageInput);
    // 已移除字符计数器显示
        
        const buttonContainer = document.createElement("div");
        buttonContainer.style.cssText = `display: flex; gap: 15px; justify-content: center; margin-top: 15px;`;
        const sendBtn = document.createElement("button");
        sendBtn.id = "sendBtn";
        sendBtn.textContent = "🚀 发送";
        sendBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2);
            color: white; padding: 12px 25px; font-size: 16px; font-weight: bold; border-radius: 25px;
            cursor: pointer; transition: all 0.3s ease; width: 100%; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        `;
        
        buttonContainer.appendChild(sendBtn);

        inputArea.appendChild(inputWrapper);
        inputArea.appendChild(buttonContainer);

        chatContainer.appendChild(chatHeader);
        chatContainer.appendChild(channelSelectorContainer);
        chatContainer.appendChild(messageList);
        chatContainer.appendChild(inputArea);
        
        chatOverlay.appendChild(chatContainer);
        document.body.appendChild(chatOverlay);

    // 移除点击空白处关闭弹窗的功能（不再绑定遮罩点击关闭）

        bindChatEvents();
    }

    // 绑定聊天事件
    function bindChatEvents() {
        const chatCloseBtn = document.getElementById('chatCloseBtn');
        const channelSelect = document.getElementById('channelSelect');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const notificationToggle = document.getElementById('notificationToggle');

        if (chatCloseBtn) {
            chatCloseBtn.addEventListener('click', hideChatPanel);
        }

        if (notificationToggle) {
            notificationToggle.addEventListener('click', toggleNotifications);
        }

        if (channelSelect) {
            channelSelect.addEventListener('change', (e) => {
                switchChannel(e.target.value);
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }

        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }
        
        // 初始化通知设置
        initNotificationSettings();
    }

    // 已移除字符计数器逻辑

    // 更新频道选择器
    function updateChannelSelector() {
        const channelSelect = document.getElementById('channelSelect');
        if (!channelSelect) return;

        const currentVal = channelSelect.value;
        channelSelect.innerHTML = '';
        
        // 添加一个禁用的标题选项
        const titleOption = document.createElement('option');
        titleOption.textContent = "选择一个频道";
        titleOption.disabled = true;
        // channelSelect.appendChild(titleOption);

        state.channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            option.style.backgroundColor = "#222";
            
            const unreadCount = state.unreadCounts[channel.id] || 0;
            if (unreadCount > 0) {
                option.textContent += ` (${unreadCount}条未读)`;
                option.style.fontWeight = 'bold';
            }
            
            channelSelect.appendChild(option);
        });

        // 恢复之前的选择，或者默认第一个
        if (currentVal && state.channels.some(c => c.id === currentVal)) {
            channelSelect.value = currentVal;
        } else if (state.currentChannel) {
            channelSelect.value = state.currentChannel;
        }
    }

    // 切换频道
    function switchChannel(channelId) {
        state.currentChannel = channelId;
        // 清除该频道未读计数
        state.unreadCounts[channelId] = 0;
        updateChannelSelector();
        renderMessages();
        // 更新聊天按钮的红点显示
        updateChatButtonNotification();
    }

    // 渲染消息列表
    function renderMessages() {
        const messageList = document.getElementById('messageList');
        if (!messageList || !state.currentChannel) return;

        const messages = state.messages[state.currentChannel] || [];
        
        messageList.innerHTML = '';
        
        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message-item ${msg.playerId === getCurrentPlayerId() ? 'own' : 'other'}`;

            const isOwn = msg.playerId === getCurrentPlayerId();
            const senderName = msg.playerName || msg.playerId;
            const avatarUrl = getAvatarUrlForPlayer(msg.playerId, msg.playerName);
            const avatarImg = avatarUrl ? `<img class="message-avatar" src="${avatarUrl}" alt="${senderName}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.2);">` : '';

            const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            if (isOwn) {
                const seatNum = getSeatFromNameOrId(msg.playerName, msg.playerId) || state.playerSeat;
                const seatLabel = seatNum ? `${seatNum}P` : senderName;
                messageDiv.innerHTML = `
                    <div class="message-header" style="display:flex;align-items:center;gap:8px;">
                      <span class="message-time">${time}</span>
                      <span class="message-sender" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${seatLabel}</span>
                      ${avatarImg}
                    </div>
                    <div class="message-content">${escapeHtml(msg.message)}</div>
                `;
            } else {
              const headerInnerLeft = `${avatarImg}<span class="message-sender" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${senderName}</span>`;
              messageDiv.innerHTML = `
                <div class="message-header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                  <div style="display:flex;align-items:center;gap:8px;min-width:0;">${headerInnerLeft}</div>
                  <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${escapeHtml(msg.message)}</div>
              `;
            }

            messageList.appendChild(messageDiv);
        });

        // 滚动到底部
        messageList.scrollTop = messageList.scrollHeight;
    }

    // 发送消息
    function sendMessage() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput || !state.currentChannel) return;

        const message = messageInput.value.trim();
        if (!message) return;

        // 限制消息长度不超过200个字符
        if (message.length > 200) {
            alert('消息长度不能超过200个字符');
            return;
        }

        // 通过WebSocket发送消息
        if (window.multiplayerManager && window.multiplayerManager.getWebSocket && state.roomId) {
            const ws = window.multiplayerManager.getWebSocket();
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'chat_message',
                    roomId: state.roomId,
                    channelId: state.currentChannel,
                    playerId: getCurrentPlayerId(),
                    playerName: getCurrentPlayerName(),
                    message: message,
                    timestamp: Date.now()
                }));

                messageInput.value = '';
            }
        }
    }

    // 接收消息
    function receiveMessage(data) {
        const { channelId, playerId, playerName, message, timestamp } = data;

        // 检查是否有权限看到该频道消息
        const hasAccess = state.channels.some(channel => channel.id === channelId);
        if (!hasAccess) return;

        // 初始化频道消息数组
        if (!state.messages[channelId]) {
            state.messages[channelId] = [];
        }

        // 添加消息
        state.messages[channelId].push({
            playerId,
            playerName,
            message,
            timestamp
        });

        // 更新未读计数（如果聊天面板不可见，或者不是当前查看的频道，且不是自己发的消息）
        const shouldCountAsUnread = playerId !== getCurrentPlayerId() && 
            (!state.isVisible || channelId !== state.currentChannel);
        
        if (shouldCountAsUnread) {
            state.unreadCounts[channelId] = (state.unreadCounts[channelId] || 0) + 1;
        }

        // 更新UI
        updateChannelSelector();
        if (channelId === state.currentChannel) {
            renderMessages();
        }
        
        // 显示聊天图标未读提示
        updateChatButtonNotification();
        
        // 发送系统通知（仅当消息不是自己发的且页面在后台时）
        if (shouldCountAsUnread) {
            const channelName = state.channels.find(ch => ch.id === channelId)?.name || channelId;
            showNotification(
                `新消息 - ${channelName}`,
                `${playerName || playerId}: ${message}`,
                `chat-${channelId}`
            );
        }
        
        // 保存到本地缓存
        saveChatToCache();
    }

    // 获取当前玩家ID
    function getCurrentPlayerId() {
        if (window.multiplayerManager && typeof window.multiplayerManager.getCurrentPlayerId === 'function') {
            return window.multiplayerManager.getCurrentPlayerId();
        }
        return `Player_${state.playerSeat || 'Unknown'}`;
    }

    // 获取当前玩家名称
    function getCurrentPlayerName() {
        if (state.playerSeat) {
            return `${state.playerSeat}P`;
        }
        const playerId = getCurrentPlayerId();
        return playerId;
    }

    // 获取当前玩家座位（从多人游戏模式或不要做挑战模式）
    function getCurrentPlayerSeat() {
        // 优先从不要做挑战模式获取座位信息
        if (window.noChallengeMode && window.noChallengeMode.active) {
            // 如果是不要做挑战模式，需要通过状态获取座位
            const isHost = window.multiplayerManager && window.multiplayerManager.isHost && window.multiplayerManager.isHost();
            if (isHost) {
                // 主持人座位从noChallengeMode状态中获取
                return 1; // 暂时默认主持人为1P，后续可以改进
            }
        }
        
        // 从状态中获取
        return state.playerSeat;
    }

    // 固定头像映射（1P-4P）
    const AVATAR_URLS = {
        1: 'https://upload-bbs.miyoushe.com/upload/2024/06/29/273489775/91487b41c74717dd5f7ddf70f54f8d86_395069412624245482.png',
        2: 'https://upload-bbs.miyoushe.com/upload/2024/06/29/273489775/f7d0df2cb75f807629bed67f5a8678c5_1377069287058428643.png',
        3: 'https://upload-bbs.miyoushe.com/upload/2024/06/29/273489775/04bcaa5de39bc19a6b0287673614f74a_6932174723629665944.png',
        4: 'https://upload-bbs.miyoushe.com/upload/2024/06/29/273489775/4be47bf1376bfb4f69c1e3fe26c8a8e8_8119842655567179283.png'
    };

    function getSeatFromNameOrId(playerName, playerId) {
        // 先从名称中识别 1P/2P/3P/4P
        if (playerName) {
            const m1 = playerName.match(/^(?:\s*)?([1-4])P(?:\s*)?$/i) || playerName.match(/([1-4])P/i);
            if (m1) return parseInt(m1[1], 10);
        }
        // 尝试从ID末尾提取数字（如 Player_1、user-4 等）
        if (playerId) {
            const m2 = String(playerId).match(/([1-4])$/);
            if (m2) return parseInt(m2[1], 10);
        }
        // 退化：如果是本地玩家，使用本地座位
        if (playerId === getCurrentPlayerId() && state.playerSeat) return state.playerSeat;
        return null;
    }

    function getAvatarUrlForPlayer(playerId, playerName) {
        const seat = getSeatFromNameOrId(playerName, playerId);
        if (seat && AVATAR_URLS[seat]) return AVATAR_URLS[seat];
        return null;
    }

    // HTML转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 显示聊天面板
    function showChatPanel() {
        const chatOverlay = document.getElementById('chatOverlay');
        const chatContainer = document.getElementById('chatContainer');
        if (chatOverlay && chatContainer) {
            chatOverlay.style.display = 'flex';
            setTimeout(() => {
                chatOverlay.style.opacity = '1';
                chatContainer.style.transform = 'scale(1)';
            }, 10);

            state.isVisible = true;
            // 阻止外部页面滚动
            try { document.body.style.overflow = 'hidden'; } catch (e) {}
            
            if (state.currentChannel) {
                state.unreadCounts[state.currentChannel] = 0;
                updateChannelSelector();
                updateChatButtonNotification();
            }
        }
    }

    // 隐藏聊天面板
    function hideChatPanel() {
        const chatOverlay = document.getElementById('chatOverlay');
        const chatContainer = document.getElementById('chatContainer');
        if (chatOverlay && chatContainer) {
            chatOverlay.style.opacity = '0';
            chatContainer.style.transform = 'scale(0.8)';
            setTimeout(() => {
                chatOverlay.style.display = 'none';
                // 恢复外部页面滚动
                try { document.body.style.overflow = ''; } catch (e) {}
            }, 300);
            state.isVisible = false;
        }
    }

    // 更新聊天按钮通知
    function updateChatButtonNotification() {
        const chatButton = document.getElementById('chatButton');
        if (!chatButton) return;

        const totalUnread = Object.values(state.unreadCounts).reduce((sum, count) => sum + count, 0);
        
        let notification = chatButton.querySelector('.chat-notification');
        if (totalUnread > 0) {
            if (!notification) {
                notification = document.createElement('span');
                notification.className = 'chat-notification';
                notification.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #e74c3c;
                    color: white;
                    border-radius: 50%;
                    width: 18px;
                    height: 18px;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                `;
                chatButton.appendChild(notification);
            }
            notification.textContent = totalUnread > 99 ? '99+' : totalUnread;
        } else if (notification) {
            notification.remove();
        }
    }

    // 初始化聊天系统
    function initializeChat(playerSeat, roomId) {
        if (!playerSeat || !roomId) return;

        state.playerSeat = playerSeat;
        state.roomId = roomId;
        state.channels = getVisibleChannels(playerSeat);
        state.currentChannel = state.channels[0]?.id;
        
        // 清理过期缓存
        cleanExpiredChatCaches();
        
        // 尝试从缓存加载聊天记录
        const cachedMessages = loadChatFromCache(roomId);
        if (cachedMessages) {
            state.messages = cachedMessages;
            console.log('从缓存加载聊天记录:', Object.keys(cachedMessages).length, '个频道');
        } else {
            state.messages = {};
        }
        
        state.unreadCounts = {};

        // 创建聊天UI（如果不存在）
        if (!document.getElementById('chatContainer')) {
            createChatUI();
        }

        // 更新频道选择器
        updateChannelSelector();
        
        // 创建聊天按钮（如果不存在）
        createChatButton();
    }

    // 创建聊天按钮
    function createChatButton() {
        if (document.getElementById('chatButton')) return;

        const chatButton = document.createElement('button');
        chatButton.id = 'chatButton';
        chatButton.innerHTML = '💬';
        chatButton.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 55px;
            height: 55px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 999;
            display: none;
            transition: all 0.3s ease;
        `;

        chatButton.addEventListener('click', () => {
            if (state.isVisible) {
                hideChatPanel();
            } else {
                showChatPanel();
            }
        });

        document.body.appendChild(chatButton);
    }

    // 显示聊天功能
    function showChatFeature() {
        const chatButton = document.getElementById('chatButton');
        if (chatButton) {
            chatButton.style.display = 'block';
        }
    }

    // 隐藏聊天功能
    function hideChatFeature() {
        const chatButton = document.getElementById('chatButton');
        const chatOverlay = document.getElementById('chatOverlay');
        
        if (chatButton) {
            chatButton.style.display = 'none';
        }
        if (chatOverlay) {
            chatOverlay.style.display = 'none';
        }
        
        state.isVisible = false;
    }

    // 清空聊天数据
    function clearChatData() {
        state.messages = {};
        state.unreadCounts = {};
        updateChannelSelector();
        updateChatButtonNotification();
        
        const messageList = document.getElementById('messageList');
        if (messageList) {
            messageList.innerHTML = '';
        }
    }

    // 房间解散时清除聊天数据和缓存
    function clearChatDataOnRoomClose() {
        if (state.roomId) {
            clearChatCache(state.roomId);
        }
        clearChatData();
        state.roomId = null;
    }

    // 导出API
    window.chatSystem = {
        initialize: initializeChat,
        receiveMessage: receiveMessage,
        show: showChatFeature,
        hide: hideChatFeature,
        clear: clearChatData,
        clearOnRoomClose: clearChatDataOnRoomClose,
        isVisible: () => state.isVisible
    };
})();
