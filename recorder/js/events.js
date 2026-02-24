(function () {
    const DEFAULT_EVENTS = [];

    window.__events_manager = {
        enabled: false,
        events: [],
        
        init: function () {
            this.loadSettings();
            this.renderSettingsUI();
            this.renderDisplayArea();
            this.updateDisplayVisibility();
            this.injectStyles();
        },

        loadSettings: function () {
            const savedData = localStorage.getItem('recorder_events');
            let data = {};
            if (savedData) {
                try {
                    data = JSON.parse(savedData);
                } catch (e) {
                    data = {};
                }
            }

            this.enabled = data.enabled === true;
            this.events = Array.isArray(data.list) ? data.list : [...DEFAULT_EVENTS];
            this.lastDrawnEvent = data.lastDrawn || "等待抽取...";
        },

        saveSettings: function () {
            const data = {
                enabled: this.enabled,
                list: this.events,
                lastDrawn: this.lastDrawnEvent
            };
            localStorage.setItem('recorder_events', JSON.stringify(data));
        },

        // 绑定设置面板的事件
        renderSettingsUI: function () {
            const toggle = document.getElementById('eventsToggle');
            const editBtn = document.getElementById('editEventsBtn');

            if (toggle) {
                // 初始化状态
                toggle.checked = this.enabled;
                // 绑定事件
                toggle.addEventListener('change', (e) => {
                    this.enabled = e.target.checked;
                    this.saveSettings();
                    this.updateDisplayVisibility();
                    
                    // 如果关闭了事件抽取，清除缓存
                    if (!this.enabled) {
                        this.lastDrawnEvent = "等待抽取...";
                        this.saveSettings();
                        const el = document.getElementById('eventContent');
                        if (el) el.textContent = "等待抽取...";
                    }
                    
                    if (window.__recorder_online && window.__recorder_online.forceSync) {
                        window.__recorder_online.forceSync();
                    }
                });
            }

            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    this.openEditModal();
                });
            }
        },

        // 在 index.html 中 lastDraw 下方插入显示区域
        renderDisplayArea: function () {
            const lastDraw = document.getElementById('lastDraw');
            if (!lastDraw) return;

            const container = document.createElement('div');
            container.id = 'eventDisplayArea';
            container.className = 'card mt-4 hidden'; // 复用 card 样式，加点 margin-top
            container.innerHTML = `
                <div class="event-title">附加随机事件</div>
                <div class="event-content" id="eventContent">${this.lastDrawnEvent}</div>
            `;
            
            lastDraw.parentNode.insertBefore(container, lastDraw.nextSibling);
        },

        updateDisplayVisibility: function () {
            const el = document.getElementById('eventDisplayArea');
            if (el) {
                if (this.enabled) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            }
        },

        // 抽取逻辑，由 script.js 的 drawOnce 调用
        draw: function () {
            if (!this.enabled) return;
            const el = document.getElementById('eventContent');
            if (!el) return;

            if (this.events.length === 0) {
                el.textContent = "无可用事件";
                return;
            }

            const finalIdx = Math.floor(Math.random() * this.events.length);
            this.lastDrawnEvent = this.events[finalIdx];
            this.saveSettings();
            
            el.textContent = this.lastDrawnEvent;

            const animsEnabled = (window.__recorder_settings && window.__recorder_settings.animationsEnabled !== false);
            const restoring = !!window.__recorder_restoring;

            if (animsEnabled && !restoring) {
                // 简单的浮现动画
                el.classList.remove('pop-anim');
                void el.offsetWidth;
                el.classList.add('pop-anim');
            }
            
        },

        openEditModal: function () {
            let modal = document.getElementById('eventsEditModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'eventsEditModal';
                modal.className = 'settings-modal hidden';
                modal.innerHTML = `
                    <div class="settings-backdrop"></div>
                    <div class="settings-dialog" style="max-width: 500px; width: 90%; height: 600px; display: flex; flex-direction: column;">
                        <div class="settings-header">
                            <h2>编辑事件列表</h2>
                            <button class="settings-close">&times;</button>
                        </div>
                        <div class="settings-body" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                            <div id="eventsListContainer" style="flex: 1; overflow-y: auto; margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
                                <!-- Events will be rendered here -->
                            </div>
                            <button id="addEventBtn" class="btn secondary" style="width: 100%; margin-bottom: 15px; flex-shrink: 0;">+ 添加新事件</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                // Bind close/cancel
                modal.querySelector('.settings-close').addEventListener('click', () => this.closeEditModal());
                modal.querySelector('.settings-backdrop').addEventListener('click', () => this.closeEditModal());
                
                modal.querySelector('#addEventBtn').addEventListener('click', () => {
                    this.tempEvents.push("");
                    this.renderEventList();
                });
            }

            this.tempEvents = [...this.events];
            this.renderEventList();
            modal.classList.remove('hidden');
            modal.classList.remove('closing');
        },

        renderEventList: function() {
            const container = document.getElementById('eventsListContainer');
            if (!container) return;
            container.innerHTML = '';
            this.tempEvents.forEach((ev, idx) => {
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.gap = '8px';
                div.innerHTML = `
                    <input type="text" class="settings-select event-item-input" value="${ev.replace(/"/g, '&quot;')}" placeholder="输入事件内容" style="flex-grow: 1;">
                    <button class="btn secondary sm delete-event-btn" data-idx="${idx}" style="padding: 0 10px; color: #ef4444; border-color: rgba(239,68,68,0.3);" title="删除">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                `;
                container.appendChild(div);
            });

            container.querySelectorAll('.delete-event-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                    this.tempEvents.splice(idx, 1);
                    this.renderEventList();
                });
            });
        },

        closeEditModal: function () {
            const modal = document.getElementById('eventsEditModal');
            if (modal && !modal.classList.contains('closing')) {
                // Auto-save on close
                const inputs = modal.querySelectorAll('.event-item-input');
                const newEvents = [];
                inputs.forEach(input => {
                    const val = input.value.trim();
                    if (val) newEvents.push(val);
                });
                
                // Only save if there's a change to avoid unnecessary toasts
                if (JSON.stringify(this.events) !== JSON.stringify(newEvents)) {
                    this.events = newEvents;
                    this.saveSettings();
                    window.showToast?.('事件列表已保存', 2000);
                }
                
                modal.classList.add('closing');
                const handle = (e) => {
                    if (e.target.classList && e.target.classList.contains('settings-dialog')) {
                        modal.classList.add('hidden');
                        modal.classList.remove('closing');
                        modal.removeEventListener('animationend', handle);
                    }
                };
                modal.addEventListener('animationend', handle);
            }
        },

        injectStyles: function () {
            const style = document.createElement('style');
            style.textContent = `
                #eventDisplayArea {
                    text-align: center;
                    padding: 15px;
                    margin-top: 10px;
                }
                .event-title {
                    font-size: 0.8rem;
                    color: #94a3b8;
                    margin-bottom: 5px;
                    letter-spacing: 1px;
                }
                .event-content {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: inherit;
                    min-height: 1.5em;
                }
                .pop-anim {
                    animation: eventPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes eventPop {
                    0% { transform: scale(0.9); opacity: 0; }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); opacity: 1; }
                }
                #eventsListContainer {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
                }
                #eventsListContainer::-webkit-scrollbar {
                    width: 6px;
                }
                #eventsListContainer::-webkit-scrollbar-track {
                    background: transparent;
                }
                #eventsListContainer::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                #eventsListContainer::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                .event-item-input {
                    background-image: none !important;
                    padding-right: 12px !important;
                }
                @media (max-width: 768px) {
                    #eventsEditModal .event-item-input {
                        width: 100% !important;
                        max-width: none !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    };
})();
