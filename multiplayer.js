document.addEventListener('DOMContentLoaded', function () {
    // 在连接WebSocket之前先发送一次HTTP请求唤醒服务器
    console.log('发送唤醒请求到服务器...');
    fetch('https://foremost-plum-octopus.glitch.me/wakeup', {
        method: 'GET',
        mode: 'no-cors'
    }).then(() => {
        console.log('服务器唤醒请求已发送');
    }).catch(err => {
        console.log('服务器唤醒请求发送（可能失败，但不影响后续连接）:', err.message);
    });

    const ws = new WebSocket('wss://foremost-plum-octopus.glitch.me');

    // DOM 元素
    const initialScreen = document.getElementById('initialScreen');
    const gameScreen = document.getElementById('gameScreen');
    const hostGameButton = document.getElementById('hostGameButton');
    const joinGameButton = document.getElementById('joinGameButton');
    const gameContent = document.getElementById('gameContent');
    const startButton = document.getElementById('startButton');
    const resetButton = document.getElementById('resetButton');
    const missionButton = document.getElementById('missionButton');
    const bpButton = document.getElementById('bpButton');
    const roundCounterDisplay = document.getElementById('roundCounter');
    const characterBoxes = document.querySelectorAll('.character-box');
    const missionBoxes = document.querySelectorAll('.mission-box');
    const syncButton = document.getElementById('syncButton'); 
    const selectedHardMission = document.getElementById('selectedHardMission');
    const timeCounter = document.getElementById('timeCounter');
    const connectionStatus = document.getElementById('connectionStatus');
    const exploreButton = document.getElementById('exploreButton');    let isHost = false;
    let currentRoomId = null;
    let currentPlayerId = 'player1'; // 默认玩家ID
    let currentPlayerCount = 1; // 当前房间玩家数量

    // 默认禁用按钮
    hostGameButton.disabled = true;
    joinGameButton.disabled = true;    // 心跳包定时器
    let heartbeatInterval = null;
    
    // 发送心跳包函数
    function sendHeartbeat() {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('发送心跳包...');
            ws.send(JSON.stringify({ 
                type: 'heartbeat', 
                timestamp: Date.now(),
                playerId: currentPlayerId,
                roomId: currentRoomId
            }));
        }
    }
    
    // 启动心跳包机制
    function startHeartbeat() {
        // 清除现有的心跳包定时器
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }
        
        // 每60秒发送一次心跳包
        heartbeatInterval = setInterval(sendHeartbeat, 60000);
        console.log('心跳包机制已启动 (每60秒一次)');
    }
    
    // 停止心跳包机制
    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
            console.log('心跳包机制已停止');
        }
    }

    // WebSocket 连接成功
    ws.onopen = () => {
        console.log('WebSocket 连接成功');
        if (connectionStatus) {
            connectionStatus.textContent = '多人游戏服务器连接成功！';
            connectionStatus.style.color = 'green'; 
        }

        // 启用按钮
        hostGameButton.disabled = false;
        joinGameButton.disabled = false;
        
        // 启动心跳包机制
        startHeartbeat();
    };    // WebSocket 连接错误
    ws.onerror = (error) => {
        console.error('WebSocket 连接错误:', error);
        if (connectionStatus) {
            connectionStatus.textContent = '服务器连接失败，请刷新页面重试...';
            connectionStatus.style.color = 'red'; 
        }

        // 确保按钮保持禁用状态
        hostGameButton.disabled = true;
        joinGameButton.disabled = true;
        
        // 停止心跳包机制
        stopHeartbeat();
    };

    // WebSocket 连接关闭
    ws.onclose = () => {
        console.log('WebSocket 连接已关闭');
        if (connectionStatus) {
            connectionStatus.textContent = '服务器连接已断开，请刷新页面重试...';
            connectionStatus.style.color = 'red'; 
        }

        // 确保按钮保持禁用状态
        hostGameButton.disabled = true;
        joinGameButton.disabled = true;
        
        // 停止心跳包机制
        stopHeartbeat();
    };

    // 主持游戏
    hostGameButton.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'createRoom' }));
        isHost = true;

        if (timeCounter) {
            timeCounter.style.display = 'block';
        }
    });

    // 加入游戏
    joinGameButton.addEventListener('click', () => {
        let roomId = localStorage.getItem('roomId'); // 从 localStorage 获取房间代码
        if (!roomId) {
            roomId = prompt('请输入地主提供的房间代码：');
            if (roomId) {
                localStorage.setItem('roomId', roomId); // 保存房间代码到 localStorage
            }
        }

        if (roomId) {
            ws.send(JSON.stringify({ type: 'joinRoom', roomId }));
        }

        isHost = false;
        if (timeCounter) {
            timeCounter.style.display = 'none';
        }
    });    // 同步数据函数 - 仅主持人可调用
    function syncGameState(isKeepAlive = false) {
        if (!window.gameState) {
            console.error('gameState 未定义');
            return;
        }
        
        // 权限检查：只有主持人可以发送游戏状态
        if (!isHost) {
            console.warn('只有主持人可以同步游戏状态');
            return;
        }
        
        // 网络连接检查
        if (!ws || ws.readyState !== WebSocket.OPEN || !currentRoomId) {
            console.warn('WebSocket未连接或房间ID不存在，跳过同步');
            return;
        }
        
        // 如果是保活同步，检查是否真的需要发送
        if (isKeepAlive) {
            // 如果最近有过事件驱动的同步，则跳过保活同步
            const now = Date.now();
            if (lastEventSyncTime && (now - lastEventSyncTime) < 60000) {
                console.log('最近有事件同步，跳过保活同步');
                return;
            }
            
            // 如果房间只有主持人一个人，也跳过保活同步
            if (currentPlayerCount <= 1) {
                console.log('房间只有主持人，跳过保活同步');
                return;
            }
        }const state = {
            roundCounter: gameState.roundCounter,
            characters: Array.from(characterBoxes).map((box) => ({
                name: box.querySelector('.character-name').textContent,
                image: box.querySelector('.character-image').src
            })),
            missions: Array.from(missionBoxes).map((box) => ({
                title: box.querySelector('.mission-title').textContent,
                content: box.querySelector('.mission-content').innerHTML // 使用 innerHTML 保留颜色
            })),            // 更新为支持新的困难事件显示格式
            hardMissions: Array.from(document.querySelectorAll('.hard-mission-box')).map((item, index) => ({
                title: item.querySelector('.hard-mission-title')?.textContent || '',
                content: item.querySelector('.hard-mission-content')?.textContent || '',
                votes: item.querySelectorAll('.vote-dot').length || 0,
                isSelected: item.classList.contains('selected'),
                isRejected: item.classList.contains('rejected'),
                isVoted: item.classList.contains('voted')
            })),
            // 重要修复：同步投票状态
            votingData: window.hardMissionVoting ? {
                votes: window.hardMissionVoting.playerVotes || {},
                results: window.hardMissionVoting.votingResults || {},
                votingActive: window.hardMissionVoting.isVotingActive ? window.hardMissionVoting.isVotingActive() : false
            } : null,
            // 保持向后兼容性
            hardMission: {
                title: selectedHardMission.querySelector('.mission-title')?.textContent || '',
                content: selectedHardMission.querySelector('.mission-content')?.innerHTML || ''
            }
        };

        const history = window.historyData || [];

        console.log('同步的游戏状态:', state, '历史记录:', history);
        ws.send(JSON.stringify({ type: 'updateState', roomId: currentRoomId, state, history }));
    }    // 优化后的同步机制：事件驱动同步 + 长间隔保活同步
    // 保持服务器连接活跃，防止5分钟自动休眠，但大幅减少同步频率
    let lastEventSyncTime = null; // 追踪最后一次事件驱动同步的时间
    
    setInterval(() => {
        // 只有主持人发送保活同步，且只在有连接时发送
        if (isHost && ws && ws.readyState === WebSocket.OPEN && currentRoomId) {
            console.log('执行保活同步检查...');
            syncGameState(true); // 传入保活标识
        }
    }, 120000); // 2分钟一次保活同步（比原来的3.5秒大幅减少）
    
    // 游戏状态缓存，用于检测变化
    let lastGameStateHash = null;
    
    // 计算游戏状态的哈希值，用于检测变化
    function calculateGameStateHash(state) {
        return JSON.stringify(state);
    }
    
    // 检测游戏状态是否发生变化
    function hasGameStateChanged() {
        if (!window.gameState) return false;
        
        const currentState = {
            roundCounter: gameState.roundCounter,
            characters: Array.from(characterBoxes).map((box) => ({
                name: box.querySelector('.character-name').textContent,
                image: box.querySelector('.character-image').src
            })),
            missions: Array.from(missionBoxes).map((box) => ({
                title: box.querySelector('.mission-title').textContent,
                content: box.querySelector('.mission-content').innerHTML
            }))
        };
        
        const currentHash = calculateGameStateHash(currentState);
        if (currentHash !== lastGameStateHash) {
            lastGameStateHash = currentHash;
            return true;
        }
        return false;
    }
      // 智能同步函数：只在状态变化时同步
    function syncGameStateIfChanged() {
        if (!isHost) {
            console.log('非主持人无法发送游戏状态同步');
            return;
        }
        
        if (hasGameStateChanged()) {
            console.log('检测到游戏状态变化，触发事件驱动同步');
            lastEventSyncTime = Date.now(); // 记录事件同步时间
            syncGameState(false); // 事件驱动同步，非保活
        }
    }    // 在主界面顶部动态显示当前人数和房间码
    function showPlayerCount(count) {
    // 检查是否已经存在提示框
    let playerCountDisplay = document.getElementById('playerCountDisplay');
    if (!playerCountDisplay) {
        // 创建提示框
        playerCountDisplay = document.createElement('div');
        playerCountDisplay.id = 'playerCountDisplay';
        playerCountDisplay.style.position = 'absolute';
        playerCountDisplay.style.top = '10px';
        playerCountDisplay.style.left = '50%';
        playerCountDisplay.style.transform = 'translateX(-50%)';
        playerCountDisplay.style.borderRadius = '8px';
        playerCountDisplay.style.padding = '8px 12px';
        playerCountDisplay.style.color = '#333'; 
        playerCountDisplay.style.fontSize = '14px';
        playerCountDisplay.style.zIndex = '1000';
        playerCountDisplay.style.textAlign = 'center';
        playerCountDisplay.style.display = 'flex';
        playerCountDisplay.style.alignItems = 'center';
        playerCountDisplay.style.gap = '10px';
        
        // 添加到主界面
        gameScreen.appendChild(playerCountDisplay);
    }

    // 更新提示框内容
    let content = `当前人数：${count}`;
    
    // 如果有房间码，添加房间码和复制按钮
    if (currentRoomId) {
        content = `
            <span>当前人数：${count}</span>
            <span style="margin: 0 5px;">|</span>
            <span>房间码：${currentRoomId}</span>
            <button id="copyRoomCodeButton" style="
                background: #3498db;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
                cursor: pointer;
                margin-left: 5px;
            ">复制</button>
        `;
        
        playerCountDisplay.innerHTML = content;
        
        // 添加复制功能
        const copyButton = document.getElementById('copyRoomCodeButton');
        if (copyButton) {
            copyButton.addEventListener('click', function() {
                navigator.clipboard.writeText(currentRoomId).then(function() {
                    // 临时更改按钮文本以显示复制成功
                    const originalText = copyButton.textContent;
                    copyButton.textContent = '已复制';
                    copyButton.style.background = '#27ae60';
                    
                    setTimeout(function() {
                        copyButton.textContent = originalText;
                        copyButton.style.background = '#3498db';
                    }, 1000);
                }).catch(function(err) {
                    console.error('复制失败:', err);
                    alert('复制失败，请手动复制房间码：' + currentRoomId);
                });
            });
        }
    } else {
        playerCountDisplay.textContent = content;
    }
}

// 显示临时提示框
function showTemporaryMessage(message) {
    // 创建提示框容器
    const messageBox = document.createElement('div');
    messageBox.style.position = 'fixed';
    messageBox.style.top = '15%';
    messageBox.style.left = '50%';
    messageBox.style.transform = 'translateX(-50%)';
    messageBox.style.backgroundColor = '#3498db';
    messageBox.style.color = '#fff';
    messageBox.style.padding = '10px 20px';
    messageBox.style.borderRadius = '8px';
    messageBox.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    messageBox.style.fontSize = '16px';
    messageBox.style.zIndex = '1000';
    messageBox.style.textAlign = 'center';
    messageBox.textContent = message;

    // 添加到文档中
    document.body.appendChild(messageBox);

    // 3秒后移除提示框
    setTimeout(() => {
        messageBox.remove();
    }, 5000);
}

// WebSocket 消息处理
ws.onmessage = (event) => {
    // console.log('收到消息:', event.data);
    const data = JSON.parse(event.data);

    switch (data.type) {        case 'roomCreated':
            currentRoomId = data.roomId;
            // 设置主持人的玩家ID
            currentPlayerId = 'host_' + Math.random().toString(36).substr(2, 9);
            console.log('创建房间，主持人ID:', currentPlayerId);
            showTemporaryMessage(`房间已创建！你需要为所有人抽取角色和事件，点击对应的角色框可为没有的重新抽取`);
            initialScreen.style.display = 'none';
            gameScreen.style.display = 'block';
            
            // 主持人创建房间后立即显示玩家数量提示框
            currentPlayerCount = 1; // 主持人自己算一个玩家
            showPlayerCount(currentPlayerCount);
            
            // 设置事件驱动同步监听器
            setupEventDrivenSync();
            break;        case 'roomJoined':
            currentRoomId = data.roomId;
            // 设置唯一的玩家ID
            currentPlayerId = data.playerId || 'player_' + Math.random().toString(36).substr(2, 9);
            console.log('加入房间，玩家ID:', currentPlayerId);
            showTemporaryMessage('成功加入房间！地主会帮你完成所有操作，等着就行。'); // 使用临时提示框
            initialScreen.style.display = 'none';
            gameScreen.style.display = 'block';
            
            // 玩家加入房间后立即显示玩家数量提示框（使用当前存储的数量）
            showPlayerCount(currentPlayerCount);
            
            // 即使是非主持人，也需要设置事件监听器（虽然不会触发同步）
            setupEventDrivenSync();

            // 隐藏按钮并禁用功能（加入房间的玩家）
            if (!isHost) {
                resetButton.style.display = 'none';
                startButton.style.display = 'none';
                missionButton.style.display = 'none';
                syncButton.style.display = 'none'; // 禁用同步按钮

                // 隐藏 BP 按钮
                bpButton.style.display = 'none'; // 隐藏 BP 按钮
                
                // 隐藏设置按钮
                const settingsButton = document.getElementById('settingsButton');
                if (settingsButton) {
                    settingsButton.style.display = 'none'; // 隐藏设置按钮
                }
                
                // 禁用角色卡片单击事件
                characterBoxes.forEach((box) => {
                    box.style.pointerEvents = 'none'; // 禁用点击事件
                });

                // 禁用事件卡片单击事件
                missionBoxes.forEach((box) => {
                    box.style.pointerEvents = 'none'; // 禁用点击事件
                });
                
                // 隐藏重抽计数器
                const rerollCounter = document.getElementById('rerollCounter');
                if (rerollCounter) {
                    rerollCounter.style.display = 'none';
                }
                
                // 历史记录按钮
                const historyButton = document.querySelector('.history-button');
                if (historyButton) {
                    historyButton.style.display = 'none'; 
                }
            }
            break;

        case 'stateUpdated':
            console.log('收到最新游戏状态:', data.state);
            updateGameState(data.state); // 更新界面

            // 同步历史记录数据
            if (data.history) {
                window.historyData = data.history;
                console.log('同步历史记录:', data.history);
            }

            // 确保其他玩家的历史记录按钮可见
            if (!isHost) {
                const historyButton = document.querySelector('.history-button');
                if (historyButton) {
                    historyButton.style.display = 'none'; 
                }
            }
            break;

        case 'roomClosed':
            alert('主持人已关闭房间');
            localStorage.removeItem('roomId'); // 房间关闭时清除房间代码
            location.reload();
            break;

        case 'error':
            alert(`错误：${data.message}`);
            localStorage.removeItem('roomId'); // 出现错误时清除房间代码
            break;        case 'playerCount':
            // 使用顶部提示框显示当前人数
            currentPlayerCount = data.count;
            showPlayerCount(data.count);
            
            // 新玩家加入时触发完整状态同步
            handleNewPlayerJoin();
            break;case 'syncVote':
            // 同步投票状态
            if (window.hardMissionVoting && window.hardMissionVoting.syncVotingState) {
                // 传递发送者ID信息，以便客户端正确处理投票状态
                window.hardMissionVoting.syncVotingState(data.voteData, data.senderId);
            }
            break;        case 'syncVotingResult':
            // 同步投票结果
            if (window.hardMissionVoting && window.hardMissionVoting.syncVotingResult) {
                window.hardMissionVoting.syncVotingResult(data.resultData);
            }
            break;        case 'votingStateSync':
            // 处理新的服务器投票状态同步消息
            console.log('收到服务器投票状态同步:', data.votingState);
            
            // 检查是否是新轮投票开始，如果是则强制允许UI重建
            if (data.votingState && data.votingState.isNewRound && window.hardMissionVoting && window.hardMissionVoting.allowUIRebuild) {
                console.log('检测到新轮投票开始，强制允许UI重建');
                window.hardMissionVoting.allowUIRebuild();
            }
            
            if (window.hardMissionVoting && window.hardMissionVoting.syncVotingState) {
                window.hardMissionVoting.syncVotingState({ votingState: data.votingState }, 'server');
            }
            break;

        case 'heartbeatAck':
            // 处理心跳包确认消息
            const latency = Date.now() - data.originalTimestamp;
            console.log(`收到心跳包确认 - 延迟: ${latency}ms`);
            break;

        case 'updateState':
            console.log(`更新状态请求，房间ID: ${data.roomId}`);
            const updateRoom = rooms[data.roomId];
            if (updateRoom && updateRoom.host === ws) {
                updateRoom.state = data.state;

                console.log(`广播最新状态，房间ID: ${data.roomId}`);
                updateRoom.players.forEach((player) => {
                    player.send(JSON.stringify({ type: 'stateUpdated', state: data.state }));
                });
            } else {
                console.log('更新状态失败：房间不存在或请求者不是主持人');
            }
            break;

        default:
            console.log('未知消息类型:', data.type);
    }
};

    // 主持人发送游戏状态
    window.sendGameState = function sendGameState() {
        if (!window.gameState) {
            console.error('gameState 未定义');
            return;
        }

        const state = {
            roundCounter: gameState.roundCounter,
            characters: Array.from(characterBoxes).map((box) => ({
                name: box.querySelector('.character-name').textContent,
                image: box.querySelector('.character-image').src
            })),
            missions: Array.from(missionBoxes).map((box) => ({
                title: box.querySelector('.mission-title').textContent,
                content: box.querySelector('.mission-content').textContent
            }))
        };

        // 添加日志记录主持人发送的数据
        console.log('主持人发送的游戏状态:', state);

        ws.send(JSON.stringify({ type: 'updateState', roomId: currentRoomId, state }));
    };

    // 更新游戏状态（同步角色、事件和轮数）
    function updateGameState(state) {
        // 更新轮数
        roundCounterDisplay.textContent = `当前轮数：${state.roundCounter}`;

        // 更新角色卡片
        state.characters.forEach((character, index) => {
            const box = characterBoxes[index];
            const img = box.querySelector('.character-image');
            const name = box.querySelector('.character-name');

            img.style.display = 'block';
            img.src = character.image;
            name.textContent = character.name;
        });

        // 更新事件卡片
        state.missions.forEach((mission, index) => {
            const box = missionBoxes[index];
            const title = box.querySelector('.mission-title');
            const content = box.querySelector('.mission-content');

            title.textContent = mission.title;
            content.innerHTML = mission.content; // 使用 innerHTML 恢复颜色
        });        // 更新困难模式事件 - 支持新的三个困难事件显示格式和投票状态
        if (state.hardMissions && state.hardMissions.length > 0) {
            // 确保困难事件容器存在
            let hardMissionsContainer = document.getElementById('hardMissionsContainer');
            let hardMissionsGrid = document.getElementById('hardMissionsGrid');
            
            if (!hardMissionsContainer || !hardMissionsGrid) {
                console.log('困难事件容器不存在，无法更新');
                return;
            }
            
            // 检查是否正在投票中 - 如果是，则不重新创建UI，避免清除投票状态
            if (window.hardMissionVoting && window.hardMissionVoting.isVotingActive && window.hardMissionVoting.isVotingActive()) {
                console.log('投票进行中，跳过困难事件UI重新创建，避免清除投票状态');
                
                // 仅更新现有元素的内容（如果标题或内容有变化）
                state.hardMissions.forEach((hardMission, index) => {
                    if (index < 3) {
                        const existingBox = document.querySelector(`[data-mission-index="${index}"]`);
                        if (existingBox) {
                            const titleElement = existingBox.querySelector('.hard-mission-title');
                            const contentElement = existingBox.querySelector('.hard-mission-content');
                            
                            if (titleElement && titleElement.textContent !== hardMission.title) {
                                titleElement.textContent = hardMission.title;
                            }
                            if (contentElement && contentElement.textContent !== hardMission.content) {
                                contentElement.textContent = hardMission.content;
                            }
                        }
                    }
                });
                
                // 显示困难事件容器
                hardMissionsContainer.style.display = 'block';
                return; // 提前退出，保持投票状态
            }
            
            // 只有在非投票状态时才重新创建UI
            console.log('非投票状态，可以重新创建困难事件UI');
            
            // 清空现有内容
            hardMissionsGrid.innerHTML = '';
            
            // 重新创建困难事件元素
            state.hardMissions.forEach((hardMission, index) => {
                if (index < 3) { // 确保不超过3个
                    const hardMissionBox = document.createElement('div');
                    hardMissionBox.className = 'hard-mission-box';
                    hardMissionBox.id = `hardMission${index + 1}`;
                    hardMissionBox.dataset.missionIndex = index;
                    
                    const titleElement = document.createElement('div');
                    titleElement.className = 'hard-mission-title';
                    titleElement.textContent = hardMission.title;
                    
                    const contentElement = document.createElement('div');
                    contentElement.className = 'hard-mission-content';
                    contentElement.textContent = hardMission.content;
                    
                    // 创建投票点数显示容器
                    const voteDotsContainer = document.createElement('div');
                    voteDotsContainer.className = 'vote-dots-container';
                    voteDotsContainer.id = `voteDots${index}`;
                    
                    hardMissionBox.appendChild(titleElement);
                    hardMissionBox.appendChild(contentElement);
                    hardMissionBox.appendChild(voteDotsContainer);
                    hardMissionsGrid.appendChild(hardMissionBox);
                    
                    // 添加点击投票事件
                    hardMissionBox.addEventListener('click', () => {
                        if (window.hardMissionVoting && window.hardMissionVoting.handleVote) {
                            window.hardMissionVoting.handleVote(index);
                        }
                    });
                }
            });
            
            // 显示困难事件容器
            hardMissionsContainer.style.display = 'block';
        }
          // 同步投票状态
        if (state.votingData) {
            if (window.hardMissionVoting && window.hardMissionVoting.syncVotingState) {
                window.hardMissionVoting.syncVotingState(state.votingData, 'gameStateSync');
            }
        }
        
        // 同步投票结果
        if (state.votingResult) {
            if (window.hardMissionVoting && window.hardMissionVoting.syncVotingResult) {
                window.hardMissionVoting.syncVotingResult(state.votingResult);
            }
        }
        
        // 保持向后兼容性 - 更新原有的单个困难事件显示
        const hardMissionTitle = selectedHardMission.querySelector('.mission-title');
        const hardMissionContent = selectedHardMission.querySelector('.mission-content');

        if (state.hardMission && state.hardMission.title) {
            selectedHardMission.style.display = 'block';
            hardMissionTitle.textContent = state.hardMission.title;
            hardMissionContent.innerHTML = state.hardMission.content; // 使用 innerHTML 恢复颜色
        }
    }    // 同步投票状态
    function syncVoteState(voteData) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket连接未打开，无法同步投票状态');
            return;
        }
        
        console.log('同步投票状态:', voteData);
        ws.send(JSON.stringify({ 
            type: 'syncVote', 
            roomId: currentRoomId, 
            voteData,
            senderId: currentPlayerId // 添加发送者ID
        }));
    }
    
    // 同步投票结果
    function syncVotingResult(resultData) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket连接未打开，无法同步投票结果');
            return;
        }
        
        console.log('同步投票结果:', resultData);
        ws.send(JSON.stringify({ 
            type: 'syncVotingResult', 
            roomId: currentRoomId, 
            resultData 
        }));
    }    exploreButton.addEventListener('click', () => {
        initialScreen.style.display = 'none';
        gameScreen.style.display = 'block';

        // 确保断开WebSocket连接，进入单机模式
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
        ws = null;
        isHost = false;
        currentRoomId = null;
        currentPlayerId = null;
        
        // 禁用房间同步功能
        console.log('进入单机游戏模式，已断开多人游戏连接');
        
        // 在页面上显示单机模式提示（可选）
        const statusElement = document.querySelector('#connectionStatus');
        if (statusElement) {
            statusElement.textContent = '单机游戏模式';
            statusElement.style.color = '#2ecc71';
        }
    });// 开始投票 - 主机发送投票开始请求
    function startVoting(missions) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket连接未打开，无法开始投票');
            return false;
        }
        
        if (!isHost) {
            console.error('只有主机可以开始投票');
            return false;
        }
        
        console.log('主机开始投票:', missions);
        ws.send(JSON.stringify({ 
            type: 'startVoting', 
            roomId: currentRoomId, 
            missions,
            hostId: currentPlayerId
        }));
        return true;
    }
      // 提交投票 - 玩家发送个人投票
    function submitVote(missionIndex, playerId) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket连接未打开，无法提交投票');
            return false;
        }
        
        console.log('提交投票:', { missionIndex, playerId: playerId || currentPlayerId });
        ws.send(JSON.stringify({ 
            type: 'submitVote', 
            roomId: currentRoomId, 
            missionIndex,
            playerId: playerId || currentPlayerId,
            isHost: isHost
        }));
        return true;
    }

    // 手动结算投票 - 主机专用
    function manualSettleVoting() {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket连接未打开，无法手动结算投票');
            return false;
        }
        
        if (!isHost) {
            console.error('只有主机可以手动结算投票');
            return false;
        }
        
        console.log('主机手动结算投票');
        ws.send(JSON.stringify({ 
            type: 'manualSettleVoting', 
            roomId: currentRoomId,
            hostId: currentPlayerId
        }));
        return true;
    }

    // 事件驱动同步：在关键操作时自动触发同步
    function setupEventDrivenSync() {
        if (!isHost) {
            console.log('非主持人，跳过同步事件监听器设置');
            return;
        }
        
        console.log('设置事件驱动同步监听器');
        
        // 监听开始游戏按钮
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.addEventListener('click', () => {
                console.log('检测到开始游戏操作');
                setTimeout(syncGameStateIfChanged, 1000); // 延迟1秒确保状态更新完成
            });
        }
        
        // 监听抽取事件按钮
        const missionButton = document.getElementById('missionButton');
        if (missionButton) {
            missionButton.addEventListener('click', () => {
                console.log('检测到抽取事件操作');
                setTimeout(syncGameStateIfChanged, 1000);
            });
        }
        
        // 监听BP模式按钮
        const bpButton = document.getElementById('bpButton');
        if (bpButton) {
            bpButton.addEventListener('click', () => {
                console.log('检测到BP模式切换操作');
                setTimeout(syncGameStateIfChanged, 500);
            });
        }
        
        // 监听重置按钮
        const resetButton = document.getElementById('resetButton');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                console.log('检测到重置游戏操作');
                setTimeout(syncGameStateIfChanged, 500);
            });
        }
        
        // 监听角色卡片点击事件（单独刷新角色）
        characterBoxes.forEach((box, index) => {
            box.addEventListener('click', () => {
                console.log(`检测到角色卡片${index + 1}点击`);
                setTimeout(syncGameStateIfChanged, 3600); // 等待动画完成后同步
            });
        });
        
        // 监听事件卡片点击事件（单独刷新事件）
        missionBoxes.forEach((box, index) => {
            box.addEventListener('click', () => {
                console.log(`检测到事件卡片${index + 1}点击`);
                setTimeout(syncGameStateIfChanged, 500);
            });
        });
    }
      // 新玩家加入时的完整状态同步
    function handleNewPlayerJoin() {
        if (isHost) {
            console.log('新玩家加入，发送完整游戏状态');
            // 强制同步，无论状态是否变化
            syncGameState();
        }
    }
      // 导出多人游戏管理器
window.multiplayerManager = {
    syncVoteState,
    syncVotingResult,
    startVoting,
    submitVote,
    manualSettleVoting,
    isConnected: () => ws && ws.readyState === WebSocket.OPEN,
    getCurrentPlayerId: () => currentPlayerId || 'player1',
    isHost: () => isHost,
    getPlayerCount: () => {
        // 返回实际的玩家数量，包含主机和所有玩家
        return currentPlayerCount;
    }
};
});
