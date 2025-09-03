const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('text-input');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const fontSizeSlider = document.getElementById('font-size-slider');
const positionYSlider = document.getElementById('position-y-slider');
const formatSelect = document.getElementById('format-select');
const imageUpload = document.getElementById('image-upload');
const imageSizeSlider = document.getElementById('image-size-slider');
const imageSizeInput = document.getElementById('image-size-input');
const imageUrlInput = document.getElementById('image-url-input');
const customUseBtn = document.getElementById('custom-use-btn');
const customPanel = document.getElementById('custom-image-panel');
const customPreview = document.getElementById('custom-preview');
const customPreviewImg = document.getElementById('custom-preview-img');
let pendingCustomSrc = '';
const galleryBtn = document.getElementById('gallery-btn');
const galleryModal = document.getElementById('gallery-modal');
const modalClose = document.querySelector('.modal-close');
const categoryContainer = document.getElementById('category-container');
const imageGallery = document.getElementById('image-gallery');
// --- First-load tip modal ---
const NO_TIP_KEY = 'pt_no_first_load_tip_v1';
function showFirstLoadTipIfNeeded() {
    try {
        if (localStorage.getItem(NO_TIP_KEY) === '1') return;
    } catch {}
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
        z-index: 10000; display: flex; justify-content: center; align-items: center;
        opacity: 0; transition: opacity .3s ease;`;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: rgb(235,228,214); color: #2c2f36; backdrop-filter: blur(15px);
        border-radius: 14px; padding: 24px; max-width: 480px; width: 92%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15); border: 1px solid rgb(209,191,162);
        transform: scale(0.96); transition: transform .3s ease; text-align: center;`;

    const title = document.createElement('h2');
    title.textContent = '提示';
    title.style.cssText = 'color:#8b6b3e; margin:0 0 10px 0; font-size:20px;';

    const msg = document.createElement('p');
    msg.textContent = '首次加载需下载字体文件和图片可能较慢，请耐心等待。';
    msg.style.cssText = 'margin:0 0 18px 0;';

    // 进度条容器与文本
    const progText = document.createElement('div');
    progText.style.cssText = 'font-size:12px; color:#6b5b45; margin:-6px 0 8px 0;';
    progText.textContent = '资源加载进度 0%';

    const progWrap = document.createElement('div');
    progWrap.style.cssText = 'height:8px; background:#e2d9c7; border-radius:999px; overflow:hidden; margin:0 0 14px 0;';
    const progBar = document.createElement('div');
    progBar.style.cssText = 'height:100%; width:0%; background:linear-gradient(90deg,#d1bca5,#8b6b3e); transition:width .2s ease;';
    progWrap.appendChild(progBar);

    modal.appendChild(title);
    modal.appendChild(msg);
    modal.appendChild(progText);
    modal.appendChild(progWrap);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => { overlay.style.opacity = '1'; modal.style.transform = 'scale(1)'; }, 10);
    let closed = false;
    const hide = () => {
        if (closed) return;
        closed = true;
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(0.96)';
        setTimeout(() => overlay.remove(), 300);
        // 清理全局进度回调，避免后续无弹窗时仍更新
        try { window.__ptPreloadTick = null; } catch {}
    };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });

    // 进度统计：字体 + 背景图 + 分类 JSON（数量 = jsonFiles.length）
    let total = 0;
    try { total = 2 + (Array.isArray(jsonFiles) ? jsonFiles.length : 0); } catch { total = 2; }
    let loaded = 0;
    const update = () => {
        const pct = Math.max(0, Math.min(100, Math.round((loaded / Math.max(1, total)) * 100)));
        progBar.style.width = pct + '%';
        progText.textContent = `资源加载进度 ${pct}%`;
        if (pct >= 100) {
            // 稍作延迟让 100% 的动画有时间展示
            setTimeout(() => hide(), 400);
        }
    };
    const tick = () => { loaded = Math.min(total, loaded + 1); update(); };
    // 提供给外部（initGallery 中每个 JSON 完成后调用）
    try { window.__ptPreloadTick = tick; } catch {}
    update();

    // 背景图完成或失败都推进一次
    try {
        if (backgroundImg && (backgroundImg.complete || backgroundImg.naturalWidth)) {
            tick();
        } else if (backgroundImg) {
            backgroundImg.addEventListener('load', tick, { once: true });
            backgroundImg.addEventListener('error', tick, { once: true });
        } else {
            tick();
        }
    } catch { tick(); }

    // 字体加载（若已缓存立即通过）
    try {
        const face = "12px 'HYWenHei-85W'";
        if (document.fonts && document.fonts.check(face)) {
            tick();
        } else if (document.fonts && document.fonts.load) {
            document.fonts.load(face).then(() => tick()).catch(() => tick());
        } else {
            // 旧浏览器不支持 FontFaceSet，直接记为完成
            tick();
        }
    } catch { tick(); }
}

// 统一的轻量提示弹窗
function showTipModal(message, { duration = 1800 } = {}) {
    try {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
            z-index: 10000; display: flex; justify-content: center; align-items: center;
            opacity: 0; transition: opacity .25s ease;`;
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: rgb(235,228,214); color: #2c2f36; backdrop-filter: blur(15px);
            border-radius: 14px; padding: 18px 20px; max-width: 420px; width: 86%;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15); border: 1px solid rgb(209,191,162);
            transform: scale(0.96); transition: transform .25s ease; text-align: center;`;
        const p = document.createElement('p');
        p.textContent = String(message || '');
        p.style.cssText = 'margin:0; font-size:14px; color:#2c2f36;';
        modal.appendChild(p);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        // 出现
        requestAnimationFrame(() => { overlay.style.opacity = '1'; modal.style.transform = 'scale(1)'; });
        // 关闭
        let closed = false;
        const hide = () => {
            if (closed) return; closed = true;
            overlay.style.opacity = '0'; modal.style.transform = 'scale(0.96)';
            setTimeout(() => overlay.remove(), 250);
        };
        const tid = setTimeout(hide, Math.max(500, duration|0));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) { clearTimeout(tid); hide(); } });
    } catch (e) { /* 忽略 */ }
}

const backgroundImg = new Image();
backgroundImg.src = 'input.png';

// 静态图像/动图的统一状态
let userImg = null; // Image 或者 OffscreenCanvas（用于单帧渲染）
let userImgPos = { x: 100, y: 100 };
let userImgSize = { width: 200, height: 200 };
// GIF 状态
let isGif = false;
let gifFrames = []; // 解析后的帧数据: {image: ImageBitmap|HTMLImageElement, delay: ms}
let gifTotalDuration = 0; // ms
let gifStartTime = 0; // requestAnimationFrame 起始时间
let gifPaused = false;
let gifFrameScaleCache = new WeakMap(); // 针对帧 image 的缩放缓存，避免频繁重采样
let isExportingGif = false; // 导出状态，防止重复点击并做进度提示

// 动态获取 gif.js worker 的同源 Blob URL，避免跨域 Worker 限制
let gifWorkerURLPromise = null;
async function getGifWorkerScriptURL() {
    if (gifWorkerURLPromise) return gifWorkerURLPromise;
    const candidates = [
        'https://cdn.jsdelivr.net/npm/gif.js.optimized/dist/gif.worker.js',
        'https://unpkg.com/gif.js.optimized/dist/gif.worker.js',
        'https://cdn.jsdelivr.net/npm/gif.js/dist/gif.worker.js'
    ];
    gifWorkerURLPromise = (async () => {
        let lastErr;
        for (const url of candidates) {
            try {
                const res = await fetch(url, { mode: 'cors' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const code = await res.text();
                const blob = new Blob([code], { type: 'application/javascript' });
                return URL.createObjectURL(blob);
            } catch (e) {
                lastErr = e;
            }
        }
        throw lastErr || new Error('无法加载 GIF worker 脚本');
    })();
    return gifWorkerURLPromise;
}

let isDragging = false;
let dragStart = { x: 0, y: 0 };
const snapThreshold = 10;
let isPointerActive = false; // 避免 pointer 与 mouse 双触发

// --- Gallery Data ---
const jsonFiles = [
    "原神×瑞幸咖啡联动.json", "小红书×心海联动.json", "抖音×八重神子联动.json",
    "达达利亚×小米.json", "原神×必胜客.json", "原神×一加手机.json",
    "派蒙的画作第1-2弹.json", "派蒙的画作第3-4弹.json", "派蒙的画作第5-6弹.json",
    "派蒙的画作第7-8弹.json", "派蒙的画作第9-10弹.json", "派蒙的画作第11-12弹.json",
    "派蒙的画作第13-14弹.json", "派蒙的画作第15-16弹.json", "派蒙的画作第17-18弹.json",
    "派蒙的画作第19-20弹.json", "派蒙的画作第21-22弹.json", "派蒙的画作第23-24弹.json",
    "派蒙的画作第25-26弹.json", "派蒙的画作第27-28弹.json", "派蒙的画作第29-30弹.json",
    "派蒙的画作第31-32弹.json", "派蒙的画作第33-34弹.json", "派蒙的画作第35-36弹.json",
    "派蒙的画作第37-38弹.json", "派蒙的画作第39-40弹.json", "派蒙的画作第41-42弹.json"
];
const galleryData = {};
// ---- Recents (最近使用) ----
const RECENTS_KEY = 'gallery_recents_v1';
const MAX_RECENTS = 50;
let recentImages = [];

function loadRecents() {
    try {
        const raw = localStorage.getItem(RECENTS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
}

function saveRecents(list) {
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(list)); } catch {}
}

function ensureRecentsCategory() {
    recentImages = loadRecents();
    galleryData['最近使用'] = recentImages;
}

function updateRecentsButtonThumb() {
    const btn = categoryContainer.querySelector('.category-btn[data-category="最近使用"]');
    if (!btn) return;
    const img = btn.querySelector('img');
    const first = recentImages && recentImages[0];
    if (first) {
        img.src = first;
        img.style.visibility = 'visible';
    } else {
        // 透明占位，避免布局抖动
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
        img.style.visibility = 'hidden';
    }
}

function addToRecents(url, refreshUI = false) {
    if (!url) return;
    // 去重 + 置顶
    recentImages = (recentImages || []).filter(u => u !== url);
    recentImages.unshift(url);
    if (recentImages.length > MAX_RECENTS) recentImages = recentImages.slice(0, MAX_RECENTS);
    saveRecents(recentImages);
    galleryData['最近使用'] = recentImages;
    if (refreshUI) {
        updateRecentsButtonThumb();
        // 如果当前在“最近使用”分类，刷新图片墙
        const active = document.querySelector('.category-btn.active');
        if (active && active.dataset.category === '最近使用') {
            displayCategory('最近使用');
        }
    }
}

// --- Main Drawing Logic ---

backgroundImg.onload = () => {
    canvas.width = backgroundImg.width;
    canvas.height = backgroundImg.height;
    redrawCanvas();
};

function redrawCanvas(frameImage = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImg, 0, 0);

    // 绘制用户图（静态或 GIF 当前帧）
    // 防御：如果外部误传了事件对象，应忽略
    const maybeImg = frameImage || userImg;
    const isDrawable = maybeImg && (maybeImg instanceof HTMLImageElement || maybeImg instanceof HTMLCanvasElement || typeof ImageBitmap !== 'undefined' && maybeImg instanceof ImageBitmap);
    const imgToDraw = isDrawable ? maybeImg : null;
    if (imgToDraw && (imgToDraw.complete === undefined || imgToDraw.complete)) {
        const scale = imageSizeSlider.value / 100;
        const baseW = imgToDraw.width || (userImg && userImg.width) || 0;
        const baseH = imgToDraw.height || (userImg && userImg.height) || 0;
        const w = baseW * scale;
        const h = baseH * scale;
        userImgSize = { width: w, height: h };
        ctx.drawImage(imgToDraw, userImgPos.x, userImgPos.y, w, h);
    }

    // 绘制文字
    const fontSize = fontSizeSlider.value;
    const positionYPercent = positionYSlider.value;
    ctx.fillStyle = 'rgb(59, 66, 85)';
    ctx.font = `${fontSize}px 'HYWenHei-85W'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = textInput.value;
    const x = canvas.width / 2;
    const y = canvas.height * (positionYPercent / 100);
    ctx.fillText(text, x, y);
}

// 动画循环，用于 GIF 预览
function tick(timestamp) {
    if (!isGif || gifPaused || gifFrames.length === 0) {
        // 非 GIF 或暂停时，不用刷新
        return;
    }
    if (!gifStartTime) gifStartTime = timestamp;
    const elapsed = (timestamp - gifStartTime) % gifTotalDuration;

    // 找到当前帧
    let acc = 0, frame = gifFrames[0];
    for (let i = 0; i < gifFrames.length; i++) {
        acc += gifFrames[i].delay;
        if (elapsed < acc) { frame = gifFrames[i]; break; }
    }

    // 尝试使用缓存的缩放帧，提高预览性能
    const scale = imageSizeSlider.value / 100;
    let toDraw = frame.image;
    try {
        const cache = gifFrameScaleCache.get(frame.image);
        if (cache && cache.scale === scale) {
            toDraw = cache.canvas;
        } else {
            const off = document.createElement('canvas');
            const w = Math.max(1, Math.round(frame.image.width * scale));
            const h = Math.max(1, Math.round(frame.image.height * scale));
            off.width = w; off.height = h;
            const octx = off.getContext('2d', { willReadFrequently: true });
            // GIF 采用无平滑缩放，减少噪声/边缘出血
            octx.imageSmoothingEnabled = false;
            octx.drawImage(frame.image, 0, 0, w, h);
            gifFrameScaleCache.set(frame.image, { scale, canvas: off });
            toDraw = off;
        }
    } catch {}

    // 在主 canvas 绘制该帧
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImg, 0, 0);
    // 主画布绘制时，同样关闭 GIF 的平滑
    ctx.imageSmoothingEnabled = isGif ? false : true;
    ctx.drawImage(toDraw, userImgPos.x, userImgPos.y);

    // 叠加文字
    const fontSize = fontSizeSlider.value;
    const positionYPercent = positionYSlider.value;
    ctx.fillStyle = 'rgb(59, 66, 85)';
    ctx.font = `${fontSize}px 'HYWenHei-85W'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = textInput.value;
    const x = canvas.width / 2;
    const y = canvas.height * (positionYPercent / 100);
    ctx.fillText(text, x, y);

    requestAnimationFrame(tick);
}

function drawGuidelines() {
    const imgCenterX = userImgPos.x + userImgSize.width / 2;
    const canvasCenterX = canvas.width / 2;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    if (Math.abs(imgCenterX - canvasCenterX) < 1) {
        ctx.beginPath();
        ctx.moveTo(canvasCenterX, 0);
        ctx.lineTo(canvasCenterX, canvas.height);
        ctx.stroke();
    }
}

async function loadImage(src) {
    // 重置 GIF 状态
    isGif = false;
    gifFrames = [];
    gifTotalDuration = 0;
    gifStartTime = 0;
    gifPaused = false;
    gifFrameScaleCache = new WeakMap();

    const lower = src.toLowerCase();
    const isGifUrl = lower.includes('.gif') || lower.startsWith('data:image/gif');

    // 如果可能是 GIF，则先尝试用 gifuct-js 解析
    if (isGifUrl) {
        try {
            const buf = await fetchArrayBuffer(src);
            const { parseGIF, decompressFrames } = window.gifuctJs || {};
            if (!parseGIF) throw new Error('GIF 解析库未加载');
            const gif = parseGIF(buf);
            const frames = decompressFrames(gif, true); // 生成每帧 patch（含 ms 级 delay）
            const gifW = gif.lsd && gif.lsd.width ? gif.lsd.width : (frames[0]?.dims?.width || 0);
            const gifH = gif.lsd && gif.lsd.height ? gif.lsd.height : (frames[0]?.dims?.height || 0);
            const comp = document.createElement('canvas');
            comp.width = gifW; comp.height = gifH;
            const cctx = comp.getContext('2d', { willReadFrequently: true });

            // 计算 GIF 逻辑屏幕背景色（若存在），用于处置=2 填充
            let bgFillStyle = null;
            try {
                const gct = gif.gct || gif.globalColorTable; // [[r,g,b], ...]
                const bgIndex = (gif.lsd && (gif.lsd.bgColor ?? gif.lsd.backgroundColor));
                if (gct && typeof bgIndex === 'number' && gct[bgIndex]) {
                    const [r, g, b] = gct[bgIndex];
                    bgFillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
                }
            } catch {}
            // 初始背景填充（如有），符合 GIF 合成规则
            if (bgFillStyle) {
                cctx.fillStyle = bgFillStyle;
                cctx.fillRect(0, 0, comp.width, comp.height);
            } else {
                // 否则保持透明背景
                cctx.clearRect(0, 0, comp.width, comp.height);
            }

            let prev = null;
            gifFrames = [];
            for (const f of frames) {
                // 应用上一帧处置
                if (prev) {
                    if (prev.disposalType === 2) {
                        const d = prev.dims;
                        if (bgFillStyle) {
                            cctx.save();
                            cctx.fillStyle = bgFillStyle;
                            cctx.fillRect(d.left, d.top, d.width, d.height);
                            cctx.restore();
                        } else {
                            cctx.clearRect(d.left, d.top, d.width, d.height);
                        }
                    } else if (prev.disposalType === 3 && prev._restore) {
                        const d = prev.dims;
                        cctx.putImageData(prev._restore, d.left, d.top);
                    }
                }
                // 绘制当前帧 patch 到逻辑屏幕位置（通过中间画布以启用 alpha 混合）
                const imageData = new ImageData(new Uint8ClampedArray(f.patch), f.dims.width, f.dims.height);
                // 若本帧需要在下一帧前恢复，则先保存受影响区域（在绘制前保存）
                if (f.disposalType === 3) {
                    try {
                        f._restore = cctx.getImageData(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
                    } catch {}
                }
                const patchCanvas = document.createElement('canvas');
                patchCanvas.width = f.dims.width;
                patchCanvas.height = f.dims.height;
                const pctx = patchCanvas.getContext('2d', { willReadFrequently: true });
                pctx.putImageData(imageData, 0, 0);
                cctx.drawImage(patchCanvas, f.dims.left, f.dims.top);

                // 导出合成帧（优先 ImageBitmap，更快；不支持时退回 dataURL）
                let frameImage;
                if (typeof createImageBitmap === 'function') {
                    frameImage = await createImageBitmap(comp);
                } else {
                    const dataURL = comp.toDataURL('image/png');
                    frameImage = await createImage(dataURL);
                }
                // 注意：gifuct-js 文档中 delay 已是毫秒，这里不再额外乘以 10
                gifFrames.push({ image: frameImage, delay: Math.max(20, f.delay || 100), disposalType: f.disposalType, dims: { ...f.dims } });
                prev = f;
            }
            gifTotalDuration = gifFrames.reduce((s, f) => s + f.delay, 0);
            if (gifFrames.length > 0) {
                isGif = true;
                // 以首帧为定位依据
                userImg = gifFrames[0].image;
                const scale = imageSizeSlider.value / 100;
                const w = userImg.width * scale;
                const h = userImg.height * scale;
                userImgPos.x = (canvas.width - w) / 2;
                userImgPos.y = (canvas.height - h) / 2;
                redrawCanvas(userImg);
                requestAnimationFrame(tick);
                return;
            }
        } catch (e) {
            console.warn('GIF 解析失败，回退为静态图加载: ', e);
        }
    }

    // 非 GIF 或解析失败：按静态图加载
    const img = await createImage(src);
    userImg = img;
    const scale = imageSizeSlider.value / 100;
    const w = userImg.width * scale;
    const h = userImg.height * scale;
    userImgPos.x = (canvas.width - w) / 2;
    userImgPos.y = (canvas.height - h) / 2;
    redrawCanvas();
}

function fetchArrayBuffer(src) {
    // 支持 data:URL 及跨域资源
    if (src.startsWith('data:')) {
        // data:[<mediatype>][;base64],<data>
        const comma = src.indexOf(',');
        const header = src.substring(0, comma);
        const data = src.substring(comma + 1);
        const isBase64 = /;base64/i.test(header);
        let binaryString;
        if (isBase64) {
            binaryString = atob(data);
        } else {
            binaryString = decodeURIComponent(data);
        }
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return Promise.resolve(bytes.buffer);
    }
    return fetch(src, { mode: 'cors' }).then(r => r.arrayBuffer());
}

function createImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = src;
    });
}

// --- Gallery Modal Logic ---
// --- Gallery Modal Logic ---

async function initGallery() {
    const promises = jsonFiles.map(file => 
                fetch(`pic/${file}`).then(res => {
            if (!res.ok) throw new Error(`加载失败: ${file}`);
            return res.json();
                }).then(data => ({ status: 'fulfilled', value: data }))
                    .catch(err => ({ status: 'rejected', reason: err, file }))
                    .finally(() => { try { window.__ptPreloadTick && window.__ptPreloadTick(); } catch {} })
    );
    const results = await Promise.all(promises);
    results.forEach((r, index) => {
        const categoryName = jsonFiles[index].replace('.json', '');
        if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0) {
            galleryData[categoryName] = r.value;
        } else {
            // 跳过不可用分类
            console.warn('跳过分类', categoryName, r.reason || '无图片');
        }
    });
    // 插入“最近使用”置顶分类
    ensureRecentsCategory();
    populateCategories();
    // 默认先展示“最近使用”，否则展示“自定义图片”，再否则展示任意可用分类
    const firstCategory = (recentImages && recentImages.length > 0)
        ? '最近使用'
        : '自定义图片' || Object.keys(galleryData).find(k => k !== '最近使用');
    if (firstCategory) displayCategory(firstCategory);
}

function populateCategories() {
    // 重建分类条，保证顺序：最近使用 -> 其他
    categoryContainer.innerHTML = '';
    const order = ['自定义图片', '最近使用', ...Object.keys(galleryData).filter(n => n !== '最近使用')];
    for (const categoryName of order) {
        const urls = galleryData[categoryName];
        if (!urls || urls.length === 0) {
            // “最近使用”和“自定义图片”允许为空也展示按钮；其他无图跳过
            if (categoryName !== '最近使用' && categoryName !== '自定义图片') continue;
        }

        const btn = document.createElement('div');
        btn.className = 'category-btn';
        btn.dataset.category = categoryName;

        const img = document.createElement('img');
        if (categoryName === '自定义图片') {
            const plusSvg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90"><rect fill="#efe8d6" x="0" y="0" width="90" height="90" rx="10"/><path d="M45 20v50M20 45h50" stroke="#8b6b3e" stroke-width="6" stroke-linecap="round"/></svg>');
            img.src = `data:image/svg+xml;utf8,${plusSvg}`;
        } else {
            img.src = (urls && urls[0]) || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
        }
        img.loading = 'lazy';
        img.alt = `${categoryName} 首图`;
        img.onerror = () => {
            img.style.visibility = 'hidden';
        };
        
        const span = document.createElement('span');
        span.textContent = categoryName;

        btn.appendChild(img);
        btn.appendChild(span);

        btn.addEventListener('click', () => {
            displayCategory(categoryName);
        });

    categoryContainer.appendChild(btn);
    }

    // 鼠标滚轮横向滚动支持
    categoryContainer.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            categoryContainer.scrollLeft += e.deltaY;
        }
    }, { passive: false });
    // 初始化“最近使用”缩略图可见性
    updateRecentsButtonThumb();
}

function displayCategory(categoryName) {
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === categoryName);
    });

    // 自动滚动激活项到可视范围
    const activeBtn = [...categoryContainer.children].find(el => el.dataset.category === categoryName);
    if (activeBtn) {
        const containerRect = categoryContainer.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        if (btnRect.left < containerRect.left || btnRect.right > containerRect.right) {
            activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }

    // 特殊分类：自定义图片
    if (categoryName === '自定义图片') {
        if (customPanel) customPanel.style.display = 'block';
        if (imageGallery) imageGallery.style.display = 'none';
        return;
    } else {
        if (customPanel) customPanel.style.display = 'none';
        if (imageGallery) imageGallery.style.display = 'grid';
    }

    // Populate images for normal categories
    imageGallery.innerHTML = '';
    const urls = galleryData[categoryName] || [];
    urls.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.loading = 'lazy';
        img.alt = categoryName + ' 图片';
        img.className = 'gallery-img';
        img.addEventListener('click', () => {
            loadImage(url);
            // 仅在选择图库图片时计入最近使用
            addToRecents(url, true);
            // 使用带动画的关闭
            if (typeof closeGalleryModal === 'function') {
                closeGalleryModal();
            } else {
                galleryModal.style.display = 'none';
            }
        });
        imageGallery.appendChild(img);
    });
}

function openGalleryModal() {
    // 先锁定页面滚动（移动端）
    try {
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.dataset.scrollY = String(scrollY);
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.classList.add('modal-open');
    } catch {}

    galleryModal.style.display = 'flex';
    // 等待下一帧以触发过渡
    requestAnimationFrame(() => {
        galleryModal.classList.remove('closing');
        galleryModal.classList.add('active');
    });
}

function closeGalleryModal() {
    galleryModal.classList.remove('active');
    galleryModal.classList.add('closing');
    const onEnd = (e) => {
        if (e.target !== galleryModal) return;
        galleryModal.style.display = 'none';
        galleryModal.classList.remove('closing');
        galleryModal.removeEventListener('transitionend', onEnd);
        // 恢复页面滚动位置与样式
        try {
            const y = parseInt(document.body.dataset.scrollY || '0', 10) || 0;
            document.body.classList.remove('modal-open');
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            delete document.body.dataset.scrollY;
            window.scrollTo(0, y);
        } catch {}
    };
    galleryModal.addEventListener('transitionend', onEnd);
}

galleryBtn.addEventListener('click', openGalleryModal);
modalClose.addEventListener('click', closeGalleryModal);
galleryModal.addEventListener('click', (e) => { if (e.target === galleryModal) closeGalleryModal(); });

// --- Event Listeners & Init ---

// Pointer events（移动端拖动适配，桌面也可用）
function getCanvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.clientX ?? (evt.touches && evt.touches[0] && evt.touches[0].clientX) ?? 0;
    const clientY = evt.clientY ?? (evt.touches && evt.touches[0] && evt.touches[0].clientY) ?? 0;
    // 将 CSS 像素转换为 canvas 内部像素，避免在缩放/高 DPR 下拖动灵敏度偏低
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: cssX * scaleX,
        y: cssY * scaleY
    };
}

// 滚轮缩放：在鼠标位于图片区域时，按光标为中心缩放图片
function onCanvasWheel(e) {
    if (!userImg) return; // 无图片不处理
    const { x: mx, y: my } = getCanvasPos(e);
    // 判断是否在当前图片范围内
    const within = mx > userImgPos.x && mx < userImgPos.x + userImgSize.width &&
                   my > userImgPos.y && my < userImgPos.y + userImgSize.height;
    if (!within) return; // 只在图片上缩放

    e.preventDefault(); // 避免页面滚动

    const cur = parseFloat(imageSizeSlider.value);
    const min = parseFloat(imageSizeSlider.min || '1');
    const max = parseFloat(imageSizeSlider.max || '500');
    // 每次滚动“变动 1 单位”（向上放大 +1，向下缩小 -1）
    let next = cur + (e.deltaY < 0 ? 1 : -1);
    next = Math.max(min, Math.min(max, next));
    if (next === cur) return;

    // 以鼠标处为缩放锚点，保持该点在图像上的相对位置不变
    const px = (mx - userImgPos.x) / (userImgSize.width || 1);
    const py = (my - userImgPos.y) / (userImgSize.height || 1);

    // 基于当前显示尺寸按比例推算新尺寸（避免依赖原始像素宽高）
    const scaleRatio = next / cur;
    const newW = Math.max(1, userImgSize.width * scaleRatio);
    const newH = Math.max(1, userImgSize.height * scaleRatio);

    // 调整位置以实现光标居中缩放
    userImgPos.x = mx - px * newW;
    userImgPos.y = my - py * newH;
    userImgSize.width = newW;
    userImgSize.height = newH;

    // 同步控件并重绘
    imageSizeSlider.value = String(next);
    if (imageSizeInput) imageSizeInput.value = String(next);
    redrawCanvas();
}

function onPointerDown(e) {
    isPointerActive = true;
    const { x: mouseX, y: mouseY } = getCanvasPos(e);
    if (userImg && mouseX > userImgPos.x && mouseX < userImgPos.x + userImgSize.width &&
        mouseY > userImgPos.y && mouseY < userImgPos.y + userImgSize.height) {
        isDragging = true;
        dragStart.x = mouseX - userImgPos.x;
        dragStart.y = mouseY - userImgPos.y;
        if (canvas.setPointerCapture && e.pointerId !== undefined) {
            try { canvas.setPointerCapture(e.pointerId); } catch {}
        }
        e.preventDefault();
    }
}

function onPointerMove(e) {
    if (!isDragging) return;
    const { x, y } = getCanvasPos(e);
    let newX = x - dragStart.x;
    let newY = y - dragStart.y;
    const imgCenterX = newX + userImgSize.width / 2;
    const canvasCenterX = canvas.width / 2;
    if (Math.abs(imgCenterX - canvasCenterX) < snapThreshold) {
        newX = canvasCenterX - userImgSize.width / 2;
    }
    userImgPos.x = newX;
    userImgPos.y = newY;
    redrawCanvas();
    drawGuidelines();
    e.preventDefault();
}

function onPointerUp(e) {
    isDragging = false;
    isPointerActive = false;
    redrawCanvas();
    if (canvas.releasePointerCapture && e.pointerId !== undefined) {
        try { canvas.releasePointerCapture(e.pointerId); } catch {}
    }
}

canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
canvas.addEventListener('pointermove', onPointerMove, { passive: false });
canvas.addEventListener('pointerup', onPointerUp, { passive: false });
canvas.addEventListener('pointercancel', onPointerUp, { passive: false });
canvas.addEventListener('wheel', onCanvasWheel, { passive: false });

canvas.addEventListener('mousedown', (e) => {
    if (isPointerActive) return; // 避免重复
    const { x: mouseX, y: mouseY } = getCanvasPos(e);
    if (userImg && mouseX > userImgPos.x && mouseX < userImgPos.x + userImgSize.width &&
        mouseY > userImgPos.y && mouseY < userImgPos.y + userImgSize.height) {
        isDragging = true;
        dragStart.x = mouseX - userImgPos.x;
        dragStart.y = mouseY - userImgPos.y;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isPointerActive) return; // 避免重复
    if (isDragging) {
        const { x, y } = getCanvasPos(e);
        let newX = x - dragStart.x;
        let newY = y - dragStart.y;
        const imgCenterX = newX + userImgSize.width / 2;
        const canvasCenterX = canvas.width / 2;
        if (Math.abs(imgCenterX - canvasCenterX) < snapThreshold) {
            newX = canvasCenterX - userImgSize.width / 2;
        }
        userImgPos.x = newX;
        userImgPos.y = newY;
        redrawCanvas();
        drawGuidelines();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isPointerActive) return; // 避免重复
    isDragging = false;
    redrawCanvas();
});

canvas.addEventListener('mouseout', () => {
    if (isPointerActive) return; // 避免重复
    isDragging = false;
    redrawCanvas();
});

textInput.addEventListener('input', () => redrawCanvas());
fontSizeSlider.addEventListener('input', () => redrawCanvas());
positionYSlider.addEventListener('input', () => redrawCanvas());
imageSizeSlider.addEventListener('input', () => {
    imageSizeInput.value = imageSizeSlider.value;
    redrawCanvas();
});
imageSizeInput.addEventListener('change', () => {
    let v = parseInt(imageSizeInput.value, 10);
    if (Number.isNaN(v)) v = parseInt(imageSizeSlider.value, 10);
    v = Math.min(parseInt(imageSizeSlider.max,10), Math.max(parseInt(imageSizeSlider.min,10), v));
    imageSizeInput.value = String(v);
    imageSizeSlider.value = String(v);
    redrawCanvas();
});
imageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        pendingCustomSrc = event.target.result;
        if (customPreview && customPreviewImg) {
            customPreviewImg.src = pendingCustomSrc;
            customPreview.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
});
imageUrlInput.addEventListener('input', (e) => {
    const url = (e.target.value || '').trim();
    // 基础校验
    if (!url) {
        pendingCustomSrc = '';
        if (customPreview) customPreview.style.display = 'none';
        return;
    }
    pendingCustomSrc = url;
    if (customPreview && customPreviewImg) {
        customPreviewImg.src = url;
        customPreview.style.display = 'block';
    }
});

// 自定义图片：使用按钮
if (customUseBtn) {
    customUseBtn.addEventListener('click', async () => {
    const src = (pendingCustomSrc || '').trim();
    if (!src) { showTipModal('请先上传图片或输入 URL'); return; }
    await loadImage(src);
    if (src.startsWith('http')) addToRecents(src, true);
    if (typeof closeGalleryModal === 'function') closeGalleryModal();
    });
}

downloadBtn.addEventListener('click', async () => {
    const format = formatSelect.value;
    if (format === 'gif') {
        if (isExportingGif) return;
        isExportingGif = true;
        const originalText = downloadBtn.textContent;
        const restoreBtn = () => { downloadBtn.textContent = originalText; downloadBtn.disabled = false; isExportingGif = false; };
        downloadBtn.disabled = true;
        downloadBtn.textContent = '准备中…';
        // 导出为 GIF：对于静态图也可导出为单帧动图
        try {
            const workerScriptURL = await getGifWorkerScriptURL();
            const encoder = new window.GIF({
                workers: 2,
                quality: 10,
                width: canvas.width,
                height: canvas.height,
                repeat: 0,
                workerScript: workerScriptURL
            });
            encoder.on('progress', (p) => {
                const pct = Math.max(0, Math.min(100, Math.round(p * 100)));
                downloadBtn.textContent = `渲染中 ${pct}%`;
            });
            // 将每一帧渲染到离屏 canvas 后加入 encoder
            const off = document.createElement('canvas');
            off.width = canvas.width; off.height = canvas.height;
            const octx = off.getContext('2d', { willReadFrequently: true });

            if (isGif && gifFrames.length > 0) {
                for (const fr of gifFrames) {
                    octx.clearRect(0, 0, off.width, off.height);
                    octx.drawImage(backgroundImg, 0, 0);
                    // 根据当前缩放绘制
                    const scale = imageSizeSlider.value / 100;
                    const w = Math.max(1, Math.round(fr.image.width * scale));
                    const h = Math.max(1, Math.round(fr.image.height * scale));
                    octx.imageSmoothingEnabled = false;
                    octx.drawImage(fr.image, userImgPos.x, userImgPos.y, w, h);
                    // 叠加文字
                    const fontSize = fontSizeSlider.value;
                    const positionYPercent = positionYSlider.value;
                    octx.fillStyle = 'rgb(59, 66, 85)';
                    octx.font = `${fontSize}px 'HYWenHei-85W'`;
                    octx.textAlign = 'center';
                    octx.textBaseline = 'middle';
                    const text = textInput.value;
                    const x = off.width / 2;
                    const y = off.height * (positionYPercent / 100);
                    octx.fillText(text, x, y);
                    encoder.addFrame(octx, { copy: true, delay: Math.max(20, fr.delay) });
                }
            } else {
                // 单帧导出
                octx.clearRect(0, 0, off.width, off.height);
                octx.drawImage(backgroundImg, 0, 0);
                if (userImg) {
                    const scale = imageSizeSlider.value / 100;
                    const w = Math.max(1, Math.round(userImg.width * scale));
                    const h = Math.max(1, Math.round(userImg.height * scale));
                    octx.drawImage(userImg, userImgPos.x, userImgPos.y, w, h);
                }
                const fontSize = fontSizeSlider.value;
                const positionYPercent = positionYSlider.value;
                octx.fillStyle = 'rgb(59, 66, 85)';
                octx.font = `${fontSize}px 'HYWenHei-85W'`;
                octx.textAlign = 'center';
                octx.textBaseline = 'middle';
                const text = textInput.value;
                const x = off.width / 2;
                const y = off.height * (positionYPercent / 100);
                octx.fillText(text, x, y);
                encoder.addFrame(octx, { copy: true, delay: 200 });
            }

            encoder.on('finished', function (blob) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'image-with-text.gif';
                link.click();
                setTimeout(() => URL.revokeObjectURL(link.href), 5000);
                restoreBtn();
            });
            encoder.render();
        } catch (e) {
            console.error(e);
            showTipModal('GIF 导出失败，请重试。', { duration: 2200 });
            restoreBtn();
        }
        return;
    }
    // 其他格式按原逻辑
    const dataURL = canvas.toDataURL(`image/${format}`);
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `image-with-text.${format}`;
    link.click();
});

copyBtn.addEventListener('click', () => {
    canvas.toBlob(blob => {
        if (navigator.clipboard && navigator.clipboard.write) {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
                showTipModal('图片已复制到剪贴板！', { duration: 1400 });
            }).catch(err => showTipModal('复制失败！', { duration: 1800 }));
        } else {
            showTipModal('浏览器不支持复制功能。', { duration: 2000 });
        }
    }, 'image/png');
});

// Show first-load tip modal once per browser (先显示以便统计进度)
showFirstLoadTipIfNeeded();
// Initialize the gallery（开始加载分类 JSON，会驱动进度条推进）
initGallery();
