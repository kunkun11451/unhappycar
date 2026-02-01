class FangweiDrawer {
    constructor() {
        this.modes = {
            clone: { name: '克隆', enabled: true },
            swap: { name: '交换', enabled: true },
            surprise: { name: '惊喜', enabled: true },
            audience: { name: '观众', enabled: true },
            normal: { name: '普通', enabled: true },
            jushi: { name: '巨史', enabled: true }
        };
        this.types = ['等级', '命座', '攻击', '生命', '防御', '精通'];
        this.directions = ['上', '下', '左', '右', '左上', '左下', '右上', '右下'];
        this.points = ['1', '2', '3', '4', '5', '6'];
        this.players = ['1P', '2P', '3P', '4P'];
        this.surpriseItems = ['禁A', '禁E', '禁Q', '禁五星武器'];
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
            // 点数范围设置（默认 1-6）
            pointMin: 1,
            pointMax: 6,
            modes: {
                clone: true, swap: true, surprise: true,
                audience: true, normal: true, jushi: true
            }
        };


        this.init();
    }

    init() {
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

    generateAudienceGroups() {
        const audience = [], participants = [];
        this.players.forEach(player => {
            if (Math.random() < 0.5) audience.push(player);
            else participants.push(player);
        });
        if (audience.length === 0) return '[参战 1P 2P 3P 4P]';
        if (participants.length === 0) return '[观众 1P 2P 3P 4P]';
        if (audience.length <= participants.length) {
            return `[观众 ${audience.join(' ')}] [参战 ${participants.join(' ')}]`;
        } else {
            return `[参战 ${participants.join(' ')}] [观众 ${audience.join(' ')}]`;
        }
    }

    generateJushiElements() {
        const shuffled = [...this.elements].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 3).join('');
    }

    drawMode() {
        const enabledModes = Object.keys(this.settings.modes).filter(mode => this.settings.modes[mode]);
        const validModes = enabledModes.filter(mode => this.modes.hasOwnProperty(mode) || this.customModes.some(m => m.id === mode));
        if (validModes.length === 0) {
            this.currentResults.mode = '';
            this.currentResults.modeDetail = '';
            this.updateModeDisplay();
            return;
        }
        const selectedMode = this.randomChoice(validModes);
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
        // 使用设置中的点数范围进行抽取（含端点）
        const min = Math.max(1, Math.min(Number(this.settings.pointMin) || 1, Number(this.settings.pointMax) || 1));
        const max = Math.max(min, Number(this.settings.pointMax) || min);
        const value = Math.floor(Math.random() * (max - min + 1)) + min;
        this.currentResults.point = `${value}点`;
        this.updatePointDisplay();
        this.updateCopyText();
        this.addAnimation('pointResult');
    }

    async drawAll() {
        if (this.settings.enableMode) this.drawMode();
        this.drawDirection();
        if (this.settings.enablePoint) this.drawPoint();
        this.showResults();

        // 抽取完成后自动复制（如果有可复制内容）
        const copySection = document.getElementById('copySection');
        const copyTextEl = document.getElementById('copyText');
        const text = copyTextEl ? (copyTextEl.textContent || '').trim() : '';
        if (copySection && copySection.style.display !== 'none' && text) {
            await this.copyResult();
        }
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
        const textEl = document.getElementById('copyText');
        const button = document.getElementById('copyButton');
        const text = textEl ? (textEl.textContent || '').trim() : '';
        if (!text) {
            showToast('无可复制的内容', { type: 'info' });
            return;
        }
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
        if (!button) return;
        // 只有在第一次进入成功状态时保存原始文本
        if (!button.dataset.copyActive) {
            button.dataset.copyActive = '1';
            button.dataset.copyOriginalText = button.textContent || '';
        }
        // 清理已有超时，防止多次触发导致恢复到错误状态
        if (button._copyTimeout) {
            clearTimeout(button._copyTimeout);
        }
        button.textContent = '✅';
        // 保持基础类 `copy-button`，并添加 success 状态
        if (!button.classList.contains('copy-button')) button.classList.add('copy-button');
        button.classList.add('copy-success');
        button._copyTimeout = setTimeout(() => {
            button.textContent = button.dataset.copyOriginalText || '';
            button.classList.remove('copy-success');
            delete button.dataset.copyActive;
            delete button.dataset.copyOriginalText;
            delete button._copyTimeout;
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



    // Custom Mode Management
    addCustomMode(name, detailConfig = null) {
        if (!name || name.trim() === '') {
            showToast('请输入模式名称');
            return;
        }
        const id = 'custom_' + Date.now();
        const customMode = {
            id: id,
            name: name.trim(),
            detailConfig: detailConfig || { type: 'text', text: '', elements: [] },
            enabled: true
        };
        this.customModes.push(customMode);
        this.settings.modes[id] = true;
        this.saveCustomModes();
        this.saveSettings();
        this.updateCustomModesList();
        this.updateSettingsUI();
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
        const container = document.getElementById('customModesContainer');
        if (!container) return;
        container.innerHTML = '';
        this.customModes.forEach(mode => {
            const isEnabled = this.settings.modes[mode.id] !== false;
            let detailText = '自定义模式';
            if (mode.detailConfig) {
                if (mode.detailConfig.type === 'text') {
                    detailText = mode.detailConfig.text || '固定文本模式';
                } else {
                    detailText = `随机抽取 ${mode.detailConfig.elements?.length || 0} 项`;
                }
            }
            const card = document.createElement('div');
            card.className = 'mode-option-card custom-mode-card';
            card.innerHTML = `
                <div class="mode-option-info">
                    <div class="mode-option-title">${mode.name}<span class="custom-mode-badge">自定义</span></div>
                    <div class="mode-option-desc">${detailText}</div>
                </div>
                <button class="mode-edit-btn" onclick="editCustomMode('${mode.id}')" title="编辑">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <label class="toggle-switch toggle-switch-sm">
                    <input type="checkbox" id="${mode.id}" ${isEnabled ? 'checked' : ''} onchange="toggleCustomMode('${mode.id}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            `;
            container.appendChild(card);
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

        // 根据enableModeDetail设置初始化mode-options-list的no-detail类
        const modeOptionsList = document.querySelector('.mode-options-list');
        if (modeOptionsList) {
            if (this.settings.enableModeDetail) {
                modeOptionsList.classList.remove('no-detail');
            } else {
                modeOptionsList.classList.add('no-detail');
            }
        }

        // 恢复点数范围 UI 值
        const pointMinEl = document.getElementById('pointMin');
        const pointMaxEl = document.getElementById('pointMax');
        if (pointMinEl) pointMinEl.value = Number(this.settings.pointMin) || 1;
        if (pointMaxEl) pointMaxEl.value = Number(this.settings.pointMax) || 6;
        Object.keys(this.modes).forEach(key => {
            const checkbox = document.getElementById(`mode${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (checkbox) checkbox.checked = this.settings.modes[key] !== false;
        });
        this.updateDrawButtonsVisibility();
    }

    updateDrawButtonsVisibility() {
        const modeResultItem = document.getElementById('modeResultItem');
        const pointResultItem = document.getElementById('pointResultItem');
        const modeSettingsArrow = document.getElementById('modeSettingsArrow');
        const pointSettingsArrow = document.getElementById('pointSettingsArrow');
        const modeSettingsExpand = document.getElementById('modeSettingsExpand');
        const pointSettingsExpand = document.getElementById('pointSettingsExpand');

        // Mode settings
        if (this.settings.enableMode) {
            modeResultItem.style.display = 'flex';
            if (modeSettingsArrow) {
                modeSettingsArrow.style.display = 'flex';
                // 如果之前是展开状态，保持展开；否则保持收起
            }
        } else {
            modeResultItem.style.display = 'none';
            if (modeSettingsArrow) {
                modeSettingsArrow.style.display = 'none';
                modeSettingsArrow.classList.remove('rotated');
            }
            if (modeSettingsExpand) {
                modeSettingsExpand.classList.remove('expanded');
            }
            this.currentResults.mode = '';
            this.currentResults.modeDetail = '';
            this.updateModeDisplay();
        }

        // Point settings
        pointResultItem.style.display = this.settings.enablePoint ? 'flex' : 'none';

        if (this.settings.enablePoint) {
            if (pointSettingsArrow) {
                pointSettingsArrow.style.display = 'flex';
            }
        } else {
            if (pointSettingsArrow) {
                pointSettingsArrow.style.display = 'none';
                pointSettingsArrow.classList.remove('rotated');
            }
            if (pointSettingsExpand) {
                pointSettingsExpand.classList.remove('expanded');
            }
            this.currentResults.point = '';
            this.updatePointDisplay();
        }

        this.updateCopyText();
    }

    toggleSettingsExpand(expandId, arrowId) {
        const expandEl = document.getElementById(expandId);
        const arrowEl = document.getElementById(arrowId);
        if (expandEl) {
            expandEl.classList.toggle('expanded');
        }
        if (arrowEl) {
            arrowEl.classList.toggle('rotated');
        }
    }

    setupEventListeners() {
        document.getElementById('enableMode').addEventListener('change', e => { this.settings.enableMode = e.target.checked; this.saveSettings(); this.updateDrawButtonsVisibility(); });
        document.getElementById('enablePoint').addEventListener('change', e => { this.settings.enablePoint = e.target.checked; this.saveSettings(); this.updateDrawButtonsVisibility(); });

        // 点数范围输入监听
        const pointMinEl = document.getElementById('pointMin');
        const pointMaxEl = document.getElementById('pointMax');
        if (pointMinEl && pointMaxEl) {
            pointMinEl.addEventListener('change', e => {
                let min = Number(e.target.value) || 1;
                let max = Number(pointMaxEl.value) || min;
                if (min < 1) min = 1;
                if (min > 999) min = 999;
                if (min > max) { max = min; pointMaxEl.value = max; }
                this.settings.pointMin = min;
                this.settings.pointMax = max;
                this.saveSettings();
            });
            pointMaxEl.addEventListener('change', e => {
                let max = Number(e.target.value) || 1;
                let min = Number(pointMinEl.value) || max;
                if (max < 1) max = 1;
                if (max > 999) max = 999;
                if (max < min) { min = max; pointMinEl.value = min; }
                this.settings.pointMin = min;
                this.settings.pointMax = max;
                this.saveSettings();
            });
        }

        const enableModeDetailEl = document.getElementById('enableModeDetail');
        if (enableModeDetailEl) {
            enableModeDetailEl.addEventListener('change', e => {
                this.settings.enableModeDetail = e.target.checked;

                // 切换mode-options-list的no-detail类
                const modeOptionsList = document.querySelector('.mode-options-list');
                if (modeOptionsList) {
                    if (this.settings.enableModeDetail) {
                        modeOptionsList.classList.remove('no-detail');
                    } else {
                        modeOptionsList.classList.add('no-detail');
                    }
                }

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

        ['customModeModal', 'settingsModal'].forEach(id => {
            const overlay = document.getElementById(id);
            if (!overlay) return;
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
function toggleSettingsExpand(expandId, arrowId) {
    if (fangweiDrawer) fangweiDrawer.toggleSettingsExpand(expandId, arrowId);
}
function addCustomMode() { fangweiDrawer.addCustomMode(); }
function toggleCustomMode(id, isChecked) {
    fangweiDrawer.settings.modes[id] = isChecked;
    fangweiDrawer.saveSettings();
    fangweiDrawer.updateCustomModesList();
}

// 规则展开/收起切换
function toggleRulesExpand() {
    const rulesExpand = document.getElementById('rulesExpand');
    const rulesArrow = document.getElementById('rulesExpandArrow');
    if (rulesExpand) {
        rulesExpand.classList.toggle('expanded');
    }
    if (rulesArrow) {
        rulesArrow.classList.toggle('rotated');
    }
}

// 主题管理
function applyTheme(theme) {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme); // 辅助属性

    let effectiveTheme = theme;
    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = prefersDark ? 'dark' : 'light';
    }

    if (effectiveTheme === 'dark' || effectiveTheme === 'dark-mode') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    // 更新选中状态
    const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
    if (radio) radio.checked = true;
}

function initTheme() {
    // 读取旧的设置进行迁移
    let theme = localStorage.getItem('theme');
    if (theme === 'dark-mode') theme = 'dark';
    if (theme === 'light-mode') theme = 'light';

    if (!theme) theme = 'system';

    applyTheme(theme);
}

// 当前正在编辑的模式ID（null表示新增模式）
let currentEditingModeId = null;

// 显示添加自定义模式弹窗
function showAddCustomModeModal() {
    currentEditingModeId = null;
    document.getElementById('customModeModalTitle').textContent = '添加自定义模式';
    document.getElementById('customModeNameInput').value = '';
    document.getElementById('customModeText').value = '';
    document.querySelector('input[name="detailType"][value="text"]').checked = true;
    updateDetailTypeDisplay();
    setRandomElements([]);
    document.getElementById('deleteCustomModeBtn').style.display = 'none';

    const modal = document.getElementById('customModeModal');
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
}

// 编辑自定义模式
function editCustomMode(id) {
    const mode = fangweiDrawer.customModes.find(m => m.id === id);
    if (!mode) return;

    currentEditingModeId = id;
    document.getElementById('customModeModalTitle').textContent = '编辑自定义模式';
    document.getElementById('customModeNameInput').value = mode.name;

    const config = mode.detailConfig || { type: 'text', text: '', elements: [] };
    document.querySelector(`input[name="detailType"][value="${config.type}"]`).checked = true;
    document.getElementById('customModeText').value = config.text || '';
    setRandomElements(config.elements || []);
    updateDetailTypeDisplay();
    document.getElementById('deleteCustomModeBtn').style.display = 'inline-flex';

    const modal = document.getElementById('customModeModal');
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));
}

// 隐藏自定义模式弹窗
function hideCustomModeModal() {
    const modal = document.getElementById('customModeModal');
    modal.classList.remove('show');
    modal.classList.add('hide');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('hide');
    }, 180);
}

// 保存自定义模式
function saveCustomMode() {
    const name = document.getElementById('customModeNameInput').value.trim();
    if (!name) {
        showToast('请输入模式名称');
        return;
    }

    const detailType = document.querySelector('input[name="detailType"]:checked').value;
    const detailConfig = {
        type: detailType,
        text: document.getElementById('customModeText').value.trim(),
        elements: getRandomElements()
    };

    if (currentEditingModeId) {
        // 编辑模式
        const mode = fangweiDrawer.customModes.find(m => m.id === currentEditingModeId);
        if (mode) {
            mode.name = name;
            mode.detailConfig = detailConfig;
            fangweiDrawer.saveCustomModes();
            fangweiDrawer.updateCustomModesList();
            showToast('模式已更新');
        }
    } else {
        // 新增模式
        fangweiDrawer.addCustomMode(name, detailConfig);
        showToast('模式已添加');
    }

    hideCustomModeModal();
}

// 删除自定义模式
async function deleteCustomMode() {
    if (!currentEditingModeId) return;
    const ok = await showConfirm('确定要删除这个自定义模式吗？');
    if (ok) {
        fangweiDrawer.customModes = fangweiDrawer.customModes.filter(m => m.id !== currentEditingModeId);
        delete fangweiDrawer.settings.modes[currentEditingModeId];
        fangweiDrawer.saveCustomModes();
        fangweiDrawer.saveSettings();
        fangweiDrawer.updateCustomModesList();
        hideCustomModeModal();
        showToast('模式已删除');
    }
}

// 更新详情类型显示
function updateDetailTypeDisplay() {
    const detailType = document.querySelector('input[name="detailType"]:checked')?.value || 'text';
    document.getElementById('fixedTextSection').style.display = detailType === 'text' ? 'block' : 'none';
    document.getElementById('randomElementsSection').style.display = detailType === 'random' ? 'block' : 'none';
}

// 添加随机元素输入框
function addRandomElement(value = '') {
    const list = document.getElementById('randomElementsList');
    if (!list) return;

    const item = document.createElement('div');
    item.className = 'random-element-item';
    item.innerHTML = `
        <input type="text" placeholder="输入元素内容" value="${escapeHtml(value)}">
        <button type="button" class="random-element-delete" onclick="removeRandomElement(this)" title="删除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    list.appendChild(item);

    // 聚焦到新添加的输入框
    const input = item.querySelector('input');
    if (input && !value) input.focus();
}

// 删除随机元素输入框
function removeRandomElement(btn) {
    const item = btn.closest('.random-element-item');
    if (item) item.remove();
}

// 获取所有随机元素
function getRandomElements() {
    const list = document.getElementById('randomElementsList');
    if (!list) return [];
    return Array.from(list.querySelectorAll('input'))
        .map(input => input.value.trim())
        .filter(Boolean);
}

// 设置随机元素列表
function setRandomElements(elements) {
    const list = document.getElementById('randomElementsList');
    if (!list) return;
    list.innerHTML = '';
    if (elements && elements.length > 0) {
        elements.forEach(el => addRandomElement(el));
    } else {
        // 默认添加一个空输入框
        addRandomElement();
    }
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    fangweiDrawer = new FangweiDrawer();

    // 主题初始化
    initTheme();

    // 主题选择事件
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            applyTheme(e.target.value);
        });
    });

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const currentSetting = localStorage.getItem('theme') || 'system';
        if (currentSetting === 'system') {
            applyTheme('system');
        }
    });

    // 详情类型选择器事件
    document.querySelectorAll('input[name="detailType"]').forEach(radio => {
        radio.addEventListener('change', updateDetailTypeDisplay);
    });

    // 窗口尺寸变化时，重新评估滚动效果
    window.addEventListener('resize', () => {
        ['modeResult', 'directionResult', 'pointResult'].forEach(id => {
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
