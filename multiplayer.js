document.addEventListener('DOMContentLoaded', function () {
    // 检查是否为本地开发环境
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const wsUrl = isLocalDev ? 'ws://127.0.0.1:3000' : 'wss://unhappycar.tech:3000';
    console.log('连接到WebSocket服务器:', wsUrl);
    
    // 记录连接开始时间
    const connectionStartTime = Date.now();
    const ws = new WebSocket(wsUrl);

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
    let heartbeatInterval = null; // 心跳包定时器
    let lastHeartbeatTime = null; // 上次心跳包发送时间

    // 默认禁用按钮
    hostGameButton.disabled = true;
    joinGameButton.disabled = true;

    // WebSocket 连接成功
    ws.onopen = () => {
        console.log('WebSocket 连接成功');
        
        // 计算连接用时
        const connectionTime = Date.now() - connectionStartTime;
        
        if (connectionStatus) {
            connectionStatus.textContent = `多人游戏服务器连接成功！ (${connectionTime}ms)`;
            connectionStatus.style.color = 'green'; 
        }        // 启用按钮
        hostGameButton.disabled = false;
        joinGameButton.disabled = false;
        
        // 开始发送心跳包
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
        
        // 停止心跳包
        stopHeartbeat();
        
    };    // WebSocket 连接关闭
    ws.onclose = () => {
        console.log('WebSocket 连接已关闭');
        if (connectionStatus) {
            connectionStatus.textContent = '服务器连接已断开，请刷新页面重试...';
            connectionStatus.style.color = 'red'; 
        }

        // 确保按钮保持禁用状态
        hostGameButton.disabled = true;
        joinGameButton.disabled = true;
        
        // 停止心跳包
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
        showRoomCodeInput();
        
        isHost = false;
        if (timeCounter) {
            timeCounter.style.display = 'none';
        }
    });

    // 显示房间码输入对话框
    function showRoomCodeInput() {
        const cachedRoomId = localStorage.getItem('roomId');
        
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0);
            backdrop-filter: blur(0px);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;

        // 创建对话框
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(15px);
            border-radius: 15px;
            padding: 30px;
            width: 380px;
            max-width: 90vw;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.3);
            transform: scale(0.7) translateY(-30px);
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            box-sizing: border-box;
        `;

        // 标题
        const title = document.createElement('h3');
        title.textContent = '加入游戏';
        title.style.cssText = `
            margin: 0 0 25px 0;
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        `;

        // 输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '请输入房间代码';
        input.maxLength = 6; // 限制最大长度为6个字符
        input.style.cssText = `
            width: 100%;
            padding: 15px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 18px;
            margin-bottom: 25px;
            box-sizing: border-box;
            text-align: center;
            transition: all 0.3s ease;
            outline: none;
        `;

        // 输入框焦点样式
        input.addEventListener('focus', () => {
            input.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            input.style.background = 'rgba(255, 255, 255, 0.2)';
            input.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.2)';
        });

        input.addEventListener('blur', () => {
            input.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            input.style.background = 'rgba(255, 255, 255, 0.1)';
            input.style.boxShadow = 'none';
        });

        // 自动转换小写字母为大写，并限制只能输入字母和数字
        input.addEventListener('input', () => {
            const cursorPosition = input.selectionStart;
            let value = input.value;
            
            // 过滤掉非字母数字字符
            value = value.replace(/[^a-zA-Z0-9]/g, '');
            
            // 限制长度为6个字符
            if (value.length > 6) {
                value = value.slice(0, 6);
            }
            
            // 转换为大写
            const upperCaseValue = value.toUpperCase();
            
            if (input.value !== upperCaseValue) {
                input.value = upperCaseValue;
                // 保持光标位置，但不能超过新值的长度
                const newCursorPosition = Math.min(cursorPosition, upperCaseValue.length);
                input.setSelectionRange(newCursorPosition, newCursorPosition);
            }
        });

        // 设置输入框占位符颜色和添加动画
        const style = document.createElement('style');
        style.textContent = `
            input::placeholder {
                color: rgba(255, 255, 255, 0.6);
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
                20%, 40%, 60%, 80% { transform: translateX(8px); }
            }
            @keyframes errorGlow {
                0% { 
                    background: rgba(255, 120, 120, 0.25);
                    border-color: rgba(255, 100, 100, 0.8);
                    box-shadow: 0 0 20px rgba(255, 100, 100, 0.4);
                }
                50% { 
                    background: rgba(255, 120, 120, 0.35);
                    border-color: rgba(255, 100, 100, 1);
                    box-shadow: 0 0 30px rgba(255, 100, 100, 0.6);
                }
                100% { 
                    background: rgba(255, 120, 120, 0.25);
                    border-color: rgba(255, 100, 100, 0.8);
                    box-shadow: 0 0 20px rgba(255, 100, 100, 0.4);
                }
            }
        `;
        document.head.appendChild(style);

        // 主按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: space-between;
            margin-bottom: 15px;
        `;

        // 确认按钮
        const confirmButton = document.createElement('button');
        confirmButton.textContent = '加入';
        confirmButton.style.cssText = `
            background: rgba(100, 255, 150, 0.15);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(100, 255, 150, 0.4);
            color: white;
            padding: 15px 30px;
            font-size: 18px;
            font-weight: bold;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            flex: 1;
            box-shadow: 0 4px 15px rgba(100, 255, 150, 0.1);
            outline: none;
        `;

        // 取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.cssText = `
            background: rgba(255, 120, 120, 0.15);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 120, 120, 0.4);
            color: white;
            padding: 15px 30px;
            font-size: 18px;
            font-weight: bold;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            flex: 1;
            box-shadow: 0 4px 15px rgba(255, 120, 120, 0.1);
            outline: none;
        `;

        // 按钮悬停效果
        confirmButton.addEventListener('mouseover', () => {
            confirmButton.style.background = 'rgba(100, 255, 150, 0.25)';
            confirmButton.style.transform = 'translateY(-3px)';
            confirmButton.style.boxShadow = '0 8px 25px rgba(100, 255, 150, 0.2)';
            confirmButton.style.borderColor = 'rgba(100, 255, 150, 0.6)';
        });

        confirmButton.addEventListener('mouseout', () => {
            confirmButton.style.background = 'rgba(100, 255, 150, 0.15)';
            confirmButton.style.transform = 'translateY(0)';
            confirmButton.style.boxShadow = '0 4px 15px rgba(100, 255, 150, 0.1)';
            confirmButton.style.borderColor = 'rgba(100, 255, 150, 0.4)';
        });

        cancelButton.addEventListener('mouseover', () => {
            cancelButton.style.background = 'rgba(255, 120, 120, 0.25)';
            cancelButton.style.transform = 'translateY(-3px)';
            cancelButton.style.boxShadow = '0 8px 25px rgba(255, 120, 120, 0.2)';
            cancelButton.style.borderColor = 'rgba(255, 120, 120, 0.6)';
        });

        cancelButton.addEventListener('mouseout', () => {
            cancelButton.style.background = 'rgba(255, 120, 120, 0.15)';
            cancelButton.style.transform = 'translateY(0)';
            cancelButton.style.boxShadow = '0 4px 15px rgba(255, 120, 120, 0.1)';
            cancelButton.style.borderColor = 'rgba(255, 120, 120, 0.4)';
        });

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);

        // 组装对话框内容
        dialog.appendChild(title);
        dialog.appendChild(input);
        dialog.appendChild(buttonContainer);

        // 如果有缓存的房间码，添加返回按钮（与上面按钮对齐）
        if (cachedRoomId) {
            const returnButtonContainer = document.createElement('div');
            returnButtonContainer.style.cssText = `
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-bottom: 0px;
                transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            `;

            const returnButton = document.createElement('button');
            returnButton.textContent = `返回"${cachedRoomId}"`;
            returnButton.style.cssText = `
                background: rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.4);
                color: white;
                padding: 15px 30px;
                font-size: 18px;
                font-weight: bold;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 100%;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2), 0 0 15px rgba(255, 255, 255, 0.3);
                outline: none;
            `;
            
            returnButton.addEventListener('mouseover', () => {
                returnButton.style.background = 'rgba(255, 255, 255, 0.3)';
                returnButton.style.transform = 'translateY(-3px)';
                returnButton.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.4)';
                returnButton.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            });

            returnButton.addEventListener('mouseout', () => {
                returnButton.style.background = 'rgba(255, 255, 255, 0.2)';
                returnButton.style.transform = 'translateY(0)';
                returnButton.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2), 0 0 15px rgba(255, 255, 255, 0.3)';
                returnButton.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            });
            
            returnButton.addEventListener('click', () => {
                // 不立即关闭弹窗，让错误处理决定是否关闭
                joinRoomWithErrorHandling(cachedRoomId, 'return', returnButton, hideDialog);
            });
            
            returnButtonContainer.appendChild(returnButton);
            dialog.appendChild(returnButtonContainer);
        }

        // 确认按钮事件
        confirmButton.addEventListener('click', () => {
            const roomId = input.value.trim();
            if (roomId) {
                hideDialog();
                joinRoomWithErrorHandling(roomId, 'input', null, null); // 输入框来源不需要保持弹窗打开
            } else {
                // 显示输入框错误动画（无文字提示）
                input.style.borderColor = 'rgba(255, 100, 100, 0.8)';
                input.style.background = 'rgba(255, 100, 100, 0.1)';
                input.style.animation = 'shake 0.6s ease-in-out, errorGlow 2s ease-in-out';
                
                // 2秒后恢复样式
                setTimeout(() => {
                    input.style.animation = '';
                    input.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    input.style.background = 'rgba(255, 255, 255, 0.1)';
                }, 2000);
            }
        });

        // 取消按钮事件
        cancelButton.addEventListener('click', () => {
            hideDialog();
        });

        // 点击遮罩层关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                hideDialog();
            }
        });

        // 回车键确认
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmButton.click();
            }
        });

        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                hideDialog();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // 隐藏对话框的函数
        function hideDialog() {
            overlay.style.opacity = '0';
            overlay.style.background = 'rgba(0, 0, 0, 0)';
            overlay.style.backdropFilter = 'blur(0px)';
            dialog.style.opacity = '0';
            dialog.style.transform = 'scale(0.8) translateY(30px)';
            
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                if (document.head.contains(style)) {
                    document.head.removeChild(style);
                }
            }, 300);
        }

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 开场动画
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.style.background = 'rgba(0, 0, 0, 0.5)';
            overlay.style.backdropFilter = 'blur(10px)';
            dialog.style.opacity = '1';
            dialog.style.transform = 'scale(1) translateY(0)';
        });
        
        // 自动聚焦到输入框
        setTimeout(() => input.focus(), 300);
    }

    // 消息提示函数（如果不存在的话）
    function showMessage(message, type = "info") {
        const messageDiv = document.createElement("div");
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 15px;
            color: white;
            font-weight: bold;
            z-index: 10001;
            backdrop-filter: blur(15px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

        if (type === "success") {
            messageDiv.style.background = "rgba(100, 255, 100, 0.2)";
            messageDiv.style.border = "1px solid rgba(100, 255, 100, 0.3)";
        } else if (type === "error") {
            messageDiv.style.background = "rgba(255, 100, 100, 0.2)";
            messageDiv.style.border = "1px solid rgba(255, 100, 100, 0.3)";
        } else {
            messageDiv.style.background = "rgba(100, 150, 255, 0.2)";
            messageDiv.style.border = "1px solid rgba(100, 150, 255, 0.3)";
        }

        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        // 动画显示
        setTimeout(() => {
            messageDiv.style.transform = "translateX(0)";
        }, 10);

        // 自动隐藏
        setTimeout(() => {
            messageDiv.style.transform = "translateX(400px)";
            setTimeout(() => {
                if (document.body.contains(messageDiv)) {
                    messageDiv.remove();
                }
            }, 300);
        }, 3000);
    }

    // 输入框错误提示函数
    function showInputError(inputElement, message) {
        // 添加摇晃动画和红色辉光
        inputElement.style.borderColor = 'rgba(255, 100, 100, 0.8)';
        inputElement.style.background = 'rgba(255, 100, 100, 0.1)';
        inputElement.style.boxShadow = '0 0 20px rgba(255, 100, 100, 0.5)';
        inputElement.style.animation = 'shake 0.5s ease-in-out';

        // 创建错误提示
        const errorText = document.createElement('div');
        errorText.textContent = message;
        errorText.style.cssText = `
            color: rgba(255, 100, 100, 0.9);
            font-size: 14px;
            text-align: center;
            margin-top: 10px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.3s ease;
        `;

        // 插入到输入框容器后面
        const inputContainer = inputElement.parentElement;
        if (inputContainer && inputContainer.nextSibling) {
            inputContainer.parentElement.insertBefore(errorText, inputContainer.nextSibling);
        }

        // 5秒后恢复样式并移除错误提示
        setTimeout(() => {
            inputElement.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            inputElement.style.background = 'rgba(255, 255, 255, 0.1)';
            inputElement.style.boxShadow = 'none';
            inputElement.style.animation = '';
            if (errorText.parentElement) {
                errorText.remove();
            }
        }, 5000);
    }

    // 按钮错误提示函数
    function showButtonError(buttonElement, message) {
        const originalBg = buttonElement.style.background;
        const originalBorder = buttonElement.style.borderColor;
        const originalShadow = buttonElement.style.boxShadow;

        // 添加摇晃动画和红色样式
        buttonElement.style.background = 'rgba(255, 120, 120, 0.25)';
        buttonElement.style.borderColor = 'rgba(255, 120, 120, 0.5)';
        buttonElement.style.boxShadow = '0 0 20px rgba(255, 120, 120, 0.4)';
        buttonElement.style.animation = 'shake 0.6s ease-in-out, errorGlow 2s ease-in-out';

        // 2秒后处理按钮状态
        setTimeout(() => {
            if (message.includes('已解散') || message.includes('房间已解散')) {
                // 如果是房间已解散，则让按钮摇晃后隐藏，但不关闭弹窗
                // 先让按钮淡出
                buttonElement.style.opacity = '0';
                buttonElement.style.transform = 'scale(0.8)';
                
                // 210ms后开始收缩容器高度
                setTimeout(() => {
                    const buttonContainer = buttonElement.parentElement;
                    if (buttonContainer) {
                        // 添加高度过渡动画
                        buttonContainer.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                        buttonContainer.style.height = buttonContainer.offsetHeight + 'px'; // 设置当前高度
                        buttonContainer.style.overflow = 'hidden';
                        
                        // 触发高度变化
                        requestAnimationFrame(() => {
                            buttonContainer.style.height = '0px';
                            buttonContainer.style.marginBottom = '0px';
                            buttonContainer.style.paddingTop = '0px';
                            buttonContainer.style.paddingBottom = '0px';
                            buttonContainer.style.opacity = '0';
                        });
                        
                        // 动画完成后移除容器
                        setTimeout(() => {
                            if (buttonContainer.parentElement) {
                                buttonContainer.remove();
                            }
                        }, 400);
                    }
                }, 210);
            } else {
                // 其他情况恢复原样
                buttonElement.style.background = originalBg;
                buttonElement.style.borderColor = originalBorder;
                buttonElement.style.boxShadow = originalShadow;
                buttonElement.style.animation = '';
            }
        }, 2000); // 与输入框错误动画时长保持一致
    }

    // 加入房间的错误处理函数
    function joinRoomWithErrorHandling(roomId, source, buttonElement = null, hideDialogCallback = null) {
        // 存储当前尝试的信息，用于错误处理
        window.currentJoinAttempt = {
            source: source,
            buttonElement: buttonElement,
            roomId: roomId,
            hideDialogCallback: hideDialogCallback
        };
        
        ws.send(JSON.stringify({ type: 'joinRoom', roomId: roomId }));
    }    // 同步数据函数 - 仅主持人可调用
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
            }        }        // 获取当前阵容名称
        const teamNameDisplay = document.getElementById('teamNameDisplay');
        const currentTeamName = teamNameDisplay ? teamNameDisplay.textContent.replace('当前阵容：', '') : '';
        const isTeamModeActive = window.teamManagement && typeof window.teamManagement.isTeamMode === 'function' ? 
            window.teamManagement.isTeamMode() : false;

        const state = {
            roundCounter: gameState.roundCounter,
            characters: Array.from(characterBoxes).map((box) => {
                const name = box.querySelector('.character-name').textContent;
                const img = box.querySelector('.character-image');
                const splitContainer = box.querySelector('.character-image-split');
                
                // 检查是否为分割头像（可替换角色）
                if (splitContainer && name.includes('/')) {
                    const imgs = splitContainer.querySelectorAll('img');
                    return {
                        name: name,
                        image: img.src, // 保留原始图像作为备用
                        isSplit: true,
                        splitImages: imgs.length >= 2 ? [imgs[0].src, imgs[1].src] : []
                    };
                } else {
                    return {
                        name: name,
                        image: img.src,
                        isSplit: false
                    };
                }
            }),
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
            },
            // 添加阵容信息同步
            teamInfo: {
                teamName: currentTeamName,
                isTeamModeActive: isTeamModeActive
            }
        };

        const history = window.historyData || [];

        console.log('同步的游戏状态:', state, '历史记录:', history);
        ws.send(JSON.stringify({ type: 'updateState', roomId: currentRoomId, state, history }));

    }    // 优化后的同步机制：事件驱动同步 + 长间隔保活同步
    let lastEventSyncTime = null; // 追踪最后一次事件驱动同步的时间
    
    setInterval(() => {
        // 只有主持人发送保活同步，且只在有连接时发送
        if (isHost && ws && ws.readyState === WebSocket.OPEN && currentRoomId) {
            console.log('执行保活同步检查...');
            syncGameState(true); // 传入保活标识
        }
    }, 30000); //30秒一次保活同步
    
    // 游戏状态缓存，用于检测变化
    let lastGameStateHash = null;
    
    // 计算游戏状态的哈希值，用于检测变化
    function calculateGameStateHash(state) {
        return JSON.stringify(state);
    }
    
    // 检测游戏状态是否发生变化
    function hasGameStateChanged() {
        if (!window.gameState) return false;          const currentState = {
            roundCounter: gameState.roundCounter,
            characters: Array.from(characterBoxes).map((box) => {
                const name = box.querySelector('.character-name').textContent;
                const img = box.querySelector('.character-image');
                const splitContainer = box.querySelector('.character-image-split');
                
                // 检查是否为分割头像（可替换角色）
                if (splitContainer && name.includes('/')) {
                    const imgs = splitContainer.querySelectorAll('img');
                    return {
                        name: name,
                        image: img.src, // 保留原始图像作为备用
                        isSplit: true,
                        splitImages: imgs.length >= 2 ? [imgs[0].src, imgs[1].src] : []
                    };
                } else {
                    return {
                        name: name,
                        image: img.src,
                        isSplit: false
                    };
                }
            }),
            missions: Array.from(missionBoxes).map((box) => ({
                title: box.querySelector('.mission-title').textContent,
                content: box.querySelector('.mission-content').innerHTML
            })),
            // 添加阵容信息用于状态变化检测
            teamInfo: {
                teamName: document.getElementById('teamNameDisplay') ? 
                    document.getElementById('teamNameDisplay').textContent : '',
                isTeamModeActive: window.teamManagement && typeof window.teamManagement.isTeamMode === 'function' ? 
                    window.teamManagement.isTeamMode() : false
            }
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
            // 成功加入房间后才将房间码写入缓存
            localStorage.setItem('roomId', data.roomId);
            // 设置唯一的玩家ID
            currentPlayerId = data.playerId || 'player_' + Math.random().toString(36).substr(2, 9);
            console.log('加入房间，玩家ID:', currentPlayerId);
            showTemporaryMessage('成功加入房间！地主会帮你完成所有操作，等着就行。'); // 使用临时提示框
            
            // 如果有弹窗关闭回调，则关闭弹窗
            if (window.currentJoinAttempt && window.currentJoinAttempt.hideDialogCallback) {
                window.currentJoinAttempt.hideDialogCallback();
            }
            
            // 清理尝试信息
            window.currentJoinAttempt = null;
            
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
            // 根据错误来源进行不同处理
            const currentAttempt = window.currentJoinAttempt;
            
            if (currentAttempt) {
                if (currentAttempt.source === 'input') {
                    // 如果是从输入框加入，关闭弹窗并重新显示，然后显示错误
                    if (currentAttempt.hideDialogCallback) {
                        currentAttempt.hideDialogCallback();
                    }
                    showRoomCodeInput();
                    setTimeout(() => {
                        const input = document.querySelector('input[placeholder="请输入房间代码"]');
                        if (input) {
                            input.value = currentAttempt.roomId;
                            showInputError(input, `房间码错误：${data.message}`);
                        }
                    }, 350);
                    localStorage.removeItem('roomId'); // 输入框错误时清除房间代码
                } else if (currentAttempt.source === 'return' && currentAttempt.buttonElement) {
                    // 如果是从返回按钮加入，则显示按钮错误，但不关闭弹窗
                    showButtonError(currentAttempt.buttonElement, `房间已解散：${data.message}`);
                    localStorage.removeItem('roomId'); // 返回房间失败时也清除房间代码
                    // 注意：这里不调用 hideDialogCallback，保持弹窗打开
                }
                
                // 清理尝试信息
                window.currentJoinAttempt = null;
            } else {
                // 传统的alert方式，作为后备
                alert(`错误：${data.message}`);
                localStorage.removeItem('roomId'); // 出现错误时清除房间代码
            }
            
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
            break;        case 'heartbeatAck':
            // 处理心跳包确认消息
            const latency = Date.now() - data.originalTimestamp;
            console.log(`收到心跳包确认 - 延迟: ${latency}ms`);
            
            // 更新连接状态显示延迟信息
            if (connectionStatus) {
                const baseText = connectionStatus.textContent.split('（')[0]; // 保留基础连接信息
            }
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
        }        const state = {
            roundCounter: gameState.roundCounter,
            characters: Array.from(characterBoxes).map((box) => {
                const name = box.querySelector('.character-name').textContent;
                const img = box.querySelector('.character-image');
                const splitContainer = box.querySelector('.character-image-split');
                
                // 检查是否为分割头像（可替换角色）
                if (splitContainer && name.includes('/')) {
                    const imgs = splitContainer.querySelectorAll('img');
                    return {
                        name: name,
                        image: img.src, // 保留原始图像作为备用
                        isSplit: true,
                        splitImages: imgs.length >= 2 ? [imgs[0].src, imgs[1].src] : []
                    };
                } else {
                    return {
                        name: name,
                        image: img.src,
                        isSplit: false
                    };
                }
            }),
            missions: Array.from(missionBoxes).map((box) => ({
                title: box.querySelector('.mission-title').textContent,
                content: box.querySelector('.mission-content').textContent
            })),
            // 添加阵容信息同步
            teamInfo: {
                teamName: document.getElementById('teamNameDisplay') ? 
                    document.getElementById('teamNameDisplay').textContent.replace('当前阵容：', '') : '',
                isTeamModeActive: window.teamManagement && typeof window.teamManagement.isTeamMode === 'function' ? 
                    window.teamManagement.isTeamMode() : false
            }
        };

        // 添加日志记录主持人发送的数据
        console.log('主持人发送的游戏状态:', state);

        ws.send(JSON.stringify({ type: 'updateState', roomId: currentRoomId, state }));
    };

    // 更新游戏状态（同步角色、事件和轮数）
    function updateGameState(state) {
        // 更新轮数
        roundCounterDisplay.textContent = `当前轮数：${state.roundCounter}`;        // 更新角色卡片
        state.characters.forEach((character, index) => {
            const box = characterBoxes[index];
            const img = box.querySelector('.character-image');
            const name = box.querySelector('.character-name');            // 检查是否为分割头像（可替换角色）
            if (character.isSplit && character.splitImages && character.splitImages.length >= 2) {
                // 隐藏原来的单一头像
                img.style.display = 'none';
                
                // 检查是否已存在分割容器，如果有则移除
                const existingSplit = box.querySelector('.character-image-split');
                if (existingSplit) {
                    existingSplit.remove();
                }
                
                // 判断是否为手机端，与主持人端保持一致
                const isMobile = window.innerWidth <= 768;
                const containerSize = isMobile ? '100px' : '140px';
                
                // 创建分割头像容器
                const splitContainer = document.createElement('div');
                splitContainer.className = 'character-image-split';
                splitContainer.style.cssText = `
                    position: relative;
                    width: ${containerSize};
                    height: ${containerSize};
                    border-radius: 50%;
                    overflow: hidden;
                    border: 3px solid #fff;
                    margin: 0 auto 10px;
                `;
                
                // 创建左侧头像
                const img1 = document.createElement('img');
                img1.src = character.splitImages[0];
                img1.style.cssText = `
                    position: absolute;
                    width: ${containerSize};
                    height: ${containerSize};
                    object-fit: cover;
                    top: 0;
                    left: -20%;
                    clip-path: polygon(0 0, 85% 0, 55% 100%, 0 100%);
                `;
                
                // 创建右侧头像
                const img2 = document.createElement('img');
                img2.src = character.splitImages[1];
                img2.style.cssText = `
                    position: absolute;
                    width: ${containerSize};
                    height: ${containerSize};
                    object-fit: cover;
                    top: 0;
                    right: -20%;
                    clip-path: polygon(45% 0, 100% 0, 100% 100%, 20% 100%);
                `;
                
                // 添加分割线
                const divider = document.createElement('div');
                divider.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 50%;
                    width: 8px;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.9);
                    transform: translateX(-50%) skewX(-15deg);
                    z-index: 1;
                `;
                
                splitContainer.appendChild(img1);
                splitContainer.appendChild(img2);
                splitContainer.appendChild(divider);
                
                // 插入分割容器
                img.parentNode.insertBefore(splitContainer, img);
                
                // 更新角色名称，针对手机端优化字体大小
                name.textContent = character.name;
                if (isMobile) {
                    name.style.cssText = `
                        font-size: 12px;
                        line-height: 1.2;
                        word-break: keep-all;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 100%;
                    `;
                } else {
                    name.style.fontSize = '14px';
                }            } else {
                // 普通单一角色头像
                // 移除可能存在的分割容器
                const existingSplit = box.querySelector('.character-image-split');
                if (existingSplit) {
                    existingSplit.remove();
                }
                
                // 判断是否为手机端，与主持人端保持一致
                const isMobile = window.innerWidth <= 768;
                
                img.style.display = 'block';
                img.src = character.image;
                
                // 为手机端设置统一的头像样式
                if (isMobile) {
                    img.style.cssText = `
                        display: block;
                        width: 100px;
                        height: 100px;
                        border-radius: 50%;
                        object-fit: cover;
                        border: 3px solid #fff;
                        margin: 0 auto 10px;
                    `;
                    name.style.cssText = `
                        font-size: 14px;
                        line-height: 1.2;
                        word-break: keep-all;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 100%;
                        text-align: center;
                    `;
                } else {
                    // 电脑端保持原有样式
                    img.style.cssText = 'display: block;';
                    name.style.fontSize = '';
                }
                
                name.textContent = character.name;
            }
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

        // 同步阵容信息
        if (state.teamInfo) {
            let teamNameDisplay = document.getElementById('teamNameDisplay');
            
            if (state.teamInfo.isTeamModeActive && state.teamInfo.teamName) {
                // 如果不存在阵容显示元素，创建一个
                if (!teamNameDisplay) {
                    teamNameDisplay = document.createElement('div');
                    teamNameDisplay.id = 'teamNameDisplay';
                    teamNameDisplay.style.cssText = `
                        text-align: center;
                        font-size: 18px;
                        font-weight: bold;
                        margin: 10px 0;
                        padding: 10px;
                        color: #2c3e50;
                    `;
                    
                    // 在开始按钮后插入阵容名称
                    const startButtonElement = document.getElementById('startButton');
                    if (startButtonElement) {
                        startButtonElement.parentNode.insertBefore(teamNameDisplay, startButtonElement.nextSibling);
                    }
                }
                
                // 更新阵容名称
                teamNameDisplay.textContent = `当前阵容：${state.teamInfo.teamName}`;
                teamNameDisplay.style.display = 'block';
            } else {
                // 如果阵容模式未激活，隐藏阵容显示
                if (teamNameDisplay) {
                    teamNameDisplay.style.display = 'none';
                }
            }
        }
    }// 同步投票状态
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
    }    // 心跳包功能
    function startHeartbeat() {
        // 清除之前的心跳包定时器
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }
        
        console.log('开始发送心跳包，间隔：60秒');
        
        // 每60秒发送一次心跳包
        heartbeatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                lastHeartbeatTime = Date.now();
                ws.send(JSON.stringify({
                    type: 'heartbeat',
                    timestamp: lastHeartbeatTime,
                    playerId: currentPlayerId,
                    roomId: currentRoomId
                }));
                console.log('发送心跳包');
            } else {
                console.warn('WebSocket未连接，停止发送心跳包');
                stopHeartbeat();
            }
        }, 60000); // 60秒 = 60000毫秒
    }
    
    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
            console.log('停止发送心跳包');
        }
    }

    exploreButton.addEventListener('click', () => {
        initialScreen.style.display = 'none';
        gameScreen.style.display = 'block';        // 确保断开WebSocket连接，进入单机模式
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }
        
        // 停止心跳包
        stopHeartbeat();
        
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
    }      // 导出多人游戏管理器
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
    },
    // 添加发送消息的方法，供其他模块使用现有的WebSocket连接
    sendMessage: (data) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
            console.log('通过多人游戏WebSocket发送消息:', data);
            return true;
        } else {
            console.error('多人游戏WebSocket连接不可用');
            return false;
        }
    }
};

// 导出同步函数到全局作用域
window.syncGameStateIfChanged = syncGameStateIfChanged;
});
