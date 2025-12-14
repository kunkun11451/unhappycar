class FangweiDrawer {
    constructor() {
        this.modes = {
            clone: { name: '克隆', enabled: true },
            swap: { name: '交换', enabled: true },
            // surprise: { name: '惊喜', enabled: true },
            // audience: { name: '观众', enabled: true },
            normal: { name: '普通', enabled: true },
            jushi: { name: '巨史', enabled: true }
        };
        this.types = ['等级', '命座', '攻击', '生命', '防御', '精通'];
        this.directions = ['上', '下', '左', '右', '左上', '左下', '右上', '右下'];
        this.points = ['1', '2', '3', '4', '5', '6'];
        this.players = ['1P', '2P', '3P', '4P'];
        // this.surpriseItems = ['禁A', '禁E', '禁Q', '禁五星武器'];
        this.elements = ['冰', '火', '水', '雷', '岩', '风', '草'];
    this.customModes = [];

        this.currentCustomDetail = { type: 'text', text: '', elements: [] };
        this.currentEditingMode = null;

        this.currentResults = {
            mode: '',
            modeDetail: '',
            direction: '',
            point: ''
        };

        this.settings = {
            enableMode: false,
            enablePoint: true,
            enableModeDetail: true,
            modes: {
                clone: true, swap: true, surprise: true,
                audience: true, normal: true, jushi: true
            }
        };

        this.history = [];
        this.maxHistory = 10;

        this.init();
    }

    init() {
        this.loadHistory();
    this.loadCustomModes();
        this.loadSettings();
        this.setupEventListeners();
        this.updateCustomModesList();
        this.showResults();
    }

    randomChoice(array) {
        if (array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }

    weightedRandomChoice(items, weights = null) {
        if (items.length === 0) return null;
        if (!weights || weights.length !== items.length) {
            return this.randomChoice(items);
        }
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < items.length; i++) {
            if (random < weights[i]) return items[i];
            random -= weights[i];
        }
        return items[items.length - 1];
    }

    generateSwapPairs() {
        const RANDOM_SWAP_PROBABILITY = 6859 / 40000;
        if (Math.random() < RANDOM_SWAP_PROBABILITY) {
            const selectedPlayer = this.randomChoice(this.players);
            return `${selectedPlayer}任选交换`;
        }
        const swapPatterns = ['1P⇄2P 3P⇄4P', '1P⇄3P 2P⇄4P', '1P⇄4P 2P⇄3P'];
        return this.randomChoice(swapPatterns);
    }

    // generateAudienceGroups() {
    //     const audience = [], participants = [];
    //     this.players.forEach(player => {
    //         if (Math.random() < 0.5) audience.push(player);
    //         else participants.push(player);
    //     });
    //     if (audience.length === 0) return '[参战 1P 2P 3P 4P]';
    //     if (participants.length === 0) return '[观众 1P 2P 3P 4P]';
    //     if (audience.length <= participants.length) {
    //         return `[观众 ${audience.join(' ')}] [参战 ${participants.join(' ')}]`;
    //     } else {
    //         return `[参战 ${participants.join(' ')}] [观众 ${audience.join(' ')}]`;
    //     }
    // }

    generateJushiElements() {
        const shuffled = [...this.elements].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3).join('');
    }

    drawMode() {
        const enabledModes = Object.keys(this.settings.modes).filter(mode => this.settings.modes[mode]);
        if (enabledModes.length === 0) {
            this.currentResults.mode = '';
            this.currentResults.modeDetail = '';
            this.updateModeDisplay();
            return;
        }
        const selectedMode = this.randomChoice(enabledModes);
        const customMode = this.customModes.find(m => m.id === selectedMode);
        if (customMode) {
            this.currentResults.mode = customMode.name;
            this.currentResults.modeDetail = this.settings.enableModeDetail ? this.generateCustomModeDetail(customMode) : '';
        } else {
            this.currentResults.mode = this.modes[selectedMode].name;
            if (this.settings.enableModeDetail) {
                switch (selectedMode) {
                    case 'clone': this.currentResults.modeDetail = `克隆 ${this.randomChoice(this.players)}`; break;
                    case 'swap': this.currentResults.modeDetail = this.generateSwapPairs(); break;
                    case 'surprise': this.currentResults.modeDetail = this.randomChoice(this.surpriseItems); break;
                    case 'audience': this.currentResults.modeDetail = this.generateAudienceGroups(); break;
                    case 'jushi': this.currentResults.modeDetail = this.generateJushiElements(); break;
                    default: this.currentResults.modeDetail = '';
                }
            } else {
                this.currentResults.modeDetail = '';
            }
        }
        this.updateModeDisplay();
        this.updateCopyText();
        this.addAnimation('modeResult');
    }

    drawDirection() {
        const type = this.randomChoice(this.types);
        const direction = this.randomChoice(this.directions);
        this.currentResults.direction = `${type}${direction}`;
        this.updateDirectionDisplay();
        this.updateCopyText();
        this.addAnimation('directionResult');
    }

    drawPoint() {
        this.currentResults.point = `${this.randomChoice(this.points)}点`;
        this.updatePointDisplay();
        this.updateCopyText();
        this.addAnimation('pointResult');
    }

    drawAll() {
        if (this.settings.enableMode) this.drawMode();
        this.drawDirection();
        if (this.settings.enablePoint) this.drawPoint();
        this.showResults();
        this.addToHistory();
    }

    showResults() {
        document.getElementById('resultContainer').style.display = 'block';
        this.updateModeDisplay();
        this.updateDirectionDisplay();
    this.updatePointDisplay();
        this.updateButtonVisibility();
        if (this.currentResults.direction || this.currentResults.mode || this.currentResults.point) {
            document.getElementById('copySection').style.display = 'block';
        } else {
            document.getElementById('copySection').style.display = 'none';
        }
    }

    updateButtonVisibility() {
        document.getElementById('drawModeBtn').style.display = this.settings.enableMode ? 'inline-block' : 'none';
        document.getElementById('drawPointBtn').style.display = this.settings.enablePoint ? 'inline-block' : 'none';
    }

    updateModeDisplay() {
        const modeElement = document.getElementById('modeResult');
        if (this.settings.enableMode && this.currentResults.mode) {
            modeElement.textContent = this.currentResults.modeDetail
                ? `${this.currentResults.mode}：${this.currentResults.modeDetail}`
                : this.currentResults.mode;
        } else {
            modeElement.textContent = '-';
        }
    applyResultMarquee(modeElement);
    }

    updateDirectionDisplay() {
        const el = document.getElementById('directionResult');
        el.textContent = this.currentResults.direction || '-';
        applyResultMarquee(el);
    }

    updatePointDisplay() {
        const el = document.getElementById('pointResult');
        el.textContent = (this.settings.enablePoint && this.currentResults.point) ? this.currentResults.point : '-';
        applyResultMarquee(el);
    }

    updateCopyText() {
        if (!this.currentResults.direction) return;
        let copyText = '';
        if (this.settings.enableMode && this.currentResults.mode) {
            copyText += this.currentResults.modeDetail
                ? `${this.currentResults.mode}：${this.currentResults.modeDetail} `
                : `${this.currentResults.mode} `;
        }
        copyText += this.currentResults.direction;
        if (this.settings.enablePoint && this.currentResults.point) {
            copyText += ` ${this.currentResults.point}`;
        }
        document.getElementById('copyText').textContent = copyText;
    }

    async copyResult() {
        const text = document.getElementById('copyText').textContent;
        const button = document.getElementById('copyButton');
        await this.copyToClipboard(text, button);
    }

    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            this.showCopySuccess(button);
        } catch (err) {
            this.fallbackCopy(text, button);
        }
    }

    showCopySuccess(button) {
        const originalText = button.textContent;
        button.textContent = '✅';
        button.classList.add('copy-success');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copy-success');
        }, 1500);
    }

    fallbackCopy(text, button) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            this.showCopySuccess(button);
        } catch (err) {
            showToast('复制失败');
        }
        document.body.removeChild(textArea);
    }

    addAnimation(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        element.style.transform = 'scale(1.1)';
        element.style.transition = 'transform 0.3s ease';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 300);
    }

    addToHistory() {
        const text = document.getElementById('copyText').textContent;
        if (text && text !== '-') {
            this.history.unshift({ result: text, time: new Date().toLocaleString() });
            if (this.history.length > this.maxHistory) {
                this.history = this.history.slice(0, this.maxHistory);
            }
            this.saveHistory();
        }
    }

    saveHistory() { localStorage.setItem('fangweiHistory', JSON.stringify(this.history)); }
    loadHistory() { this.history = JSON.parse(localStorage.getItem('fangweiHistory') || '[]'); }

    showHistory() {
        const modal = document.getElementById('historyModal');
        const content = document.getElementById('historyContent');
        if (this.history.length === 0) {
            content.innerHTML = '<p style="text-align: center; color: #999;">暂无历史记录</p>';
        } else {
            content.innerHTML = this.history.map(item => `
                <div class="history-item">
                    <div class="history-time">${item.time}</div>
                    <div class="history-result">${item.result}</div>
                </div>`).join('');
        }
        modal.style.display = 'flex';
    }

    hideHistory() { document.getElementById('historyModal').style.display = 'none'; }
    async clearHistory() {
        const ok = await showConfirm('确定要清空所有历史记录吗？');
        if (ok) {
            this.history = [];
            this.saveHistory();
            this.showHistory();
        }
    }

    // Custom Mode Management (simplified for brevity, full logic is complex)
    addCustomMode(name, detailConfig = null) {
        const inputName = name || document.getElementById('customModeName').value;
        if (!inputName || inputName.trim() === '') {
            showToast('请输入模式名称');
            return;
        }
        const id = 'custom_' + Date.now();
        const customMode = {
            id: id, name: inputName.trim(),
            detailConfig: detailConfig || { ...this.currentCustomDetail },
            enabled: true
        };
        this.customModes.push(customMode);
        this.settings.modes[id] = true;
        this.saveCustomModes();
        this.saveSettings();
        this.updateCustomModesList();
        this.updateSettingsUI();
        document.getElementById('customModeName').value = '';
        this.resetCustomDetail();
    }

    generateCustomModeDetail(customMode) {
        if (!customMode.detailConfig) return '';
        if (customMode.detailConfig.type === 'text') {
            return customMode.detailConfig.text || '';
        } else if (customMode.detailConfig.type === 'random') {
            const elements = customMode.detailConfig.elements || [];
            return this.randomChoice(elements) || '';
        }
        return '';
    }

    async removeCustomMode(id) {
        const ok = await showConfirm('确定要删除这个自定义模式吗？');
        if (ok) {
            this.customModes = this.customModes.filter(m => m.id !== id);
            delete this.settings.modes[id];
            this.saveCustomModes();
            this.saveSettings();
            this.updateCustomModesList();
            this.updateSettingsUI();
        }
    }

    editCustomMode(id) {
        const mode = this.customModes.find(m => m.id === id);
        if (mode) window.showCustomModeDetail(mode);
    }

    resetCustomDetail() { this.currentCustomDetail = { type: 'text', text: '', elements: [] }; }
    saveCustomModes() { localStorage.setItem('fangweiCustomModes', JSON.stringify(this.customModes)); }
    loadCustomModes() {
        this.customModes = JSON.parse(localStorage.getItem('fangweiCustomModes') || '[]');
        this.customModes.forEach(mode => {
            if (!this.settings.modes.hasOwnProperty(mode.id)) {
                this.settings.modes[mode.id] = true;
            }
        });
    }

    updateCustomModesList() {
        const container = document.getElementById('customModesList');
        if (!container) return;
        container.innerHTML = '';
        this.customModes.forEach(mode => {
            const isEnabled = this.settings.modes[mode.id] !== false;
            const item = document.createElement('div');
            item.className = `custom-mode-item${isEnabled ? '' : ' disabled'}`;
            let detailText = '普通模式';
            if (mode.detailConfig) {
                if (mode.detailConfig.type === 'text') detailText = `固定: ${mode.detailConfig.text || '无'}`;
                else detailText = `随机: ${mode.detailConfig.elements.length}项`;
            }
            item.innerHTML = `
                <div class="custom-mode-info">
                    <div class="custom-mode-name">
                        <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleCustomMode('${mode.id}', this.checked)">
                        ${mode.name}
                    </div>
                    <div class="custom-mode-detail">${detailText}</div>
                </div>
                <div class="custom-mode-actions">
                    <button class="btn-sm" onclick="fangweiDrawer.editCustomMode('${mode.id}')">✏️ 编辑</button>
                    <button class="btn-sm btn-danger" onclick="fangweiDrawer.removeCustomMode('${mode.id}')">删除</button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    saveSettings() { localStorage.setItem('fangweiSettings', JSON.stringify(this.settings)); }
    loadSettings() {
        const saved = localStorage.getItem('fangweiSettings');
        if (saved) {
            const loaded = JSON.parse(saved);
            this.settings = { ...this.settings, ...loaded };
            this.settings.modes = { ...this.settings.modes, ...(loaded.modes || {}) };
        }
        this.updateSettingsUI();
    }

    updateSettingsUI() {
        document.getElementById('enableMode').checked = this.settings.enableMode;
        document.getElementById('enablePoint').checked = this.settings.enablePoint;
        const enableModeDetailEl = document.getElementById('enableModeDetail');
        if (enableModeDetailEl) enableModeDetailEl.checked = this.settings.enableModeDetail;
        Object.keys(this.modes).forEach(key => {
            const checkbox = document.getElementById(`mode${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (checkbox) checkbox.checked = this.settings.modes[key] !== false;
        });
        this.updateDrawButtonsVisibility();
    }

    updateDrawButtonsVisibility() {
        const modeResultItem = document.getElementById('modeResultItem');
        const pointResultItem = document.getElementById('pointResultItem');
        const modeSettings = document.getElementById('modeSettings');
        const customModeSection = document.querySelector('.custom-mode-section');

        if (this.settings.enableMode) {
            modeResultItem.style.display = 'flex';
            modeSettings.style.display = 'block';
            customModeSection.style.display = 'block';
        } else {
            modeResultItem.style.display = 'none';
            modeSettings.style.display = 'none';
            customModeSection.style.display = 'none';
            this.currentResults.mode = '';
            this.currentResults.modeDetail = '';
            this.updateModeDisplay();
        }

        pointResultItem.style.display = this.settings.enablePoint ? 'flex' : 'none';
        if (!this.settings.enablePoint) {
            this.currentResults.point = '';
            this.updatePointDisplay();
        }

        this.updateCopyText();
    }

    setupEventListeners() {
        document.getElementById('enableMode').addEventListener('change', e => { this.settings.enableMode = e.target.checked; this.saveSettings(); this.updateDrawButtonsVisibility(); });
    document.getElementById('enablePoint').addEventListener('change', e => { this.settings.enablePoint = e.target.checked; this.saveSettings(); this.updateDrawButtonsVisibility(); });
    const enableModeDetailEl = document.getElementById('enableModeDetail');
    if (enableModeDetailEl) {
        enableModeDetailEl.addEventListener('change', e => {
            this.settings.enableModeDetail = e.target.checked;
            if (!this.settings.enableModeDetail) {
                this.currentResults.modeDetail = '';
            } else if (this.settings.enableMode && this.currentResults.mode) {
                // 重新生成当前模式详情
                const key = Object.keys(this.modes).find(k => this.modes[k].name === this.currentResults.mode);
                const custom = this.customModes.find(m => m.name === this.currentResults.mode);
                if (custom) {
                    this.currentResults.modeDetail = this.generateCustomModeDetail(custom);
                } else if (key) {
                    switch (key) {
                        case 'clone': this.currentResults.modeDetail = `克隆 ${this.randomChoice(this.players)}`; break;
                        case 'swap': this.currentResults.modeDetail = this.generateSwapPairs(); break;
                        case 'surprise': this.currentResults.modeDetail = this.randomChoice(this.surpriseItems); break;
                        case 'audience': this.currentResults.modeDetail = this.generateAudienceGroups(); break;
                        case 'jushi': this.currentResults.modeDetail = this.generateJushiElements(); break;
                        default: this.currentResults.modeDetail = '';
                    }
                }
            }
            this.saveSettings();
            this.updateModeDisplay();
            this.updateCopyText();
        });
    }
    // 事件抽取已移除

        Object.keys(this.modes).forEach(key => {
            const checkbox = document.getElementById(`mode${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (checkbox) checkbox.addEventListener('change', e => { this.settings.modes[key] = e.target.checked; this.saveSettings(); });
        });

        document.addEventListener('keydown', e => {
            const target = e.target || document.activeElement;
            const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
            const isEditable = target && (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select');
            // 空格触发全部抽取（避免在可编辑控件中触发）
            if (!isEditable && !e.ctrlKey && !e.metaKey && !e.altKey && (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar')) {
                e.preventDefault();
                this.drawAll();
                return;
            }
            // Ctrl+C 复制结果
            if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && document.getElementById('copySection').style.display !== 'none') {
                e.preventDefault(); this.copyResult();
            }
        });

        ['historyModal', 'customDetailModal', 'settingsModal'].forEach(id => {
            const overlay = document.getElementById(id);
            overlay.addEventListener('click', e => {
                if (e.target.id === id) {
                    // 统一走平滑关闭动画
                    overlay.classList.remove('show');
                    overlay.classList.add('hide');
                    setTimeout(() => {
                        overlay.style.display = 'none';
                        overlay.classList.remove('hide');
                    }, 180);
                }
            });
        });
    }
}

let fangweiDrawer;
// Global functions for HTML
function drawAll() { fangweiDrawer.drawAll(); }
function drawMode() { fangweiDrawer.drawMode(); }
function drawDirection() { fangweiDrawer.drawDirection(); }
function drawPoint() { fangweiDrawer.drawPoint(); }
function copyResult() { fangweiDrawer.copyResult(); }
function showHistory() { fangweiDrawer.showHistory(); }
function hideHistory() { fangweiDrawer.hideHistory(); }
function clearHistory() { fangweiDrawer.clearHistory(); }
function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
}
function hideSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('show');
    modal.classList.add('hide');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('hide');
    }, 180);
}
function addCustomMode() { fangweiDrawer.addCustomMode(); }
function toggleCustomMode(id, isChecked) {
    fangweiDrawer.settings.modes[id] = isChecked;
    fangweiDrawer.saveSettings();
    fangweiDrawer.updateCustomModesList();
}

// Custom Mode Detail Modal
function showCustomModeDetail(mode = null) {
    const modal = document.getElementById('customDetailModal');
    fangweiDrawer.currentEditingMode = mode;
    const config = mode ? mode.detailConfig : fangweiDrawer.currentCustomDetail;
    if (modal) {
        modal.style.display = 'flex';
    }
    requestAnimationFrame(() => {
        if (modal) {
            modal.classList.add('show');
            modal.classList.remove('hide');
        }
        const typeEl = document.getElementById('customModeType');
        const textEl = document.getElementById('customModeText');
        const elementsEl = document.getElementById('customModeElements');
        if (typeEl) typeEl.value = config.type || 'text';
        if (textEl) textEl.value = config.text || '';
        if (elementsEl) elementsEl.value = (config.elements || []).join('\n');
        updateCustomDetailDisplay();
    });
}

function hideCustomDetail() {
    const typeEl = document.getElementById('customModeType');
    const textEl = document.getElementById('customModeText');
    const elementsEl = document.getElementById('customModeElements');
    const detailConfig = {
        type: typeEl ? typeEl.value : 'text',
        text: textEl ? textEl.value.trim() : '',
        elements: elementsEl ? elementsEl.value.split('\n').map(s => s.trim()).filter(Boolean) : []
    };
    if (fangweiDrawer.currentEditingMode) {
        fangweiDrawer.currentEditingMode.detailConfig = detailConfig;
    } else {
        fangweiDrawer.currentCustomDetail = detailConfig;
    }
    fangweiDrawer.saveCustomModes();
    fangweiDrawer.updateCustomModesList();
    const modal = document.getElementById('customDetailModal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hide');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('hide');
        }, 180);
    }
}

function clearCustomDetail() {
    const textEl = document.getElementById('customModeText');
    const elementsEl = document.getElementById('customModeElements');
    if (textEl) textEl.value = '';
    if (elementsEl) elementsEl.value = '';
}

function updateCustomDetailDisplay() {
    const typeEl = document.getElementById('customModeType');
    const textSec = document.getElementById('textDetailSection');
    const randSec = document.getElementById('randomDetailSection');
    if (!typeEl || !textSec || !randSec) return;
    const type = typeEl.value;
    textSec.style.display = type === 'text' ? 'block' : 'none';
    randSec.style.display = type === 'random' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    fangweiDrawer = new FangweiDrawer();

    const themeToggle = document.getElementById('theme-toggle-checkbox');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme) {
        document.body.classList.add(currentTheme);
        if (currentTheme === 'dark-mode') {
            themeToggle.checked = true;
        }
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
        localStorage.setItem('theme', 'dark-mode');
    }

    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light-mode');
        }
    });

    const typeEl = document.getElementById('customModeType');
    if (typeEl) typeEl.addEventListener('change', updateCustomDetailDisplay);

    // 窗口尺寸变化时，重新评估滚动效果
    window.addEventListener('resize', () => {
        ['modeResult','directionResult','pointResult'].forEach(id => {
            const el = document.getElementById(id);
            if (el) applyResultMarquee(el);
        });
    });
});

// Toast 提示
function ensureToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, { duration = 1800, type = 'info' } = {}) {
    const container = ensureToastContainer();
    // 只允许同时存在一个提示
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    // 下一帧触发过渡
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 200);
    }, duration);
}

// 自定义确认弹窗（Promise 风格）
function showConfirm(message, { okText = '确定', cancelText = '取消' } = {}) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.id = 'confirmModalOverlay_' + Date.now();

        const content = document.createElement('div');
        content.className = 'modal-content';
        content.innerHTML = `
            <div class="modal-header">
                <h3>确认</h3>
                <button class="modal-close" aria-label="关闭">✕</button>
            </div>
            <div class="modal-body">
                <p style="margin: 0;">${message}</p>
            </div>
            <div class="modal-footer">
                <button class="modal-button btn-cancel">${cancelText}</button>
                <button class="modal-button">${okText}</button>
            </div>`;
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        // 置顶于其他弹窗上
        overlay.style.zIndex = 1200;

        // 动画：下一帧添加 show
        requestAnimationFrame(() => overlay.classList.add('show'));

        const cleanup = (result) => {
            overlay.classList.remove('show');
            overlay.classList.add('hide');
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve(result);
            }, 180);
        };

        // 事件绑定
        content.querySelector('.modal-close').addEventListener('click', () => cleanup(false));
        content.querySelector('.btn-cancel').addEventListener('click', () => cleanup(false));
        content.querySelector('.modal-footer .modal-button:last-child').addEventListener('click', () => cleanup(true));
        // 点击遮罩关闭（视为取消）
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
        // Esc 关闭
        const onKey = (e) => { if (e.key === 'Escape') { cleanup(false); window.removeEventListener('keydown', onKey); } };
        window.addEventListener('keydown', onKey);
    });
}

// 结果文本溢出时的左右往返滚动
function applyResultMarquee(el) {
    if (!el) return;
    // 清理旧结构
    const oldInner = el.querySelector('.marquee-inner');
    if (oldInner) {
        el.textContent = oldInner.textContent;
    }
    el.classList.remove('marquee');
    el.style.removeProperty('--marquee-shift');

    // 仅在移动端并且文本溢出时启用
    const isMobile = window.matchMedia('(max-width: 480px)').matches;
    if (!isMobile) return;

    // 稍后测量，确保样式已应用
    requestAnimationFrame(() => {
        const overflow = el.scrollWidth > el.clientWidth + 4; // 容差
        if (!overflow) return;
        const text = el.textContent;
        const shift = Math.min(0, el.clientWidth - el.scrollWidth - 12); // 往左负值位移
        el.classList.add('marquee');
        el.style.setProperty('--marquee-shift', `${shift}px`);
        el.innerHTML = `<span class="marquee-inner">${escapeHtml(text)}</span>`;
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
