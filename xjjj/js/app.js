/**
 * 角色抽取器 - 核心逻辑
 */
(function () {
    'use strict';

    // ===================== 状态管理 =====================
    const state = {
        availablePool: [],      // 可用角色池（角色名数组）
        usedCharacters: [],     // 已使用角色
        currentSelection: [],   // 当前待选区角色
        keepInRound: new Set(), // 本轮选中保留的角色（绿色边框，不加入已用池）
        currentAEQ: '',         // 当前 AEQ 排序（如 Q-E-A）
        currentNumberOrder: '', // 纯数字顺序（如 1-2-3-4）
        roundHistory: [],       // 历史记录 [{round: 1, usedChars: ['角色1', '角色2']}]
        currentRound: 0,        // 当前轮次
        undoStack: [],          // 撤销栈，存储之前的状态
        drawStats: {},          // 统计信息 { [name]: { drawn: 0, unused: 0 } }
        settings: {
            orderEnabled: true,
            theme: 'system'
        }
    };

    // ===================== 获取角色列表 =====================
    function getAllCharacterNames() {
        return Object.keys(window.characterData);
    }

    function getCharacterAvatar(name) {
        const char = window.characterData[name];
        return char ? char['头像'] : '';
    }

    // ===================== DOM 元素 =====================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const els = {
        charCount: $('#charCount'),
        drawBtn: $('#drawBtn'),
        availableCount: $('#availableCount'),
        totalCount: $('#totalCount'),
        selectionArea: $('#selectionArea'),
        usedArea: $('#usedArea'),
        copyCharacters: $('#copyCharacters'),
        copyAEQ: $('#copyAEQ'),
        copyOrder: $('#copyOrder'),
        orderRow: $('#orderRow'),
        copyBtn: $('#copyBtn'),
        settingsBtn: $('#settingsBtn'),
        settingsModal: $('#settingsModal'),
        modalUndoBtn: $('#modalUndoBtn'),
        orderToggle: $('#orderToggle'),
        themeSelect: $('#themeSelect'),
        modalResetBtn: $('#modalResetBtn'),
        alertModal: $('#alertModal'),
        alertTitle: $('#alertTitle'),
        alertMessage: $('#alertMessage'),
        alertOkBtn: $('#alertOkBtn'),
        alertCancelBtn: $('#alertCancelBtn'),
        alertCloseBtn: $('#alertCloseBtn'),
        toast: $('#toast'),
        lightThemeLink: $('#lightThemeLink'),
        historyTbody: $('#historyTbody'),
        statsTbody: $('#statsTbody'),
        tabBtns: $$('.tab-btn'),
        tabPanes: $$('.tab-pane'),
        rulesDetails: $('#rulesDetails')
    };

    const tabOrder = Array.from(els.tabBtns).map(btn => btn.dataset.tab);
    let currentTab = tabOrder.find(tab => document.getElementById(tab + 'Pane')?.classList.contains('active')) || tabOrder[0] || 'history';

    function init() {
        initCharacterPool();
        loadSettings();
        bindEvents();

        // 恢复设置 UI 状态
        els.orderToggle.checked = state.settings.orderEnabled;
        els.themeSelect.value = state.settings.theme;
        els.orderRow.style.display = state.settings.orderEnabled ? 'flex' : 'none';

        // 渲染 UI（使用加载的数据）
        renderSelectionArea();
        renderUsedArea();
        renderHistory();
        renderStatsTable();
        updateStats();
        updateCopyArea();
        applyTheme(state.settings.theme);
    }

    function buildEmptyStats() {
        const stats = {};
        getAllCharacterNames().forEach(name => {
            stats[name] = { drawn: 0, unused: 0 };
        });
        return stats;
    }

    function normalizeStats(saved) {
        const stats = buildEmptyStats();
        if (saved && typeof saved === 'object') {
            Object.keys(stats).forEach(name => {
                if (saved[name]) {
                    const s = saved[name];
                    stats[name] = {
                        drawn: Number(s.drawn) || 0,
                        unused: Number(s.unused) || 0
                    };
                }
            });
        }
        return stats;
    }

    function initCharacterPool() {
        state.availablePool = getAllCharacterNames();
        state.usedCharacters = [];
        state.currentSelection = [];
        state.keepInRound = new Set();
        state.currentAEQ = '';
        state.currentNumberOrder = '';
        state.roundHistory = [];
        state.currentRound = 0;
        state.undoStack = [];
        state.drawStats = buildEmptyStats();
    }

    function loadSettings() {
        try {
            const saved = localStorage.getItem('characterPickerSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                state.settings = { ...state.settings, ...parsed };
            }
            const savedPool = localStorage.getItem('characterPickerPool');
            if (savedPool) {
                const poolData = JSON.parse(savedPool);
                const allNames = getAllCharacterNames();
                state.availablePool = (poolData.available || allNames).filter(n => allNames.includes(n));
                state.usedCharacters = (poolData.used || []).filter(n => allNames.includes(n));
                state.roundHistory = poolData.history || [];
                state.currentRound = poolData.round || 0;
                // 恢复当前抽取数据
                state.currentSelection = (poolData.currentSelection || []).filter(n => allNames.includes(n));
                state.currentAEQ = poolData.currentAEQ || '';
                state.currentNumberOrder = poolData.currentNumberOrder || '';
                state.keepInRound = new Set(poolData.keepInRound || []);
                state.undoStack = poolData.undoStack || [];
                state.drawStats = normalizeStats(poolData.drawStats || {});
            } else {
                state.drawStats = buildEmptyStats();
            }
        } catch (e) {
            console.warn('加载设置失败', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem('characterPickerSettings', JSON.stringify(state.settings));
        } catch (e) {
            console.warn('保存设置失败', e);
        }
    }

    function savePool() {
        try {
            localStorage.setItem('characterPickerPool', JSON.stringify({
                available: state.availablePool,
                used: state.usedCharacters,
                history: state.roundHistory,
                round: state.currentRound,
                // 保存当前抽取数据
                currentSelection: state.currentSelection,
                currentAEQ: state.currentAEQ,
                currentNumberOrder: state.currentNumberOrder,
                keepInRound: Array.from(state.keepInRound),
                undoStack: state.undoStack,
                drawStats: state.drawStats
            }));
        } catch (e) {
            console.warn('保存角色池失败', e);
        }
    }

    // ===================== 事件绑定 =====================
    function bindEvents() {
        // 抽取按钮
        els.drawBtn.addEventListener('click', drawCharacters);

        // 复制按钮
        els.copyBtn.addEventListener('click', copyResult);

        // 设置弹窗
        els.settingsBtn.addEventListener('click', () => openModal(els.settingsModal));
        els.settingsModal.querySelector('.settings-close').addEventListener('click', () => closeModal(els.settingsModal));
        els.settingsModal.querySelector('.settings-backdrop').addEventListener('click', () => closeModal(els.settingsModal));

        // 撤销上一轮
        els.modalUndoBtn.addEventListener('click', () => {
            closeModal(els.settingsModal);
            if (state.undoStack.length === 0) {
                showToast('无法撤销到更早的状态');
                return;
            }
            showAlert('确认撤销', '确定要撤销本轮的抽取吗？', () => {
                undoLastRound();
            }, true);
        });

        // 设置中的重置按钮
        els.modalResetBtn.addEventListener('click', () => {
            closeModal(els.settingsModal);
            confirmReset();
        });

        // 设置项
        els.orderToggle.addEventListener('change', (e) => {
            state.settings.orderEnabled = e.target.checked;
            els.orderRow.style.display = e.target.checked ? 'flex' : 'none';
            saveSettings();
            updateCopyArea();
        });

        els.themeSelect.addEventListener('change', (e) => {
            state.settings.theme = e.target.value;
            applyTheme(e.target.value);
            saveSettings();
        });

        // Alert 弹窗
        els.alertCloseBtn.addEventListener('click', () => closeModal(els.alertModal));
        els.alertModal.querySelector('.settings-backdrop').addEventListener('click', () => closeModal(els.alertModal));

        // 标签页切换
        els.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                switchTab(tabName);
            });
        });

        // 规则展开/收起动画
        if (els.rulesDetails) {
            const summary = els.rulesDetails.querySelector('.rules-summary');
            let closeTimeout = null;

            summary.addEventListener('click', (e) => {
                e.preventDefault(); 

                if (closeTimeout) {
                    clearTimeout(closeTimeout);
                    closeTimeout = null;
                }

                const isOpen = els.rulesDetails.classList.contains('is-open');

                if (isOpen) {
                    els.rulesDetails.classList.remove('is-open');
                    closeTimeout = setTimeout(() => {
                        els.rulesDetails.removeAttribute('open');
                        closeTimeout = null;
                    }, 350);
                } else {
                    els.rulesDetails.setAttribute('open', '');
                    els.rulesDetails.offsetHeight; 
                    els.rulesDetails.classList.add('is-open');
                }
            });
        }
    }

    function switchTab(tabName) {
        if (tabName === currentTab) return;

        const currentIndex = tabOrder.indexOf(currentTab);
        const nextIndex = tabOrder.indexOf(tabName);
        const direction = nextIndex > currentIndex ? 'right' : 'left';

        els.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        els.tabPanes.forEach(pane => {
            pane.classList.remove('active', 'slide-in-left', 'slide-in-right');
        });

        const targetPane = document.getElementById(tabName + 'Pane');
        if (targetPane) {
            const slideClass = direction === 'right' ? 'slide-in-right' : 'slide-in-left';
            targetPane.classList.add('active', slideClass);
            const handle = () => {
                targetPane.classList.remove(slideClass);
                targetPane.removeEventListener('animationend', handle);
            };
            targetPane.addEventListener('animationend', handle);
        }

        currentTab = tabName;
    }

    // ===================== 抽取逻辑 =====================
    function drawCharacters() {
        const count = parseInt(els.charCount.value);

        // 保存当前状态快照到撤销栈
        state.undoStack.push({
            availablePool: [...state.availablePool],
            usedCharacters: [...state.usedCharacters],
            currentSelection: [...state.currentSelection],
            keepInRound: Array.from(state.keepInRound),
            currentAEQ: state.currentAEQ,
            currentNumberOrder: state.currentNumberOrder,
            roundHistory: JSON.parse(JSON.stringify(state.roundHistory)), // 深拷贝
            currentRound: state.currentRound,
            drawStats: JSON.parse(JSON.stringify(state.drawStats))
        });

        // 限制撤销栈大小（例如保留最近50次）
        if (state.undoStack.length > 50) {
            state.undoStack.shift();
        }

        // 处理上一轮：未选中（未保留）的角色加入已用池
        if (state.currentSelection.length > 0) {
            const usedThisRound = [];
            state.currentSelection.forEach(name => {
                if (!state.keepInRound.has(name)) {
                    const poolIndex = state.availablePool.indexOf(name);
                    if (poolIndex > -1) {
                        state.availablePool.splice(poolIndex, 1);
                        state.usedCharacters.push(name);
                        usedThisRound.push(name);
                    }
                }
            });
            // 统计：本轮未使用（被标记为“未使用/保留”）的角色
            state.keepInRound.forEach(name => {
                if (!state.drawStats[name]) {
                    state.drawStats[name] = { drawn: 0, unused: 0 };
                }
                state.drawStats[name].unused += 1;
            });
            // 记录历史
            if (usedThisRound.length > 0) {
                state.roundHistory.push({
                    round: state.currentRound,
                    usedChars: usedThisRound
                });
            }
            state.keepInRound.clear();
            savePool();
        }

        if (state.availablePool.length === 0) {
            showToast('角色池已空，请重置后再抽取');
            return;
        }

        if (state.availablePool.length < count) {
            showToast(`角色池剩余 ${state.availablePool.length} 个，不足 ${count} 个`);
            return;
        }

        // 增加轮次
        state.currentRound++;

        // 随机抽取角色
        const shuffled = [...state.availablePool].sort(() => Math.random() - 0.5);
        state.currentSelection = shuffled.slice(0, count);

        // 统计：本轮抽出的角色
        state.currentSelection.forEach(name => {
            if (!state.drawStats[name]) {
                state.drawStats[name] = { drawn: 0, unused: 0 };
            }
            state.drawStats[name].drawn += 1;
        });

        // 始终生成 AEQ 排序（格式：Q-E-A）
        state.currentAEQ = generateAEQOrder();

        // 如果开启选角顺序，生成数字顺序（格式：1-2-3-4）
        if (state.settings.orderEnabled) {
            state.currentNumberOrder = generateNumberOrder();
        } else {
            state.currentNumberOrder = '';
        }

        // 更新 UI
        renderSelectionArea();
        renderUsedArea();
        renderHistory();
        renderStatsTable();
        updateStats();
        updateCopyArea();

        // 保存到缓存
        savePool();

        // 同步高度
        setTimeout(syncPanelHeight, 100);
    }

    function generateAEQOrder() {
        const letters = ['A', 'E', 'Q'];
        const shuffled = [...letters].sort(() => Math.random() - 0.5);
        return shuffled.join('-');
    }

    function generateNumberOrder() {
        const numbers = [1, 2, 3, 4];
        const shuffledNumbers = [...numbers].sort(() => Math.random() - 0.5);
        return shuffledNumbers.join('-');
    }

    // 生成复制用的组合顺序（如 1Q-2E-3A-4）
    function generateCombinedOrder() {
        if (!state.currentAEQ || !state.currentNumberOrder) return '';

        const aeq = state.currentAEQ.split('-');
        const numbers = state.currentNumberOrder.split('-');

        const combined = [];
        for (let i = 0; i < 3; i++) {
            combined.push(`${numbers[i]}${aeq[i]}`);
        }
        combined.push(numbers[3]);

        return combined.join('-');
    }

    // ===================== 角色池管理 =====================
    function toggleKeep(name) {
        if (state.keepInRound.has(name)) {
            state.keepInRound.delete(name);
        } else {
            state.keepInRound.add(name);
        }
        // 只更新该卡片的样式，不重新渲染整个区域
        updateCardKeptState(name);
        // 保存到缓存
        savePool();
    }

    function updateCardKeptState(name) {
        const cards = els.selectionArea.querySelectorAll('.card');
        cards.forEach(card => {
            const cardName = card.querySelector('h3').textContent;
            if (cardName === name) {
                card.classList.toggle('card-kept', state.keepInRound.has(name));
            }
        });
    }

    function returnToPool(name) {
        const index = state.usedCharacters.indexOf(name);
        if (index > -1) {
            state.usedCharacters.splice(index, 1);
            state.availablePool.push(name);
        }

        savePool();
        renderUsedArea();
        updateStats();
    }

    function undoLastRound() {
        if (state.undoStack.length === 0) return;

        const prev = state.undoStack.pop();
        state.availablePool = [...prev.availablePool];
        state.usedCharacters = [...prev.usedCharacters];
        state.currentSelection = [...prev.currentSelection];
        state.keepInRound = new Set(prev.keepInRound);
        state.currentAEQ = prev.currentAEQ;
        state.currentNumberOrder = prev.currentNumberOrder;
        state.roundHistory = JSON.parse(JSON.stringify(prev.roundHistory));
        state.currentRound = prev.currentRound;
        state.drawStats = JSON.parse(JSON.stringify(prev.drawStats || buildEmptyStats()));

        savePool();
        renderSelectionArea();
        renderUsedArea();
        renderHistory();
        renderStatsTable();
        updateStats();
        updateCopyArea();
        showToast('已撤销');
    }

    function resetPool() {
        state.availablePool = getAllCharacterNames();
        state.usedCharacters = [];
        state.currentSelection = [];
        state.keepInRound.clear();
        state.currentAEQ = '';
        state.currentNumberOrder = '';
        state.roundHistory = [];
        state.currentRound = 0;
        state.undoStack = [];
        state.drawStats = buildEmptyStats();

        savePool();
        renderSelectionArea();
        renderUsedArea();
        renderHistory();
        renderStatsTable();
        updateCopyArea();
        updateStats();
        showToast('角色池已重置');
    }

    function confirmReset() {
        showAlert('确认重置', '确定要重置游戏吗？', () => {
            resetPool();
        }, true);
    }

    // ===================== UI 渲染 =====================
    function updateUI() {
        els.orderToggle.checked = state.settings.orderEnabled;
        els.themeSelect.value = state.settings.theme;
        els.orderRow.style.display = state.settings.orderEnabled ? 'flex' : 'none';

        renderSelectionArea();
        renderUsedArea();
        renderHistory();
        renderStatsTable();
        updateStats();
        updateCopyArea();

        setTimeout(syncPanelHeight, 50);
    }

    function renderSelectionArea() {
        els.selectionArea.innerHTML = '';

        if (state.currentSelection.length === 0) {
            els.selectionArea.innerHTML = '<div class="empty-hint">点击"抽取角色"开始</div>';
            return;
        }

        state.currentSelection.forEach((name, index) => {
            const card = createCharacterCard(name, index, true);
            els.selectionArea.appendChild(card);
        });
    }

    function renderUsedArea() {
        els.usedArea.innerHTML = '';

        if (state.usedCharacters.length === 0) {
            els.usedArea.innerHTML = '<div class="empty-hint">暂无已使用角色</div>';
            return;
        }

        state.usedCharacters.forEach((name, index) => {
            const card = createCharacterCard(name, index, false);
            els.usedArea.appendChild(card);
        });
    }

    function renderHistory() {
        els.historyTbody.innerHTML = '';

        if (state.roundHistory.length === 0) {
            els.historyTbody.innerHTML = '<tr class="empty"><td colspan="2">暂无记录</td></tr>';
            return;
        }

        // 显示历史记录
        state.roundHistory.forEach(record => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${record.round}</td>
                <td>${record.usedChars.join('、')}</td>
            `;
            els.historyTbody.appendChild(tr);
        });
    }

    function renderStatsTable() {
        els.statsTbody.innerHTML = '';

        const names = getAllCharacterNames();
        if (names.length === 0) {
            els.statsTbody.innerHTML = '<tr class="empty"><td colspan="2">暂无统计</td></tr>';
            return;
        }

        const rows = names.map(name => {
            const stats = state.drawStats[name] || { drawn: 0, unused: 0 };
            return { name, unused: stats.unused || 0 };
        }).filter(item => item.unused > 0);

        if (rows.length === 0) {
            els.statsTbody.innerHTML = '<tr class="empty"><td colspan="2">暂无统计</td></tr>';
            return;
        }

        rows.sort((a, b) => {
            if (b.unused !== a.unused) return b.unused - a.unused;
            return a.name.localeCompare(b.name, 'zh-Hans');
        });

        rows.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${item.unused}</td>
            `;
            els.statsTbody.appendChild(tr);
        });
    }

    function createCharacterCard(name, index, isSelection) {
        const card = document.createElement('div');
        card.className = isSelection ? 'card card-appear' : 'card';
        card.style.setProperty('--stagger', index);

        const isKept = state.keepInRound.has(name);
        if (isSelection && isKept) {
            card.classList.add('card-kept');
        }

        const avatar = getCharacterAvatar(name);

        card.innerHTML = `
            ${avatar ? `<img class="avatar" src="${avatar}" alt="${name}" loading="lazy">` : '<div class="avatar-placeholder"></div>'}
            <h3>${name}</h3>
            ${!isSelection ? `<button class="btn-return" title="返回随机池">返回</button>` : ''}
        `;

        if (isSelection) {
            card.addEventListener('click', () => {
                toggleKeep(name);
            });
        } else {
            card.querySelector('.btn-return').addEventListener('click', (e) => {
                e.stopPropagation();
                returnToPool(name);
            });
        }

        return card;
    }

    function updateStats() {
        els.availableCount.textContent = state.availablePool.length;
        els.totalCount.textContent = getAllCharacterNames().length;
    }

    function updateCopyArea() {
        if (state.currentSelection.length === 0) {
            els.copyCharacters.textContent = '-';
            els.copyAEQ.textContent = '-';
            els.copyOrder.textContent = '-';
            return;
        }

        els.copyCharacters.textContent = state.currentSelection.join(' ');
        // 显示 AEQ 顺序（格式：Q-E-A）
        els.copyAEQ.textContent = state.currentAEQ || '-';
        // 显示选角顺序（格式：1-2-3-4）
        els.copyOrder.textContent = state.currentNumberOrder || '-';
    }

    // ===================== 复制功能 =====================
    function copyResult() {
        if (state.currentSelection.length === 0) {
            showToast('暂无可复制内容');
            return;
        }

        // 复制
        let text = state.currentSelection.join(' ');

        if (state.settings.orderEnabled && state.currentNumberOrder) {
            // 组合
            text += ' ' + generateCombinedOrder();
        }

        navigator.clipboard.writeText(text).then(() => {
            showToast('已复制到剪贴板');
            els.copyBtn.classList.add('success');
            setTimeout(() => els.copyBtn.classList.remove('success'), 1500);
        }).catch(() => {
            showToast('复制失败');
        });
    }

    // ===================== 主题切换 =====================
    function applyTheme(theme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        let isDark = theme === 'dark' || (theme === 'system' && prefersDark);

        if (isDark) {
            document.body.classList.remove('light-theme');
            els.lightThemeLink.disabled = true;
        } else {
            document.body.classList.add('light-theme');
            els.lightThemeLink.disabled = false;
        }
    }

    // ===================== 弹窗管理 =====================
    function openModal(modal) {
        modal.classList.remove('hidden', 'closing');
        document.body.classList.add('modal-open');
    }

    function closeModal(modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('closing');
            document.body.classList.remove('modal-open');
        }, 280);
    }

    function showAlert(title, message, onConfirm, showCancel = false) {
        els.alertTitle.textContent = title;
        els.alertMessage.textContent = message;
        els.alertCancelBtn.classList.toggle('hidden', !showCancel);

        const handleConfirm = () => {
            closeModal(els.alertModal);
            els.alertOkBtn.removeEventListener('click', handleConfirm);
            els.alertCancelBtn.removeEventListener('click', handleCancel);
            if (onConfirm) onConfirm();
        };

        const handleCancel = () => {
            closeModal(els.alertModal);
            els.alertOkBtn.removeEventListener('click', handleConfirm);
            els.alertCancelBtn.removeEventListener('click', handleCancel);
        };

        els.alertOkBtn.addEventListener('click', handleConfirm);
        els.alertCancelBtn.addEventListener('click', handleCancel);

        openModal(els.alertModal);
    }

    function showToast(message) {
        els.toast.textContent = message;
        els.toast.classList.add('show');
        setTimeout(() => {
            els.toast.classList.remove('show');
        }, 2500);
    }

    // ===================== 启动 =====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
