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
        this.events = [];
        this.defaultEvents = [
            '诸神黄昏：选角时跳过2命及以上五星',
            '芙宁双子：你克隆队友角色或队友克隆你同时两人绑定14',
            '负伤之行：气球禁 橙色q 绿色e',
            '移型换位：与一名玩家交换角色',
            '双刀流：方位可选相反方位角色（队友可用 不出战不bp）',
            '无事发生：你单独可选择重骰方位来选角色',
            '团队之宠：迪奥娜 琳妮特 绮良良 可莉 卡齐娜（无视bp）',
            '逆活一世：可以让你多一条命，活下来才有输出！',
            '西风头子：使用西风系列武器',
            '友尽友情：指定一名队友后气球喜欢不喜欢的角色（无视bp）',
            '皇帝的新衣：下骰之前只能观战',
            '旅行者：只能使用空荧兄妹',
            '衣不蔽体：禁止携带圣遗物',
            '同生共死：选择绑定几人气球：绑定死亡 共生血缘',
            '别藏了：ox掏出了温迪或琴各一次 选完重投（无视bp）',
            '颠倒黑白：你的方位变成倒序（例如：方位12变21）',
            '心肌梗：选角后立刻死亡清空能量和复活默认血量',
            '请神上身：骰子1温 2钟 3雷 4纳 5芙 6自选（无视bp）',
            '保底人：可选一名常驻5星角色 单独bp',
            '点石成金：当前角色元素任选 是5星可变同武器类型'
        ];

        this.currentCustomDetail = { type: 'text', text: '', elements: [] };
        this.currentEditingMode = null;

        this.currentResults = {
            mode: '',
            modeDetail: '',
            direction: '',
            point: '',
            events: {}
        };

        this.settings = {
            enableMode: false,
            enablePoint: true,
            enableEvents: false,
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
        this.loadEvents();
        this.loadSettings();
        this.setupEventListeners();
        this.updateCustomModesList();
        this.renderEvents();
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
            this.currentResults.modeDetail = this.generateCustomModeDetail(customMode);
        } else {
            this.currentResults.mode = this.modes[selectedMode].name;
            switch (selectedMode) {
                case 'clone': this.currentResults.modeDetail = `克隆 ${this.randomChoice(this.players)}`; break;
                case 'swap': this.currentResults.modeDetail = this.generateSwapPairs(); break;
                case 'surprise': this.currentResults.modeDetail = this.randomChoice(this.surpriseItems); break;
                case 'audience': this.currentResults.modeDetail = this.generateAudienceGroups(); break;
                case 'jushi': this.currentResults.modeDetail = this.generateJushiElements(); break;
                default: this.currentResults.modeDetail = '';
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

    drawEvents() {
        this.players.forEach(player => {
            this.currentResults.events[player] = this.randomChoice(this.events) || '无事发生';
        });
        this.updateEventDisplay();
    }

    drawAll() {
        if (this.settings.enableMode) this.drawMode();
        this.drawDirection();
        if (this.settings.enablePoint) this.drawPoint();
        if (this.settings.enableEvents) this.drawEvents();
        this.showResults();
        this.addToHistory();
    }

    showResults() {
        document.getElementById('resultContainer').style.display = 'block';
        this.updateModeDisplay();
        this.updateDirectionDisplay();
        this.updatePointDisplay();
        this.updateEventDisplay();
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
    }

    updateDirectionDisplay() {
        document.getElementById('directionResult').textContent = this.currentResults.direction || '-';
    }

    updatePointDisplay() {
        document.getElementById('pointResult').textContent = (this.settings.enablePoint && this.currentResults.point) ? this.currentResults.point : '-';
    }

    updateEventDisplay() {
        const container = document.getElementById('eventResultsContainer');
        container.innerHTML = '';
        if (this.settings.enableEvents) {
            this.players.forEach(player => {
                const eventText = this.currentResults.events[player];
                if (eventText) {
                    const item = document.createElement('div');
                    item.className = 'result-item';
                    item.innerHTML = `
                        <div class="result-label">${player} 事件:</div>
                        <div class="result-value event-result">${eventText}</div>
                        <button class="copy-event-button" onclick="copyEventResult('${player}')">📋</button>
                    `;
                    container.appendChild(item);
                }
            });
        }
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

    async copyEventResult(player) {
        const text = `${player} 事件：${this.currentResults.events[player]}`;
        const button = event.target;
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
            alert('复制失败');
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
    clearHistory() {
        if (confirm('确定要清空所有历史记录吗？')) {
            this.history = [];
            this.saveHistory();
            this.showHistory();
        }
    }

    // Event Management
    loadEvents() {
        const savedEvents = localStorage.getItem('fangweiEvents');
        this.events = savedEvents ? JSON.parse(savedEvents) : [...this.defaultEvents];
    }
    saveEvents() { localStorage.setItem('fangweiEvents', JSON.stringify(this.events)); }

    renderEvents() {
        const list = document.getElementById('eventList');
        list.innerHTML = '';
        this.events.forEach((event, index) => {
            const item = document.createElement('div');
            item.className = 'custom-mode-item'; // Reusing style
            item.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 5px 10px; background: rgba(255,255,255,0.6); border-radius: 5px; margin: 2px 0;`;
            item.innerHTML = `
                <span style="flex: 1; text-align: left;">${event}</span>
                <button onclick="deleteEvent(${index})" style="background: #ff4757; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer;">×</button>
            `;
            list.appendChild(item);
        });
    }

    addEvent() {
        const input = document.getElementById('newEventInput');
        const eventText = input.value.trim();
        if (eventText) {
            this.events.push(eventText);
            this.saveEvents();
            this.renderEvents();
            input.value = '';
        }
    }

    deleteEvent(index) {
        if (confirm(`确定要删除事件: "${this.events[index]}"吗？`)) {
            this.events.splice(index, 1);
            this.saveEvents();
            this.renderEvents();
        }
    }

    showEventModal() { document.getElementById('eventModal').style.display = 'flex'; }
    hideEventModal() { document.getElementById('eventModal').style.display = 'none'; }

    // Custom Mode Management (simplified for brevity, full logic is complex)
    addCustomMode(name, detailConfig = null) {
        const inputName = name || document.getElementById('customModeName').value;
        if (!inputName || inputName.trim() === '') {
            alert('请输入模式名称');
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

    removeCustomMode(id) {
        if (confirm('确定要删除这个自定义模式吗？')) {
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
            item.className = 'custom-mode-item';
            item.style.opacity = isEnabled ? '1' : '0.5';
            let detailText = '普通模式';
            if (mode.detailConfig) {
                if (mode.detailConfig.type === 'text') detailText = `固定: ${mode.detailConfig.text || '无'}`;
                else detailText = `随机: ${mode.detailConfig.elements.length}项`;
            }
            item.innerHTML = `
                <div style="flex: 1; text-align: left;">
                    <div style="font-weight: bold;">
                        <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleCustomMode('${mode.id}', this.checked)" style="margin-right: 5px;">
                        ${mode.name}
                    </div>
                    <div style="font-size: 11px; color: #666;">${detailText}</div>
                </div>
                <div>
                    <button onclick="fangweiDrawer.editCustomMode('${mode.id}')" style="background: #ffc107; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">✏️</button>
                    <button onclick="fangweiDrawer.removeCustomMode('${mode.id}')" style="background: #ff4757; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">×</button>
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
        document.getElementById('enableEvents').checked = this.settings.enableEvents;
        Object.keys(this.modes).forEach(key => {
            const checkbox = document.getElementById(`mode${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (checkbox) checkbox.checked = this.settings.modes[key] !== false;
        });
        this.updateDrawButtonsVisibility();
    }

    updateDrawButtonsVisibility() {
        const modeResultItem = document.getElementById('modeResultItem');
        const pointResultItem = document.getElementById('pointResultItem');
        const eventResultsContainer = document.getElementById('eventResultsContainer');
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

        eventResultsContainer.style.display = this.settings.enableEvents ? 'block' : 'none';
        if (!this.settings.enableEvents) {
            this.currentResults.events = {};
            this.updateEventDisplay();
        }

        this.updateCopyText();
    }

    setupEventListeners() {
        document.getElementById('enableMode').addEventListener('change', e => { this.settings.enableMode = e.target.checked; this.saveSettings(); this.updateDrawButtonsVisibility(); });
        document.getElementById('enablePoint').addEventListener('change', e => { this.settings.enablePoint = e.target.checked; this.saveSettings(); this.updateDrawButtonsVisibility(); });
        document.getElementById('enableEvents').addEventListener('change', e => { this.settings.enableEvents = e.target.checked; this.saveSettings(); this.updateDrawButtonsVisibility(); });

        Object.keys(this.modes).forEach(key => {
            const checkbox = document.getElementById(`mode${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (checkbox) checkbox.addEventListener('change', e => { this.settings.modes[key] = e.target.checked; this.saveSettings(); });
        });

        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); this.drawAll(); }
            if (e.ctrlKey && e.key === 'c' && document.getElementById('copySection').style.display !== 'none') {
                e.preventDefault(); this.copyResult();
            }
        });

        ['historyModal', 'eventModal', 'customDetailModal'].forEach(id => {
            document.getElementById(id).addEventListener('click', e => {
                if (e.target.id === id) e.target.style.display = 'none';
            });
        });
    }
}

let fangweiDrawer;
document.addEventListener('DOMContentLoaded', () => {
    fangweiDrawer = new FangweiDrawer();
});

// Global functions for HTML
function drawAll() { fangweiDrawer.drawAll(); }
function drawMode() { fangweiDrawer.drawMode(); }
function drawDirection() { fangweiDrawer.drawDirection(); }
function drawPoint() { fangweiDrawer.drawPoint(); }
function copyResult() { fangweiDrawer.copyResult(); }
function copyEventResult(player) { fangweiDrawer.copyEventResult(player); }
function showHistory() { fangweiDrawer.showHistory(); }
function hideHistory() { fangweiDrawer.hideHistory(); }
function clearHistory() { fangweiDrawer.clearHistory(); }
function showEventModal() { fangweiDrawer.showEventModal(); }
function hideEventModal() { fangweiDrawer.hideEventModal(); }
function addEvent() { fangweiDrawer.addEvent(); }
function deleteEvent(index) { fangweiDrawer.deleteEvent(index); }
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
    document.getElementById('customModeType').value = config.type || 'text';
    document.getElementById('customModeText').value = config.text || '';
    document.getElementById('customModeElements').value = (config.elements || []).join('\n');
    updateCustomDetailDisplay();
    modal.style.display = 'flex';
}

function hideCustomDetail() {
    const detailConfig = {
        type: document.getElementById('customModeType').value,
        text: document.getElementById('customModeText').value.trim(),
        elements: document.getElementById('customModeElements').value.split('\n').map(s => s.trim()).filter(Boolean)
    };
    if (fangweiDrawer.currentEditingMode) {
        fangweiDrawer.currentEditingMode.detailConfig = detailConfig;
    } else {
        fangweiDrawer.currentCustomDetail = detailConfig;
    }
    fangweiDrawer.saveCustomModes();
    fangweiDrawer.updateCustomModesList();
    document.getElementById('customDetailModal').style.display = 'none';
}

function clearCustomDetail() {
    document.getElementById('customModeText').value = '';
    document.getElementById('customModeElements').value = '';
}

function updateCustomDetailDisplay() {
    const type = document.getElementById('customModeType').value;
    document.getElementById('textDetailSection').style.display = type === 'text' ? 'block' : 'none';
    document.getElementById('randomDetailSection').style.display = type === 'random' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('customModeType').addEventListener('change', updateCustomDetailDisplay);
});
