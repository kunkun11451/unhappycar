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

            // 3. 隐藏默认列表由 script.js 处理
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
        },

        injectStyles: function () {
            if (document.getElementById('bt-styles')) return;
            const style = document.createElement('style');
            style.id = 'bt-styles';
            style.textContent = `
                @keyframes bt-zoom-in {
                    0% { transform: scale(0.5); opacity: 0; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
                .bt-placeholder-anim {
                    animation: bt-zoom-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `;
            document.head.appendChild(style);
        },

        showPlaceholder: function (animate = true) {
            if (this.resultContainer) {
                const animClass = animate ? 'bt-placeholder-anim' : '';
                const opacity = animate ? '0' : '0.8';

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
            const val = this.input.value.trim().toLowerCase();
            if (!val) {
                this.showPlaceholder();
                return;
            }

            // Surrender Check
            if (val === '我是笨蛋') {
                this.handleSurrender();
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
                // 检查是否已经验证过（可选，这里简化为每次都重新生成卡片）
                return `
                    <div class="card verification-card" onclick="window.__brainTeaser.verify('${name}', this)">
                        ${avatar ? `<img src="${avatar}" alt="${name}" class="avatar">` : ''}
                        <h3>${name}</h3>
                        <div class="verify-hint">点击验证</div>
                    </div>
                `;
            }).join('');

            this.resultContainer.innerHTML = html;
        },

        verify: function (name, cardElement) {
            if (!cardElement) return;

            // Check applicability
            const isAvailable = this.availableList.some(item => item.name === name);

            // Removing existing status classes
            cardElement.classList.remove('verify-success', 'verify-fail');
            const hint = cardElement.querySelector('.verify-hint');

            if (isAvailable) {
                cardElement.classList.add('verify-success');
                if (hint) hint.textContent = '正确：可用';
                window.showToast?.('正确！该角色可用', 1500);
            } else {
                cardElement.classList.add('verify-fail');
                if (hint) hint.textContent = '错误：不可用';
                window.showToast?.('错误！该角色不可用', 1500);
            }
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
