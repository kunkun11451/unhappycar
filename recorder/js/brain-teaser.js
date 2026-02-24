(function () {
    window.__brainTeaser = {
        isSurrendered: false,
        availableList: [],

        init: function () {
            this.container = document.getElementById('brainTeaserContainer');
            this.input = document.getElementById('btInput');
            this.searchBtn = document.getElementById('btSearchBtn');
            this.resultContainer = document.getElementById('btResult');

            this.injectStyles();

            if (this.input) {
                this.input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.handleSearch();
                    }
                });
            }

            if (this.searchBtn) {
                this.searchBtn.addEventListener('click', () => {
                    this.handleSearch();
                });
            }
        },

        reset: function () {
            this.isSurrendered = false;
            // 恢复静态占位图（无动画），保持图片显示不消失
            this.showPlaceholder(false);
            if (this.input) this.input.value = '';
        },

        renderUI: function (availableList) {
            this.availableList = availableList; // list of {name, data}

            // 确保 DOM 初始化
            if (!this.container) this.init();

            // 1. 修改标题
            const panel = document.getElementById('availablePanel');
            const h2 = panel ? panel.querySelector('h2') : null;
            if (h2) {
                h2.setAttribute('data-original-text', h2.getAttribute('data-original-text') || h2.textContent);
                h2.textContent = '验证可用角色';
            }

            // 2. 显示容器
            if (this.container) {
                this.container.classList.remove('hidden');
            }

            // 3. 如果没有搜索结果，显示占位图片（带动画）
            if (this.resultContainer && (this.resultContainer.innerHTML === '' || this.resultContainer.querySelector('img[alt="等待搜索"]'))) {
                this.showPlaceholder(true);
            }

            // 4. 添加底部验证提示
            if (panel) {
                let hint = panel.querySelector('.bt-verify-hint');
                if (!hint) {
                    hint = document.createElement('div');
                    hint.className = 'bt-verify-hint';
                    hint.textContent = '搜索后点击即可验证是否可用';
                    panel.appendChild(hint);
                }
            }

            // 5. 隐藏默认列表由 script.js 处理
        },

        hideUI: function () {
            // 1. 恢复标题
            const panel = document.getElementById('availablePanel');
            const h2 = panel ? panel.querySelector('h2') : null;
            if (h2 && h2.getAttribute('data-original-text')) {
                h2.textContent = h2.getAttribute('data-original-text');
            }

            // 2. 隐藏容器
            if (this.container) {
                this.container.classList.add('hidden');
                if (this.resultContainer) this.resultContainer.innerHTML = '';
                if (this.input) this.input.value = '';
            }

            // 3. 移除底部验证提示
            if (panel) {
                const hint = panel.querySelector('.bt-verify-hint');
                if (hint) hint.remove();
            }
        },

        injectStyles: function () {
            if (document.getElementById('bt-styles')) return;
            const style = document.createElement('style');
            style.id = 'bt-styles';
            style.textContent = `
                @keyframes bt-zoom-in {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 0.95; }
                }
                .bt-placeholder-anim {
                    animation: bt-zoom-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                .verification-card {
                    cursor: pointer;
                    transition: border-color 0.3s, box-shadow 0.3s, transform 0.2s;
                }
                .verification-card:active {
                    transform: scale(0.97);
                }
                .verify-success {
                    border-color: rgba(34, 197, 94, 0.7) !important;
                    box-shadow: 0 0 12px rgba(34, 197, 94, 0.35), inset 0 0 8px rgba(34, 197, 94, 0.1) !important;
                }
                .verify-fail {
                    border-color: rgba(239, 68, 68, 0.7) !important;
                    box-shadow: 0 0 12px rgba(239, 68, 68, 0.35), inset 0 0 8px rgba(239, 68, 68, 0.1) !important;
                    animation: bt-shake 0.45s ease-in-out;
                }
                @keyframes bt-shake {
                    0%, 100% { transform: translateX(0); }
                    15% { transform: translateX(-6px); }
                    30% { transform: translateX(5px); }
                    45% { transform: translateX(-4px); }
                    60% { transform: translateX(3px); }
                    75% { transform: translateX(-2px); }
                    90% { transform: translateX(1px); }
                }
                @keyframes bt-badge-flash {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                    20% { box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.7); border-color: rgba(239, 68, 68, 0.8); background: rgba(239, 68, 68, 0.25); }
                    50% { box-shadow: 0 0 4px 1px rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.7); border-color: rgba(239, 68, 68, 0.8); background: rgba(239, 68, 68, 0.25); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .bt-badge-flash-active {
                    animation: bt-badge-flash 0.8s ease-in-out;
                    border-color: rgba(239, 68, 68, 0.6) !important;
                }
                .bt-verify-hint {
                    text-align: center;
                    font-size: 0.72rem;
                    color: #64748b;
                    margin-top: 8px;
                    padding: 4px 0;
                    opacity: 0.6;
                    user-select: none;
                }
            `;
            document.head.appendChild(style);
        },

        showPlaceholder: function (animate = true) {
            if (this.resultContainer) {
                this.resultContainer.classList.remove('bt-has-results');
                const animClass = animate ? 'bt-placeholder-anim' : '';
                const opacity = animate ? '0' : '0.95';

                this.resultContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; width: 100%; grid-column: 1 / -1; display: flex; justify-content: center;">
                        <img src="https://upload-bbs.miyoushe.com/upload/2025/10/04/273489775/2d460e43aea1bfef1f0853a5590f8df6_2431135975151007136.png" 
                             alt="等待搜索" 
                             class="${animClass}"
                             style="max-width: 300px; width: 100%; height: auto; opacity: ${opacity};">
                    </div>
                `;
            }
        },

        handleSearch: function () {
            const val = this.input.value.trim().toLowerCase().replace(/'/g, '');
            if (!val) {
                this.showPlaceholder();
                return;
            }

            // Search Logic
            const allNames = Object.keys(window.characterData || {});
            let matches = [];

            // Check for Pinyin support
            const hasPinyinSupport = typeof window.pinyinPro !== 'undefined' &&
                typeof window.pinyinPro.pinyin === 'function';
            let pinyinFunc = hasPinyinSupport ? window.pinyinPro.pinyin : null;

            if (!hasPinyinSupport) {
                console.warn('pinyinPro库未加载，仅支持全名精确匹配');
            }

            allNames.forEach(name => {
                let isMatch = false;

                // 1. Exact/Partial Name Match
                if (name.toLowerCase().includes(val)) {
                    isMatch = true;
                }
                // 2. Pinyin Match
                else if (hasPinyinSupport) {
                    const matchResult = this.matchPinyinInitials(name, val, pinyinFunc);
                    if (matchResult.match) {
                        isMatch = true;
                    }
                }

                if (isMatch) {
                    matches.push(name);
                }
            });

            if (matches.length > 0) {
                this.showResults(matches);
            } else {
                window.showToast?.('未找到该角色', 2000);
                // Optionally clear results or keep previous? Clearing seems better to indicate no match.
                // But keep input.
                this.resultContainer.innerHTML = '';
                // Or show placeholder?
                this.showPlaceholder();
            }
        },

        showResults: function (names) {
            if (!this.resultContainer) return;

            const html = names.map(name => {
                const data = window.characterData[name];
                if (!data) return '';

                const avatar = data.头像 || '';
                return `
                    <div class="card verification-card" onclick="window.__brainTeaser.verify('${name}', this)">
                        ${avatar ? `<div class="avatar-wrapper"><img src="${avatar}" class="avatar-glow" aria-hidden="true"><img src="${avatar}" alt="${name}" class="avatar"></div>` : ''}
                        <h3>${name}</h3>
                    </div>
                `;
            }).join('');

            this.resultContainer.innerHTML = html;
            this.resultContainer.classList.add('bt-has-results');
        },

        verify: function (name, cardElement) {
            if (!cardElement) return;

            // Prevent re-triggering on already-verified cards during animation
            if (cardElement.classList.contains('verify-success') || cardElement.classList.contains('verify-fail')) {
                return;
            }

            // Check applicability
            const isAvailable = this.availableList.some(item => item.name === name);

            if (isAvailable) {
                cardElement.classList.add('verify-success');
            } else {
                cardElement.classList.add('verify-fail');

                // Flash the badges in the record area that ban this character
                this.flashBanReasons(name);

                // Remove fail class after animation to allow re-verification on new search
                setTimeout(() => {
                    cardElement.classList.remove('verify-fail');
                }, 1500);
            }
        },

        // 闪烁record区域中导致该角色被禁用的badge
        flashBanReasons: function (name) {
            const data = window.characterData ? window.characterData[name] : null;
            if (!data) return;

            const record = window.__recorder_actions && window.__recorder_actions.getRecord
                ? window.__recorder_actions.getRecord()
                : null;
            if (!record) return;

            // 收集匹配的禁用值
            const bannedValues = [];
            const charElem = data.元素类型;
            const charNation = data.国家 || '其他';
            const charWeapon = data.武器类型;
            const charBody = data.体型 || '';

            if (charElem && record.元素类型.has(charElem)) bannedValues.push(charElem);
            if (charNation && record.国家.has(charNation)) bannedValues.push(charNation);
            if (charWeapon && record.武器类型.has(charWeapon)) bannedValues.push(charWeapon);
            if (charBody && record.体型.has(charBody)) bannedValues.push(charBody);

            if (bannedValues.length === 0) return;

            // 在 #record 中找到对应的 badge 并闪烁
            const recordEl = document.getElementById('record');
            if (!recordEl) return;

            const allBadges = recordEl.querySelectorAll('.badge');
            allBadges.forEach(badge => {
                // 获取 badge 的文本值（考虑不同显示模式）
                let badgeText = badge.getAttribute('title') || '';
                if (!badgeText) {
                    const textEl = badge.querySelector('.badge-text');
                    badgeText = textEl ? textEl.textContent.trim() : badge.textContent.trim();
                }
                if (bannedValues.includes(badgeText)) {
                    badge.classList.remove('bt-badge-flash-active');
                    // Force reflow to restart animation
                    void badge.offsetWidth;
                    badge.classList.add('bt-badge-flash-active');
                    badge.addEventListener('animationend', () => {
                        badge.classList.remove('bt-badge-flash-active');
                    }, { once: true });
                }
            });
        },

        handleSurrender: function () {
            this.isSurrendered = true;
            window.showToast?.('已恢复显示角色列表', 2000);

            // Trigger UI Refresh
            if (window.__recorder_actions && window.__recorder_actions.refresh) {
                window.__recorder_actions.refresh();
            }
        },

        // --- Pinyin Helper Functions (from Requirements) ---
        matchPinyinInitials: function (name, searchTerm, pinyinFunc) {
            if (!pinyinFunc) return { match: false };

            // 获取所有可能的拼音首字母组合
            const { initialsMatrix } = this.getAllPossibleInitials(name, searchTerm, pinyinFunc);

            // 检查是否有任何组合匹配搜索词
            let matchRange = null;
            const match = initialsMatrix.some(initials => {
                const combinedInitials = initials.join('');
                const startIndex = combinedInitials.indexOf(searchTerm);

                if (startIndex !== -1) {
                    // 记录匹配的字符范围
                    matchRange = { start: startIndex, length: searchTerm.length };
                    return true;
                }
                return false;
            });

            return { match, range: matchRange };
        },

        getAllPossibleInitials: function (name, searchTerm, pinyinFunc) {
            // 存储每个字符的所有可能首字母
            const charInitialsList = [];

            // 遍历名字中的每个字符
            for (let i = 0; i < name.length; i++) {
                const char = name[i];
                // 获取字符的所有可能拼音
                const pinyinOptions = pinyinFunc(char, {
                    pattern: 'pinyin',
                    toneType: 'none',
                    multiple: true // 获取多音字的所有拼音
                });

                // 提取每个拼音的首字母
                const initials = pinyinOptions
                    .split(' ')
                    // Filter duplicates
                    .map(py => py.charAt(0).toLowerCase())
                    .filter((v, i, a) => a.indexOf(v) === i);

                charInitialsList.push(initials);
            }

            // 生成所有可能的组合矩阵（每个组合是一个首字母数组）
            const initialsMatrix = this.generateInitialsMatrix(charInitialsList);

            return { initialsMatrix, matchedPositions: [] };
        },

        generateInitialsMatrix: function (charInitialsList) {
            let result = [[]];

            charInitialsList.forEach(initials => {
                const temp = [];
                result.forEach(prefix => {
                    initials.forEach(initial => {
                        temp.push([...prefix, initial]);
                    });
                });
                result = temp;
            });

            return result;
        }
    };
})();
