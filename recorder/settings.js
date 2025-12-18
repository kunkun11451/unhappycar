(function() {
    const STORAGE_KEY = 'recorder_settings_v1';
    const DEFAULT_SETTINGS = {
        animationsEnabled: true,
        theme: 'dark',
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

        // 绑定弹窗内的按钮
        document.getElementById('modalUndoBtn').addEventListener('click', () => {
            window.__recorder_actions.undo();
        });
        document.getElementById('modalResetBtn').addEventListener('click', () => {
            window.__recorder_actions.reset();
        });
        document.getElementById('modalHistoryBtn').addEventListener('click', () => {
            window.__recorder_actions.openHistory();
            closeSettings();
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
                actions.copyWithFeedback(actions.formatLastDrawText(), btn);
                e.preventDefault();
            } else if (pressedShortcut === settings.shortcuts.currentRecord) {
                lastActionTime = now;
                lastActionShortcut = pressedShortcut;
                const btn = document.getElementById('copyRecordBtn');
                actions.copyWithFeedback(actions.formatCurrentRecordText().replace(/水/g, '氵'), btn);
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
            actions.copyWithFeedback(actions.formatLastDrawText(), btn);
            allInOneStep = 1;
        } else if (allInOneStep === 1) {
            const btn = document.getElementById('copyRecordBtn');
            actions.copyWithFeedback(actions.formatCurrentRecordText().replace(/水/g, '氵'), btn);
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
            try {
                await navigator.clipboard.writeText(text);
                btn.classList.add('success');
                btn.textContent = '✔ 已复制';
                
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
})();
