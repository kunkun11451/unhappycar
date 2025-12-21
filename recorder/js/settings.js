(function () {
    const STORAGE_KEY = 'recorder_settings_v1';
    const DEFAULT_SETTINGS = {
        animationsEnabled: true,
        theme: 'dark',
        badgeDisplayMode: 'text',
        copyAllInOneEnabled: false,
        shortcuts: {
            draw: 'None',
            lastDraw: 'None',
            currentRecord: 'None',
            availableChars: 'None',
            copyAllInOne: 'None'
        }
    };

    let settings = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SETTINGS;
    // 确保新设置项存在
    if (settings.animationsEnabled === undefined) settings.animationsEnabled = true;
    if (!settings.theme) settings.theme = 'dark';
    if (!settings.badgeDisplayMode) settings.badgeDisplayMode = 'text';
    if (settings.copyAllInOneEnabled === undefined) settings.copyAllInOneEnabled = false;
    if (!settings.shortcuts.copyAllInOne) settings.shortcuts.copyAllInOne = 'None';

    window.__recorder_settings = settings;

    let currentCopyIndex = 0;
    let allInOneStep = 0; // 0: lastDraw, 1: currentRecord, 2+: availableChars
    let lastActionTime = 0;
    let lastActionShortcut = '';

    function saveSettings() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }

    function init() {
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsModal = document.getElementById('settingsModal');
        const closeBtn = document.querySelector('.settings-close');
        const backdrop = document.querySelector('.settings-backdrop');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                settingsModal.classList.remove('hidden');
                settingsModal.classList.remove('closing');
                document.body.classList.add('modal-open');
            });
        }

        const closeSettings = () => {
            settingsModal.classList.add('closing');
            document.body.classList.remove('modal-open');
            const handle = (e) => {
                if (e.target.classList && e.target.classList.contains('settings-dialog')) {
                    settingsModal.classList.add('hidden');
                    settingsModal.classList.remove('closing');
                    settingsModal.removeEventListener('animationend', handle);
                }
            };
            settingsModal.addEventListener('animationend', handle);
        };

        if (closeBtn) closeBtn.addEventListener('click', closeSettings);
        if (backdrop) backdrop.addEventListener('click', closeSettings);

        // 规则说明折叠动画处理
        const rulesDetails = document.getElementById('rulesDetails');
        if (rulesDetails) {
            const summary = rulesDetails.querySelector('.rules-summary');
            let closeTimeout = null;

            summary.addEventListener('click', (e) => {
                e.preventDefault(); // 阻止原生瞬间切换

                // 清除任何正在进行的定时器，支持连续点击打断
                if (closeTimeout) {
                    clearTimeout(closeTimeout);
                    closeTimeout = null;
                }

                const isOpen = rulesDetails.classList.contains('is-open');

                if (isOpen) {
                    // 收起动画
                    rulesDetails.classList.remove('is-open');
                    closeTimeout = setTimeout(() => {
                        rulesDetails.removeAttribute('open');
                        closeTimeout = null;
                    }, 350);
                } else {
                    // 展开动画 - 先确保 open 属性存在
                    rulesDetails.setAttribute('open', '');
                    // 强制重排后添加动画类
                    rulesDetails.offsetHeight; // 触发重排
                    rulesDetails.classList.add('is-open');
                }
            });
        }

        // 绑定弹窗内的按钮
        document.getElementById('modalUndoBtn').addEventListener('click', () => {
            window.__recorder_actions.undo();
        });
        document.getElementById('modalResetBtn').addEventListener('click', () => {
            window.__recorder_actions.reset();
        });
        document.getElementById('modalHistoryBtn').addEventListener('click', () => {
            window.__recorder_actions.openHistory();
            // 直接隐藏，不等待动画，避免层级冲突
            settingsModal.classList.add('hidden');
            settingsModal.classList.remove('closing');
            document.body.classList.remove('modal-open');
        });

        // 初始化快捷键显示
        initShortcutInputs();

        // 初始化动画开关
        const animToggle = document.getElementById('animToggle');
        if (animToggle) {
            animToggle.checked = settings.animationsEnabled;
            animToggle.addEventListener('change', (e) => {
                settings.animationsEnabled = e.target.checked;
                saveSettings();
            });
        }

        // 初始化复制一条龙开关
        const allInOneToggle = document.getElementById('allInOneToggle');
        const allInOneShortcutItem = document.getElementById('allInOneShortcutItem');
        const individualShortcuts = document.querySelectorAll('.shortcut-individual');

        // 初始化徽标显示模式选择
        const badgeModeSelect = document.getElementById('badgeModeSelect');
        if (badgeModeSelect) {
            badgeModeSelect.value = settings.badgeDisplayMode;
            badgeModeSelect.addEventListener('change', (e) => {
                settings.badgeDisplayMode = e.target.value;
                saveSettings();
                // 触发重新渲染
                if (window.__recorder_actions && window.__recorder_actions.refresh) {
                    window.__recorder_actions.refresh();
                }
            });
        }

        // 初始化在线模式开关
        const onlineToggle = document.getElementById('onlineToggle');
        if (onlineToggle) {
            // 恢复保存的状态
            const savedOnline = settings.onlineMode || false;
            onlineToggle.checked = savedOnline;

            // 如果默认开启，则自动初始化
            if (savedOnline) {
                if (window.__recorder_online && window.__recorder_online.createRoom) {
                    // 使用 createRoom (新版内部已映射为 initHost)
                    window.__recorder_online.createRoom();
                }
            }

            onlineToggle.addEventListener('change', (e) => {
                settings.onlineMode = e.target.checked;
                saveSettings();

                if (e.target.checked) {
                    if (window.__recorder_online && window.__recorder_online.createRoom) {
                        window.__recorder_online.createRoom();
                    }
                } else {
                    // 关闭
                    if (window.__recorder_online && window.__recorder_online.closeHost) {
                        window.__recorder_online.closeHost();
                    }
                }
            });
        }

        // 初始化浅色主题开关
        const themeToggle = document.getElementById('themeToggle');
        const lightLink = document.getElementById('lightThemeLink');
        const applyTheme = (t) => {
            if (lightLink) lightLink.disabled = (t !== 'light');
            // 额外 body class 可选：
            if (t === 'light') document.body.classList.add('light-theme'); else document.body.classList.remove('light-theme');
        };
        if (themeToggle) {
            themeToggle.checked = (settings.theme === 'light');
            applyTheme(settings.theme);
            themeToggle.addEventListener('change', (e) => {
                settings.theme = e.target.checked ? 'light' : 'dark';
                applyTheme(settings.theme);
                saveSettings();
            });
        } else {
            // 确保页面加载时也应用一次主题
            applyTheme(settings.theme);
        }

        const updateVisibility = () => {
            const enabled = settings.copyAllInOneEnabled;
            if (allInOneShortcutItem) allInOneShortcutItem.style.display = enabled ? 'flex' : 'none';
            individualShortcuts.forEach(item => {
                item.style.display = enabled ? 'none' : 'flex';
            });
            // 切换时清除所有冲突提示
            document.querySelectorAll('.shortcut-input').forEach(input => {
                input.classList.remove('conflict');
            });
        };

        if (allInOneToggle) {
            allInOneToggle.checked = settings.copyAllInOneEnabled;
            updateVisibility();
            allInOneToggle.addEventListener('change', (e) => {
                settings.copyAllInOneEnabled = e.target.checked;
                updateVisibility();
                saveSettings();
            });
        }

        // 监听快捷键
        window.addEventListener('keydown', handleKeyDown);

        // 监听抽取按钮，重置复制索引
        const drawBtn = document.getElementById('drawBtn');
        if (drawBtn) {
            drawBtn.addEventListener('click', () => {
                currentCopyIndex = 0;
                allInOneStep = 0;
            });
        }
    }

    function getShortcutDisplay(shortcut) {
        if (!shortcut || shortcut === 'None') return 'None';
        return shortcut.replace('Key', '').replace('Digit', '').replace('Control', 'Ctrl').replace('AltLeft', 'Alt').replace('AltRight', 'Alt').replace('ShiftLeft', 'Shift').replace('ShiftRight', 'Shift');
    }

    function initShortcutInputs() {
        const inputs = document.querySelectorAll('.shortcut-input');
        inputs.forEach(input => {
            const type = input.dataset.type;
            input.value = getShortcutDisplay(settings.shortcuts[type]);

            const updateDisplay = (e) => {
                let combo = [];
                if (e.ctrlKey) combo.push('Ctrl');
                if (e.altKey) combo.push('Alt');
                if (e.shiftKey) combo.push('Shift');

                if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
                    input.value = combo.length > 0 ? combo.join('+') + '+' : '';
                } else {
                    let keyName = e.code.replace('Key', '').replace('Digit', '');
                    if (keyName === 'Escape') return;
                    input.value = (combo.length > 0 ? combo.join('+') + '+' : '') + keyName;
                }
            };

            input.addEventListener('focus', () => {
                input.dataset.oldValue = input.value;
                input.value = '';
            });

            input.addEventListener('blur', () => {
                if (!input.value || input.value.endsWith('+')) {
                    input.value = input.dataset.oldValue;
                }
                delete input.dataset.oldValue;
            });

            input.addEventListener('keydown', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (e.code === 'Escape') {
                    settings.shortcuts[type] = 'None';
                    input.value = 'None';
                    input.dataset.oldValue = 'None';
                    input.classList.remove('conflict');
                    saveSettings();
                    input.blur();
                    return;
                }

                // 如果是修饰键，只更新显示
                if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'].includes(e.code)) {
                    updateDisplay(e);
                    return;
                }

                let combo = [];
                if (e.ctrlKey) combo.push('Ctrl');
                if (e.altKey) combo.push('Alt');
                if (e.shiftKey) combo.push('Shift');

                let keyName = e.code.replace('Key', '').replace('Digit', '');
                combo.push(keyName);

                const newShortcut = combo.join('+');

                // 检查冲突
                let conflict = false;
                const individualTypes = ['lastDraw', 'currentRecord', 'availableChars'];

                Object.entries(settings.shortcuts).forEach(([t, s]) => {
                    if (t === type || s === 'None' || s !== newShortcut) return;

                    // 如果开启了一条龙，忽略独立快捷键的冲突
                    if (settings.copyAllInOneEnabled) {
                        if (individualTypes.includes(t)) return;
                    } else {
                        // 如果没开启一条龙，忽略一条龙快捷键的冲突
                        if (t === 'copyAllInOne') return;
                    }

                    conflict = true;
                });

                if (conflict) {
                    input.classList.add('conflict');
                    setTimeout(() => input.classList.remove('conflict'), 1000);
                    return;
                }

                input.classList.remove('conflict');
                settings.shortcuts[type] = newShortcut;
                input.value = newShortcut;
                input.dataset.oldValue = newShortcut;
                saveSettings();
                input.blur();
            });

            input.addEventListener('keyup', (e) => {
                if (document.activeElement === input) {
                    updateDisplay(e);
                }
            });
        });
    }

    function handleKeyDown(e) {
        // 如果正在输入（如在弹窗中设置快捷键），不触发
        if (e.target.tagName === 'INPUT') return;

        const actions = window.__recorder_actions;

        // 构建当前按下的组合键字符串
        let pressed = [];
        if (e.ctrlKey) pressed.push('Ctrl');
        if (e.altKey) pressed.push('Alt');
        if (e.shiftKey) pressed.push('Shift');

        // 忽略单独的修饰键
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

        let keyName = e.code.replace('Key', '').replace('Digit', '');
        pressed.push(keyName);
        const pressedShortcut = pressed.join('+');

        // 防止长按导致的快速重复触发（延迟 0.2s）
        const now = Date.now();
        if (pressedShortcut === lastActionShortcut && (now - lastActionTime) < 200) {
            return;
        }

        if (pressedShortcut === settings.shortcuts.draw) {
            lastActionTime = now;
            lastActionShortcut = pressedShortcut;
            actions.drawOnce();
            e.preventDefault();
        } else if (settings.copyAllInOneEnabled) {
            if (pressedShortcut === settings.shortcuts.copyAllInOne) {
                lastActionTime = now;
                lastActionShortcut = pressedShortcut;
                handleAllInOne();
                e.preventDefault();
            }
        } else {
            if (pressedShortcut === settings.shortcuts.lastDraw) {
                lastActionTime = now;
                lastActionShortcut = pressedShortcut;
                const btn = document.getElementById('copyLastBtn');
                actions.copyWithFeedback(actions.formatLastDrawText(), btn, true);
                e.preventDefault();
            } else if (pressedShortcut === settings.shortcuts.currentRecord) {
                lastActionTime = now;
                lastActionShortcut = pressedShortcut;
                const btn = document.getElementById('copyRecordBtn');
                actions.copyWithFeedback(actions.formatCurrentRecordText().replace(/水/g, '氵'), btn, true);
                e.preventDefault();
            } else if (pressedShortcut === settings.shortcuts.availableChars) {
                lastActionTime = now;
                lastActionShortcut = pressedShortcut;
                copyNextAvailableChar();
                e.preventDefault();
            }
        }
    }

    async function handleAllInOne() {
        const actions = window.__recorder_actions;
        const copyBox = document.getElementById('copyAvailable');
        const chips = copyBox ? copyBox.querySelectorAll('.copy-chip') : [];

        if (allInOneStep === 0) {
            const btn = document.getElementById('copyLastBtn');
            actions.copyWithFeedback(actions.formatLastDrawText(), btn, true);
            allInOneStep = 1;
        } else if (allInOneStep === 1) {
            const btn = document.getElementById('copyRecordBtn');
            actions.copyWithFeedback(actions.formatCurrentRecordText().replace(/水/g, '氵'), btn, true);
            allInOneStep = 2;
            currentCopyIndex = 0;
        } else {
            if (chips.length === 0 || currentCopyIndex >= chips.length) {
                allInOneStep = 0;
                handleAllInOne();
                return;
            }

            await copyNextAvailableChar();

            if (currentCopyIndex >= chips.length) {
                allInOneStep = 0;
            }
        }
    }

    async function copyNextAvailableChar() {
        const copyBox = document.getElementById('copyAvailable');
        if (!copyBox || copyBox.classList.contains('hidden')) return;

        const chips = copyBox.querySelectorAll('.copy-chip');
        if (chips.length === 0) return;

        if (currentCopyIndex >= chips.length) {
            currentCopyIndex = 0; // 循环或提示已结束
        }

        const chip = chips[currentCopyIndex];
        const input = chip.querySelector('input.text');
        const btn = chip.querySelector('button');

        if (input && btn) {
            const text = input.value;
            const ICON_CHECK = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            try {
                await navigator.clipboard.writeText(text);
                btn.classList.add('success');
                btn.innerHTML = ICON_CHECK;

                // 视觉反馈：高亮当前复制的项（全局唯一）
                document.querySelectorAll('.copy-highlight').forEach(el => {
                    el.classList.remove('copy-highlight');
                });
                chip.classList.add('copy-highlight');

                // 3秒后移除高亮
                setTimeout(() => {
                    chip.classList.remove('copy-highlight');
                }, 3000);

                currentCopyIndex++;
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    // 自定义 Alert 功能
    window.showCustomAlert = function (msg, title = '提示', callback = null) {
        const modal = document.getElementById('alertModal');
        const titleEl = document.getElementById('alertTitle');
        const msgEl = document.getElementById('alertMessage');
        const okBtn = document.getElementById('alertOkBtn');
        const closeBtn = document.getElementById('alertCloseBtn');
        const backdrop = modal.querySelector('.settings-backdrop');

        if (!modal) {
            alert(msg); // Fallback
            if (callback) callback();
            return;
        }

        titleEl.textContent = title;
        msgEl.textContent = msg;
        modal.classList.remove('hidden');

        const closeModal = () => {
            modal.classList.add('closing');
            modal.addEventListener('animationend', () => {
                modal.classList.remove('hidden');
                modal.classList.remove('closing');
                modal.classList.add('hidden'); // Ensure hidden is back
                if (callback) callback();
            }, { once: true });
        };

        const newOk = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        newOk.addEventListener('click', closeModal);

        const newClose = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newClose, closeBtn);
        newClose.addEventListener('click', closeModal);

        const newBackdrop = backdrop.cloneNode(true);
        backdrop.parentNode.replaceChild(newBackdrop, backdrop);
    };

    // 自定义 Toast 功能
    window.showToast = function (msg, duration = 2000) {
        let toast = document.getElementById('toastNotification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toastNotification';
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }

        toast.textContent = msg;
        toast.classList.add('show');

        clearTimeout(toast.timeout);
        toast.timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    };

})();
