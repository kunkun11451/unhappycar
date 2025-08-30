document.addEventListener('DOMContentLoaded', function () {
    // 检查自定义服务器URL
    const customWsUrl = localStorage.getItem('customWsUrl');
    // 检查是否为本地开发环境
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const defaultWsUrl = isLocalDev ? 'ws://127.0.0.1:3000' : 'wss://unhappycar.tech:11451';
    const wsUrl = customWsUrl || defaultWsUrl;
    console.log('连接到WebSocket服务器:', wsUrl);
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
    let selectedGameMode = 'classic'; // 默认选中经典模式

    // 获取游戏模式的显示名称
    function getGameModeDisplayName(modeId) {
        const modes = {
            'classic': '🎲 经典模式',
            'nochallenge': '🚫 不要做挑战'
        };
        return modes[modeId] || '🎮 更多玩法';
    }

    // 默认禁用按钮
    hostGameButton.disabled = true;
    joinGameButton.disabled = true;

    // WebSocket 连接成功
    ws.onopen = () => {
        console.log('WebSocket 连接成功');
                
        if (connectionStatus) {
            connectionStatus.innerHTML = `多人游戏服务器连接成功！<br>连接到：${wsUrl}`;
            connectionStatus.style.color = 'green'; 
        }
        // 启用按钮
        hostGameButton.disabled = false;
        joinGameButton.disabled = false;
        
        // 开始发送心跳包
        startHeartbeat();

        // 初始化共享事件模块
        if (window.sharedEvents && typeof window.sharedEvents.init === 'function') {
            window.sharedEvents.init(ws);
        }
        
    };    
    
    // 生成错误连接HTML的函数，接受错误原因参数
    const generateInsecureHtml = (errorReason = '') => `
        <div style="
            background: rgba(255, 230, 230, 0.98);
            border-radius: 12px;
            padding: 24px 18px;
            margin: 20px auto;
            width: 70%;
            max-width: 390px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
            text-align: center;
            border: 1px solid #f5c2c7;
        ">
            <div style="font-size: 18px; color: #d32f2f; font-weight: bold; margin-bottom: 12px;">
                ⛓️‍💥服务器连接失败或断开...
            </div>
            <div style="color: #b71c1c; margin-bottom: 16px;">
                连接到：${wsUrl}<br>
                ${errorReason ? `<div style="background: rgba(255, 200, 200, 0.7); border-radius: 6px; padding: 8px 12px; margin: 12px 0; font-size: 14px; border-left: 3px solid #d32f2f;">
                    <strong>失败原因：</strong>${errorReason}
                </div>` : ''}
                请首先刷新页面重试...<br>
                如果持续连接不上，可以尝试设置自定义服务器
            </div>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button id="refreshPageButton" style="
                    display: inline-block;
                    background: #4caf50;
                    color: #fff;
                    font-weight: bold;
                    padding: 12px 24px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-size: 16px;
                    box-shadow: 0 2px 8px rgba(76,175,80,0.12);
                    transition: background 0.2s;
                    border: none;
                    cursor: pointer;
                ">🔄 刷新页面</button>
                <button id="openSettingsForServer" style="
                    display: inline-block;
                    background: #ff9800;
                    color: #fff;
                    font-weight: bold;
                    padding: 12px 24px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-size: 16px;
                    box-shadow: 0 2px 8px rgba(255,152,0,0.12);
                    transition: background 0.2s;
                    border: none;
                    cursor: pointer;
                ">⚙️ 设置服务器</button>
            </div>
        </div>
    `;

    // WebSocket 连接错误
    ws.onerror = (error) => {
        console.error('WebSocket 连接错误:', error);
        let errorReason = '网络连接错误';
        
        // 尝试获取更详细的错误信息
        if (error.type === 'error') {
            if (wsUrl.includes('wss://') && window.location.protocol === 'http:') {
                errorReason = '混合内容错误：HTTPS页面无法连接WS协议';
            } else if (wsUrl.includes('ws://') && window.location.protocol === 'https:') {
                errorReason = '协议不匹配：HTTP页面尝试连接WSS协议';
            } else {
                errorReason = '无法连接到服务器，可能是服务器未启动或网络问题';
            }
        }
        
        if (connectionStatus) {
            connectionStatus.innerHTML = generateInsecureHtml(errorReason);
            connectionStatus.style.color = 'unset';
            
            // 绑定刷新按钮事件
            const refreshPageBtn = document.getElementById('refreshPageButton');
            if (refreshPageBtn) {
                refreshPageBtn.addEventListener('click', () => {
                    window.location.reload();
                });
            }
            
            // 绑定设置按钮事件
            const openSettingsBtn = document.getElementById('openSettingsForServer');
            if (openSettingsBtn) {
                openSettingsBtn.addEventListener('click', () => {
                    const settingsButton = document.getElementById('initialSettingsButton');
                    if (settingsButton) {
                        settingsButton.click();
                        setTimeout(() => {
                            const gameSettings = document.getElementById('gameSettings');
                            if(gameSettings) gameSettings.click();
                        }, 100);
                    }
                });
            }
        }
        hostGameButton.disabled = true;
        joinGameButton.disabled = true;
        stopHeartbeat();
    };

    // WebSocket 连接关闭
    ws.onclose = (event) => {
        console.log(`WebSocket 连接已关闭, Code: ${event.code}, Reason: ${event.reason}, WasClean: ${event.wasClean}`);
        
        let closeReason = '连接已断开';
        
        // 根据关闭代码提供更详细的原因
        switch (event.code) {
            case 1000:
                closeReason = '正常关闭连接';
                break;
            case 1001:
                closeReason = '端点已离开（如页面刷新）';
                break;
            case 1002:
                closeReason = '协议错误';
                break;
            case 1003:
                closeReason = '收到不支持的数据类型';
                break;
            case 1006:
                closeReason = '连接异常关闭（可能是网络问题或服务器未开启）';
                break;
            case 1011:
                closeReason = '服务器遇到意外情况';
                break;
            case 1012:
                closeReason = '服务器重启中';
                break;
            case 1013:
                closeReason = '服务器过载，请稍后重试';
                break;
            case 1015:
                closeReason = 'TLS握手失败';
                break;
            default:
                if (event.reason) {
                    closeReason = `连接关闭：${event.reason}`;
                } else {
                    closeReason = `连接关闭（代码：${event.code}）`;
                }
        }
        
        if (connectionStatus) {
            connectionStatus.innerHTML = generateInsecureHtml(closeReason);
            connectionStatus.style.color = 'unset';
            
            // 绑定刷新按钮事件
            const refreshPageBtn = document.getElementById('refreshPageButton');
            if (refreshPageBtn) {
                refreshPageBtn.addEventListener('click', () => {
                    window.location.reload();
                });
            }
            
            // 绑定设置按钮事件
            const openSettingsBtn = document.getElementById('openSettingsForServer');
            if (openSettingsBtn) {
                openSettingsBtn.addEventListener('click', () => {
                    const settingsButton = document.getElementById('initialSettingsButton');
                    if (settingsButton) {
                        settingsButton.click();
                        setTimeout(() => {
                            const gameSettings = document.getElementById('gameSettings');
                            if(gameSettings) gameSettings.click();
                        }, 100);
                    }
                });
            }
        }
        hostGameButton.disabled = true;
        joinGameButton.disabled = true;
        stopHeartbeat();
    };

    // 主持游戏
    hostGameButton.addEventListener('click', () => {
        showHostGameOptions();
        
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
        input.maxLength = 20; // 修改最大长度为20个字符
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

        // 移除所有输入限制和大写转换
        input.addEventListener('input', () => {
            // 移除所有字符过滤和大写转换
            // 允许任何字符：中文、英文、数字、符号等
            let value = input.value;
            
            // 只限制最大长度为20个字符
            if (value.length > 20) {
                value = value.slice(0, 20);
                input.value = value;
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
                // 仅显示输入框错误动画，无文字提示
                showInputErrorAnimation(input);
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

    // 显示主持游戏选项对话框
    function showHostGameOptions() {
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
        title.textContent = '主持游戏';
        title.style.cssText = `
            margin: 0 0 25px 0;
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        `;

        // 快速创建按钮
        const quickCreateButton = document.createElement('button');
        quickCreateButton.textContent = '🚀 快速创建房间';
        quickCreateButton.style.cssText = `
            width: 100%;
            padding: 15px;
            border: 2px solid rgba(100, 255, 150, 0.4);
            border-radius: 8px;
            background: rgba(100, 255, 150, 0.15);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 15px;
            box-shadow: 0 4px 15px rgba(100, 255, 150, 0.1);
            outline: none;
        `;

        // 分隔文字
        const separator = document.createElement('div');
        separator.textContent = '或';
        separator.style.cssText = `
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 16px;
            margin: 15px 0;
            position: relative;
        `;

        // 添加分隔线效果
        separator.innerHTML = `
            <div style="
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    flex: 1;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.3);
                    margin-right: 15px;
                "></div>
                <span style="
                    background: rgba(255, 255, 255, 0.1);
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 14px;
                ">或</span>
                <div style="
                    flex: 1;
                    height: 1px;
                    background: rgba(255, 255, 255, 0.3);
                    margin-left: 15px;
                "></div>
            </div>
        `;

        // 自定义房间码按钮/输入框容器
        const customContainer = document.createElement('div');
        customContainer.style.cssText = `
            width: 100%;
            position: relative;
            margin-bottom: 20px;
        `;

        // 自定义房间码按钮
        const customButton = document.createElement('button');
        customButton.textContent = '⚙️ 自定义房间码';
        customButton.style.cssText = `
            width: 100%;
            padding: 15px;
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
            outline: none;
        `;

        // 自定义输入框（初始隐藏）
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.placeholder = '输入任意房间码（支持中文,20字符内）';
        customInput.maxLength = 20; // 修改最大长度为20
        customInput.style.cssText = `
            width: 100%;
            padding: 15px 50px 15px 15px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 15px;
            box-sizing: border-box;
            text-align: center;
            transition: all 0.3s ease;
            outline: none;
            opacity: 0;
            transform: scale(0.9);
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
        `;

        // 确认按钮（输入框右侧的√）
        const confirmIcon = document.createElement('button');
        confirmIcon.innerHTML = '✓';
        confirmIcon.style.cssText = `
            position: absolute;
            right: 10px;
            top: 45%;
            transform: translateY(-50%);
            width: 35px;
            height: 35px;
            border: none;
            border-radius: 50%;
            background: rgba(100, 255, 150, 0.3);
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            opacity: 0;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        `;

        // 取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.style.cssText = `
            width: 100%;
            padding: 15px;
            border: 2px solid rgba(255, 120, 120, 0.4);
            border-radius: 8px;
            background: rgba(255, 120, 120, 0.15);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255, 120, 120, 0.1);
            outline: none;
        `;

        // 添加样式
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

        // 输入框处理 - 移除所有输入限制
        customInput.addEventListener('input', () => {
            // 移除所有字符过滤和大写转换
            // 允许任何字符：中文、英文、数字、符号等
            let value = customInput.value;
            
            // 只限制最大长度为20个字符
            if (value.length > 20) {
                value = value.slice(0, 20);
                customInput.value = value;
            }
        });

        customInput.addEventListener('focus', () => {
            customInput.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            customInput.style.background = 'rgba(255, 255, 255, 0.2)';
            customInput.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.2)';
        });

        customInput.addEventListener('blur', () => {
            customInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            customInput.style.background = 'rgba(255, 255, 255, 0.1)';
            customInput.style.boxShadow = 'none';
        });

        // 按钮悬停效果
        quickCreateButton.addEventListener('mouseover', () => {
            quickCreateButton.style.background = 'rgba(100, 255, 150, 0.25)';
            quickCreateButton.style.transform = 'translateY(-3px)';
            quickCreateButton.style.boxShadow = '0 8px 25px rgba(100, 255, 150, 0.2)';
            quickCreateButton.style.borderColor = 'rgba(100, 255, 150, 0.6)';
        });

        quickCreateButton.addEventListener('mouseout', () => {
            quickCreateButton.style.background = 'rgba(100, 255, 150, 0.15)';
            quickCreateButton.style.transform = 'translateY(0)';
            quickCreateButton.style.boxShadow = '0 4px 15px rgba(100, 255, 150, 0.1)';
            quickCreateButton.style.borderColor = 'rgba(100, 255, 150, 0.4)';
        });

        customButton.addEventListener('mouseover', () => {
            customButton.style.background = 'rgba(255, 255, 255, 0.25)';
            customButton.style.transform = 'translateY(-3px)';
            customButton.style.boxShadow = '0 8px 25px rgba(255, 255, 255, 0.2)';
            customButton.style.borderColor = 'rgba(255, 255, 255, 0.6)';
        });

        customButton.addEventListener('mouseout', () => {
            customButton.style.background = 'rgba(255, 255, 255, 0.15)';
            customButton.style.transform = 'translateY(0)';
            customButton.style.boxShadow = '0 4px 15px rgba(255, 255, 255, 0.1)';
            customButton.style.borderColor = 'rgba(255, 255, 255, 0.4)';
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

        confirmIcon.addEventListener('mouseover', () => {
            confirmIcon.style.background = 'rgba(100, 255, 150, 0.5)';
            confirmIcon.style.transform = 'translateY(-50%) scale(1.1)';
        });

        confirmIcon.addEventListener('mouseout', () => {
            confirmIcon.style.background = 'rgba(100, 255, 150, 0.3)';
            confirmIcon.style.transform = 'translateY(-50%) scale(1)';
        });

        // 事件处理
        let isCustomMode = false;

        // 快速创建事件
        quickCreateButton.addEventListener('click', () => {
            hideDialog();
            createRoom(); // 快速创建房间
        });

        // 自定义房间码按钮事件
        customButton.addEventListener('click', () => {
            if (!isCustomMode) {
                // 切换到输入模式
                isCustomMode = true;
                
                // 隐藏按钮，显示输入框
                customButton.style.opacity = '0';
                customButton.style.transform = 'scale(0.9)';
                customButton.style.pointerEvents = 'none';
                
                setTimeout(() => {
                    customInput.style.opacity = '1';
                    customInput.style.transform = 'scale(1)';
                    customInput.style.pointerEvents = 'auto';
                    confirmIcon.style.opacity = '1';
                    confirmIcon.style.pointerEvents = 'auto';
                    customInput.focus();
                }, 150);
            }
        });

        // 确认自定义房间码
        function confirmCustomRoom() {
            const roomCode = customInput.value.trim();
            if (roomCode.length > 0 && roomCode.length <= 20) { // 修改验证条件：1-20个字符
                hideDialog();
                createRoom(roomCode); // 使用自定义房间码创建房间
            } else {
                // 使用统一的错误处理函数
                showInputError(customInput);
            }
        }

        confirmIcon.addEventListener('click', confirmCustomRoom);

        // 回车键确认
        customInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmCustomRoom();
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

        // 创建房间的函数
        function createRoom(customRoomId = null) {
            isHost = true;
            const message = customRoomId ? 
                { type: 'createRoom', customRoomId: customRoomId, gameMode: selectedGameMode } : 
                { type: 'createRoom', gameMode: selectedGameMode };
            ws.send(JSON.stringify(message));
        }

        // 更多玩法按钮
        const moreGameModesButton = document.createElement('button');
        moreGameModesButton.textContent = getGameModeDisplayName(selectedGameMode);
        moreGameModesButton.style.cssText = `
            width: 100%;
            padding: 15px;
            border: 2px solid rgba(255, 200, 100, 0.4);
            border-radius: 8px;
            background: rgba(255, 200, 100, 0.15);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 20px;
            box-shadow: 0 4px 15px rgba(255, 200, 100, 0.1);
            outline: none;
        `;

        // 更多玩法按钮悬停效果
        moreGameModesButton.addEventListener('mouseover', () => {
            moreGameModesButton.style.background = 'rgba(255, 200, 100, 0.25)';
            moreGameModesButton.style.transform = 'translateY(-3px)';
            moreGameModesButton.style.boxShadow = '0 8px 25px rgba(255, 200, 100, 0.2)';
            moreGameModesButton.style.borderColor = 'rgba(255, 200, 100, 0.6)';
        });

        moreGameModesButton.addEventListener('mouseout', () => {
            moreGameModesButton.style.background = 'rgba(255, 200, 100, 0.15)';
            moreGameModesButton.style.transform = 'translateY(0)';
            moreGameModesButton.style.boxShadow = '0 4px 15px rgba(255, 200, 100, 0.1)';
            moreGameModesButton.style.borderColor = 'rgba(255, 200, 100, 0.4)';
        });

        // 更多玩法按钮点击事件
        moreGameModesButton.addEventListener('click', () => {
            hideDialog();
            showMoreGameModesDialog();
        });

        // 组装对话框
        customContainer.appendChild(customButton);
        customContainer.appendChild(customInput);
        customContainer.appendChild(confirmIcon);

        dialog.appendChild(title);
        dialog.appendChild(quickCreateButton);
        dialog.appendChild(separator);
        dialog.appendChild(customContainer);
        dialog.appendChild(moreGameModesButton);
        dialog.appendChild(cancelButton);

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
    }

    // 显示更多玩法选择对话框
    function showMoreGameModesDialog() {
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
            width: 400px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.3);
            transform: scale(0.7) translateY(-30px);
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            box-sizing: border-box;
        `;

        // 标题
        const title = document.createElement('h3');
        title.textContent = '更多玩法选择';
        title.style.cssText = `
            margin: 0 0 25px 0;
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        `;

        // 玩法选项容器
        const modesContainer = document.createElement('div');
        modesContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 20px;
        `;

        // 玩法选项（仅保留经典模式与“不要做挑战”）
        const gameModes = [
            {
                id: 'classic',
                name: '🎲 经典模式',
                description: '随机角色随机事件。',
                color: 'rgba(100, 255, 150, 0.15)',
                borderColor: 'rgba(100, 255, 150, 0.4)'
            },
            {
                id: 'nochallenge',
                name: '🚫 不要做挑战',
                description: '玩家看不到自己的事件，做了自己事件的内容扣分。诱导其他玩家出错以获得胜利。',
                color: 'rgba(255, 200, 100, 0.15)',
                borderColor: 'rgba(255, 200, 100, 0.4)'
            }
        ];

        // 当前选中的模式
        let selectedMode = 'classic';

        // 创建模式选项
        gameModes.forEach(mode => {
            const modeOption = document.createElement('div');
            modeOption.style.cssText = `
                padding: 20px;
                border: 2px solid ${mode.borderColor};
                border-radius: 12px;
                background: ${mode.color};
                backdrop-filter: blur(10px);
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                user-select: none;
            `;

            const modeTitle = document.createElement('div');
            modeTitle.textContent = mode.name;
            modeTitle.style.cssText = `
                color: white;
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 8px;
            `;

            const modeDesc = document.createElement('div');
            modeDesc.textContent = mode.description;
            modeDesc.style.cssText = `
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                line-height: 1.4;
            `;



            // 鼠标悬停效果
            modeOption.addEventListener('mouseover', () => {
                modeOption.style.transform = 'translateY(-3px)';
                modeOption.style.boxShadow = `0 8px 25px ${mode.borderColor.replace('0.4', '0.3')}`;
            });

            modeOption.addEventListener('mouseout', () => {
                modeOption.style.transform = 'translateY(0)';
                modeOption.style.boxShadow = 'none';
            });

            // 点击选择
            modeOption.addEventListener('click', () => {
                // 选择模式并返回主持游戏界面
                selectedGameMode = mode.id;
                hideMoreGameModesDialog();
                showHostGameOptions();
            });

            modeOption.appendChild(modeTitle);
            modeOption.appendChild(modeDesc);
            modesContainer.appendChild(modeOption);
        });

        // 按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: center;
            margin-top: 20px;
        `;

        // 返回按钮
        const backButton = document.createElement('button');
        backButton.textContent = '返回';
        backButton.style.cssText = `
            padding: 15px 30px;
            border: 2px solid rgba(255, 120, 120, 0.4);
            border-radius: 8px;
            background: rgba(255, 120, 120, 0.15);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255, 120, 120, 0.1);
            outline: none;
        `;

        // 按钮悬停效果
        backButton.addEventListener('mouseover', () => {
            backButton.style.background = 'rgba(255, 120, 120, 0.25)';
            backButton.style.transform = 'translateY(-2px)';
            backButton.style.boxShadow = '0 6px 20px rgba(255, 120, 120, 0.2)';
        });

        backButton.addEventListener('mouseout', () => {
            backButton.style.background = 'rgba(255, 120, 120, 0.15)';
            backButton.style.transform = 'translateY(0)';
            backButton.style.boxShadow = '0 4px 15px rgba(255, 120, 120, 0.1)';
        });

        // 事件处理
        backButton.addEventListener('click', () => {
            hideMoreGameModesDialog();
            // 返回主持游戏对话框
            showHostGameOptions();
        });

        // 点击遮罩层关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                hideMoreGameModesDialog();
                showHostGameOptions();
            }
        });

        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                hideMoreGameModesDialog();
                showHostGameOptions();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // 隐藏对话框的函数
        function hideMoreGameModesDialog() {
            overlay.style.opacity = '0';
            overlay.style.background = 'rgba(0, 0, 0, 0)';
            overlay.style.backdropFilter = 'blur(0px)';
            dialog.style.opacity = '0';
            dialog.style.transform = 'scale(0.8) translateY(30px)';
            
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 300);
        }

        // 根据模式创建房间的函数
        function createRoomWithMode(mode) {
            isHost = true;
            // 可以在这里根据不同模式设置不同的房间参数
            const message = { 
                type: 'createRoom', 
                gameMode: mode 
            };
            ws.send(JSON.stringify(message));
            showMessage(`正在创建${getGameModeDisplayName(mode)}房间...`, 'info');
        }

        // 组装对话框
        buttonContainer.appendChild(backButton);

        dialog.appendChild(title);
        dialog.appendChild(modesContainer);
        dialog.appendChild(buttonContainer);

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
    }

    // 提供给其它模块使用的统一样式选择弹窗（复用加入房间的视觉风格）
    window.showStyledOptionDialog = function showStyledOptionDialog({ title = '请选择', options = [], disableCancel = false, closeOnOverlayClick = true }) {
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
            padding: 24px;
            width: 360px;
            max-width: 90vw;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.3);
            transform: scale(0.7) translateY(-30px);
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            box-sizing: border-box;
        `;

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            margin: 0 0 18px 0;
            color: white;
            font-size: 22px;
            font-weight: bold;
            text-align: center;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        `;

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 25px;
            justify-content: center;
        `;

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.textContent = opt.label || String(opt.value);
            btn.style.cssText = `
                padding: 12px 16px;
                border: 2px solid rgba(255, 255, 255, 0.4);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                color: white;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
                outline: none;
                min-width: 88px;
            `;
            btn.addEventListener('mouseover', () => {
                btn.style.background = 'rgba(255, 255, 255, 0.25)';
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 8px 20px rgba(255, 255, 255, 0.2)';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            });
            btn.addEventListener('mouseout', () => {
                btn.style.background = 'rgba(255, 255, 255, 0.15)';
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = '0 4px 15px rgba(255, 255, 255, 0.1)';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            });
            btn.addEventListener('click', () => {
                try {
                    if (typeof opt.onSelect === 'function') opt.onSelect(opt.value);
                    else if (typeof options.onSelect === 'function') options.onSelect(opt.value);
                } finally {
                    overlay.style.opacity = '0';
                    overlay.style.background = 'rgba(0, 0, 0, 0)';
                    overlay.style.backdropFilter = 'blur(0px)';
                    dialog.style.opacity = '0';
                    dialog.style.transform = 'scale(0.8) translateY(30px)';
                    setTimeout(() => {
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    }, 250);
                }
            });
            btnContainer.appendChild(btn);
        });

        // 取消按钮（可选）
        let cancelBtn = null;
        if (!disableCancel) {
            cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = `
                margin-top: 8px;
                padding: 10px 16px;
                border: 2px solid rgba(255, 120, 120, 0.4);
                border-radius: 10px;
                background: rgba(255, 120, 120, 0.15);
                color: white;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
            `;
            cancelBtn.addEventListener('click', hideDialog);
        }

        function hideDialog() {
            overlay.style.opacity = '0';
            overlay.style.background = 'rgba(0, 0, 0, 0)';
            overlay.style.backdropFilter = 'blur(0px)';
            dialog.style.opacity = '0';
            dialog.style.transform = 'scale(0.8) translateY(30px)';
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 250);
        }

        if (closeOnOverlayClick) {
            overlay.addEventListener('click', (e) => { if (e.target === overlay) hideDialog(); });
        }

        dialog.appendChild(titleEl);
        dialog.appendChild(btnContainer);
    if (cancelBtn) dialog.appendChild(cancelBtn);
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
    };

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

    // 输入框错误动画函数（仅动画，无文字）
    function showInputErrorAnimation(inputElement) {
        // 确保动画样式已添加到页面中
        if (!document.getElementById('inputErrorAnimations')) {
            const style = document.createElement('style');
            style.id = 'inputErrorAnimations';
            style.textContent = `
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
        }
        
        // 添加摇晃动画和红色辉光（仅视觉效果）
        inputElement.style.borderColor = 'rgba(255, 100, 100, 0.8)';
        inputElement.style.background = 'rgba(255, 100, 100, 0.1)';
        inputElement.style.boxShadow = '0 0 20px rgba(255, 100, 100, 0.5)';
        inputElement.style.animation = 'shake 0.6s ease-in-out, errorGlow 2s ease-in-out';

        // 2秒后恢复样式
        setTimeout(() => {
            inputElement.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            inputElement.style.background = 'rgba(255, 255, 255, 0.1)';
            inputElement.style.boxShadow = 'none';
            inputElement.style.animation = '';
        }, 2000);
    }

    // 输入框错误提示函数（带文字提示）
    function showInputError(inputElement, message) {
        // 确保动画样式已添加到页面中
        if (!document.getElementById('inputErrorAnimations')) {
            const style = document.createElement('style');
            style.id = 'inputErrorAnimations';
            style.textContent = `
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
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // 添加摇晃动画和红色辉光
        inputElement.style.borderColor = 'rgba(255, 100, 100, 0.8)';
        inputElement.style.background = 'rgba(255, 100, 100, 0.1)';
        inputElement.style.boxShadow = '0 0 20px rgba(255, 100, 100, 0.5)';
        inputElement.style.animation = 'shake 0.6s ease-in-out, errorGlow 2s ease-in-out';

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

        // 插入到输入框后面
        inputElement.parentNode.insertBefore(errorText, inputElement.nextSibling);

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
        
        // // 如果是保活同步，检查是否真的需要发送
        // if (isKeepAlive) {
        //     // 如果最近有过事件驱动的同步，则跳过保活同步
        //     const now = Date.now();
        //     if (lastEventSyncTime && (now - lastEventSyncTime) < 60000) {
        //         console.log('最近有事件同步，跳过保活同步');
        //         return;
        //     }
            
        //     // 如果房间只有主持人一个人，也跳过保活同步
        //     if (currentPlayerCount <= 1) {
        //         console.log('房间只有主持人，跳过保活同步');
        //         return;
        //     }
        // }

        // 获取当前阵容名称
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
            missions: Array.from(missionBoxes).map((box) => {
                const tEl = box.querySelector('.mission-title');
                const cEl = box.querySelector('.mission-content');
                const title = tEl?.dataset.realTitle ?? tEl?.textContent ?? '';
                const content = cEl?.dataset.realContent ?? cEl?.innerHTML ?? '';
                return { title, content };
            }),            // 更新为支持新的困难事件显示格式
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
            },
            // 特殊模式：不要做挑战（用于首次/增量同步给加入者）
            noChallenge: (window.noChallengeMode && window.noChallengeMode.active) ? {
                active: true,
                lastMissions: (window.noChallengeMode.getLastMissions ? window.noChallengeMode.getLastMissions() : []),
                counters: (window.noChallengeMode.getCounters ? window.noChallengeMode.getCounters() : [0,0,0,0]),
                seats: (window.noChallengeMode.getSeats ? window.noChallengeMode.getSeats() : undefined)
            } : undefined,
        };

        const eventHistory = (window.noChallengeMode && window.noChallengeMode.active)
            ? []
            : (window.eventHistoryModule ? window.eventHistoryModule.eventHistoryData : []);
        const characterHistory = window.historyModule ? window.historyModule.historyData : [];

        console.log('同步的游戏状态:', state, '事件历史:', eventHistory, '角色历史:', characterHistory);
        ws.send(JSON.stringify({ type: 'updateState', roomId: currentRoomId, state, history: eventHistory, characterHistory: characterHistory }));

    }    // 优化后的同步机制：事件驱动同步 + 长间隔保活同步
    let lastEventSyncTime = null; // 追踪最后一次事件驱动同步的时间
    
    // setInterval(() => {
    //     // 只有主持人发送保活同步，且只在有连接时发送
    //     if (isHost && ws && ws.readyState === WebSocket.OPEN && currentRoomId) {
    //         console.log('执行保活同步检查...');
    //         syncGameState(true); // 传入保活标识
    //     }
    // }, 30000); //30秒一次保活同步
    
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
            missions: Array.from(missionBoxes).map((box) => {
                const tEl = box.querySelector('.mission-title');
                const cEl = box.querySelector('.mission-content');
                const title = tEl?.dataset.realTitle ?? tEl?.textContent ?? '';
                const content = cEl?.dataset.realContent ?? cEl?.innerHTML ?? '';
                return { title, content };
            }),
            // 添加阵容信息用于状态变化检测
            teamInfo: {
                teamName: document.getElementById('teamNameDisplay') ? 
                    document.getElementById('teamNameDisplay').textContent : '',
                isTeamModeActive: window.teamManagement && typeof window.teamManagement.isTeamMode === 'function' ? 
                    window.teamManagement.isTeamMode() : false
            },
            noChallenge: (window.noChallengeMode && window.noChallengeMode.active) ? {
                active: true,
                lastMissions: (window.noChallengeMode.getLastMissions ? window.noChallengeMode.getLastMissions() : []),
                counters: (window.noChallengeMode.getCounters ? window.noChallengeMode.getCounters() : [0,0,0,0]),
                seats: (window.noChallengeMode.getSeats ? window.noChallengeMode.getSeats() : undefined)
            } : undefined,
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
            // lastEventSyncTime = Date.now(); // 记录事件同步时间
            syncGameState(false); // 事件驱动同步，非保活
        }
    }    // 在主界面顶部动态显示当前人数和房间码
    // 当前座位占用（由服务器广播维护）
    let noChallengeSeats = [null, null, null, null];

    function updateSeatChips() {
        const chipsContainer = document.getElementById('seatChips');
        if (!chipsContainer) return;
        // 仅在不要做挑战模式下显示
        if (selectedGameMode !== 'nochallenge') {
            chipsContainer.innerHTML = '';
            chipsContainer.style.display = 'none';
            return;
        }
        chipsContainer.style.display = 'flex';
        chipsContainer.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            const chip = document.createElement('span');
            const taken = !!noChallengeSeats[i];
            chip.textContent = `${i + 1}P`;
            chip.style.cssText = [
                'padding:2px 6px',
                'border-radius:999px',
                'font-size:12px',
                'border:1px solid rgba(0,0,0,0.15)',
                taken ? 'background:#2ecc71;color:#fff' : 'background:#e74c3c;color:#fff'
            ].join(';');
            chipsContainer.appendChild(chip);
        }
    }

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
            <span id="seatChips" style="display:flex;gap:6px;align-items:center;margin-left:8px"></span>
        `;
        
        playerCountDisplay.innerHTML = content;

        // 更新座位指示
        updateSeatChips();
        
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

    // 将消息路由到共享事件模块
    if (window.sharedEvents && typeof window.sharedEvents.handleMessage === 'function') {
        const sharedEventTypes = [
            'shared_libraries_data', 
            'upload_success',
            'pin_mismatch',
            'authentication_success',
            'authentication_failure',
            'event_deleted_success',
            'event_added_success',
            // Legacy types, can be kept for compatibility or removed if not used
            'admin_login_success', 
            'pending_libraries_list', 
            'approval_success', 
            'rejection_success'
        ];
        if (sharedEventTypes.includes(data.type)) {
            window.sharedEvents.handleMessage(data);
            return;
        }
    }

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
            
            // 如果选择了“不要做挑战”模式，则激活模式逻辑并立刻同步一次基础状态
            if (selectedGameMode === 'nochallenge' && window.noChallengeMode) {
                try {
                    window.noChallengeMode.activate({ isHost: true });
                } catch (e) { console.error('激活不要做挑战模式失败:', e); }
                setTimeout(() => {
                    try { syncGameState(); } catch (e) { console.error('初始同步失败:', e); }
                }, 300);
            }

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
                const historyButton = document.getElementById('viewHistoryButton');
                if (historyButton) {
                    historyButton.style.display = 'block';
                }
            }
            break;

        case 'stateUpdated':
            console.log('收到最新游戏状态:', data.state);
            updateGameState(data.state); // 更新界面

            // 同步事件历史记录数据
            if (data.history) {
                const noChallengeActive = !!(data.state && data.state.noChallenge && data.state.noChallenge.active);
                if (!noChallengeActive && window.eventHistoryModule && window.eventHistoryModule.eventHistoryData) {
                    window.eventHistoryModule.eventHistoryData.length = 0;
                    Array.prototype.push.apply(window.eventHistoryModule.eventHistoryData, data.history);
                }
                console.log('同步事件历史:', data.history);
            }

            // 同步角色历史记录数据
            if (data.characterHistory) {
                if (window.historyModule && window.historyModule.historyData) {
                    window.historyModule.historyData.length = 0;
                    Array.prototype.push.apply(window.historyModule.historyData, data.characterHistory);
                }
                console.log('同步角色历史:', data.characterHistory);
            }

            // 确保其他玩家的历史记录按钮可见
            if (!isHost) {
                const historyButton = document.getElementById('viewHistoryButton');
                if (historyButton) {
                    historyButton.style.display = 'block';
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
                            showInputErrorAnimation(input);
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
            break;case 'noChallenge_seats':
            // 更新座位占用
            if (Array.isArray(data.seats)) {
                noChallengeSeats = data.seats.slice(0,4);
                updateSeatChips();
            }
            break;case 'noChallenge_seatRejected':
            showTemporaryMessage(`该座位已被占用，请重新选择`);
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

        case 'submissionConfirmed':
            // 处理投稿确认消息
            console.log('投稿确认消息:', data);
            if (window.showSubmissionConfirmation) {
                window.showSubmissionConfirmation(data.message);
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
            missions: Array.from(missionBoxes).map((box) => {
                const tEl = box.querySelector('.mission-title');
                const cEl = box.querySelector('.mission-content');
                const title = (tEl && (tEl.dataset.realTitle ?? tEl.textContent)) || '';
                const content = (cEl && (cEl.dataset.realContent ?? cEl.innerHTML)) || '';
                return { title, content };
            }),
            // 添加阵容信息同步
            teamInfo: {
                teamName: document.getElementById('teamNameDisplay') ? 
                    document.getElementById('teamNameDisplay').textContent.replace('当前阵容：', '') : '',
                isTeamModeActive: window.teamManagement && typeof window.teamManagement.isTeamMode === 'function' ? 
                    window.teamManagement.isTeamMode() : false
            },
            // 特殊模式：不要做挑战
            noChallenge: (window.noChallengeMode && window.noChallengeMode.active) ? {
                active: true,
                lastMissions: (window.noChallengeMode.getLastMissions ? window.noChallengeMode.getLastMissions() : []),
                counters: (window.noChallengeMode.getCounters ? window.noChallengeMode.getCounters() : [0,0,0,0]),
                seats: (window.noChallengeMode.getSeats ? window.noChallengeMode.getSeats() : undefined)
            } : undefined,
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

        // 更新事件卡片（在“不要做挑战”模式下，本机所选P位不更新可见内容，但更新data-real*用于同步）
        state.missions.forEach((mission, index) => {
            const box = missionBoxes[index];
            if (!box) return;

            // 若为不要做挑战模式，且该索引为本机P位，则跳过更新，保持静态（问号或本地内容）
            if (
                window.noChallengeMode && window.noChallengeMode.active &&
                typeof window.noChallengeMode.shouldFreezeIndex === 'function' &&
                window.noChallengeMode.shouldFreezeIndex(index)
            ) {
                const tEl = box.querySelector('.mission-title');
                const cEl = box.querySelector('.mission-content');
                if (tEl) tEl.dataset.realTitle = mission.title;
                if (cEl) cEl.dataset.realContent = mission.content;
                return; // 不改写可见DOM，防止本地看到内容
            }

            const title = box.querySelector('.mission-title');
            const content = box.querySelector('.mission-content');
            if (title) {
                title.textContent = mission.title;
                title.dataset.realTitle = mission.title;
            }
            if (content) {
                content.innerHTML = mission.content; // 使用 innerHTML 保留颜色
                content.dataset.realContent = mission.content;
            }
        });

        // 更新困难模式事件 - 支持新的三个困难事件显示格式和投票状态
        // 若为“不要做挑战”模式，彻底跳过困难事件区域的构建与显示，并强制隐藏
        if (!(window.noChallengeMode && window.noChallengeMode.active) && state.hardMissions && state.hardMissions.length > 0) {
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
        // 保持向后兼容性 - 更新原有的单个困难事件显示（不要做挑战下跳过）
        if (!(window.noChallengeMode && window.noChallengeMode.active)) {
            const hardMissionTitle = selectedHardMission.querySelector('.mission-title');
            const hardMissionContent = selectedHardMission.querySelector('.mission-content');
            if (state.hardMission && state.hardMission.title) {
                selectedHardMission.style.display = 'block';
                if (hardMissionTitle) hardMissionTitle.textContent = state.hardMission.title;
                if (hardMissionContent) hardMissionContent.innerHTML = state.hardMission.content; // 使用 innerHTML 恢复颜色
            }
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

        // 特殊模式：不要做挑战
        if (state.noChallenge && state.noChallenge.active) {
            const hardMissionsContainer = document.getElementById('hardMissionsContainer');
            const selectedHardMissionEl = document.getElementById('selectedHardMission');
            if (hardMissionsContainer) hardMissionsContainer.style.display = 'none';
            if (selectedHardMissionEl) selectedHardMissionEl.style.display = 'none';

            if (window.noChallengeMode && typeof window.noChallengeMode.onStateUpdated === 'function') {
                try { window.noChallengeMode.onStateUpdated(state.noChallenge); } catch (e) { console.error(e); }
            }

            // 额外保险：在回调之后再次隐藏，防止其它异步渲染重新显示
            setTimeout(() => {
                const cont2 = document.getElementById('hardMissionsContainer');
                const sel2 = document.getElementById('selectedHardMission');
                if (cont2) cont2.style.display = 'none';
                if (sel2) sel2.style.display = 'none';
            }, 0);
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
    getRoomId: () => currentRoomId,
    getPlayerCount: () => {
        // 返回实际的玩家数量，包含主机和所有玩家
        return currentPlayerCount;
    },
    // 获取WebSocket连接实例
    getWebSocket: () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            return ws;
        }
        return null;
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
    },
    // 提供给 noChallengeMode 的座位更新回调
    onNoChallengeSeats: (seats) => {
        if (Array.isArray(seats)) {
            noChallengeSeats = seats.slice(0,4);
            // 刷新顶部 chips
            const el = document.getElementById('seatChips');
            if (el) {
                el.style.display = 'flex';
            }
            // 复用渲染
            try { (typeof updateSeatChips === 'function') && updateSeatChips(); } catch {}
        }
    }
};

// 导出同步函数到全局作用域
window.syncGameStateIfChanged = syncGameStateIfChanged;
});
