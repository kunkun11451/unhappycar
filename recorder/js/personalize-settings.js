(function () {
    const STORAGE_KEY = 'recorder_personalize_settings_v1';
    const DEFAULT_SETTINGS = {
        backgroundMode: 'default', // default | color | image | emoji
        backgroundColor: '#ffffff',
        backgroundImage: '',
        emojiImages: [],
        emojiLayout: 'mix',
        emojiScale: 1.0,
        emojiSeed: 0,
        useHostWallpaper: true,
        fontColor: '#0f172a',
        btnColor: '#e1be88'
    };

    let settings = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SETTINGS;
    if (!settings.backgroundMode) settings.backgroundMode = 'default';
    if (!settings.backgroundColor) settings.backgroundColor = '#ffffff';
    if (!Array.isArray(settings.emojiImages)) settings.emojiImages = [];
    if (!settings.emojiLayout) settings.emojiLayout = 'mix';
    if (typeof settings.emojiScale !== 'number') settings.emojiScale = 1.0;
    if (typeof settings.useHostWallpaper !== 'boolean') settings.useHostWallpaper = true;
    if (!settings.emojiSeed) settings.emojiSeed = 0;
    if (!settings.backgroundImage) settings.backgroundImage = '';
    if (!settings.fontColor) settings.fontColor = '#0f172a';
    if (!settings.btnColor) settings.btnColor = '#e1be88';
    let personalizeSyncTimer = null;
    const WALLPAPER_SYNC_DEBOUNCE_MS = 5000;

    // Export internal interface for online sync
    window.__personalize_settings = {
        getExportState: () => {
            if (settings.backgroundMode === 'color') {
                return {
                    backgroundMode: 'color',
                    backgroundColor: settings.backgroundColor,
                    fontColor: settings.fontColor,
                    btnColor: settings.btnColor
                };
            } else if (settings.backgroundMode === 'emoji') {
                return {
                    backgroundMode: 'emoji',
                    backgroundColor: settings.backgroundColor,
                    fontColor: settings.fontColor,
                    btnColor: settings.btnColor,
                    emojiImages: settings.emojiImages || [],
                    emojiLayout: settings.emojiLayout || 'mix',
                    emojiScale: settings.emojiScale || 1.0,
                    emojiSeed: settings.emojiSeed || 0
                };
            }
            return null; // Don't export default or image
        },
        importState: async (state) => {
            if (!settings.useHostWallpaper) return; // Only process if viewer wants it

            const bgContainer = ensureBackgroundContainer();
            const root = document.documentElement;

            if (!state || (state.backgroundMode !== 'color' && state.backgroundMode !== 'emoji')) {
                // If the host has default/image or we didn't get state, revert to viewer's own settings
                applySettings();
                return;
            }

            // Reset legacy inline styles
            document.body.style.removeProperty('background-color');
            document.body.style.removeProperty('background-image');
            document.body.style.removeProperty('background-size');
            document.body.style.removeProperty('background-position');
            document.body.style.removeProperty('background-repeat');
            document.body.style.removeProperty('background-attachment');

            // Apply host theme
            setThemeLock(true); // Since it's color/emoji
            root.classList.add('personalize-active');
            document.body.classList.add('personalize-bg');
            bgContainer.style.display = 'block';

            if (state.backgroundMode === 'color') {
                root.style.setProperty('--personalize-bg-color', state.backgroundColor);
                bgContainer.style.backgroundColor = state.backgroundColor;
                bgContainer.style.backgroundImage = 'none';
                lastEmojiWallpaperDataUrl = '';
                applyElementColorsFromState(state);
            } else if (state.backgroundMode === 'emoji') {
                root.style.setProperty('--personalize-bg-color', state.backgroundColor);
                bgContainer.style.backgroundColor = state.backgroundColor;
                applyElementColorsFromState(state);
                
                try {
                    const images = await loadEmojiImagesForCanvas(state.emojiImages);
                    if (images.length > 0) {
                        const bgData = drawEmojiWallpaper(
                            images, 
                            state.emojiLayout, 
                            state.backgroundColor, 
                            state.emojiSeed, 
                            state.emojiScale
                        );
                        bgContainer.style.backgroundImage = `url("${bgData}")`;
                        bgContainer.style.backgroundSize = 'cover';
                    } else {
                        bgContainer.style.backgroundImage = 'none';
                    }
                } catch (e) {
                    console.error("Failed to render host emoji wallpaper", e);
                }
            }
        },
        settings: settings
    };

    function saveSettings(options = {}) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            // Trigger state sync if host
            if (!document.body.classList.contains('viewer-mode') && window.__recorder_actions && window.__recorder_actions.pushStateChange) {
                const debounceMs = Number(options.debounceSyncMs || 0);
                if (debounceMs > 0) {
                    if (personalizeSyncTimer) clearTimeout(personalizeSyncTimer);
                    personalizeSyncTimer = setTimeout(() => {
                        personalizeSyncTimer = null;
                        window.__recorder_actions.pushStateChange(); // Broadcast wallpaper change
                    }, debounceMs);
                } else {
                    window.__recorder_actions.pushStateChange(); // Broadcast wallpaper change
                }
            }
            return true;
        } catch (err) {
            console.warn('Failed to save personalize settings:', err);
            if (window.showCustomAlert) {
                window.showCustomAlert('图片过大，无法保存到本地存储。已临时应用，但刷新后可能丢失。');
            }
            return false;
        }
    }

    function saveWallpaperSettings() {
        return saveSettings({ debounceSyncMs: WALLPAPER_SYNC_DEBOUNCE_MS });
    }

    function hexToRgb(hex) {
        if (!hex || hex.length !== 7) return '255, 255, 255';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    }

    function applyElementColorsFromState(state) {
        const root = document.body;
        const props = ['--pc-font-color', '--pc-font-muted', '--pc-font-muted-rgb', '--pc-font-muted-dark', '--pc-btn-color', '--pc-btn-rgb', '--pc-btn-hover', '--pc-btn-hover-border'];

        if (!state || (state.backgroundMode !== 'color' && state.backgroundMode !== 'emoji')) {
            props.forEach(p => root.style.removeProperty(p));
            return;
        }

        const fontColor = state.fontColor || '#0f172a';
        const btnColor = state.btnColor || '#e1be88';

        root.style.setProperty('--pc-font-color', fontColor);
        root.style.setProperty('--pc-font-muted', `color-mix(in srgb, ${fontColor}, white 40%)`);
        root.style.setProperty('--pc-font-muted-dark', `color-mix(in srgb, ${fontColor}, white 20%)`);
        root.style.setProperty('--pc-font-muted-rgb', hexToRgb(fontColor));

        root.style.setProperty('--pc-btn-color', btnColor);
        root.style.setProperty('--pc-btn-rgb', hexToRgb(btnColor));
        root.style.setProperty('--pc-btn-hover', `color-mix(in srgb, ${btnColor}, black 10%)`);
        root.style.setProperty('--pc-btn-hover-border', `color-mix(in srgb, ${btnColor}, black 20%)`);
    }

    
    function applyElementColors() {
        const root = document.body;
        if (settings.backgroundMode === 'default') {
            const props = ['--pc-font-color', '--pc-font-muted', '--pc-font-muted-rgb', '--pc-font-muted-dark', '--pc-btn-color', '--pc-btn-rgb', '--pc-btn-hover', '--pc-btn-hover-border'];
            props.forEach(p => root.style.removeProperty(p));
            return;
        }

        const fontColor = settings.fontColor || '#0f172a';
        const btnColor = settings.btnColor || '#e1be88';

        root.style.setProperty('--pc-font-color', fontColor);
        root.style.setProperty('--pc-font-muted', `color-mix(in srgb, ${fontColor}, white 40%)`);
        root.style.setProperty('--pc-font-muted-dark', `color-mix(in srgb, ${fontColor}, white 20%)`);
        root.style.setProperty('--pc-font-muted-rgb', hexToRgb(fontColor));

        root.style.setProperty('--pc-btn-color', btnColor);
        root.style.setProperty('--pc-btn-rgb', hexToRgb(btnColor));
        root.style.setProperty('--pc-btn-hover', `color-mix(in srgb, ${btnColor}, black 10%)`);
        root.style.setProperty('--pc-btn-hover-border', `color-mix(in srgb, ${btnColor}, black 20%)`);
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
            const response = await fetch('../pt/image_urls.json');
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

        Object.entries(emojiUrls || {}).forEach(([charName, list]) => {
            if (charName === '崩铁') return; 
            if (!Array.isArray(list)) return;
            list.forEach(url => {
                if (!url || seen.has(url)) return;
                seen.add(url);
                all.push(url);
            });
        });

        return all;
    }

    function drawEmojiWallpaper(images, layout, bgColor, seed, scaleFactor, customWidth, customHeight, customDpr, returnCanvas = false) {
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

        if (!images.length) return returnCanvas ? canvas : canvas.toDataURL('image/png');

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
            return returnCanvas ? canvas : canvas.toDataURL('image/png');
        } catch (error) {
            console.warn('Failed to export emoji wallpaper:', error);
            return returnCanvas ? null : '';
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
            applyElementColors();
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
                 applyElementColors();
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
        applyElementColors();
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
                        <div style="position: relative; display: inline-block; margin-right: auto; flex-shrink: 0;">
                            <button class="btn" id="emojiPickPresetBtn">预设</button>
                            <div id="emojiPresetMenu" class="quick-theme-popup" style="position: absolute; bottom: 100%; left: 0; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 4px; z-index: 1000; margin-bottom: 8px; min-width: 160px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); cursor: default; display: flex; flex-direction: column; gap: 2px;"></div>
                        </div>
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
        let localBgColor = settings.backgroundColor || '#242424';
        let localFontColor = settings.fontColor || '#0f172a';
        let localBtnColor = settings.btnColor || '#e1be88';
        let localEmojiLayout = settings.emojiLayout || 'grid';
        let localEmojiScale = settings.emojiScale || 1.0;
        let quickPickerDocListenerController = null;

        const renderQuickColorPicker = (container, bgColor, fontColor, btnColor, layout, scale) => {
            if (!container) return;

            container.style.position = 'relative';
            container.style.display = 'inline-block';

            container.innerHTML = `
                <div class="emoji-option quick-theme-picker" id="emojiQuickMenuToggle" style="border: 2px solid rgba(255,255,255,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; background: ${bgColor}; margin: 0; box-sizing: border-box;" title="点此调整颜色与排列">
                    <span id="emojiQuickMenuToggleText" style="color: ${fontColor}; pointer-events: none; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));">
                        <svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
                            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
                            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
                            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
                            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.551-2.5 5.551-5.652C22 5.61 17.5 2 12 2z"></path>
                        </svg>
                    </span>
                </div>
                
                <div id="emojiQuickMenuPopup" class="quick-theme-popup" style="position: absolute; bottom: 100%; left: 0; background: ${bgColor}; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 10px; z-index: 1000; margin-bottom: 8px; width: 220px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); cursor: default;">
                    <style>
                            .quick-theme-menu-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; color: ${fontColor}; font-size: 0.85rem; }
                            .quick-theme-menu-item:last-child { margin-bottom: 0; }
                            .quick-theme-menu-item input[type="color"] { border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 0; cursor: pointer; }
                            .quick-theme-menu-item .btn-icon { color: ${fontColor}; border-color: rgba(255,255,255,0.1); }
                            .quick-theme-menu-item select { color: ${fontColor}; background-color: rgba(0,0,0,0.1); border-color: rgba(255,255,255,0.1); }
                        </style>
                        <div class="quick-theme-menu-item">
                            <span>背景颜色</span>
                            <input type="color" value="${bgColor}" id="emojiQuickBgColor" style="width:28px;height:28px;">
                        </div>
                        <div class="quick-theme-divider" style="height: 1px; background: ${fontColor}; opacity: 0.1; margin: 4px 6px;"></div>
                        <div class="quick-theme-menu-item">
                            <span>字体颜色</span>
                            <input type="color" value="${fontColor}" id="emojiQuickFontColor" style="width:28px;height:28px;">
                        </div>
                        <div class="quick-theme-divider" style="height: 1px; background: ${fontColor}; opacity: 0.1; margin: 4px 6px;"></div>
                        <div class="quick-theme-menu-item">
                            <span>控件颜色</span>
                            <input type="color" value="${btnColor}" id="emojiQuickBtnColor" style="width:28px;height:28px;">
                        </div>
                        <div class="quick-theme-divider" style="height: 1px; background: ${fontColor}; opacity: 0.1; margin: 4px 6px;"></div>
                        <div class="quick-theme-menu-item">
                            <span>排列方式</span>
                            <select id="emojiQuickLayout" class="settings-select" style="padding: 2px 24px 2px 8px; font-size: 0.8rem; width: auto; max-width: 80px; height: 28px;">
                                <option value="grid" ${layout === 'grid' ? 'selected' : ''}>网格</option>
                                <option value="diamond" ${layout === 'diamond' ? 'selected' : ''}>菱形</option>
                                <option value="hex" ${layout === 'hex' ? 'selected' : ''}>六边形</option>
                                <option value="spiral" ${layout === 'spiral' ? 'selected' : ''}>螺旋</option>
                                <option value="foam" ${layout === 'foam' ? 'selected' : ''}>泡泡</option>
                                <option value="mix" ${layout === 'mix' ? 'selected' : ''}>堆叠</option>
                            </select>
                        </div>
                        <div class="quick-theme-divider" style="height: 1px; background: ${fontColor}; opacity: 0.1; margin: 4px 6px;"></div>
                        <div class="quick-theme-menu-item">
                            <span>表情大小</span>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <button class="btn btn-icon" id="emojiQuickScaleDec" style="width: 24px; height: 24px; padding: 0;">-</button>
                                <span id="emojiQuickScaleVal" style="min-width: 2em; text-align: center; user-select: none; -webkit-user-select: none;">${scale.toFixed(1)}</span>
                                <button class="btn btn-icon" id="emojiQuickScaleInc" style="width: 24px; height: 24px; padding: 0;">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const toggle = container.querySelector('#emojiQuickMenuToggle');
            const popup = container.querySelector('#emojiQuickMenuPopup');

            toggle.addEventListener('click', (e) => {
                if (e.target.closest('#emojiQuickMenuPopup')) return;
                e.stopPropagation();
                popup.classList.toggle('show');
            });

            if (quickPickerDocListenerController) {
                quickPickerDocListenerController.abort();
            }
            quickPickerDocListenerController = new AbortController();

            document.addEventListener('click', (e) => {
                if (document.body.contains(container) && !container.contains(e.target)) {
                    popup.classList.remove('show');
                }
            }, { signal: quickPickerDocListenerController.signal });

            const bindColorInput = (id, onColor, targetElementCallback) => {
                const input = container.querySelector(`#${id}`);
                if (!input) return;
                input.addEventListener('input', (e) => {
                    const value = e.target.value;
                    onColor(value);
                    if (targetElementCallback) {
                        targetElementCallback(value);
                    }
                });
            };

            bindColorInput('emojiQuickBgColor', (value) => {
                localBgColor = value;
            }, (val) => {
                toggle.style.background = val;
                popup.style.background = val;
            });

            bindColorInput('emojiQuickFontColor', (value) => {
                localFontColor = value;
            }, (val) => {
                const span = container.querySelector('#emojiQuickMenuToggleText');
                if (span) span.style.color = val;
                const items = popup.querySelectorAll('.quick-theme-menu-item');
                items.forEach(item => item.style.color = val);
                const buttons = popup.querySelectorAll('.btn-icon');
                buttons.forEach(btn => btn.style.color = val);
                const selects = popup.querySelectorAll('.settings-select');
                selects.forEach(sel => sel.style.color = val);
                const dividers = popup.querySelectorAll('.quick-theme-divider');
                dividers.forEach(div => div.style.background = val);
            });

            bindColorInput('emojiQuickBtnColor', (value) => {
                localBtnColor = value;
            });

            const layoutSelect = container.querySelector('#emojiQuickLayout');
            if (layoutSelect) {
                layoutSelect.addEventListener('change', (e) => {
                    localEmojiLayout = e.target.value;
                });
            }

            const scaleDec = container.querySelector('#emojiQuickScaleDec');
            const scaleInc = container.querySelector('#emojiQuickScaleInc');
            const scaleVal = container.querySelector('#emojiQuickScaleVal');
            if (scaleDec && scaleInc && scaleVal) {
                const updateScale = (delta) => {
                    localEmojiScale = Math.max(0.1, Math.min(5.0, (localEmojiScale + delta)));
                    scaleVal.textContent = localEmojiScale.toFixed(1);
                };
                
                const attachHoldEvent = (btn, delta) => {
                    let timer = null;
                    let interval = null;
                    const stopHold = (e) => {
                        if (e && e.pointerId && btn.hasPointerCapture(e.pointerId)) {
                            btn.releasePointerCapture(e.pointerId);
                        }
                        clearTimeout(timer);
                        clearInterval(interval);
                    };
                    btn.addEventListener('pointerdown', (e) => {
                        if (e.pointerId) btn.setPointerCapture(e.pointerId);
                        e.preventDefault();
                        updateScale(delta);
                        timer = setTimeout(() => {
                            interval = setInterval(() => {
                                updateScale(delta);
                            }, 80);
                        }, 400);
                    });
                    btn.addEventListener('pointerup', stopHold);
                    btn.addEventListener('pointercancel', stopHold);
                    btn.addEventListener('contextmenu', (e) => e.preventDefault());
                };
                
                attachHoldEvent(scaleDec, -0.1);
                attachHoldEvent(scaleInc, 0.1);
            }
        };

        const renderSelected = () => {
            if (selectedLabel) {
                selectedLabel.textContent = `已勾选 ${selected.length} / 12`;
            }
            if (selectedGrid) {
                selectedGrid.innerHTML = `
                    <div id="emojiQuickThemePickerMount"></div>
                ` + selected.map(url => `
                    <div class="emoji-option selected" data-url="${url}">
                        <img src="${url}" alt="已选表情" loading="lazy">
                        <div class="emoji-check">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                `).join('');

                const quickPickerMount = selectedGrid.querySelector('#emojiQuickThemePickerMount');
                renderQuickColorPicker(quickPickerMount, localBgColor, localFontColor, localBtnColor, localEmojiLayout, localEmojiScale);
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
            const unmappedUrls = [];

            for (const [charName, urls] of Object.entries(emojiUrls || {})) {
                if (charName === '崩铁') continue;
                if (urls && urls.length > 0) {
                    if (charData[charName]) {
                        result[charName] = urls;
                    } else {
                        unmappedUrls.push(...urls);
                    }
                }
            }

            const finalResult = {};
            if (unmappedUrls.length > 0) {
                finalResult['未实装或其他角色'] = [...new Set(unmappedUrls)]; // 去重
            }
            for (const key in result) {
                finalResult[key] = result[key];
            }

            return finalResult;
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

                let avatarHtml = '';
                if (name === '未实装或其他角色') {
                    avatarHtml = `
                        <div class="char-pref-avatar" style="background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; box-sizing: border-box; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
                            <img src="https://upload-bbs.miyoushe.com/upload/2026/02/01/284249424/e792aef6b6978b37340d0d4b44e7f699_1599720184154830647.png" style="width: 100%; height: 100%; object-fit: cover;" alt="其他角色">
                        </div>
                    `;
                } else {
                    avatarHtml = `<img src="${defaultAvatar}" class="char-pref-avatar" alt="${name}">`;
                }

                return `
                    <div class="char-pref-item" data-char="${name}" data-rendered="false">
                        <div class="char-pref-header">
                            ${avatarHtml}
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
                
                settings.backgroundColor = localBgColor;
                settings.fontColor = localFontColor;
                settings.btnColor = localBtnColor;
                settings.emojiLayout = localEmojiLayout;
                settings.emojiScale = localEmojiScale;
                
                const mainColorInput = document.getElementById('personalizeBgColor');
                if (mainColorInput) mainColorInput.value = localBgColor;
                const mainFontColorInput = document.getElementById('personalizeFontColor');
                if (mainFontColorInput) mainFontColorInput.value = localFontColor;
                const mainBtnColorInput = document.getElementById('personalizeBtnColor');
                if (mainBtnColorInput) mainBtnColorInput.value = localBtnColor;
                const mainLayoutSelect = document.getElementById('personalizeEmojiLayout');
                if (mainLayoutSelect) mainLayoutSelect.value = localEmojiLayout;
                const mainScaleText = document.getElementById('personalizeEmojiScaleValue');
                if (mainScaleText) mainScaleText.textContent = localEmojiScale.toFixed(1);
                
                const bgModeSelect = document.getElementById('personalizeBgMode');
                if (bgModeSelect) bgModeSelect.value = 'emoji';
                saveWallpaperSettings();
                updateEmojiCount();
                applySettings();
                syncUiVisibility();
                closeModal();
            });
        }

        if (selectedGrid) {
            selectedGrid.addEventListener('click', (e) => {
                if (e.target.closest('#emojiQuickMenuToggle')) return;
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
                const term = e.target.value.trim().replace(/['\s]/g, '');
                renderCharList(term);
            });
        }

        const presetBtn = modal.querySelector('#emojiPickPresetBtn');
        const emojiPresetMenu = modal.querySelector('#emojiPresetMenu');
        
        if (presetBtn && emojiPresetMenu) {
            presetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isShowing = emojiPresetMenu.classList.contains('show');
                if (isShowing) {
                    emojiPresetMenu.classList.remove('show');
                } else {
                    renderPresetMenuContent(emojiPresetMenu, selected, {
                        bgColor: localBgColor,
                        fontColor: localFontColor,
                        btnColor: localBtnColor,
                        emojiLayout: localEmojiLayout,
                        emojiScale: localEmojiScale
                    }, (newSelection, loadedPreset) => {
                        // Update selected array
                        selected.splice(0, selected.length, ...newSelection);
                        if (loadedPreset) {
                            localBgColor = loadedPreset.bgColor || localBgColor;
                            localFontColor = loadedPreset.fontColor || localFontColor;
                            localBtnColor = loadedPreset.btnColor || localBtnColor;
                            localEmojiLayout = loadedPreset.emojiLayout || localEmojiLayout;
                            localEmojiScale = loadedPreset.emojiScale !== undefined ? loadedPreset.emojiScale : localEmojiScale;
                        }
                        renderSelected();
                        // Refresh char list to show correct selection state
                        if (searchInput) {
                            renderCharList(searchInput.value.trim().replace(/['\s]/g, ''));
                        } else {
                            renderCharList();
                        }
                    });
                    emojiPresetMenu.style.background = localBgColor;
                    emojiPresetMenu.classList.add('show');
                }
            });

            document.addEventListener('click', (e) => {
                if (document.body.contains(emojiPresetMenu) && !presetBtn.contains(e.target) && !emojiPresetMenu.contains(e.target)) {
                    emojiPresetMenu.classList.remove('show');
                }
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

    function renderPresetMenuContent(menu, currentSelection, currentColors, onLoadCallback) {
        menu.innerHTML = '';
        if (!Array.isArray(settings.emojiPresets)) settings.emojiPresets = [];

        const fontColor = currentColors.fontColor || '#f1f5f9';

        // Save Item
        const saveItem = document.createElement('div');
        saveItem.innerHTML = '<span>+ 保存当前预设</span>';
        saveItem.style.cssText = `padding: 8px 12px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; transition: background 0.2s; color: ${fontColor}; font-size: 0.9rem;`;
        saveItem.onmouseover = () => saveItem.style.background = 'rgba(255, 255, 255, 0.1)';
        saveItem.onmouseout = () => saveItem.style.background = 'transparent';
        saveItem.onclick = () => {
            if (currentSelection.length === 0) {
                if (window.showCustomAlert) window.showCustomAlert('请先选择表情素材');
                else alert('请先选择表情素材');
                return;
            }
            
            const handleSave = (name) => {
                if (name) {
                    const existingIdx = settings.emojiPresets.findIndex(p => p.name === name);
                    if (existingIdx >= 0) {
                        const doOverwrite = () => {
                            settings.emojiPresets[existingIdx].images = [...currentSelection];
                            settings.emojiPresets[existingIdx].bgColor = currentColors.bgColor;
                            settings.emojiPresets[existingIdx].fontColor = currentColors.fontColor;
                            settings.emojiPresets[existingIdx].btnColor = currentColors.btnColor;
                            settings.emojiPresets[existingIdx].emojiLayout = currentColors.emojiLayout;
                            settings.emojiPresets[existingIdx].emojiScale = currentColors.emojiScale;
                            saveSettings();
                        };

                        if (window.showCustomConfirm) {
                            window.showCustomConfirm(`预设 "${name}" 已存在，是否覆盖？`, doOverwrite, null, '覆盖预设', '覆盖');
                        } else if (confirm(`预设 "${name}" 已存在，是否覆盖？`)) {
                             doOverwrite();
                        }
                    } else {
                        settings.emojiPresets.push({
                            name: name,
                            images: [...currentSelection],
                            bgColor: currentColors.bgColor,
                            fontColor: currentColors.fontColor,
                            btnColor: currentColors.btnColor,
                            emojiLayout: currentColors.emojiLayout,
                            emojiScale: currentColors.emojiScale
                        });
                        saveSettings();
                    }
                }
            };
            
            menu.classList.remove('show'); // Hide menu before showing prompt

            if (window.showCustomPrompt) {
                const existingNames = settings.emojiPresets.map(p => p.name);
                window.showCustomPrompt('请输入预设名称', '', handleSave, null, '保存预设', '确定', '取消', existingNames);
            } else {
                const name = prompt('请输入预设名称', '');
                if (name) handleSave(name);
            }
        };
        menu.appendChild(saveItem);

        // Divider
        if (settings.emojiPresets.length > 0) {
            const separator = document.createElement('div');
            separator.className = 'quick-theme-divider';
            separator.style.cssText = `height: 1px; background: ${fontColor}; opacity: 0.15; margin: 4px 6px;`;
            menu.appendChild(separator);

            settings.emojiPresets.forEach((preset, idx) => {
                const item = document.createElement('div');
                item.className = 'quick-theme-divider-label';
                item.style.cssText = `padding: 8px 12px; cursor: pointer; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; color: ${fontColor};`;
                item.title = `包含 ${preset.images.length} 个表情`;
                
                const label = document.createElement('span');
                label.textContent = preset.name;
                label.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px;';
                
                const del = document.createElement('span');
                del.innerHTML = '&times;';
                del.style.cssText = 'opacity: 0.6; font-size: 1.2em; padding: 0 4px; margin-right: -4px;';
                del.onmouseover = () => del.style.opacity = '1';
                del.onmouseout = () => del.style.opacity = '0.6';
                del.onclick = (e) => {
                    e.stopPropagation();
                    const handleDelete = () => {
                        settings.emojiPresets.splice(idx, 1);
                        saveSettings();
                        menu.classList.remove('show');
                    };

                    if (window.showCustomConfirm) {
                        window.showCustomConfirm(`确定要删除预设 "${preset.name}" 吗？`, handleDelete, null, '删除预设');
                    } else if (confirm(`删除预设 "${preset.name}"?`)) {
                        handleDelete();
                    }
                };

                item.appendChild(label);
                item.appendChild(del);
                
                item.onmouseover = () => item.style.background = 'rgba(255, 255, 255, 0.1)';
                item.onmouseout = () => item.style.background = 'transparent';
                item.onclick = () => {
                   if (onLoadCallback) onLoadCallback(preset.images, preset);
                   menu.classList.remove('show');
                };
                
                menu.appendChild(item);
            });
        }

        // IO Row at bottom
        const separatorBottom = document.createElement('div');
        separatorBottom.className = 'quick-theme-divider';
        separatorBottom.style.cssText = `height: 1px; background: ${fontColor}; opacity: 0.15; margin: 4px 6px;`;
        menu.appendChild(separatorBottom);

        const ioRow = document.createElement('div');
        ioRow.style.cssText = `display: flex; gap: 4px; padding: 4px; margin-top: 2px;`;

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn';
        exportBtn.style.cssText = `flex: 1; padding: 6px; font-size: 0.8rem; border-radius: 4px;`;
        exportBtn.textContent = '导出';
        exportBtn.onclick = async (e) => {
            e.stopPropagation();
            menu.classList.remove('show');
            try {
                const dataStr = JSON.stringify(settings.emojiPresets || []);
                const exportText = '导出的表情符号墙纸预设：\n\n' + dataStr;
                await navigator.clipboard.writeText(exportText);
                if (window.showToast) window.showToast('预设内容已导出到剪贴板');
                else alert('预设内容已导出到剪贴板');
            } catch (err) {
                console.error('Export failed', err);
                if (window.showCustomAlert) window.showCustomAlert('导出失败，请检查浏览器剪贴板权限');
                else alert('导出失败，请检查浏览器剪贴板权限');
            }
        };

        const importBtn = document.createElement('button');
        importBtn.className = 'btn';
        importBtn.style.cssText = `flex: 1; padding: 6px; font-size: 0.8rem; border-radius: 4px;`;
        importBtn.textContent = '导入';
        importBtn.onclick = (e) => {
            e.stopPropagation();
            menu.classList.remove('show');
            
            const doImport = async () => {
                try {
                    let text = await navigator.clipboard.readText();
                    if (!text) {
                        if (window.showToast) window.showToast('剪贴板为空');
                        return;
                    }
                    
                    text = text.trim();
                    if (text.startsWith('导出的表情符号墙纸预设：')) {
                        const arrayStart = text.indexOf('[');
                        if (arrayStart !== -1) {
                            text = text.substring(arrayStart);
                        }
                    }

                    const parsed = JSON.parse(text);

                    if (Array.isArray(parsed)) {
                        const validUrls = new Set(await getAllEmojiUrls());
                        const sanitized = parsed.map(p => {
                            if (Array.isArray(p.images)) {
                                p.images = p.images.filter(url => validUrls.has(url));
                            } else {
                                p.images = [];
                            }
                            return p;
                        });
                        
                        settings.emojiPresets = sanitized;
                        if (typeof saveSettings === 'function') saveSettings();
                        if (window.showToast) window.showToast('预设导入成功');
                    } else {
                        throw new Error('解析失败，数据不是数组格式');
                    }
                } catch (err) {
                    console.error('Import failed', err);
                    if (window.showCustomAlert) window.showCustomAlert('导入失败：内容格式不正确或未获取到剪贴板权限，请确保你已经复制了预设数据。');
                    else alert('导入失败：内容格式不正确或未获取到剪贴板权限。');
                }
            };

            if (window.showCustomConfirm) {
                window.showCustomConfirm('请先复制已导出的预设内容后点击确定，将自动读取剪贴板覆盖当前所有预设。', doImport, null, '导入预设');
            } else {
                if (confirm('请先复制已导出的预设内容后点击确定，将自动读取剪贴板覆盖当前所有预设。')) {
                    doImport();
                }
            }
        };

        ioRow.appendChild(exportBtn);
        ioRow.appendChild(importBtn);
        menu.appendChild(ioRow);
    }

    function syncUiVisibility() {
        const bgColorItem = document.getElementById('personalizeBgColorItem');
        const bgImageItem = document.getElementById('personalizeBgImageItem');
        const emojiItem = document.getElementById('personalizeEmojiItem');
        const emojiLayoutItem = document.getElementById('personalizeEmojiLayoutItem');
        const emojiScaleItem = document.getElementById('personalizeEmojiScaleItem');
        const previewItem = document.getElementById('personalizePreviewItem');
        const downloadItem = document.getElementById('personalizeDownloadItem');
        const fontColorItem = document.getElementById('personalizeFontColorItem');
        const btnColorItem = document.getElementById('personalizeBtnColorItem');
        const wallpaperColorGroupDetails = document.getElementById('wallpaperColorGroupDetails');

        if (bgColorItem) bgColorItem.style.display = (settings.backgroundMode === 'color' || settings.backgroundMode === 'emoji') ? 'flex' : 'none';
        if (bgImageItem) bgImageItem.style.display = settings.backgroundMode === 'image' ? 'flex' : 'none';
        if (emojiItem) emojiItem.style.display = settings.backgroundMode === 'emoji' ? 'flex' : 'none';
        if (emojiLayoutItem) emojiLayoutItem.style.display = settings.backgroundMode === 'emoji' ? 'flex' : 'none';
        if (emojiScaleItem) emojiScaleItem.style.display = settings.backgroundMode === 'emoji' ? 'flex' : 'none';
        if (previewItem) previewItem.style.display = settings.backgroundMode === 'emoji' ? 'flex' : 'none';
        if (downloadItem) downloadItem.style.display = settings.backgroundMode === 'emoji' ? 'flex' : 'none';
        if (fontColorItem) fontColorItem.style.display = settings.backgroundMode === 'default' ? 'none' : 'flex';
        if (btnColorItem) btnColorItem.style.display = settings.backgroundMode === 'default' ? 'none' : 'flex';
        if (wallpaperColorGroupDetails) wallpaperColorGroupDetails.style.display = settings.backgroundMode === 'default' ? 'none' : 'block';

        if (settings.useHostWallpaper) {
            document.body.classList.add('use-host-wallpaper');
        } else {
            document.body.classList.remove('use-host-wallpaper');
        }
    }

    function init() {
        
        const fontColorInput = document.getElementById('personalizeFontColor');
        if (fontColorInput) {
            fontColorInput.value = settings.fontColor || '#0f172a';
            fontColorInput.addEventListener('input', (e) => {
                settings.fontColor = e.target.value;
                applyElementColors();
            });
            fontColorInput.addEventListener('change', (e) => {
                settings.fontColor = e.target.value;
                saveWallpaperSettings();
                applyElementColors();
            });
        }
        
        const btnColorInput = document.getElementById('personalizeBtnColor');
        if (btnColorInput) {
            btnColorInput.value = settings.btnColor || '#e1be88';
            btnColorInput.addEventListener('input', (e) => {
                settings.btnColor = e.target.value;
                applyElementColors();
            });
            btnColorInput.addEventListener('change', (e) => {
                settings.btnColor = e.target.value;
                saveWallpaperSettings();
                applyElementColors();
            });
        }
        
        const useHostWallpaperToggle = document.getElementById('useHostWallpaperToggle');
        if (useHostWallpaperToggle) {
            useHostWallpaperToggle.checked = settings.useHostWallpaper;
            useHostWallpaperToggle.addEventListener('change', (e) => {
                settings.useHostWallpaper = e.target.checked;
                saveSettings();
                syncUiVisibility();
                
                // If turning it on as a viewer, attempt to fetch state from host.
                // We don't have direct access to socket, but we can trigger a state sync request or
                // just rely on the host's next broadcast. For now, it will apply when host updates or viewer rejoins.
                // A local applySettings will clear out the current wallpaper if the host hasn't synced yet.
                if (settings.useHostWallpaper && document.body.classList.contains('viewer-mode')) {
                    if (window.__recorder_actions && window.__recorder_actions.notifyViewerWallpaperPreferenceChanged) {
                        window.__recorder_actions.notifyViewerWallpaperPreferenceChanged();
                    }
                } else {
                    // Revert to viewer's own settings
                    applySettings();
                }
            });
        }
        
        const bgModeSelect = document.getElementById('personalizeBgMode');
        const bgColorInput = document.getElementById('personalizeBgColor');
        const bgImageInput = document.getElementById('personalizeBgImage');
        const bgClearBtn = document.getElementById('personalizeBgClear');
        const personalizeEmojiItem = document.getElementById('personalizeEmojiItem');
        const emojiLayoutSelect = document.getElementById('personalizeEmojiLayout');
        const emojiScaleDecreaseBtn = document.getElementById('emojiScaleDecrease');
        const emojiScaleIncreaseBtn = document.getElementById('emojiScaleIncrease');
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

                    const renderCanvas = drawEmojiWallpaper(
                        images, 
                        settings.emojiLayout, 
                        settings.backgroundColor, 
                        settings.emojiSeed, 
                        settings.emojiScale,
                        undefined, 
                        undefined, 
                        targetDpr,
                        true
                    );

                    if (renderCanvas) {
                        updateStatus('导出图片...');
                        await nextFrame();

                        const blob = await new Promise(resolve => {
                            renderCanvas.toBlob(resolve, 'image/png');
                        });

                        if (!blob) {
                            if (window.showCustomAlert) window.showCustomAlert('导出失败：无法生成图片');
                            return;
                        }

                        const link = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        link.download = `emoji-wallpaper-${Date.now()}-${scale}x.png`;
                        link.href = url;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
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
                saveWallpaperSettings();
                applySettings();
                syncUiVisibility();
            });
        }
        
        const emojiScaleValueDisplay = document.getElementById('personalizeEmojiScaleValue');
        if (emojiScaleDecreaseBtn && emojiScaleIncreaseBtn && emojiScaleValueDisplay) {
            let renderTimer = null;
            
            const updateScale = (newScale) => {
                // Constrain values
                if (newScale < 0.1) newScale = 0.1;
                if (newScale > 5.0) newScale = 5.0;
                
                settings.emojiScale = newScale;
                emojiScaleValueDisplay.textContent = settings.emojiScale.toFixed(1);
                
                saveWallpaperSettings();
                
                // Debounce heavy rendering
                if (renderTimer) clearTimeout(renderTimer);
                renderTimer = setTimeout(() => {
                    applySettings();
                }, 300);
            };

            // Initialize display
            emojiScaleValueDisplay.textContent = (settings.emojiScale || 1.0).toFixed(1);

            const attachHoldEvent = (btn, delta) => {
                let timer = null;
                let interval = null;
                const stopHold = (e) => {
                    if (e && e.pointerId && btn.hasPointerCapture(e.pointerId)) {
                        btn.releasePointerCapture(e.pointerId);
                    }
                    clearTimeout(timer);
                    clearInterval(interval);
                };
                btn.addEventListener('pointerdown', (e) => {
                    if (e.pointerId) btn.setPointerCapture(e.pointerId);
                    e.preventDefault();
                    let currentScale = settings.emojiScale || 1.0;
                    updateScale(Math.round((currentScale + delta) * 10) / 10);
                    timer = setTimeout(() => {
                        interval = setInterval(() => {
                            let currentScale = settings.emojiScale || 1.0;
                            updateScale(Math.round((currentScale + delta) * 10) / 10);
                        }, 80);
                    }, 400);
                });
                btn.addEventListener('pointerup', stopHold);
                btn.addEventListener('pointercancel', stopHold);
                btn.addEventListener('contextmenu', (e) => e.preventDefault());
            };

            attachHoldEvent(emojiScaleDecreaseBtn, -0.1);
            attachHoldEvent(emojiScaleIncreaseBtn, 0.1);
        }

        if (bgColorInput) {
            bgColorInput.value = settings.backgroundColor;
            bgColorInput.addEventListener('change', (e) => {
                settings.backgroundColor = e.target.value;
                if (settings.backgroundMode !== 'emoji') {
                    settings.backgroundMode = 'color';
                    if (bgModeSelect) bgModeSelect.value = 'color';
                }
                saveWallpaperSettings();
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
                    saveWallpaperSettings();
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
                saveWallpaperSettings();
                applySettings();
                syncUiVisibility();
            });
        }

        if (emojiLayoutSelect) {
            emojiLayoutSelect.value = settings.emojiLayout;
            emojiLayoutSelect.addEventListener('change', (e) => {
                settings.emojiLayout = e.target.value;
                settings.emojiSeed = Date.now();
                saveWallpaperSettings();
                applySettings();
            });
        }

        if (personalizeEmojiItem) {
            personalizeEmojiItem.addEventListener('click', () => {
                openEmojiMaterialModal();
            });
        }
        
        const refreshSeedBtn = document.getElementById('refreshSeedBtn');
        if (refreshSeedBtn) {
            refreshSeedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                settings.emojiSeed = Date.now();
                saveWallpaperSettings();
                applySettings();
                
                const icon = refreshSeedBtn.querySelector('svg');
                if (icon) {
                    icon.style.transition = 'transform 0.4s ease-out';
                    icon.style.transform = 'rotate(180deg)';
                    setTimeout(() => {
                        icon.style.transition = 'none';
                        icon.style.transform = 'rotate(0deg)';
                    }, 400);
                }
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
        
        // Viewer logic: Need to re-render host wallpaper if they are using it and it's emoji type
        if (settings.useHostWallpaper && document.body.classList.contains('viewer-mode')) {
             if (window.__onlineMode && window.__onlineMode.getLastSyncedPayload) {
                 const payload = window.__onlineMode.getLastSyncedPayload();
                 if (payload && payload.personalizeState && payload.personalizeState.backgroundMode === 'emoji') {
                     // Check vertical-only resizes
                     const currentWidth = window.innerWidth;
                     if (Math.abs(currentWidth - lastWindowWidth) < 10) return;
                     lastWindowWidth = currentWidth;
             
                     if (resizeTimer) clearTimeout(resizeTimer);
                     resizeTimer = setTimeout(() => {
                         window.__personalize_settings.importState(payload.personalizeState);
                     }, 120);
                     return;
                 }
             }
        }

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
