(function () {
    const STORAGE_KEY = 'recorder_avatar_settings_v1';

    // 默认设置
    const DEFAULT_SETTINGS = {
        avatarMode: 'default', // 'default' 或 'emoji'
        characterPreferences: { "甘雨": [3], "阿贝多": [0], "阿蕾奇诺": [0], "埃洛伊": [0], "艾尔海森": [0], "艾梅莉埃": [3], "爱可菲": [6], "爱诺": [3], "安柏": [3], "八重神子": [0], "芭芭拉": [4], "白术": [3], "班尼特": [1], "北斗": [0], "达达利亚": [10], "迪奥娜": [0], "迪卢克": [1], "迪希雅": [3], "杜林": [0], "多莉": [1], "珐露珊": [1], "菲林斯": [3], "菲米尼": [1], "菲谢尔": [2], "枫原万叶": [5], "芙宁娜": [3], "哥伦比娅": [3], "胡桃": [16], "荒泷一斗": [6], "基尼奇": [4], "嘉明": [2], "九条裟罗": [1], "久岐忍": [0], "卡齐娜": [1], "卡维": [4], "凯亚": [1], "坎蒂丝": [1], "柯莱": [3], "可莉": [4], "克洛琳德": [0], "刻晴": [10], "菈乌玛": [5], "莱欧斯利": [5], "莱依拉": [0], "蓝砚": [2], "雷电将军": [6], "雷泽": [3], "丽莎": [1], "林尼": [3], "琳妮特": [4], "流浪者": [5], "鹿野院平藏": [3], "罗莎莉亚": [0], "玛拉妮": [3], "玛薇卡": [3], "梦见月瑞希": [1], "米卡": [1], "莫娜": [2], "那维莱特": [3], "纳西妲": [0], "娜维娅": [1], "奈芙尔": [0], "妮露": [3], "凝光": [8], "诺艾尔": [1], "欧洛伦": [2], "七七": [8], "绮良良": [7], "恰斯卡": [0], "千织": [0], "茜特菈莉": [8], "琴": [5], "赛诺": [4], "赛索斯": [1], "砂糖": [1], "珊瑚宫心海": [5], "申鹤": [1], "神里绫华": [8], "神里绫人": [5], "丝柯克": [0], "塔利雅": [0], "提纳里": [2], "托马": [5], "瓦雷莎": [0], "温迪": [0], "五郎": [2], "希格雯": [0], "希诺宁": [2], "夏洛蒂": [0], "夏沃蕾": [4], "闲云": [0], "香菱": [1], "宵宫": [3], "魈": [8], "辛焱": [2], "行秋": [4], "雅珂达": [4], "烟绯": [0], "瑶瑶": [7], "夜兰": [3], "伊安珊": [2], "伊法": [0], "伊涅芙": [4], "优菈": [1], "叶洛亚": [1], "云堇": [2], "兹白": [2], "早柚": [1], "钟离": [5], "重云": [2] }
    };

    // 加载设置
    let avatarSettings = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SETTINGS;

    // 确保所有设置项存在
    if (!avatarSettings.avatarMode) avatarSettings.avatarMode = 'default';
    if (!avatarSettings.characterPreferences) {
        avatarSettings.characterPreferences = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.characterPreferences));
    }

    // 表情包数据缓存
    let emojiUrlsCache = null;

    /**
     * 保存设置
     */
    function saveSettings() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(avatarSettings));
    }

    /**
     * 加载表情包数据
     */
    async function loadEmojiUrls() {
        if (emojiUrlsCache) return emojiUrlsCache;

        try {
            const response = await fetch('js/image_urls.json');
            emojiUrlsCache = await response.json();
            return emojiUrlsCache;
        } catch (error) {
            console.error('加载表情包数据失败:', error);
            return {};
        }
    }

    /**
     * 获取角色的头像URL
     */
    async function getAvatarUrl(characterName, characterData) {
        if (avatarSettings.avatarMode === 'default') {
            return characterData.头像 || '';
        }

        const emojiUrls = await loadEmojiUrls();
        const characterEmojis = emojiUrls[characterName];

        if (!characterEmojis || characterEmojis.length === 0) {
            return characterData.头像 || '';
        }

        const charPref = avatarSettings.characterPreferences[characterName];

        // 如果该角色设置为随机或没有设置
        if (!charPref || charPref === 'random') {
            const randomIndex = Math.floor(Math.random() * characterEmojis.length);
            return characterEmojis[randomIndex];
        }

        // 如果是数组（已选择特定表情包）
        if (Array.isArray(charPref) && charPref.length > 0) {
            const randomIdx = Math.floor(Math.random() * charPref.length);
            const selectedIndex = charPref[randomIdx];
            if (selectedIndex >= 0 && selectedIndex < characterEmojis.length) {
                return characterEmojis[selectedIndex];
            }
        }

        // 兜底：随机选择
        const randomIndex = Math.floor(Math.random() * characterEmojis.length);
        return characterEmojis[randomIndex];
    }

    /**
     * 同步获取头像URL（使用缓存）
     */
    function getAvatarUrlSync(characterName, characterData) {
        if (avatarSettings.avatarMode === 'default') {
            return characterData.头像 || '';
        }

        if (!emojiUrlsCache) {
            return characterData.头像 || '';
        }

        const characterEmojis = emojiUrlsCache[characterName];

        if (!characterEmojis || characterEmojis.length === 0) {
            return characterData.头像 || '';
        }

        const charPref = avatarSettings.characterPreferences[characterName];

        if (!charPref || charPref === 'random') {
            const randomIndex = Math.floor(Math.random() * characterEmojis.length);
            return characterEmojis[randomIndex];
        }

        if (Array.isArray(charPref) && charPref.length > 0) {
            const randomIdx = Math.floor(Math.random() * charPref.length);
            const selectedIndex = charPref[randomIdx];
            if (selectedIndex >= 0 && selectedIndex < characterEmojis.length) {
                return characterEmojis[selectedIndex];
            }
        }

        const randomIndex = Math.floor(Math.random() * characterEmojis.length);
        return characterEmojis[randomIndex];
    }

    function getSettings() {
        return { ...avatarSettings };
    }

    function setAvatarMode(mode) {
        avatarSettings.avatarMode = mode;
        saveSettings();
    }

    function setCharacterPreference(characterName, pref) {
        avatarSettings.characterPreferences[characterName] = pref;
        saveSettings();
    }

    /**
     * 获取有表情包且在 characterData 中存在的角色列表
     */
    async function getCharactersWithEmojis() {
        const emojiUrls = await loadEmojiUrls();
        const charData = window.characterData || {};
        const result = {};

        for (const [charName, urls] of Object.entries(emojiUrls)) {
            // 只显示在 characters.js 中存在的角色
            if (urls && urls.length > 0 && charData[charName]) {
                result[charName] = urls;
            }
        }

        return result;
    }

    /**
     * 渲染显示偏好设置弹窗
     */
    async function openDisplayPreferenceModal() {
        const modal = document.createElement('div');
        modal.id = 'avatarPreferenceModal';
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="settings-backdrop"></div>
            <div class="settings-dialog">
                <div class="settings-header">
                    <h2>头像显示自定义设置</h2>
                    <button class="settings-close">&times;</button>
                </div>
                <div class="settings-body avatar-pref-body">
                    <div class="avatar-pref-search-container">
                        <input type="text" id="avatarPrefSearch" placeholder="搜索角色/拼音..." class="avatar-pref-search-input">
                    </div>
                    <div class="char-list-container" id="charListContainer">
                        <div class="loading-placeholder">加载中...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const charsWithEmojis = await getCharactersWithEmojis();
        const charData = window.characterData || {};
        const charListContainer = document.getElementById('charListContainer');

        function renderCharacterPanel(item, charName) {
            if (item.dataset.rendered === 'true') return;

            const emojiUrls = charsWithEmojis[charName];
            const pref = avatarSettings.characterPreferences[charName];
            const selectedIndices = Array.isArray(pref) ? pref : [];
            
            // 生成选中区表情
            const selectedEmojis = selectedIndices;
            // 生成待选区表情
            const unselectedEmojis = emojiUrls.map((_, idx) => idx).filter(idx => !selectedIndices.includes(idx));
            // 判断选中区是否为空
            const isSelectedEmpty = selectedEmojis.length === 0;

            const panel = item.querySelector('.char-emoji-panel');
            
            panel.innerHTML = `
                <div class="emoji-zone selected-zone" data-zone="selected">
                    <div class="zone-label">已选择</div>
                    <div class="emoji-grid" data-char="${charName}" data-zone="selected">
                        ${isSelectedEmpty ? `
                            <div class="empty-zone-hint">
                                <span>当前已选择列表为空，此角色会在所有表情中随机显示一个作为头像</span>
                                <br>
                                <span>可在下方选择指定若干个表情添加到此处</span>
                                <span>显示时将从已选表情中随机显示一个</span>
                            </div>
                        ` : ''}
                        ${selectedEmojis.map(idx => `
                            <div class="emoji-option" data-idx="${idx}" data-char="${charName}">
                                <img src="${emojiUrls[idx]}" alt="表情${idx + 1}" loading="lazy">
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="emoji-zone unselected-zone" data-zone="unselected">
                    <div class="emoji-grid" data-char="${charName}" data-zone="unselected">
                        ${unselectedEmojis.map(idx => `
                            <div class="emoji-option" data-idx="${idx}" data-char="${charName}">
                                <img src="${emojiUrls[idx]}" alt="表情${idx + 1}" loading="lazy">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            item.dataset.rendered = 'true';
        }

        function highlightText(text, search, matchRange) {
            if (!matchRange) return text;
            const start = matchRange.start;
            const end = start + matchRange.length;
            return text.substring(0, start) + 
                   `<span class="name-hl">${text.substring(start, end)}</span>` + 
                   text.substring(end);
        }

        function renderCharList(searchTerm = '') {
            let entries = Object.entries(charsWithEmojis).map(([name, urls]) => ({name, urls}));

            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                const pinyinFunc = (window.pinyinPro && typeof window.pinyinPro.pinyin === 'function') ? window.pinyinPro.pinyin : null;

                entries = entries.map(item => {
                    const name = item.name;
                    // 1. 直接匹配
                    const idx = name.toLowerCase().indexOf(lowerTerm);
                    if (idx !== -1) {
                        return { ...item, matchRange: { start: idx, length: lowerTerm.length } };
                    }
                    // 2. 拼音匹配
                    if (window.__brainTeaser && typeof window.__brainTeaser.matchPinyinInitials === 'function') {
                        const res = window.__brainTeaser.matchPinyinInitials(name, lowerTerm, pinyinFunc);
                        if (res && res.match) {
                            return { ...item, matchRange: res.range };
                        }
                    }
                    return null;
                }).filter(Boolean);
            }

            if (entries.length === 0) {
                charListContainer.innerHTML = '<div class="no-chars-msg">没有找到匹配的角色</div>';
                return;
            }

            charListContainer.innerHTML = entries.map(({name, urls, matchRange}) => {
                const defaultAvatar = charData[name]?.头像 || '';
                const pref = avatarSettings.characterPreferences[name];
                const selectedCount = Array.isArray(pref) ? pref.length : 0;
                let displayName = name;
                if (matchRange) {
                    displayName = highlightText(name, searchTerm, matchRange);
                }

                return `
                    <div class="char-pref-item" data-char="${name}" data-rendered="false">
                        <div class="char-pref-header">
                            <img src="${defaultAvatar}" class="char-pref-avatar" alt="${name}">
                            <span class="char-pref-name">${displayName}</span>
                            <span class="char-emoji-count">${selectedCount} 个已选</span>
                        </div>
                        <div class="char-emoji-panel" data-char="${name}">
                            <!-- 内容将在首次展开时动态渲染 -->
                            <div class="loading-placeholder" style="padding: 10px; font-size: 0.8rem;">加载中...</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function moveEmojiWithFlip(emojiEl, fromGrid, toGrid, charName, idx) {
            const oldPosMap = new Map();
            const allOptions = [fromGrid, toGrid]
                .filter(Boolean)
                .flatMap(grid => Array.from(grid.querySelectorAll('.emoji-option')));

            allOptions.forEach(el => {
                oldPosMap.set(el, el.getBoundingClientRect());
            });

            // 移动到目标grid
            // 找到插入位置
            const currentIdx = parseInt(idx, 10);
            const siblings = Array.from(toGrid.children).filter(el => el.classList.contains('emoji-option'));
            let inserted = false;

            for (let i = 0; i < siblings.length; i++) {
                const siblingIdx = parseInt(siblings[i].dataset.idx, 10);
                if (siblingIdx > currentIdx) {
                    toGrid.insertBefore(emojiEl, siblings[i]);
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                toGrid.appendChild(emojiEl);
            }

            // 更新设置（可能会插入/移除空状态提示）
            updateCharacterPreference(charName);

            // FLIP: 计算新位置并做整体动画
            if (oldPosMap.size > 0 && !document.hidden) {
                requestAnimationFrame(() => {
                    const moved = [];
                    oldPosMap.forEach((oldRect, el) => {
                        if (!document.body.contains(el)) return;
                        const newRect = el.getBoundingClientRect();
                        const dx = oldRect.left - newRect.left;
                        const dy = oldRect.top - newRect.top;
                        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                            el.style.transform = `translate(${dx}px, ${dy}px)`;
                            el.style.transition = 'none';
                            moved.push(el);
                        }
                    });

                    if (moved.length > 0) {
                        requestAnimationFrame(() => {
                            moved.forEach(el => {
                                el.style.transform = '';
                                el.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
                            });
                        });
                    }
                });
            }
        }

        function updateCharacterPreference(charName) {
            const item = charListContainer.querySelector(`.char-pref-item[data-char="${charName}"]`);
            if (!item) return;

            const selectedGrid = item.querySelector('.emoji-grid[data-zone="selected"]');
            const countEl = item.querySelector('.char-emoji-count');

            // 收集选中区的表情索引
            const selectedIndices = [];
            selectedGrid.querySelectorAll('.emoji-option').forEach(opt => {
                const idx = parseInt(opt.dataset.idx, 10);
                if (!isNaN(idx)) {
                    selectedIndices.push(idx);
                }
            });
            avatarSettings.characterPreferences[charName] = selectedIndices;

            if (countEl) {
                countEl.textContent = `${selectedIndices.length} 个已选`;
            }

            // 更新空状态提示
            updateEmptyHint(selectedGrid, selectedIndices.length === 0);
        }

        function updateEmptyHint(selectedGrid, isEmpty) {
            let hint = selectedGrid.querySelector('.empty-zone-hint');
            if (isEmpty && !hint) {
                // 添加空状态提示
                hint = document.createElement('div');
                hint.className = 'empty-zone-hint';
                hint.innerHTML = `
                    <span>当前已选择列表为空，此角色会在所有表情中随机显示一个作为头像</span>
                    <br>
                    <span>可在下方选择指定若干个表情添加到此处</span>
                    <span>显示时将从已选表情中随机显示一个</span>
                `;
                selectedGrid.insertBefore(hint, selectedGrid.firstChild);
            } else if (!isEmpty && hint) {
                // 移除空状态提示
                hint.remove();
            }
        }

        function bindCharListEvents() {
            // 使用事件委托处理所有交互
            charListContainer.addEventListener('click', (e) => {
                // 1. 处理展开/收起 (点击 Header 或 Expand Button)
                const header = e.target.closest('.char-pref-header');
                if (header) {
                    if (e.target.closest('.char-expand-btn')) e.stopPropagation();
                    
                    const item = header.closest('.char-pref-item');
                    if (item) {
                        const charName = item.dataset.char;
                        // 懒加载：首次展开时渲染内容
                        if (!item.classList.contains('expanded')) {
                            renderCharacterPanel(item, charName);
                        }
                        item.classList.toggle('expanded');
                    }
                    return;
                }

                // 2. 处理表情点击
                const opt = e.target.closest('.emoji-option');
                if (opt) {
                    e.stopPropagation();

                    const charName = opt.dataset.char;
                    const item = opt.closest('.char-pref-item');
                    const currentGrid = opt.closest('.emoji-grid');
                    const currentZone = currentGrid.dataset.zone;

                    const selectedGrid = item.querySelector('.emoji-grid[data-zone="selected"]');
                    const unselectedGrid = item.querySelector('.emoji-grid[data-zone="unselected"]');

                    const targetGrid = currentZone === 'selected' ? unselectedGrid : selectedGrid;
                    moveEmojiWithFlip(opt, currentGrid, targetGrid, charName, opt.dataset.idx);
                }
            });
        }

        // 绑定搜索框事件
        const searchInput = modal.querySelector('#avatarPrefSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.trim().replace(/'/g, '');
                renderCharList(term);
            });
        }

        // 初始渲染
        renderCharList();
        bindCharListEvents(); // 只需绑定一次事件委托

        // 关闭弹窗
        const closeModal = () => {
            saveSettings(); // 保存设置
            if (window.__recorder_actions && window.__recorder_actions.refresh) {
                window.__recorder_actions.refresh();
            }

            modal.classList.add('closing');
            setTimeout(() => {
                modal.remove();
            }, 280);
        };

        modal.querySelector('.settings-close').addEventListener('click', closeModal);
        modal.querySelector('.settings-backdrop').addEventListener('click', closeModal);
    }

    /**
     * 初始化功能
     */
    async function init() {
        await loadEmojiUrls();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupUI);
        } else {
            setupUI();
        }
    }

    /**
     * 设置 UI
     */
    function setupUI() {
        const avatarModeSelect = document.getElementById('avatarModeSelect');
        const displayPrefItem = document.getElementById('displayPrefItem');
        const displayPrefBtn = document.getElementById('displayPrefBtn');

        if (avatarModeSelect) {
            avatarModeSelect.value = avatarSettings.avatarMode;

            const updatePrefVisibility = () => {
                if (displayPrefItem) {
                    if (avatarSettings.avatarMode === 'emoji') {
                        displayPrefItem.classList.remove('hidden');
                        displayPrefItem.style.display = 'flex';
                    } else {
                        displayPrefItem.classList.add('hidden');
                        displayPrefItem.style.display = 'none';
                    }
                }
            };

            updatePrefVisibility();

            avatarModeSelect.addEventListener('change', (e) => {
                avatarSettings.avatarMode = e.target.value;
                saveSettings();
                updatePrefVisibility();

                if (window.__recorder_actions && window.__recorder_actions.refresh) {
                    window.__recorder_actions.refresh();
                }
            });
        }

        if (displayPrefBtn) {
            displayPrefBtn.addEventListener('click', () => {
                openDisplayPreferenceModal();
            });
        }
    }

    // 暴露到全局
    window.__avatar_settings = {
        getSettings,
        setAvatarMode,
        setCharacterPreference,
        getAvatarUrl,
        getAvatarUrlSync,
        loadEmojiUrls,
        getCharactersWithEmojis,
        openDisplayPreferenceModal
    };

    init();
})();
