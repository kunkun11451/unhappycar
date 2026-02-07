(function () {
    let socket = null;
    let roomCode = null;
    let isHost = false;
    // Versioned Sync: Track local version
    let currentVersion = 0;

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
        document.body.classList.add('viewer-mode');
    }

    // 动态添加样式
    const style = document.createElement('style');
    style.textContent = `
        .btn-icon-sm { background: none; border: none; cursor: pointer; opacity: 0.7; padding: 2px; font-size: 1.1em; }
        .btn-icon-sm:hover { opacity: 1; transform: scale(1.1); }
        
        .room-status { font-size: 0.75em; }
        .status-connecting { color: #f59e0b; }
        .status-disconnected { color: #ef4444; }
        .btn-icon-sm { background: none; border: none; cursor: pointer; opacity: 0.7; padding: 2px; font-size: 1.1em; }
        .btn-icon-sm:hover { opacity: 1; transform: scale(1.1); }
        
        /* 观众模式样式 */
        body.viewer-mode #drawBtn { display: none !important; }
        body.viewer-mode .host-only { display: none !important; }
        
        /* ===== 在线房间信息栏 ===== */
        .online-room-bar {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            margin-top: 0;
            margin-bottom: 20px;
            gap: 12px;
            padding: 10px 16px !important;
            z-index: 10;
        }
        .online-room-bar.hidden { display: none !important; }

        /* 左区：模式 + 房间码 */
        .online-room-bar .room-bar-left {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            flex: 1;
        }
        .online-room-bar .room-mode {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
            border: 1px solid rgba(16, 185, 129, 0.3);
            white-space: nowrap;
        }
        body.viewer-mode .online-room-bar .room-mode {
            background: rgba(59, 130, 246, 0.15);
            color: #3b82f6;
            border-color: rgba(59, 130, 246, 0.3);
        }
        .online-room-bar .room-divider {
            width: 1px;
            height: 16px;
            background: rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
        }
        .online-room-bar .room-label {
            color: #64748b;
            font-size: 0.8rem;
            font-weight: 500;
            flex-shrink: 0;
        }
        .online-room-bar .room-code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-weight: 700;
            color: #38bdf8;
            font-size: 1.1rem;
            letter-spacing: 3px;
            white-space: nowrap;
        }

        /* 右区：操作按钮组 */
        .online-room-bar .room-bar-right {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
        }
        .online-room-bar .btn-icon.danger {
            color: #94a3b8;
        }
        .online-room-bar .btn-icon.danger:hover {
            background: rgba(239, 68, 68, 0.15);
            border-color: rgba(239, 68, 68, 0.35);
            color: #f87171;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.15);
        }
        /* 复制成功反馈 */
        .online-room-bar .btn-icon.copy-ok {
            color: #10b981 !important;
            border-color: rgba(16, 185, 129, 0.4) !important;
            background: rgba(16, 185, 129, 0.12) !important;
        }

        /* 二维码弹出层（向下弹出） */
        .qr-wrapper { position: relative; }
        .qr-popover {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            background: #fff;
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.45);
            z-index: 999;
            opacity: 0;
            transform: translateY(-6px) scale(0.95);
            transition: opacity 0.2s ease, transform 0.2s ease;
            pointer-events: none;
        }
        .qr-popover::before {
            content: '';
            position: absolute;
            top: -6px;
            right: 14px;
            width: 12px;
            height: 12px;
            background: #fff;
            transform: rotate(45deg);
            border-radius: 2px;
        }
        .qr-popover.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        .qr-popover.hidden { display: none; }
        .qr-popover canvas {
            display: block;
            width: 140px;
            height: 140px;
            border-radius: 6px;
        }

        /* ===== 手机端适配 ===== */
        @media (max-width: 560px) {
            .online-room-bar {
                gap: 8px;
                padding: 10px 12px !important;
            }
            .online-room-bar .room-bar-left {
                flex: 1;
                min-width: 0;
            }
            .online-room-bar .room-code {
                font-size: 0.95rem;
                letter-spacing: 2px;
            }
            .online-room-bar .room-label {
                display: none;
            }
            .online-room-bar .room-divider {
                display: none;
            }
            .qr-popover {
                right: -40px;
            }
            .qr-popover::before {
                right: 54px;
            }
        }
    `;
    document.head.appendChild(style);



    function checkIo(cb) {
        if (window.io) cb();
        else setTimeout(() => checkIo(cb), 100);
    }

    function updateConnectionStatus(status) {
        const statusEl = document.getElementById('connectionStatus');
        const roomModeDisplay = document.getElementById('roomModeDisplay');

        if (status === 'connected') {
            if (statusEl) {
                statusEl.textContent = '';
                statusEl.className = 'room-status';
            }
            if (roomModeDisplay) {
                document.body.classList.remove('disconnected');
            }
        } else if (status === 'connecting') {
            if (statusEl) {
                statusEl.className = 'room-status status-connecting';
            }
            if (roomModeDisplay) {
                document.body.classList.add('disconnected');
            }
        } else if (status === 'disconnected') {
            if (statusEl) {
                statusEl.textContent = '(已断开)';
                statusEl.className = 'room-status status-disconnected';
            }
            if (roomModeDisplay) {
                document.body.classList.add('disconnected');
            }
        }
    }

    function connectSocket() {
        if (socket) return socket;

        const opts = {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000
        };
        const serverUrl = 'https://unhappycar.tech:4000';

        socket = window.io(serverUrl, opts);

        // 核心优化：每次连接成功（包括重连）都执行恢复逻辑
        socket.on('connect', () => {
            console.log('Connected to server');
            updateConnectionStatus('connected');

            // 区分 Host 和 Viewer 的重连逻辑
            if (document.body.classList.contains('viewer-mode')) {
                // Viewer 重连
                const params = new URLSearchParams(window.location.search);
                const currentRoom = params.get('room');
                if (currentRoom) {
                    console.log('Viewer reconecting to room:', currentRoom);
                    // 1. Join Room
                    socket.emit('join_room', currentRoom);
                    // 2. Fetch State (Inbox) using current version
                    socket.emit('fetch_state', currentVersion);
                }
            } else {
                // Host 重连：尝试恢复身份或创建新房间
                const savedCode = localStorage.getItem('recorder_room_code') || roomCode;

                // 只有当用户显式开启了在线模式 (通过 savedCode 判断) 才尝试重连
                // 或者是当前会话已经是 Host (roomCode存在)
                if (savedCode) {
                    console.log('Host restoring room:', savedCode);
                    socket.emit('host_reconnect', savedCode);
                } else {
                    // 没有保存的房间且不是观众模式，新建房间
                    console.log('Host creating new room');
                    socket.emit('create_room');
                }
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
            updateConnectionStatus('disconnected');
        });

        socket.on('connect_error', () => {
            updateConnectionStatus('disconnected');
        });

        socket.on('reconnect_attempt', () => {
            updateConnectionStatus('connecting');
        });

        socket.on('room_created', (code) => {
            roomCode = code;
            isHost = true;
            localStorage.setItem('recorder_room_code', code); // 保存房间码
            updateRoomUI();

            // 立即同步当前状态 (Host starts fresh, generates new version)
            syncCurrentState();
        });

        socket.on('host_restored', (code) => {
            roomCode = code;
            isHost = true;
            // 房间码已存在 localStorage，无需再次保存
            updateRoomUI();

            // Host reconnected, force push current local state to server (Authoritative)
            syncCurrentState();
        });

        socket.on('reconnect_failed', () => {
            // Host 重连失败（房间过期），创建新房间
            if (!document.body.classList.contains('viewer-mode')) {
                console.log('Host restore failed, creating new room');
                localStorage.removeItem('recorder_room_code');
                socket.emit('create_room');
            } else {
                window.showToast('房间已失效或连接失败');
            }
        });

        socket.on('joined_room', (code) => {
            roomCode = code;
            isHost = false;
            enableViewerMode();
            updateRoomUI();

            // 隐藏加载遮罩
            const loader = document.getElementById('viewerLoader');
            if (loader) loader.classList.add('hidden');
        });

        // 核心更新：处理版本化状态 (Inbox Processor)
        socket.on('update_state', (envelope) => {
            // Envelope structure: { version: number, payload: object }

            // 如果收到的不是 envelope (兼容旧代码或错误)，尝试直接作为 payload 处理，但版本设为 0
            let version = 0;
            let payload = envelope;

            if (envelope && typeof envelope.version === 'number' && envelope.payload) {
                version = envelope.version;
                payload = envelope.payload;
            }

            // Version Check: Only apply if newer
            if (version > currentVersion) {
                console.log(`Applying new state version: ${version} (was ${currentVersion})`);
                currentVersion = version;

                if (!isHost && window.__recorder_actions && window.__recorder_actions.restoreState) {
                    window.__recorder_actions.restoreState(payload);
                }
            } else {
                console.log(`Ignoring stale/duplicate state version: ${version} (current: ${currentVersion})`);
            }
        });

        socket.on('host_left', () => {
            if (window.showCustomAlert) {
                window.showCustomAlert('房主已离开，房间关闭', '提示', () => {
                    location.href = location.pathname;
                });
            } else {
                alert('房主已离开，房间关闭');
                location.href = location.pathname;
            }
        });

        socket.on('host_replaced', () => {
            // 被顶号
            isHost = false;
            roomCode = null;
            // 简单提示
            if (window.showCustomAlert) {
                window.showCustomAlert('您已在其他页面开启了在线模式，当前页面已失效，可前往新页面继续操作。');
            } else {
                alert('您已在其他页面开启了在线模式，当前页面已失效，可前往新页面继续操作。');
            }

            // 禁用 UI
            const el = document.getElementById('roomInfo');
            if (el) {
                el.classList.add('hidden');
            }
            if (socket) socket.disconnect();

            // 重要：更新设置里的开关状态（视觉上关闭）
            const toggle = document.getElementById('onlineToggle');
            if (toggle) {
                toggle.checked = false;
            }
        });

        socket.on('error_msg', (msg) => {
            // 如果存在加载遮罩且可见，说明是在连接阶段出错
            const loader = document.getElementById('viewerLoader');
            if (loader && !loader.classList.contains('hidden')) {
                const txt = document.getElementById('loaderText');
                const btn = document.getElementById('loaderExitBtn');
                const spinner = loader.querySelector('.spinner-large');

                if (txt) txt.textContent = msg; // 显示错误信息 (如：房间不存在)
                if (btn) btn.classList.remove('hidden'); // 显示退出按钮
                if (spinner) spinner.style.display = 'none'; // 隐藏转圈
            } else {
                if (window.showCustomAlert) {
                    window.showCustomAlert('错误: ' + msg, '错误');
                } else {
                    alert('错误: ' + msg);
                }
            }
        });

        return socket;
    }

    // Host Only: Pack state into envelope and sync
    function syncCurrentState() {
        if (window.__recorder_actions && window.__recorder_actions.getState) {
            const state = window.__recorder_actions.getState();
            if (socket && socket.connected) {
                const now = Date.now();
                // 确保 Host 本地版本也更新，防止自己也收到旧数据（理论上 Host 不收 update_state，但在多端同 Host 账号时有用）
                // 这里 Host 是 Authority，所以它定义最新版本。
                const envelope = {
                    version: now,
                    payload: state
                };
                currentVersion = now;
                socket.emit('sync_state', envelope);
            }
        }
    }

    function enableViewerMode() {
        document.body.classList.add('viewer-mode');
    }

    // 初始化房主模式（检查重连或创建）
    function initHost() {
        if (document.body.classList.contains('viewer-mode')) {
            console.log('Viewer mode active, skipping host initialization.');
            return;
        }

        checkIo(() => {
            const s = connectSocket();
            // 注意：连接逻辑已移至 'connect' 事件监听器中
            // 这里只需确保 socket 初始化并在连接后做一次状态绑定
            if (!s.connected) {
                s.connect();
            } else {
                // 如果已经连接（罕见情况，例如快速切换开关），手动触发一次重连逻辑
                const savedCode = localStorage.getItem('recorder_room_code');
                if (savedCode) {
                    s.emit('host_reconnect', savedCode);
                } else {
                    s.emit('create_room');
                }
            }

            // 绑定状态变更监听 (只需绑定一次)
            if (!window.__recorder_is_bound) {
                if (window.__recorder_actions && window.__recorder_actions.setOnStateChange) {
                    window.__recorder_actions.setOnStateChange(state => {
                        if (socket && isHost && socket.connected) {
                            // Call syncCurrentState to handle wrapping
                            syncCurrentState();
                        }
                    });
                }
                window.__recorder_is_bound = true;
            }
        });

        // 显示房间信息栏
        const roomBar = document.getElementById('onlineRoomBar');
        const roomCodeDisplay = document.getElementById('roomCodeDisplay');
        const roomModeDisplay = document.getElementById('roomModeDisplay');
        if (roomBar) {
            roomBar.classList.remove('hidden');
            if (roomCodeDisplay) roomCodeDisplay.textContent = '连接中...';
            if (roomModeDisplay) roomModeDisplay.textContent = '主持模式';
            updateConnectionStatus('connecting');
        }

        // 更新设置面板状态：转圈
        const statusEl = document.getElementById('onlineStatus');
        if (statusEl) {
            statusEl.innerHTML = '<span class="loading-spinner">↻</span> 连接中...';
            statusEl.style.cursor = 'default';
            statusEl.onclick = null;
        }
    }

    function closeHost() {
        if (socket) {
            // Only host can close room on server
            if (isHost && socket.connected) {
                socket.emit('close_room');
            }

            isHost = false;
            roomCode = null;
            localStorage.removeItem('recorder_room_code');

            // 隐藏 UI
            const el = document.getElementById('roomInfo');
            if (el) el.classList.add('hidden');

            // 隐藏房间信息栏
            const roomBar = document.getElementById('onlineRoomBar');
            if (roomBar) roomBar.classList.add('hidden');

            // 清空设置面板状态
            const statusEl = document.getElementById('onlineStatus');
            if (statusEl) {
                statusEl.innerHTML = '';
                statusEl.onclick = null;
                statusEl.style.cursor = 'default';
            }

            // Disconnect socket (cleanup)
            socket.disconnect();
        }
    }

    // 旧的 createRoom 废弃，保留兼容
    function createRoom() {
        initHost();
    }

    function joinRoom(code) {
        checkIo(() => {
            const s = connectSocket();
            if (s.connected) {
                s.emit('join_room', code);
            }
            // 如果未连接，'connect' 事件会处理加入逻辑
        });

        // 显示全屏加载遮罩
        const loader = document.getElementById('viewerLoader');
        if (loader) {
            loader.classList.remove('hidden');
            const txt = document.getElementById('loaderText');
            if (txt) txt.textContent = '正在连接房间...';
            const btn = document.getElementById('loaderExitBtn');
            if (btn) btn.classList.add('hidden');
        }

        // 显示房间信息栏
        const roomBar = document.getElementById('onlineRoomBar');
        const roomCodeDisplay = document.getElementById('roomCodeDisplay');
        const roomModeDisplay = document.getElementById('roomModeDisplay');
        if (roomBar) {
            roomBar.classList.remove('hidden');
            if (roomCodeDisplay) roomCodeDisplay.textContent = code || '连接中...';
            if (roomModeDisplay) roomModeDisplay.textContent = '观众模式';
            updateConnectionStatus('connecting');
        }
    }

    function insertUI() {
        const joinBtn = document.getElementById('joinRoomBtn');
        const joinInput = document.getElementById('joinRoomInput');

        if (joinBtn && joinInput) {
            // 限制只能输入数字
            joinInput.addEventListener('input', (e) => {
                joinInput.value = joinInput.value.replace(/\D/g, '').slice(0, 6);
            });

            joinBtn.addEventListener('click', () => {
                const code = joinInput.value.trim();
                if (code.length === 6) {
                    // 跳转到带 room 参数的链接
                    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
                    window.location.href = url.toString();
                } else {
                    window.showToast('请输入6位数字房间码');
                }
            });
        }

        // 离开房间按钮
        const leaveRoomBtn = document.getElementById('leaveRoomBtn');
        if (leaveRoomBtn) {
            leaveRoomBtn.addEventListener('click', () => {
                const doConfirm = window.showCustomConfirm || ((msg, cb) => { if (confirm(msg)) cb(); });

                if (isHost) {
                    // 主持人离开房间
                    doConfirm('确定要关闭房间吗？此房间将直接解散。', () => {
                        // 联动关闭设置中的开关 (触发 change 事件以保存设置)
                        const toggle = document.getElementById('onlineToggle');
                        if (toggle && toggle.checked) {
                            toggle.click();
                        } else {
                            closeHost();
                        }
                    }, null, '关闭房间', '确定', '取消');
                } else {
                    // 观众离开房间
                    doConfirm('确定要离开房间吗？', () => {
                        // 触发断开清理
                        closeHost();
                        // 刷新页面回到主页
                        window.location.href = window.location.origin + window.location.pathname;
                    }, null, '离开房间', '确定', '取消');
                }
            });
        }

        // 绑定 Loader 退出按钮
        const loaderExitBtn = document.getElementById('loaderExitBtn');
        if (loaderExitBtn) {
            loaderExitBtn.addEventListener('click', () => {
                // 隐藏加载遮罩
                const loader = document.getElementById('viewerLoader');
                if (loader) loader.classList.add('hidden');

                // 刷新页面回到主页
                window.location.href = window.location.origin + window.location.pathname;
            });
        }

        // ===== 房间信息栏按钮绑定 =====

        // 获取当前房间链接（兼容 roomCode 未设置时从 URL 参数获取）
        function getRoomUrl() {
            const code = roomCode || new URLSearchParams(window.location.search).get('room');
            if (!code) return null;
            return `${window.location.origin}${window.location.pathname}?room=${code}`;
        }

        // Clipboard 降级方案（移动端 http 等场景）
        function fallbackCopy(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                window.showToast?.('房间链接已复制');
                const btn = document.getElementById('copyRoomLinkBtn');
                if (btn) {
                    btn.classList.add('copy-ok');
                    setTimeout(() => btn.classList.remove('copy-ok'), 1200);
                }
            } catch (e) { window.showToast?.('复制失败，请手动复制'); }
            document.body.removeChild(ta);
        }

        // 复制房间链接按钮
        const copyLinkBtn = document.getElementById('copyRoomLinkBtn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = getRoomUrl();
                if (!url) { window.showToast?.('房间尚未连接'); return; }
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(() => {
                        window.showToast?.('房间链接已复制');
                        copyLinkBtn.classList.add('copy-ok');
                        setTimeout(() => copyLinkBtn.classList.remove('copy-ok'), 1200);
                    }).catch(() => {
                        fallbackCopy(url);
                    });
                } else {
                    fallbackCopy(url);
                }
            });
        }

        // 二维码按钮 hover/click 逻辑
        const qrWrapper = document.querySelector('.qr-wrapper');
        const showQRBtn = document.getElementById('showQRBtn');
        const qrPopover = document.getElementById('qrPopover');
        let qrGenerated = false;

        function showQR() {
            const url = getRoomUrl();
            if (!url) { window.showToast?.('房间尚未连接'); return; }
            if (!qrGenerated) generateQR();
            qrPopover.classList.remove('hidden');
            requestAnimationFrame(() => qrPopover.classList.add('visible'));
        }
        function hideQR() {
            qrPopover.classList.remove('visible');
            setTimeout(() => {
                if (!qrPopover.classList.contains('visible')) qrPopover.classList.add('hidden');
            }, 200);
        }
        function markQRDirty() { qrGenerated = false; }

        if (qrWrapper && showQRBtn && qrPopover) {
            showQRBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (qrPopover.classList.contains('visible')) {
                    hideQR();
                } else {
                    showQR();
                }
            });
            document.addEventListener('click', (e) => {
                if (!qrWrapper.contains(e.target) && qrPopover.classList.contains('visible')) {
                    hideQR();
                }
            });
        }

        function generateQR() {
            const canvas = document.getElementById('qrCanvas');
            const url = getRoomUrl();
            if (!canvas || !url) return;
            drawQR(canvas, url);
            qrGenerated = true;
        }

        window.__roomQR = { markDirty: markQRDirty };
    }

    function updateRoomUI() {
        const roomBar = document.getElementById('onlineRoomBar');
        const roomCodeDisplay = document.getElementById('roomCodeDisplay');
        const roomModeDisplay = document.getElementById('roomModeDisplay');
        const leaveBtn = document.getElementById('leaveRoomBtn');

        if (roomBar && roomCodeDisplay && roomModeDisplay) {
            roomBar.classList.remove('hidden');
            roomCodeDisplay.textContent = roomCode || '------';
            roomModeDisplay.textContent = isHost ? '主持模式' : '观众模式';
            if (leaveBtn) {
                leaveBtn.title = isHost ? '关闭房间' : '离开房间';
            }
            updateConnectionStatus('connected');
            // 标记 QR 需要重新生成
            if (window.__roomQR) window.__roomQR.markDirty();
        }

        // 更新设置面板状态：可点击复制
        const statusEl = document.getElementById('onlineStatus');
        if (statusEl && roomCode) {
            statusEl.innerHTML = '房间已开启，点击复制链接';
            statusEl.style.color = '#38bdf8';
            statusEl.style.cursor = 'pointer';
            statusEl.onclick = (e) => {
                e.preventDefault(); // 防止触发任何外层点击（虽通常不需要）
                const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(() => {
                        window.showToast('房间链接已复制');
                        // 临时改变文案
                        const originalText = statusEl.innerHTML;
                        statusEl.innerHTML = '✅ 已复制';
                        setTimeout(() => {
                            if (statusEl) statusEl.innerHTML = originalText;
                        }, 2000);
                    }).catch(err => {
                        console.error(err);
                        window.showToast('复制失败，请手动复制');
                    });
                }
            };
        }
    }

    // Visibility API 集成：页面切回时强制检查和同步
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('App returned to foreground, checking connection...');

            if (socket) {
                if (!socket.connected) {
                    console.log('Socket disconnected, attempting reconnect...');
                    socket.connect();
                } else {
                    // 已连接状态，根据身份执行不同逻辑
                    if (isHost) {
                        // Host: 强制推送最新状态 (确保 Authority)
                        console.log('Host forcing state sync...');
                        syncCurrentState();
                    } else if (roomCode) {
                        // Viewer: 主动 Fetch 最新状态 (确保 Inbox 更新)
                        console.log('Viewer fetching latest state...');
                        socket.emit('fetch_state', currentVersion);
                    }
                }
            }
        }
    });

    function init() {
        insertUI();

        // 检查 URL 参数
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');

        if (roomParam) {
            joinRoom(roomParam);
        }

    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ===== 极简 QR Code 生成器 (Canvas) =====
    // 使用 QR Server API 通过 Image 加载到 Canvas
    function drawQR(canvas, text) {
        const size = 280; // 2x for retina
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.drawImage(img, 0, 0, size, size);
        };
        img.onerror = () => {
            // fallback: 显示文字
            ctx.fillStyle = '#333';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('二维码加载失败', size / 2, size / 2);
        };
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=8`;
    }

    // 暴露给 Settings 调用
    window.__recorder_online = {
        createRoom,
        closeHost,
        forceSync: syncCurrentState
    };
})();
