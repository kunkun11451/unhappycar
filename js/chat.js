// 聊天系统模块
(function() {
    const state = {
        playerSeat: null, // 当前玩家座位 (1-4)
        currentChannel: null, // 当前选中频道
        channels: [], // 可见频道列表
        messages: {}, // 各频道消息 {channelId: [{playerId, playerName, message, timestamp}]}
        unreadCounts: {}, // 未读消息计数 {channelId: count}
        isVisible: false, // 聊天面板是否可见
        roomId: null
    };

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
        const chatContainer = document.createElement('div');
        chatContainer.id = 'chatContainer';
        chatContainer.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 320px;
            height: 400px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            z-index: 1000;
            font-family: Arial, sans-serif;
            display: none;
        `;

        // 聊天头部
        const chatHeader = document.createElement('div');
        chatHeader.style.cssText = `
            padding: 10px 15px;
            background: #4a90e2;
            color: white;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
        `;
        chatHeader.innerHTML = `
            <span>聊天</span>
            <button id="chatCloseBtn" style="background:none;border:none;color:white;font-size:18px;cursor:pointer;">×</button>
        `;

        // 频道选择
        const channelSelector = document.createElement('div');
        channelSelector.style.cssText = `
            padding: 8px 15px;
            border-bottom: 1px solid #eee;
            background: #f8f9fa;
        `;
        channelSelector.innerHTML = `
            <select id="channelSelect" style="width:100%;padding:4px;border:1px solid #ddd;border-radius:4px;">
            </select>
        `;

        // 消息列表
        const messageList = document.createElement('div');
        messageList.id = 'messageList';
        messageList.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            background: white;
        `;

        // 输入区域
        const inputArea = document.createElement('div');
        inputArea.style.cssText = `
            padding: 10px;
            border-top: 1px solid #eee;
            background: #f8f9fa;
        `;
        inputArea.innerHTML = `
            <div style="display:flex;gap:8px;">
                <input id="messageInput" type="text" placeholder="输入消息..." 
                       style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;">
                <button id="sendBtn" style="padding:8px 15px;background:#4a90e2;color:white;border:none;border-radius:4px;cursor:pointer;">发送</button>
            </div>
        `;

        chatContainer.appendChild(chatHeader);
        chatContainer.appendChild(channelSelector);
        chatContainer.appendChild(messageList);
        chatContainer.appendChild(inputArea);

        document.body.appendChild(chatContainer);

        // 绑定事件
        bindChatEvents();
    }

    // 绑定聊天事件
    function bindChatEvents() {
        const chatCloseBtn = document.getElementById('chatCloseBtn');
        const channelSelect = document.getElementById('channelSelect');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');

        if (chatCloseBtn) {
            chatCloseBtn.addEventListener('click', hideChatPanel);
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
    }

    // 更新频道选择器
    function updateChannelSelector() {
        const channelSelect = document.getElementById('channelSelect');
        if (!channelSelect) return;

        channelSelect.innerHTML = '';
        
        state.channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            
            // 显示未读消息数
            const unreadCount = state.unreadCounts[channel.id] || 0;
            if (unreadCount > 0) {
                option.textContent += ` (${unreadCount})`;
                option.style.fontWeight = 'bold';
                option.style.color = '#e74c3c';
            }
            
            channelSelect.appendChild(option);
        });

        // 设置当前频道
        if (state.currentChannel && channelSelect.value !== state.currentChannel) {
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
    }

    // 渲染消息列表
    function renderMessages() {
        const messageList = document.getElementById('messageList');
        if (!messageList || !state.currentChannel) return;

        const messages = state.messages[state.currentChannel] || [];
        
        messageList.innerHTML = '';
        
        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                margin-bottom: 8px;
                padding: 6px 10px;
                background: ${msg.playerId === getCurrentPlayerId() ? '#e3f2fd' : '#f5f5f5'};
                border-radius: 6px;
                border-left: 3px solid ${msg.playerId === getCurrentPlayerId() ? '#2196f3' : '#999'};
            `;

            const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            messageDiv.innerHTML = `
                <div style="font-size:12px;color:#666;margin-bottom:2px;">
                    <strong>${msg.playerName || msg.playerId}</strong> 
                    <span style="float:right;">${time}</span>
                </div>
                <div style="font-size:14px;color:#333;">${escapeHtml(msg.message)}</div>
            `;

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

        // 更新未读计数（如果不是当前频道且不是自己发的消息）
        if (channelId !== state.currentChannel && playerId !== getCurrentPlayerId()) {
            state.unreadCounts[channelId] = (state.unreadCounts[channelId] || 0) + 1;
        }

        // 更新UI
        updateChannelSelector();
        if (channelId === state.currentChannel) {
            renderMessages();
        }
        
        // 显示聊天图标未读提示
        updateChatButtonNotification();
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

    // HTML转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 显示聊天面板
    function showChatPanel() {
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.style.display = 'flex';
            state.isVisible = true;
            
            // 清除当前频道未读计数
            if (state.currentChannel) {
                state.unreadCounts[state.currentChannel] = 0;
                updateChannelSelector();
                updateChatButtonNotification();
            }
        }
    }

    // 隐藏聊天面板
    function hideChatPanel() {
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.style.display = 'none';
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
        state.messages = {};
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
            bottom: 440px;
            width: 50px;
            height: 50px;
            background: #4a90e2;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 999;
            display: none;
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
        const chatContainer = document.getElementById('chatContainer');
        
        if (chatButton) {
            chatButton.style.display = 'none';
        }
        if (chatContainer) {
            chatContainer.style.display = 'none';
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

    // 导出API
    window.chatSystem = {
        initialize: initializeChat,
        receiveMessage: receiveMessage,
        show: showChatFeature,
        hide: hideChatFeature,
        clear: clearChatData,
        isVisible: () => state.isVisible
    };
})();
