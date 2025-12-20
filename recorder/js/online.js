(function () {
    let socket = null;
    let roomCode = null;
    let isHost = false;

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
        document.body.classList.add('viewer-mode');
    }

    // 动态添加样式
    const style = document.createElement('style');
    style.textContent = `
        .room-info {
            position: absolute;
            left: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            color: var(--text-secondary);
            background: var(--bg-secondary);
            padding: 4px 12px;
            border-radius: 99px;
            border: 1px solid var(--border-color);
            z-index: 100;
        }
        .room-info.hidden { display: none; }
        .room-code { font-weight: bold; font-family: monospace; letter-spacing: 1px; color: var(--primary-color); }
        .btn-icon-sm { background: none; border: none; cursor: pointer; opacity: 0.7; padding: 2px; font-size: 1.1em; }
        .btn-icon-sm:hover { opacity: 1; transform: scale(1.1); }
        
        /* 观众模式样式 */
        body.viewer-mode .controls:not(.tab-controls) { display: none !important; }
        /* body.viewer-mode #settingsBtn { display: none !important; }  <-- Removed to allow viewing history */
        body.viewer-mode .host-only { display: none !important; }
        body.viewer-mode .viewer-badge {
             position: fixed;
             bottom: 20px;
             right: 20px;
             background: #3b82f6;
             color: white;
             padding: 8px 16px;
             border-radius: 20px;
             font-size: 0.85rem;
             pointer-events: none;
             box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
             z-index: 1000;
        }
    `;
    document.head.appendChild(style);

    // UI初始化
    const roomInfo = document.createElement('div');
    roomInfo.id = 'roomInfo';
    roomInfo.className = 'room-info hidden';
    roomInfo.innerHTML = `
        <span class="room-label">房间:</span>
        <span class="room-code" id="displayRoomCode">------</span>
        <button class="btn-icon-sm" id="copyRoomLink" title="复制房间链接">🔗</button>
    `;

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
                    window.location.href = url;
                } else {
                    window.showToast('请输入6位数字房间码');
                }
            });
        }

        const header = document.querySelector('header');
        if (header) {
            header.appendChild(roomInfo);
        }

        // 绑定 Loader 退出按钮
        const exitBtn = document.getElementById('loaderExitBtn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                // 清除 URL 参数并刷新
                const url = new URL(window.location.href);
                url.searchParams.delete('room');
                window.location.href = url.toString();
            });
        }
    }

    function checkIo(cb) {
        if (window.io) cb();
        else setTimeout(() => checkIo(cb), 100);
    }

    function connectSocket() {
        if (socket) return socket;

        const opts = {};
        const serverUrl = 'https://unhappycar.tech:4000';

        socket = window.io(serverUrl, opts);

        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('room_created', (code) => {
            roomCode = code;
            isHost = true;
            localStorage.setItem('recorder_room_code', code); // 保存房间码
            updateRoomUI();

            // 立即同步当前状态
            syncCurrentState();
        });

        socket.on('host_restored', (code) => {
            roomCode = code;
            isHost = true;
            // 房间码已存在 localStorage，无需再次保存
            updateRoomUI();

            // 立即同步当前状态（因为掉线期间可能有重连动作，保证最新）
            syncCurrentState();
        });

        socket.on('reconnect_failed', () => {
            // 重连失败（房间过期），创建新房间
            localStorage.removeItem('recorder_room_code');
            socket.emit('create_room');
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

        socket.on('update_state', (state) => {
            if (!isHost && window.__recorder_actions && window.__recorder_actions.restoreState) {
                window.__recorder_actions.restoreState(state);
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
            // 也可以选择刷新页面 location.reload()，或者变为普通离线状态
            // 这里选择仅断开在线状态
            if (socket) socket.disconnect();

            // 重要：更新设置里的开关状态（视觉上关闭）
            const toggle = document.getElementById('onlineToggle');
            if (toggle) {
                // 不触发 change 事件，仅修改显示
                toggle.checked = false;
                // 注意：不更新 localStorage，否则会影响新开启的页面
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

    function syncCurrentState() {
        if (window.__recorder_actions && window.__recorder_actions.getState) {
            const state = window.__recorder_actions.getState();
            socket.emit('sync_state', state);
        }
    }

    function enableViewerMode() {
        document.body.classList.add('viewer-mode');
        const badge = document.createElement('div');
        badge.className = 'viewer-badge';
        badge.textContent = '观众模式';
        document.body.appendChild(badge);
    }

    // 初始化房主模式（检查重连或创建）
    function initHost() {
        if (document.body.classList.contains('viewer-mode')) {
            console.log('Viewer mode active, skipping host initialization.');
            return;
        }

        checkIo(() => {
            const s = connectSocket();
            if (s.connected) {
                // 如果已连接，直接发消息
                const savedCode = localStorage.getItem('recorder_room_code');
                if (savedCode) {
                    s.emit('host_reconnect', savedCode);
                } else {
                    s.emit('create_room');
                }
            } else {
                // 如果还没连上，bind connect 一次
                s.once('connect', () => {
                    const savedCode = localStorage.getItem('recorder_room_code');
                    if (savedCode) {
                        s.emit('host_reconnect', savedCode);
                    } else {
                        s.emit('create_room');
                    }
                });
            }

            // 绑定状态变更监听 (只需绑定一次)
            if (!window.__recorder_is_bound) {
                if (window.__recorder_actions && window.__recorder_actions.setOnStateChange) {
                    window.__recorder_actions.setOnStateChange(state => {
                        if (socket && isHost) {
                            socket.emit('sync_state', state);
                        }
                    });
                }
                window.__recorder_is_bound = true;
            }
        });

        // 显示“正在连接...”状态
        const el = document.getElementById('roomInfo');
        const codeEl = document.getElementById('displayRoomCode');
        if (el && codeEl) {
            el.classList.remove('hidden');
            codeEl.textContent = '连接中...';
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
            socket.emit('close_room');
            isHost = false;
            roomCode = null;
            localStorage.removeItem('recorder_room_code');

            // 隐藏 UI
            const el = document.getElementById('roomInfo');
            if (el) el.classList.add('hidden');

            // 清空设置面板状态
            const statusEl = document.getElementById('onlineStatus');
            if (statusEl) {
                statusEl.innerHTML = '';
                statusEl.onclick = null;
                statusEl.style.cursor = 'default';
            }
        }
    }

    // 旧的 createRoom 废弃，保留兼容
    function createRoom() {
        initHost();
    }

    function joinRoom(code) {
        checkIo(() => {
            const s = connectSocket();
            s.emit('join_room', code);
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

        // 显示“正在连接...”状态 (UI顶部)
        const el = document.getElementById('roomInfo');
        const codeEl = document.getElementById('displayRoomCode');
        if (el && codeEl) {
            el.classList.remove('hidden');
            codeEl.textContent = '连接中...';
        }
    }

    function updateRoomUI() {
        const el = document.getElementById('roomInfo');
        const codeEl = document.getElementById('displayRoomCode');
        if (el && codeEl) {
            el.classList.remove('hidden');
            codeEl.textContent = roomCode;
        }

        // 更新设置面板状态：可点击复制
        const statusEl = document.getElementById('onlineStatus');
        if (statusEl && roomCode) {
            statusEl.innerHTML = '🔗 复制链接';
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

    function init() {
        insertUI();

        // 检查 URL 参数
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');

        if (roomParam) {
            joinRoom(roomParam);
        }

        // 绑定复制
        document.addEventListener('click', (e) => {
            if (e.target.closest('#copyRoomLink')) {
                const url = new URL(window.location.href);
                url.searchParams.set('room', roomCode);

                // 处理 file:// 协议复制出来的链接问题 (file:// 不太好分享，但为了完整性)
                let text = url.toString();

                navigator.clipboard.writeText(text);
                const btn = e.target.closest('#copyRoomLink');
                const original = btn.textContent;
                btn.textContent = '✅';
                setTimeout(() => btn.textContent = original, 1000);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 暴露给 Settings 调用
    window.__recorder_online = {
        createRoom,
        closeHost
    };
})();
