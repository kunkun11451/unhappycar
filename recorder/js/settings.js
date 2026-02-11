(function () {
    const STORAGE_KEY = 'recorder_settings_v1';
    const DEFAULT_SETTINGS = {
        animationsEnabled: true,
        theme: 'system',
        badgeDisplayMode: 'text',
        copyAllInOneEnabled: false,
        customContextMenuEnabled: true,
        brainTeaserMode: false,
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
    if (!settings.theme) settings.theme = 'system';
    if (!settings.badgeDisplayMode) settings.badgeDisplayMode = 'text';
    if (settings.copyAllInOneEnabled === undefined) settings.copyAllInOneEnabled = false;
    if (settings.customContextMenuEnabled === undefined) settings.customContextMenuEnabled = true;
    if (settings.brainTeaserMode === undefined) settings.brainTeaserMode = false;
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

        // 规则说明折叠动画处理 (支持多个折叠面板)
        document.querySelectorAll('.rules-details').forEach(details => {
            const summary = details.querySelector('.rules-summary');
            if(!summary) return;
            
            let closeTimeout = null;

            summary.addEventListener('click', (e) => {
                e.preventDefault(); // 阻止原生瞬间切换

                // 清除任何正在进行的定时器，支持连续点击打断
                if (closeTimeout) {
                    clearTimeout(closeTimeout);
                    closeTimeout = null;
                }

                const isOpen = details.classList.contains('is-open');

                if (isOpen) {
                    // 收起动画
                    details.classList.remove('is-open');
                    closeTimeout = setTimeout(() => {
                        details.removeAttribute('open');
                        closeTimeout = null;
                    }, 350);
                } else {
                    // 展开动画 - 先确保 open 属性存在
                    details.setAttribute('open', '');
                    // 强制重排后添加动画类
                    details.offsetHeight; // 触发重排
                    details.classList.add('is-open');
                }
            });
        });

        // 初始化脑筋急转弯模式开关
        const brainTeaserToggle = document.getElementById('brainTeaserToggle');
        if (brainTeaserToggle) {
            brainTeaserToggle.checked = settings.brainTeaserMode;
            brainTeaserToggle.addEventListener('change', (e) => {
                settings.brainTeaserMode = e.target.checked;
                saveSettings();

                // 触发 UI 刷新
                if (window.__recorder_actions && window.__recorder_actions.refresh) {
                    window.__recorder_actions.refresh();
                }

                // 如果在线，同步给观众
                if (window.__recorder_online && window.__recorder_online.forceSync) {
                    window.__recorder_online.forceSync();
                }
            });
        }

        // 绑定弹窗内的按钮
        document.getElementById('modalUndoBtn').addEventListener('click', () => {
            window.__recorder_actions.undo();
        });
        document.getElementById('modalResetBtn').addEventListener('click', () => {
            const doConfirm = window.showCustomConfirm || ((msg, cb) => { if (confirm(msg)) cb(); });
            doConfirm('确定要重置所有记录吗？此操作无法撤销。', () => {
                window.__recorder_actions.reset();
            }, null, '重置记录', '确定', '取消');
        });
        document.getElementById('modalHistoryBtn').addEventListener('click', () => {
            window.__recorder_actions.openHistory();
        });

        // 查看所有角色标签按钮
        const viewAllTagsBtn = document.getElementById('viewAllTagsBtn');
        const charTagsModal = document.getElementById('charTagsModal');
        const charTagsGrid = document.getElementById('charTagsGrid');
        const charTagsSearchBtn = document.getElementById('charTagsSearchBtn');
        const charTagsSearchInput = document.getElementById('charTagsSearchInput');
        const charTagsSearchContainer = document.getElementById('charTagsSearchContainer');

        // 角色标签弹窗搜索词
        let charTagsSearchTerm = '';

        // 高亮文本辅助函数
        function highlightCharTagText(text, search, matchRange) {
            if (!search || !text) return text;
            if (matchRange) {
                const start = matchRange.start;
                const end = start + matchRange.length;
                return text.substring(0, start) +
                    `<span class="name-hl">${text.substring(start, end)}</span>` +
                    text.substring(end);
            }
            const idx = text.toLowerCase().indexOf(search.toLowerCase());
            if (idx !== -1) {
                return text.substring(0, idx) +
                    `<span class="name-hl">${text.substring(idx, idx + search.length)}</span>` +
                    text.substring(idx + search.length);
            }
            return text;
        }

        // 渲染角色标签列表
        function renderCharTagsGrid(skipAnims = false) {
            if (!charTagsGrid) return;

            // 获取当前记录
            const record = window.__recorder_actions && window.__recorder_actions.getRecord
                ? window.__recorder_actions.getRecord()
                : { 元素类型: new Set(), 国家: new Set(), 武器类型: new Set(), 体型: new Set() };

            // 获取角色数据
            const charData = window.characterData || {};
            const entries = Object.entries(charData);
            let displayList = entries.map(([name, data]) => ({ name, data }));

            // 处理搜索逻辑
            let matches = new Map();
            const isSearchActive = !!charTagsSearchTerm;

            if (isSearchActive) {
                const hasPinyinSupport = typeof window.pinyinPro !== 'undefined' && typeof window.pinyinPro.pinyin === 'function';
                const pinyinFunc = hasPinyinSupport ? window.pinyinPro.pinyin : null;

                displayList.forEach(item => {
                    const name = item.name;
                    const lowerName = name.toLowerCase();

                    // 1. 优先尝试直接子串匹配
                    const subIdx = lowerName.indexOf(charTagsSearchTerm);
                    if (subIdx !== -1) {
                        matches.set(name, { start: subIdx, length: charTagsSearchTerm.length });
                        return;
                    }

                    // 2. 尝试拼音首字母逻辑
                    if (window.__brainTeaser && window.__brainTeaser.matchPinyinInitials) {
                        const res = window.__brainTeaser.matchPinyinInitials(name, charTagsSearchTerm, pinyinFunc);
                        if (res && res.match) {
                            matches.set(name, res.range);
                        }
                    }
                });

                // 将匹配项排在前面
                displayList.sort((a, b) => {
                    const matchA = matches.has(a.name);
                    const matchB = matches.has(b.name);
                    if (matchA && !matchB) return -1;
                    if (!matchA && matchB) return 1;
                    return 0;
                });
            }

            const globalAnims = settings.animationsEnabled !== false;
            const anims = globalAnims && !skipAnims;

            // FLIP: 捕获旧位置
            const oldPosMap = new Map();
            if (charTagsGrid.children.length > 0) {
                Array.from(charTagsGrid.children).forEach(el => {
                    const name = el.getAttribute('title');
                    if (name) oldPosMap.set(name, el.getBoundingClientRect());
                });
            }

            charTagsGrid.innerHTML = displayList.map(({ name, data }, i) => {
                // 使用头像设置模块获取头像URL（如果存在）
                let avatar = data.头像 || '';
                if (window.__avatar_settings && window.__avatar_settings.getAvatarUrlSync) {
                    avatar = window.__avatar_settings.getAvatarUrlSync(name, data) || avatar;
                }
                const element = data.元素类型 || '';
                const region = data.国家 || '';
                const weapon = data.武器类型 || '';
                const body = data.体型 || '';

                // 检查每个标签是否在当前记录中（被禁用）
                const elementBanned = element && record.元素类型.has(element);
                const regionBanned = region && record.国家.has(region);
                const weaponBanned = weapon && record.武器类型.has(weapon);
                const bodyBanned = body && record.体型.has(body);

                // 如果是 FLIP 动画（已有旧位置），不播放入场动画
                const isExisting = oldPosMap.has(name);
                let cardClass = (anims && !isExisting) ? 'char-tag-card char-tag-card-appear' : 'char-tag-card';
                let displayName = name;

                if (isSearchActive) {
                    const matchRange = matches.get(name);
                    if (matchRange) {
                        cardClass += ' search-match';
                        displayName = highlightCharTagText(name, charTagsSearchTerm, matchRange);
                    } else {
                        cardClass += ' search-dim';
                    }
                }

                const cardStyle = (anims && !isExisting) ? `style="--stagger:${i}"` : '';

                return `
                    <div class="${cardClass}" ${cardStyle} title="${name}">
                        ${avatar ? `<img src="${avatar}" alt="${name}" class="avatar">` : '<div class="avatar"></div>'}
                        <div class="char-tag-info">
                            <div class="name">${displayName}</div>
                            <div class="char-tag-row">
                                <span class="label">元素类型</span>
                                <span class="value ${element ? '' : 'empty'} ${elementBanned ? 'banned' : ''}">${element || '无'}</span>
                            </div>
                            <div class="char-tag-row">
                                <span class="label">国家</span>
                                <span class="value ${region ? '' : 'empty'} ${regionBanned ? 'banned' : ''}">${region || '无'}</span>
                            </div>
                            <div class="char-tag-row">
                                <span class="label">武器类型</span>
                                <span class="value ${weaponBanned ? 'banned' : ''}">${weapon}</span>
                            </div>
                            <div class="char-tag-row">
                                <span class="label">体型</span>
                                <span class="value ${bodyBanned ? 'banned' : ''}">${body}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // 更新搜索状态类
            if (isSearchActive) {
                charTagsGrid.classList.add('search-active');
            } else {
                charTagsGrid.classList.remove('search-active');
            }

            // FLIP: 计算新位置并执行动画
            if (globalAnims && oldPosMap.size > 0 && !document.hidden) {
                requestAnimationFrame(() => {
                    const newItems = Array.from(charTagsGrid.children);
                    const moved = [];
                    newItems.forEach(el => {
                        const name = el.getAttribute('title');
                        const oldRect = oldPosMap.get(name);
                        if (oldRect) {
                            const newRect = el.getBoundingClientRect();
                            const dx = oldRect.left - newRect.left;
                            const dy = oldRect.top - newRect.top;
                            if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                                el.style.transform = `translate(${dx}px, ${dy}px)`;
                                el.style.transition = 'none';
                                moved.push(el);
                            }
                        }
                    });

                    if (moved.length > 0) {
                        requestAnimationFrame(() => {
                            moved.forEach(el => {
                                el.style.transform = '';
                                el.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
                            });
                        });
                    }
                });
            }
        }

        // 关闭搜索框
        function closeCharTagsSearch() {
            if (charTagsSearchContainer) {
                charTagsSearchContainer.classList.remove('active');
                charTagsSearchInput.value = '';
                charTagsSearchTerm = '';
                charTagsSearchBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
                renderCharTagsGrid(true);
            }
        }

        if (viewAllTagsBtn && charTagsModal && charTagsGrid) {
            viewAllTagsBtn.addEventListener('click', () => {
                // 重置搜索状态
                charTagsSearchTerm = '';
                if (charTagsSearchInput) charTagsSearchInput.value = '';
                if (charTagsSearchContainer) {
                    charTagsSearchContainer.classList.remove('active');
                    if (charTagsSearchBtn) {
                        charTagsSearchBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
                    }
                }

                // 渲染角色列表
                renderCharTagsGrid();

                // 打开弹窗
                charTagsModal.classList.remove('hidden');
                document.body.classList.add('modal-open');
            });

            // 搜索框逻辑
            if (charTagsSearchBtn && charTagsSearchInput && charTagsSearchContainer) {
                charTagsSearchBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!charTagsSearchContainer.classList.contains('active')) {
                        charTagsSearchContainer.classList.add('active');
                        charTagsSearchInput.focus();
                        charTagsSearchBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
                    } else {
                        closeCharTagsSearch();
                    }
                });

                charTagsSearchInput.addEventListener('input', () => {
                    charTagsSearchTerm = charTagsSearchInput.value.trim().toLowerCase().replace(/'/g, '');
                    renderCharTagsGrid(true);
                });

                // 快捷键 ESC 退出搜索
                charTagsSearchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        closeCharTagsSearch();
                    }
                });
            }

            // 关闭弹窗
            charTagsModal.querySelectorAll('[data-chartags-close]').forEach(el => {
                el.addEventListener('click', () => {
                    charTagsModal.classList.add('closing');
                    setTimeout(() => {
                        charTagsModal.classList.add('hidden');
                        charTagsModal.classList.remove('closing');
                        document.body.classList.remove('modal-open');
                        // 关闭弹窗时重置搜索状态
                        closeCharTagsSearch();
                    }, 280);
                });
            });
        }

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

        // 初始化自定义右键菜单开关
        const contextMenuToggle = document.getElementById('contextMenuToggle');
        if (contextMenuToggle) {
            contextMenuToggle.checked = settings.customContextMenuEnabled;
            contextMenuToggle.addEventListener('change', (e) => {
                settings.customContextMenuEnabled = e.target.checked;
                saveSettings();
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

        // 初始化主题设置
        const themeSelect = document.getElementById('themeSelect');
        const lightLink = document.getElementById('lightThemeLink');
        const applyTheme = (t) => {
            let activeTheme = t;
            if (t === 'system') {
                activeTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
            }
            if (lightLink) lightLink.disabled = (activeTheme !== 'light');
            if (activeTheme === 'light') document.body.classList.add('light-theme');
            else document.body.classList.remove('light-theme');
        };

        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
            if (settings.theme === 'system') {
                applyTheme('system');
            }
        });

        if (themeSelect) {
            themeSelect.value = settings.theme || 'system';
            applyTheme(settings.theme || 'system');
            themeSelect.addEventListener('change', (e) => {
                settings.theme = e.target.value;
                applyTheme(settings.theme);
                saveSettings();
            });
        } else {
            // 确保页面加载时也应用一次主题
            applyTheme(settings.theme || 'system');
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
                // 脑筋急转弯模式下禁用（除非投降）
                if (settings.brainTeaserMode && window.__brainTeaser && !window.__brainTeaser.isSurrendered) {
                    return;
                }
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
        const copyPanel = document.getElementById('copyAvailablePanel');

        // Check availability/visibility of copy area
        // If hidden, treat as empty (step over)
        const isCopyVisible = copyBox && !copyBox.classList.contains('hidden') &&
            copyPanel && !copyPanel.classList.contains('hidden');

        // 脑筋急转弯模式下跳过最后一步（除非投降）
        // 或者如果复制区域不可见，也跳过
        if (allInOneStep === 2) {
            const shouldSkip = (settings.brainTeaserMode && window.__brainTeaser && !window.__brainTeaser.isSurrendered) ||
                !isCopyVisible;

            if (shouldSkip) {
                allInOneStep = 0; // Reset
                handleAllInOne(); // Immediately loop back to start
                return;
            }
        }

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

            // If we are moving to step 2, check if we should skip it immediately?
            // The next press handles it usually. But if user wants "All in One", maybe automatic?
            // No, the requirement implies manual cycling "repeatedly pressing".
            // However, if Step 2 is invalid (hidden), we should probably skip it NOW if we were automating.
            // But this function handles ONE press. 
            // If I just finished Step 1, I wait for next press.
            // Next press enters function. `allInOneStep` is 2.
            // It hits the `if (allInOneStep === 2)` block above.
            // Checks `shouldSkip`. If true -> resets to 0 -> calls `handleAllInOne()` -> executes Step 0.
            // This seems correct for the "loop back" behavior.
        } else {
            // Step 2 Execution
            if (chips.length === 0 || currentCopyIndex >= chips.length) {
                allInOneStep = 0;
                handleAllInOne();
                return;
            }

            await copyNextAvailableChar();

            if (currentCopyIndex >= chips.length) {
                // Cycle finished after this press?
                // Actually copyNextAvailableChar increments index.
                // If we reached end, next press should wrap to 0.
                // Current logic: sets `allInOneStep = 0`.
                // User has to press AGAIN to do Step 0.
                // Requirement: "copy complete available... press again -> back to first".
                // So setting allInOneStep = 0 is correct.
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
        const inputEl = document.getElementById('alertInput');
        const okBtn = document.getElementById('alertOkBtn');
        const closeBtn = document.getElementById('alertCloseBtn');
        const backdrop = modal.querySelector('.settings-backdrop');

        if (!modal) {
            alert(msg); // Fallback
            if (callback) callback();
            return;
        }

        // Cancel previous closing animation
        modal.classList.remove('closing');
        const openId = Date.now();
        modal.dataset.openId = openId;

        if (inputEl) inputEl.classList.add('hidden');

        titleEl.textContent = title;
        msgEl.textContent = msg;
        modal.classList.remove('hidden');

        const closeModal = () => {
             // Only close if we are still the relevant session
            if (modal.dataset.openId != openId) return;
            
            modal.classList.add('closing');
            modal.addEventListener('animationend', () => {
                // If ID changed during animation, it means a new dialog opened
                if (modal.dataset.openId != openId) return;
                
                modal.classList.remove('hidden');
                modal.classList.remove('closing');
                modal.classList.add('hidden'); // Ensure hidden is back
                if (callback) callback();
            }, { once: true });
        };

        const cancelBtn = document.getElementById('alertCancelBtn');
        if (cancelBtn) cancelBtn.classList.add('hidden'); // Ensure hidden for alert

        const newOk = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        newOk.addEventListener('click', closeModal);

        const newClose = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newClose, closeBtn);
        newClose.addEventListener('click', closeModal);

        const newBackdrop = backdrop.cloneNode(true);
        backdrop.parentNode.replaceChild(newBackdrop, backdrop);
    };

    // 自定义 Confirm 功能
    window.showCustomConfirm = function (msg, onConfirm, onCancel = null, title = '确认', confirmText = '确定', cancelText = '取消') {
        const modal = document.getElementById('alertModal');
        const titleEl = document.getElementById('alertTitle');
        const msgEl = document.getElementById('alertMessage');
        const inputEl = document.getElementById('alertInput');
        const okBtn = document.getElementById('alertOkBtn');
        const cancelBtn = document.getElementById('alertCancelBtn');
        const closeBtn = document.getElementById('alertCloseBtn');
        const backdrop = modal.querySelector('.settings-backdrop');

        if (!modal) {
            if (confirm(msg)) {
                if (onConfirm) onConfirm();
            } else {
                if (onCancel) onCancel();
            }
            return;
        }

        // Cancel previous closing animation
        modal.classList.remove('closing');
        const openId = Date.now();
        modal.dataset.openId = openId;

        if (inputEl) inputEl.classList.add('hidden');

        titleEl.textContent = title;
        msgEl.textContent = msg;
        okBtn.textContent = confirmText;
        if (cancelBtn) {
            cancelBtn.textContent = cancelText;
            cancelBtn.classList.remove('hidden');
        }
        modal.classList.remove('hidden');

        const closeModal = () => {
             // Only close if we are still the relevant session
            if (modal.dataset.openId != openId) return;

            modal.classList.add('closing');
            modal.addEventListener('animationend', () => {
                if (modal.dataset.openId != openId) return;

                modal.classList.remove('hidden');
                modal.classList.remove('closing');
                modal.classList.add('hidden');
            }, { once: true });
        };

        // Reset OK Button
        const newOk = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        newOk.addEventListener('click', () => {
            closeModal();
            if (onConfirm) onConfirm();
        });

        // Reset Cancel Button
        if (cancelBtn) {
            const newCancel = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
            newCancel.addEventListener('click', () => {
                closeModal();
                if (onCancel) onCancel();
            });
        }

        // Reset Close Button (treat as cancel)
        const newClose = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newClose, closeBtn);
        newClose.addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });

        // Reset Backdrop (treat as cancel, if you want click outside to close)
        // Currently existing alert doesn't close on backdrop click? 
        // Let's implement backdrop close same as alert but triggering cancel?
        // Alert implementation doesn't seem to have listener on backdrop?
        // Ah, `newBackdrop` was created but no listener added in `showCustomAlert`.
        // I'll leave it as is for consistency, or maybe I should add it?
        // Let's just clone it to clear listeners.
        const newBackdrop = backdrop.cloneNode(true);
        backdrop.parentNode.replaceChild(newBackdrop, backdrop);
    };

    // 自定义 Prompt 功能
    window.showCustomPrompt = function (msg, defaultValue = '', onConfirm, onCancel = null, title = '输入', confirmText = '确定', cancelText = '取消') {
        const modal = document.getElementById('alertModal');
        const titleEl = document.getElementById('alertTitle');
        const msgEl = document.getElementById('alertMessage');
        const inputEl = document.getElementById('alertInput');
        const okBtn = document.getElementById('alertOkBtn');
        const cancelBtn = document.getElementById('alertCancelBtn');
        const closeBtn = document.getElementById('alertCloseBtn');
        const backdrop = modal.querySelector('.settings-backdrop');

        if (!modal) {
            const result = prompt(msg, defaultValue);
            if (result !== null) {
                if (onConfirm) onConfirm(result);
            } else {
                if (onCancel) onCancel();
            }
            return;
        }

        // Cancel previous closing animation
        modal.classList.remove('closing');
        const openId = Date.now();
        modal.dataset.openId = openId;

        titleEl.textContent = title;
        msgEl.textContent = msg;
        okBtn.textContent = confirmText;
        
        if (inputEl) {
            inputEl.value = defaultValue;
            inputEl.classList.remove('hidden');
            // Give focus after a tick to ensure visibility
            setTimeout(() => inputEl.focus(), 50);
        }

        if (cancelBtn) {
            cancelBtn.textContent = cancelText;
            cancelBtn.classList.remove('hidden');
        }
        
        modal.classList.remove('hidden');

        const closeModal = () => {
             // Only close if we are still the relevant session
            if (modal.dataset.openId != openId) return;

            modal.classList.add('closing');
            modal.addEventListener('animationend', () => {
                if (modal.dataset.openId != openId) return;

                modal.classList.remove('hidden');
                modal.classList.remove('closing');
                modal.classList.add('hidden');
                if (inputEl) inputEl.value = ''; // Clean up
            }, { once: true });
        };

        // Reset OK Button
        const newOk = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        newOk.addEventListener('click', () => {
            const currentInput = document.getElementById('alertInput');
            const val = currentInput ? currentInput.value : '';
            closeModal();
            if (onConfirm) onConfirm(val);
        });

        // Reset Cancel Button
        if (cancelBtn) {
            const newCancel = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
            newCancel.addEventListener('click', () => {
                closeModal();
                if (onCancel) onCancel();
            });
        }
        
        // Reset Close Button
        const newClose = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newClose, closeBtn);
        newClose.addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });

         // Reset Backdrop
        const newBackdrop = backdrop.cloneNode(true);
        backdrop.parentNode.replaceChild(newBackdrop, backdrop);

        // Enter key support
        if (inputEl) {
             // Clone input to remove old listeners
            const newInput = inputEl.cloneNode(true);
            inputEl.parentNode.replaceChild(newInput, inputEl);
            newInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    newOk.click();
                } else if (e.key === 'Escape') {
                    if (cancelBtn) cancelBtn.click();
                    else newClose.click();
                }
            });
        }
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
