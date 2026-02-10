(function () {
    const STORAGE_KEY = 'recorder_personalize_settings_v1';
    const DEFAULT_SETTINGS = {
        backgroundMode: 'default', // default | color | image | emoji
        backgroundColor: '#ffffff',
        backgroundImage: '',
        emojiImages: [],
        emojiLayout: 'mix',
        emojiScale: 1.0,
        emojiSeed: 0
    };

    let settings = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SETTINGS;
    if (!settings.backgroundMode) settings.backgroundMode = 'default';
    if (!settings.backgroundColor) settings.backgroundColor = '#ffffff';
    if (!Array.isArray(settings.emojiImages)) settings.emojiImages = [];
    if (!settings.emojiLayout) settings.emojiLayout = 'mix';
    if (typeof settings.emojiScale !== 'number') settings.emojiScale = 1.0;
    if (!settings.emojiSeed) settings.emojiSeed = 0;
    if (!settings.backgroundImage) settings.backgroundImage = '';

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            return true;
        } catch (err) {
            console.warn('Failed to save personalize settings:', err);
            if (window.showCustomAlert) {
                window.showCustomAlert('图片过大，无法保存到本地存储。已临时应用，但刷新后可能丢失。');
            }
            return false;
        }
    }

    function ensureBackgroundContainer() {
        let container = document.getElementById('personalize-bg-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'personalize-bg-container';
            // Hardware acceleration and fixed positioning
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: -1;
                pointer-events: none;
                transform: translateZ(0);
                -webkit-transform: translateZ(0);
                will-change: transform;
                display: none;
                background-position: center;
                background-repeat: no-repeat;
                background-size: cover;
            `;
            document.body.appendChild(container); // Append to body so it sits behind content
        }
        return container;
    }

    function ensureStyleTag() {
        if (document.getElementById('personalizeThemeStyles')) return;
        const style = document.createElement('style');
        style.id = 'personalizeThemeStyles';
        style.textContent = `
            html.personalize-active {
                background-color: var(--personalize-bg-color, #1f1f1f);
            }
            body.personalize-bg {
                background: transparent !important;
                min-height: 100vh;
            }
        `;
        document.head.appendChild(style);
    }

    function createRng(seed) {
        let value = seed % 2147483647;
        if (value <= 0) value += 2147483646;
        return () => (value = value * 16807 % 2147483647) / 2147483647;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function readFileAsDataUrl(file) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        });
    }

    async function processImageFile(file, maxSize) {
        const dataUrl = await readFileAsDataUrl(file);
        if (!dataUrl) return '';

        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                const maxSide = Math.max(w, h);

                if (!maxSize || maxSide <= maxSize) {
                    resolve(dataUrl);
                    return;
                }

                const scale = maxSize / maxSide;
                const cw = Math.max(1, Math.round(w * scale));
                const ch = Math.max(1, Math.round(h * scale));
                const canvas = document.createElement('canvas');
                canvas.width = cw;
                canvas.height = ch;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(dataUrl);
                    return;
                }
                ctx.drawImage(img, 0, 0, cw, ch);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve('');
            img.src = dataUrl;
        });
    }

    function loadEmojiImages(urls) {
        const list = urls.slice(0, 12);
        return Promise.all(list.map(src => new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        }))).then(images => images.filter(Boolean));
    }

    let emojiCorsWarningShown = false;

    async function fetchImageAsDataUrl(url) {
        if (!url) return '';
        if (url.startsWith('data:') || url.startsWith('blob:')) return url;

        try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) return '';
            const blob = await response.blob();
            return await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => resolve('');
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn('Failed to fetch emoji image for canvas:', error);
            return '';
        }
    }

    async function loadEmojiImagesForCanvas(urls) {
        const list = urls.slice(0, 12);
        const dataUrls = await Promise.all(list.map(src => fetchImageAsDataUrl(src)));
        const safeUrls = dataUrls.filter(Boolean);

        if (list.length > 0 && safeUrls.length === 0 && !emojiCorsWarningShown) {
            emojiCorsWarningShown = true;
            if (window.showCustomAlert) {
                window.showCustomAlert('部分表情素材无法用于墙纸生成（跨域限制）。请尝试更换素材。');
            }
        }

        return Promise.all(safeUrls.map(src => new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        }))).then(images => images.filter(Boolean));
    }

    let emojiUrlsCache = null;

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

    async function getAllEmojiUrls() {
        const emojiUrls = await loadEmojiUrls();
        const all = [];
        const seen = new Set();

        Object.values(emojiUrls || {}).forEach(list => {
            if (!Array.isArray(list)) return;
            list.forEach(url => {
                if (!url || seen.has(url)) return;
                seen.add(url);
                all.push(url);
            });
        });

        return all;
    }

    function drawEmojiWallpaper(images, layout, bgColor, seed, scaleFactor, customWidth, customHeight, customDpr) {
        const w = customWidth || window.innerWidth;
        const h = customHeight || window.innerHeight;
        const dpr = customDpr || window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        ctx.scale(dpr, dpr);
        ctx.fillStyle = bgColor || '#1f1f1f';
        ctx.fillRect(0, 0, w, h);

        if (!images.length) return canvas.toDataURL('image/png');

        const rng = createRng(seed || 1);
        const random = () => rng();
        const pick = (i) => images[i % images.length];
        const randomImage = () => images[Math.floor(random() * images.length)];

        // Base size scaled by user preference
        const sizeBase = (Math.hypot(w, h) / 50) * (scaleFactor || 1.0);
        
        // Helper to draw image center-aligned
        const drawAt = (img, x, y, s, rotate = 0) => {
            ctx.save();
            ctx.translate(x + s / 2, y + s / 2); // Center of the image
            if (rotate) ctx.rotate(rotate);
            
            // Draw centered
            ctx.drawImage(img, -s / 2, -s / 2, s, s);
            ctx.restore();
        };

        const gridLayout = (pattern) => {
            let size = sizeBase;
            let spacingX = size;
            let spacingY = size;
            
            if (pattern === 'diamond') {
                spacingX = size * 3 / 2;
                spacingY = spacingX / 3;
            } else if (pattern === 'hex') {
                spacingX = size * 1.2;
                spacingY = size * 1.1;
                // spacing adjusted for hex packing usually relates to sqrt(3)
            } else if (pattern === 'large') {
                size = sizeBase * 2.5;
                spacingX = size;
                spacingY = size;
            } else {
                // grid
                size = sizeBase * 1.5;
                spacingX = size;
                spacingY = size;
            }

            const cols = Math.round(w / (size + spacingX * 0.1)); // Approx cols
            const rows = Math.round(h / (size + spacingY * 0.1));

            // Adjust spacing to fit screen exactly
            // Simplified logic compared to script.js to ensure coverage without gaps
            const realSpacingX = w / Math.max(1, cols);
            const realSpacingY = h / Math.max(1, rows);

            // Re-calc specific spacing for diamond/hex
            let cellW = realSpacingX;
            let cellH = realSpacingY;

            // Enforce aspect ratio more strictly if pattern needs it, but filling screen is priority
            
            const stagger = (pattern === 'diamond' || pattern === 'hex');

            for (let r = -1; r <= rows; r++) {
                for (let c = -1; c <= cols; c++) {
                    const staggerRow = stagger && (r % 2 !== 0);
                    const staggerX = staggerRow ? 0.5 : 0;
                    
                    const x = (c + staggerX) * cellW;
                    const y = r * cellH;

                    const img = randomImage(); // Using random image
                    
                    // Check bounds roughly
                    if (x < -size || x > w + size || y < -size || y > h + size) continue;

                    drawAt(img, x, y, size * 0.9, 0);
                }
            }
        };

        const spiralLayout = () => {
            const centerX = w / 2;
            const centerY = h / 2;
            const baseSize = sizeBase * 2;
            const maxR = Math.hypot(w, h) * 0.75;
            const golden = Math.PI * (3 - Math.sqrt(5)); // Golden angle
            
            // Use area accumulation to determine radius.
            let accumulatedArea = 0;
            
            // Slightly reduced spacing factor from 1.25 to 1.15 to tighten the gaps
            // while still preventing most overlaps
            const spacingFactor = 1.15; 

            for (let i = 0; i < 3000; i++) {
                // Reduced initial offset to nearly zero (was baseSize*baseSize).
                // This closes the "big empty circle" in the middle.
                const currentRadius = Math.sqrt((accumulatedArea + 20) * spacingFactor / Math.PI);

                if (currentRadius > maxR) break;

                // Calculate size based on current radius
                const distRatio = Math.min(1.0, currentRadius / maxR);
                
                // Enhanced "Small to Big" effect:
                // Start smaller (0.25x) at center to fit tightly.
                // End larger (3.5x) at edges for dramatic effect.
                const size = baseSize * (0.25 + 3.25 * (distRatio * distRatio));

                const angle = i * golden;
                const x = centerX + Math.cos(angle) * currentRadius - size / 2;
                const y = centerY + Math.sin(angle) * currentRadius - size / 2;

                const img = pick(i);
                const rot = angle + (random() - 0.5) * 0.5;

                drawAt(img, x, y, size, rot);

                // Accumulate area
                accumulatedArea += Math.PI * Math.pow(size / 2, 2);
            }
        };

        const foamLayout = () => {
            // Bubble packing
            // Based on script.js foamLayout
            const bubbles = [];
            const count = 1500; // max attempts
            const maxRadius = sizeBase * 4;
            const minRadius = sizeBase * 0.8;

            for (let i = 0; i < count; i++) {
                const x = random() * w;
                const y = random() * h;
                
                // Determine max possible radius here
                let effectiveR = Math.min(x, w - x, y, h - y); // Dist to edge? script.js does this but it makes edges empty.
                // Let's allow overlap with edge
                effectiveR = maxRadius;

                // Check against existing bubbles
                for (let j = 0; j < bubbles.length; j++) {
                    const b = bubbles[j];
                    const dist = Math.hypot(x - b.x, y - b.y);
                    effectiveR = Math.min(effectiveR, dist - b.r); // Touch existing
                    if (effectiveR < minRadius) break;
                }

                if (effectiveR >= minRadius) {
                    effectiveR = Math.min(effectiveR, maxRadius);
                    // Add some randomness to size so it's not always "perfect fit"
                    // effectiveR *= (0.8 + random() * 0.2); 
                    
                    bubbles.push({
                        x: x,
                        y: y,
                        r: effectiveR,
                        img: randomImage()
                    });
                }
            }

            // Draw bubbles
            for (const b of bubbles) {
                // Determine img size from radius
                // r is radius, drawAt takes width/height (diameter-ish)
                // Use diameter = r * 1.5 usually fits well
                const size = b.r * 1.6; 
                const rot = (random() - 0.5) * 1.0;
                // Center is b.x, b.y. drawAt expects top-left.
                // My drawAt expects top-left x,y, but I modified it to translate(x+size/2).
                // Wait, drawAt(img, x, y, size) translates to x+size/2. 
                // So if I pass b.x-size/2, b.y-size/2 it will center at b.x, b.y
                drawAt(b.img, b.x - size/2, b.y - size/2, size, rot);
            }
        };

        const packingLayout = () => {
            // Stacks / Bin Packing
            // Simplified grid bin packing
            const cellSize = sizeBase * 1.5;
            const cols = Math.ceil(w / cellSize);
            const rows = Math.ceil(h / cellSize);
            const grid = new Array(cols).fill(0).map(() => new Array(rows).fill(false));

            const sizes = [1, 2, 3]; // multiples of cellSize

            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    if (grid[c][r]) continue;

                    // Try to fit a random size block
                    // Random pick logic: biased towards smaller to fill gaps
                    let blockSize = 1;
                    const rVal = random();
                    if (rVal > 0.95) blockSize = 3;
                    else if (rVal > 0.7) blockSize = 2;

                    // reduce until fits
                    while (blockSize > 0) {
                        let fits = true;
                        if (c + blockSize > cols || r + blockSize > rows) {
                            fits = false;
                        } else {
                            for (let i = 0; i < blockSize; i++) {
                                for (let j = 0; j < blockSize; j++) {
                                    if (grid[c + i][r + j]) {
                                        fits = false;
                                        break;
                                    }
                                }
                                if (!fits) break;
                            }
                        }

                        if (fits) {
                            // Mark grid
                            for (let i = 0; i < blockSize; i++) {
                                for (let j = 0; j < blockSize; j++) {
                                    grid[c + i][r + j] = true;
                                }
                            }
                            
                            // Draw
                            const img = randomImage();
                            const drawSize = blockSize * cellSize * 0.9; // Scale down slightly for margin
                            const margin = cellSize * 0.05 + (blockSize-1)*cellSize*0; 
                            
                            // Center in the block area
                            const areaW = blockSize * cellSize;
                            const cx = c * cellSize + areaW/2;
                            const cy = r * cellSize + areaW/2;
                            
                            // drawAt uses top-left
                            const x = cx - drawSize/2;
                            const y = cy - drawSize/2;
                            
                            drawAt(img, x, y, drawSize, 0);
                            break;
                        }
                        blockSize--;
                    }
                }
            }
        };

        // Dispatch
        switch (layout) {
            case 'grid':
            case 'large': // Fallback for old setting
            case 'ray': // Fallback, maybe map to spiral or grid? Map to 'Grid' usually safe.
                gridLayout('grid');
                break;
            case 'diamond':
                gridLayout('diamond');
                break;
            case 'hex':
                gridLayout('hex');
                break;
            case 'spiral':
                spiralLayout();
                break;
            case 'foam':
                foamLayout();
                break;
            case 'mix':
            case 'stacks':
                packingLayout();
                break;
            default:
                gridLayout('grid');
                break;
        }

        try {
            return canvas.toDataURL('image/png');
        } catch (error) {
            console.warn('Failed to export emoji wallpaper:', error);
            return '';
        }
    }

    let lastEmojiWallpaperDataUrl = '';

    function updatePreviewAspect() {
        const previewBox = document.getElementById('personalizePreviewBox');
        if (!previewBox) return;
        const w = Math.max(1, window.innerWidth || 1);
        const h = Math.max(1, window.innerHeight || 1);
        previewBox.style.aspectRatio = `${w} / ${h}`;
    }

    function updateEmojiPreview(dataUrl) {
        const previewImage = document.getElementById('personalizePreviewImage');
        const previewBox = document.getElementById('personalizePreviewBox');
        if (!previewImage || !previewBox) return;

        if (!dataUrl) {
            previewImage.removeAttribute('src');
            previewImage.style.opacity = '0';
            previewBox.style.backgroundColor = settings.backgroundColor || '#1f1f1f';
            return;
        }

        previewImage.src = dataUrl;
        previewImage.style.opacity = '1';
        previewBox.style.backgroundColor = 'transparent';
    }

    async function applySettings() {
        ensureStyleTag();
        const bgContainer = ensureBackgroundContainer();

        const root = document.documentElement;
        
        // Reset legacy inline styles
        document.body.style.removeProperty('background-color');
        document.body.style.removeProperty('background-image');
        document.body.style.removeProperty('background-size');
        document.body.style.removeProperty('background-position');
        document.body.style.removeProperty('background-repeat');
        document.body.style.removeProperty('background-attachment');

        const lockLightTheme = settings.backgroundMode !== 'default';
        setThemeLock(lockLightTheme);

        if (settings.backgroundMode === 'default') {
            // Restore default state
            root.classList.remove('personalize-active');
            document.body.classList.remove('personalize-bg');
            bgContainer.style.display = 'none';
            bgContainer.style.backgroundImage = 'none';
            bgContainer.style.backgroundColor = 'transparent';
            root.style.removeProperty('--personalize-bg-color');
            lastEmojiWallpaperDataUrl = '';
            updateEmojiPreview('');
            return;
        }

        // Active Custom Mode
        root.classList.add('personalize-active');
        document.body.classList.add('personalize-bg');
        bgContainer.style.display = 'block';

        // Set shared background color
        root.style.setProperty('--personalize-bg-color', settings.backgroundColor);
        bgContainer.style.backgroundColor = settings.backgroundColor;

        if (settings.backgroundMode === 'image' && settings.backgroundImage) {
            bgContainer.style.backgroundImage = `url("${settings.backgroundImage}")`;
            bgContainer.style.backgroundSize = 'cover';
            lastEmojiWallpaperDataUrl = '';
            updateEmojiPreview('');
        } else if (settings.backgroundMode === 'color') {
            bgContainer.style.backgroundImage = 'none';
            lastEmojiWallpaperDataUrl = '';
            updateEmojiPreview('');
        } else if (settings.backgroundMode === 'emoji') {
             const images = await loadEmojiImagesForCanvas(settings.emojiImages || []);
             if (!images.length) {
                 bgContainer.style.backgroundImage = 'none';
                 lastEmojiWallpaperDataUrl = '';
                 updateEmojiPreview('');
                 return;
             }
             const bgData = drawEmojiWallpaper(images, settings.emojiLayout, settings.backgroundColor, settings.emojiSeed, settings.emojiScale);
             lastEmojiWallpaperDataUrl = bgData || '';
             bgContainer.style.backgroundImage = bgData ? `url("${bgData}")` : 'none';
             bgContainer.style.backgroundSize = '100% 100%';
             updateEmojiPreview(lastEmojiWallpaperDataUrl);
        } else {
             bgContainer.style.backgroundImage = 'none';
             lastEmojiWallpaperDataUrl = '';
             updateEmojiPreview('');
        }
    }

    function updateEmojiCount() {
        const emojiCount = document.getElementById('personalizeEmojiCount');
        if (!emojiCount) return;
        const count = Array.isArray(settings.emojiImages) ? settings.emojiImages.length : 0;
        emojiCount.textContent = `已选 ${count} / 12`;
    }

    let lastThemeValue = null;
    let lastThemeSetting = null;
    let isThemeLocked = false;

    function setThemeLock(enabled) {
        const themeSelect = document.getElementById('themeSelect');
        const lightLink = document.getElementById('lightThemeLink');

        if (enabled === isThemeLocked) return;
        isThemeLocked = enabled;

        if (enabled) {
            if (themeSelect && !themeSelect.disabled) {
                lastThemeValue = themeSelect.value;
            }
            if (window.__recorder_settings && lastThemeSetting === null) {
                lastThemeSetting = window.__recorder_settings.theme || 'system';
                window.__recorder_settings.theme = 'light';
            }
            if (themeSelect) {
                themeSelect.value = 'light';
                themeSelect.disabled = true;
            }
            if (lightLink) lightLink.disabled = false;
            document.body.classList.add('light-theme');
        } else {
            if (themeSelect) {
                themeSelect.disabled = false;
                if (lastThemeValue) {
                    themeSelect.value = lastThemeValue;
                }
                if (window.__recorder_settings && lastThemeSetting !== null) {
                    window.__recorder_settings.theme = lastThemeSetting;
                    lastThemeSetting = null;
                }
                themeSelect.dispatchEvent(new Event('change'));
            }
        }
    }

    async function openEmojiMaterialModal() {
        const modal = document.createElement('div');
        modal.id = 'emojiMaterialModal';
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="settings-backdrop"></div>
            <div class="settings-dialog emoji-pick-dialog">
                <div class="settings-header">
                    <h2>选择表情素材</h2>
                    <button class="settings-close">&times;</button>
                </div>
                <div class="settings-body avatar-pref-body emoji-pick-body">
                    <div class="avatar-pref-search-container">
                        <input type="text" id="emojiPickSearch" placeholder="搜索角色/拼音..." class="avatar-pref-search-input">
                    </div>
                    <div class="char-list-container" id="emojiPickCharList">
                        <div class="loading-placeholder">加载中...</div>
                    </div>
                </div>
                <div class="emoji-pick-footer">
                    <div class="emoji-selected-zone">
                        <div class="emoji-selected-label" id="emojiSelectedLabel">已勾选 0 / 12</div>
                        <div class="emoji-grid" id="emojiSelectedGrid"></div>
                    </div>
                    <div class="emoji-pick-actions">
                        <button class="btn" id="emojiPickClear">清空</button>
                        <button class="btn primary" id="emojiPickConfirm">确认</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const charListContainer = modal.querySelector('#emojiPickCharList');
        const selectedGrid = modal.querySelector('#emojiSelectedGrid');
        const selectedLabel = modal.querySelector('#emojiSelectedLabel');
        const maxSelected = 12;

        const selected = Array.isArray(settings.emojiImages) ? settings.emojiImages.slice(0, maxSelected) : [];

        const renderSelected = () => {
            if (selectedLabel) {
                selectedLabel.textContent = `已勾选 ${selected.length} / 12`;
            }
            if (selectedGrid) {
                selectedGrid.innerHTML = selected.map(url => `
                    <div class="emoji-option selected" data-url="${url}">
                        <img src="${url}" alt="已选表情" loading="lazy">
                        <div class="emoji-check">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                `).join('');
            }
        };

        const setOptionSelected = (option, isSelected) => {
            if (!option) return;
            option.classList.toggle('selected', isSelected);
            option.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        };

        const syncOptionSelected = (url, isSelected) => {
            if (!charListContainer) return;
            charListContainer.querySelectorAll('.emoji-option').forEach(option => {
                if (option.dataset.url === url) {
                    setOptionSelected(option, isSelected);
                }
            });
        };

        const updateCharSelectedCount = (charName, urls) => {
            if (!charListContainer) return;
            const item = charListContainer.querySelector(`.char-pref-item[data-char="${charName}"]`);
            if (!item) return;
            const countEl = item.querySelector('.char-emoji-count');
            if (!countEl) return;
            const count = (urls || []).filter(url => selected.includes(url)).length;
            countEl.textContent = `${count} 个已选`;
        };

        const highlightText = (text, search, matchRange) => {
            if (!matchRange) return text;
            const start = matchRange.start;
            const end = start + matchRange.length;
            return text.substring(0, start) + 
                   `<span class="name-hl">${text.substring(start, end)}</span>` + 
                   text.substring(end);
        };

        const charsWithEmojis = await (async () => {
            const emojiUrls = await loadEmojiUrls();
            const charData = window.characterData || {};
            const result = {};

            for (const [charName, urls] of Object.entries(emojiUrls || {})) {
                if (urls && urls.length > 0 && charData[charName]) {
                    result[charName] = urls;
                }
            }

            return result;
        })();

        const charData = window.characterData || {};

        const renderCharacterPanel = (item, charName) => {
            if (item.dataset.rendered === 'true') return;
            const urls = charsWithEmojis[charName] || [];
            const panel = item.querySelector('.char-emoji-panel');
            const selectedSet = new Set(selected);

            panel.innerHTML = `
                <div class="emoji-grid" data-char="${charName}">
                    ${urls.map((url, idx) => `
                        <div class="emoji-option${selectedSet.has(url) ? ' selected' : ''}" data-idx="${idx}" data-char="${charName}" data-url="${url}" role="checkbox" aria-checked="${selectedSet.has(url) ? 'true' : 'false'}">
                            <img src="${url}" alt="表情${idx + 1}" loading="lazy">
                            <div class="emoji-check">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            item.dataset.rendered = 'true';
        };

        const renderCharList = (searchTerm = '') => {
            if (!charListContainer) return;
            let entries = Object.entries(charsWithEmojis).map(([name, urls]) => ({ name, urls }));

            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                const pinyinFunc = (window.pinyinPro && typeof window.pinyinPro.pinyin === 'function') ? window.pinyinPro.pinyin : null;

                entries = entries.map(item => {
                    const name = item.name;
                    const idx = name.toLowerCase().indexOf(lowerTerm);
                    if (idx !== -1) {
                        return { ...item, matchRange: { start: idx, length: lowerTerm.length } };
                    }
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

            charListContainer.innerHTML = entries.map(({ name, urls, matchRange }) => {
                const defaultAvatar = charData[name]?.头像 || '';
                const selectedCount = (urls || []).filter(url => selected.includes(url)).length;
                const displayName = matchRange ? highlightText(name, searchTerm, matchRange) : name;

                return `
                    <div class="char-pref-item" data-char="${name}" data-rendered="false">
                        <div class="char-pref-header">
                            <img src="${defaultAvatar}" class="char-pref-avatar" alt="${name}">
                            <span class="char-pref-name">${displayName}</span>
                            <span class="char-emoji-count">${selectedCount} 个已选</span>
                        </div>
                        <div class="char-emoji-panel" data-char="${name}">
                            <div class="loading-placeholder" style="padding: 10px; font-size: 0.8rem;">加载中...</div>
                        </div>
                    </div>
                `;
            }).join('');
        };

        const bindCharListEvents = () => {
            if (!charListContainer) return;

            charListContainer.addEventListener('click', (e) => {
                const header = e.target.closest('.char-pref-header');
                if (header) {
                    const item = header.closest('.char-pref-item');
                    if (item) {
                        const charName = item.dataset.char;
                        if (!item.classList.contains('expanded')) {
                            renderCharacterPanel(item, charName);
                        }
                        item.classList.toggle('expanded');
                    }
                    return;
                }

                const option = e.target.closest('.emoji-option');
                if (!option) return;

                const url = option.dataset.url;
                const charName = option.dataset.char;
                if (!url) return;

                const idx = selected.indexOf(url);
                if (idx >= 0) {
                    selected.splice(idx, 1);
                    setOptionSelected(option, false);
                    renderSelected();
                    updateCharSelectedCount(charName, charsWithEmojis[charName]);
                    return;
                }

                if (selected.length >= maxSelected) {
                    if (window.showCustomAlert) {
                        window.showCustomAlert('最多只能选择 12 个表情素材。');
                    }
                    return;
                }

                selected.push(url);
                setOptionSelected(option, true);
                renderSelected();
                updateCharSelectedCount(charName, charsWithEmojis[charName]);
            });
        };

        renderSelected();
        renderCharList();
        bindCharListEvents();

        const clearBtn = modal.querySelector('#emojiPickClear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                selected.splice(0, selected.length);
                if (charListContainer) {
                    charListContainer.querySelectorAll('.emoji-option.selected').forEach(option => {
                        setOptionSelected(option, false);
                    });
                }
                renderSelected();
                Object.keys(charsWithEmojis).forEach(charName => {
                    updateCharSelectedCount(charName, charsWithEmojis[charName]);
                });
            });
        }

        const confirmBtn = modal.querySelector('#emojiPickConfirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                settings.emojiImages = selected.slice(0, maxSelected);
                settings.emojiSeed = Date.now();
                settings.backgroundMode = 'emoji';
                const bgModeSelect = document.getElementById('personalizeBgMode');
                if (bgModeSelect) bgModeSelect.value = 'emoji';
                saveSettings();
                updateEmojiCount();
                applySettings();
                syncUiVisibility();
                closeModal();
            });
        }

        if (selectedGrid) {
            selectedGrid.addEventListener('click', (e) => {
                const option = e.target.closest('.emoji-option');
                if (!option) return;
                const url = option.dataset.url;
                if (!url) return;
                const idx = selected.indexOf(url);
                if (idx >= 0) {
                    selected.splice(idx, 1);
                    syncOptionSelected(url, false);
                    renderSelected();
                    Object.entries(charsWithEmojis).forEach(([charName, urls]) => {
                        if ((urls || []).includes(url)) {
                            updateCharSelectedCount(charName, urls);
                        }
                    });
                }
            });
        }

        const searchInput = modal.querySelector('#emojiPickSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.trim().replace(/'/g, '');
                renderCharList(term);
            });
        }

        const closeModal = () => {
            modal.classList.add('closing');
            setTimeout(() => {
                modal.remove();
            }, 280);
        };

        modal.querySelector('.settings-close').addEventListener('click', closeModal);
        modal.querySelector('.settings-backdrop').addEventListener('click', closeModal);
    }

    function syncUiVisibility() {
        const bgColorItem = document.getElementById('personalizeBgColorItem');
        const bgImageItem = document.getElementById('personalizeBgImageItem');
        const emojiItem = document.getElementById('personalizeEmojiItem');
        const emojiLayoutItem = document.getElementById('personalizeEmojiLayoutItem');
        const emojiScaleItem = document.getElementById('personalizeEmojiScaleItem');
        const previewItem = document.getElementById('personalizePreviewItem');
        const downloadItem = document.getElementById('personalizeDownloadItem');

        if (bgColorItem) bgColorItem.style.display = (settings.backgroundMode === 'color' || settings.backgroundMode === 'emoji') ? 'flex' : 'none';
        if (bgImageItem) bgImageItem.style.display = settings.backgroundMode === 'image' ? 'flex' : 'none';
        if (emojiItem) emojiItem.style.display = settings.backgroundMode === 'emoji' ? 'flex' : 'none';
        if (emojiLayoutItem) emojiLayoutItem.style.display = settings.backgroundMode === 'emoji' ? 'flex' : 'none';
        if (emojiScaleItem) emojiScaleItem.style.display = settings.backgroundMode === 'emoji' ? 'flex' : 'none';
        if (previewItem) previewItem.style.display = settings.backgroundMode === 'emoji' ? 'flex' : 'none';
        if (downloadItem) downloadItem.style.display = settings.backgroundMode === 'emoji' ? 'flex' : 'none';
    }

    function init() {
        const bgModeSelect = document.getElementById('personalizeBgMode');
        const bgColorInput = document.getElementById('personalizeBgColor');
        const bgImageInput = document.getElementById('personalizeBgImage');
        const bgClearBtn = document.getElementById('personalizeBgClear');
        const emojiPickBtn = document.getElementById('personalizeEmojiPickBtn');
        const emojiLayoutSelect = document.getElementById('personalizeEmojiLayout');
        const emojiScaleSelect = document.getElementById('personalizeEmojiScale');
        const downloadBtn = document.getElementById('personalizeDownloadBtn');

        updatePreviewAspect();

        if (downloadBtn) {
            downloadBtn.addEventListener('click', async () => {
                const scaleSelect = document.getElementById('personalizeDownloadScale');
                const scale = scaleSelect ? parseInt(scaleSelect.value) : 4;
                
                // UI feedback
                const originalText = downloadBtn.textContent;
                downloadBtn.disabled = true;
                
                const updateStatus = (text) => {
                    downloadBtn.textContent = text;
                };

                updateStatus('准备素材...');

                // Helper to wait for UI update
                const nextFrame = () => new Promise(translate => setTimeout(translate, 50));

                try {
                    await nextFrame();
                    const images = await loadEmojiImagesForCanvas(settings.emojiImages || []);
                    if (!images.length) {
                        if (window.showCustomAlert) window.showCustomAlert('没有选择表情素材，无法生成墙纸');
                        updateStatus(originalText);
                        downloadBtn.disabled = false;
                        return;
                    }

                    updateStatus('正在渲染...');
                    await nextFrame();

                    // Calculate high res DPR based on user selection
                    // Use scale factor relative to current device pixel ratio or base 1?
                    // Usually user means "Nx output", so relative to CSS pixels (screen size)
                    // But if user selects 8x, on a retina screen (already 2x), it might be 16x internal if not careful.
                    // Let's interpret "4x" as "4x logical resolution". 
                    // If devicePixelRatio is 2, 4x means 2 * css_pixels. 
                    // No, let's just make it simple multiplier of logical CSS pixels.
                    // Actually previous code used Math.max(dpr, 4).
                    // If user selects 1x, it should be current screen res (dpr).
                    
                    // Logic: user choice is the target multiplier for logical pixels.
                    // e.g. 1x = standard, 2x = retina quality, 4x = 4k-ish, 8x = 8k-ish
                    const targetDpr = Math.max(1, scale); 

                    // Large render warning or limit could be added here if needed

                    const bgData = drawEmojiWallpaper(
                        images, 
                        settings.emojiLayout, 
                        settings.backgroundColor, 
                        settings.emojiSeed, 
                        settings.emojiScale,
                        undefined, 
                        undefined, 
                        targetDpr
                    );
                    
                    if (bgData) {
                        updateStatus('导出图片...');
                        await nextFrame();
                        
                        const link = document.createElement('a');
                        link.download = `emoji-wallpaper-${Date.now()}-${scale}x.png`;
                        link.href = bgData;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                } catch (e) {
                    console.error('Wallpaper generation failed:', e);
                    if (window.showCustomAlert) window.showCustomAlert('生成失败: ' + e.message);
                } finally {
                    updateStatus(originalText);
                    downloadBtn.disabled = false;
                }
            });
        }

        if (bgModeSelect) {
            bgModeSelect.value = settings.backgroundMode;
            bgModeSelect.addEventListener('change', (e) => {
                settings.backgroundMode = e.target.value;
                saveSettings();
                applySettings();
                syncUiVisibility();
            });
        }
        
        if (emojiScaleSelect) {
            emojiScaleSelect.value = settings.emojiScale || 1.0;
            const updateValueDisplay = (val) => {
                const display = document.getElementById('personalizeEmojiScaleValue');
                if (display) display.textContent = parseFloat(val).toFixed(1);
            };
            updateValueDisplay(emojiScaleSelect.value);

            emojiScaleSelect.addEventListener('input', (e) => {
                updateValueDisplay(e.target.value);
            });

            emojiScaleSelect.addEventListener('change', (e) => {
                settings.emojiScale = parseFloat(e.target.value);
                saveSettings();
                applySettings(); 
            });
        }

        if (bgColorInput) {
            bgColorInput.value = settings.backgroundColor;
            bgColorInput.addEventListener('input', (e) => {
                settings.backgroundColor = e.target.value;
                if (settings.backgroundMode !== 'emoji') {
                    settings.backgroundMode = 'color';
                    if (bgModeSelect) bgModeSelect.value = 'color';
                }
                saveSettings();
                applySettings();
                syncUiVisibility();
            });
        }

        if (bgImageInput) {
            bgImageInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                processImageFile(file, 1200).then((dataUrl) => {
                    if (!dataUrl) return;
                    settings.backgroundImage = dataUrl;
                    settings.backgroundMode = 'image';
                    if (bgModeSelect) bgModeSelect.value = 'image';
                    saveSettings();
                    applySettings();
                    syncUiVisibility();
                });
            });
        }

        if (bgClearBtn) {
            bgClearBtn.addEventListener('click', () => {
                settings.backgroundImage = '';
                settings.backgroundMode = 'default';
                if (bgModeSelect) bgModeSelect.value = 'default';
                if (bgImageInput) bgImageInput.value = '';
                saveSettings();
                applySettings();
                syncUiVisibility();
            });
        }

        if (emojiLayoutSelect) {
            emojiLayoutSelect.value = settings.emojiLayout;
            emojiLayoutSelect.addEventListener('change', (e) => {
                settings.emojiLayout = e.target.value;
                settings.emojiSeed = Date.now();
                saveSettings();
                applySettings();
            });
        }

        if (emojiPickBtn) {
            emojiPickBtn.addEventListener('click', () => {
                openEmojiMaterialModal();
            });
        }

        updateEmojiCount();
        applySettings();
        syncUiVisibility();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    let resizeTimer = null;
    let lastWindowWidth = window.innerWidth;
    
    window.addEventListener('resize', () => {
        updatePreviewAspect();
        if (settings.backgroundMode !== 'emoji') return;
        
        // Ignore vertical-only resizes (address bar toggling on mobile)
        const currentWidth = window.innerWidth;
        if (Math.abs(currentWidth - lastWindowWidth) < 10) return;
        lastWindowWidth = currentWidth;

        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            applySettings();
        }, 120);
    });
})();
