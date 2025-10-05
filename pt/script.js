const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('text-input');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const fontSizeSlider = document.getElementById('font-size-slider');
const TEXT_Y_PCT = 0.866;
const formatSelect = document.getElementById('format-select');
const qualitySelect = document.getElementById('quality-select');
const qualityLabel = document.querySelector('label[for="quality-select"]');
const imageUpload = document.getElementById('image-upload');
const imageSizeSlider = document.getElementById('image-size-slider');
const imageSizeInput = document.getElementById('image-size-input');
const imageUrlInput = document.getElementById('image-url-input');
const customUseBtn = document.getElementById('custom-use-btn');
const customPanel = document.getElementById('custom-image-panel');
const customPreview = document.getElementById('custom-preview');
const customPreviewImg = document.getElementById('custom-preview-img');
// 抠图相关元素
const bgRemoveTools = document.getElementById('bg-remove-tools');
const pickedColorSwatch = document.getElementById('picked-color-swatch');
const bgThresholdSlider = document.getElementById('bg-threshold');
const bgThresholdVal = document.getElementById('bg-threshold-val');
const bgResetBtn = document.getElementById('bg-reset-btn');
const pickedColorInfo = document.getElementById('picked-color-info');
const pickedRangePreview = document.getElementById('picked-range-preview');
const pickedColorPlaceholder = document.getElementById('picked-color-placeholder');
const bgThresholdWrapper = document.getElementById('bg-threshold-wrapper');
// Zoom preview elements
const previewZoomBtn = document.getElementById('preview-zoom-btn');
const zoomModal = document.getElementById('zoom-preview-modal');
const zoomCloseBtn = document.getElementById('zoom-close-btn');
const zoomPreviewImg = document.getElementById('zoom-preview-img');
// Big tool mirrors
const pickedColorSwatchBig = document.getElementById('picked-color-swatch-big');
const pickedColorPlaceholderBig = document.getElementById('picked-color-placeholder-big');
const pickedColorInfoBig = document.getElementById('picked-color-info-big');
const pickedRangePreviewBig = document.getElementById('picked-range-preview-big');
const bgThresholdWrapperBig = document.getElementById('bg-threshold-wrapper-big');
const bgThresholdSliderBig = document.getElementById('bg-threshold-big');
const bgThresholdValBig = document.getElementById('bg-threshold-val-big');
const bgResetBtnBig = document.getElementById('bg-reset-btn-big');

// 抠图状态
let originalPreviewImageData = null; // 原始像素缓存（ImageData）
let workingPreviewCanvas = null;     // 离屏 canvas 用于处理
let workingPreviewCtx = null;
let pickedColor = null;              // {r,g,b}
let lastAppliedThreshold = null;
let processedPreviewDataURL = null;  // 当前处理后的 dataURL
let suppressPreviewReimport = false; // 避免处理结果再次触发覆盖原始像素缓存

function ensureWorkingPreviewCanvas() {
    if (!customPreviewImg || !customPreviewImg.complete) return null;
    if (!workingPreviewCanvas) {
        workingPreviewCanvas = document.createElement('canvas');
        workingPreviewCtx = workingPreviewCanvas.getContext('2d', { willReadFrequently: true });
    }
    // 以图片天然尺寸绘制
    workingPreviewCanvas.width = customPreviewImg.naturalWidth;
    workingPreviewCanvas.height = customPreviewImg.naturalHeight;
    workingPreviewCtx.clearRect(0,0,workingPreviewCanvas.width, workingPreviewCanvas.height);
    workingPreviewCtx.drawImage(customPreviewImg, 0, 0);
    try {
        originalPreviewImageData = workingPreviewCtx.getImageData(0,0,workingPreviewCanvas.width, workingPreviewCanvas.height);
    } catch(e) {
        // 跨域取像素失败
        originalPreviewImageData = null;
    }
    return originalPreviewImageData;
}

function applyBackgroundRemoval(threshold) {
    if (!originalPreviewImageData || !pickedColor || !workingPreviewCtx) return;
    threshold = Math.max(0, Math.min(255, threshold|0));
    const { data, width, height } = originalPreviewImageData;
    const out = workingPreviewCtx.createImageData(width, height);
    const outData = out.data;
    const pr = pickedColor.r, pg = pickedColor.g, pb = pickedColor.b;
    const tSq = threshold * threshold; // 使用平方距离加速比较
    for (let i=0; i<data.length; i+=4) {
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        const dr = r - pr, dg = g - pg, db = b - pb;
        const distSq = dr*dr + dg*dg + db*db;
        if (distSq <= tSq) {
            // 设透明
            outData[i] = r; outData[i+1] = g; outData[i+2] = b; outData[i+3] = 0;
        } else {
            outData[i] = r; outData[i+1] = g; outData[i+2] = b; outData[i+3] = a;
        }
    }
    workingPreviewCtx.putImageData(out, 0, 0);
    // 使用 dataURL（同步），并阻止重新抓取为“原始”
    suppressPreviewReimport = true;
    processedPreviewDataURL = workingPreviewCanvas.toDataURL('image/png');
    customPreviewImg.src = processedPreviewDataURL;
}

function updateThresholdUI() {
    if (bgThresholdVal && bgThresholdSlider) bgThresholdVal.textContent = bgThresholdSlider.value;
    updatePickedColorInfo();
    if (bgThresholdValBig && bgThresholdSliderBig) bgThresholdValBig.textContent = bgThresholdSliderBig.value;
}

function resetPreviewRemoval() {
    if (!customPreviewImg || !pendingCustomSrc) return;
    customPreviewImg.src = pendingCustomSrc; // 恢复原图
    pickedColor = null;
    lastAppliedThreshold = null;
    processedPreviewDataURL = null;
    if (pickedColorSwatch) {
        pickedColorSwatch.style.background = 'linear-gradient(45deg,#ccc,#eee)';
    }
    updatePickedColorInfo();
    if (pickedColorPlaceholder) pickedColorPlaceholder.style.display = 'inline';
    if (pickedColorInfo) pickedColorInfo.style.display = 'none';
    if (bgThresholdWrapper) bgThresholdWrapper.style.display = 'none';
    if (bgResetBtn) bgResetBtn.style.display = 'none';
    // Big mirror reset
    if (pickedColorSwatchBig) pickedColorSwatchBig.style.background = 'linear-gradient(45deg,#ccc,#eee)';
    if (pickedColorPlaceholderBig) pickedColorPlaceholderBig.style.display = 'inline';
    if (pickedColorInfoBig) pickedColorInfoBig.style.display = 'none';
    if (bgThresholdWrapperBig) bgThresholdWrapperBig.style.display = 'none';
    if (bgResetBtnBig) bgResetBtnBig.style.display = 'none';
}

if (bgThresholdSlider) {
    bgThresholdSlider.addEventListener('input', () => {
        updateThresholdUI();
        const th = parseInt(bgThresholdSlider.value,10);
        if (pickedColor && th !== lastAppliedThreshold) {
            // 重新从原始数据开始（避免累积精度丢失）
            if (originalPreviewImageData) {
                workingPreviewCtx.putImageData(originalPreviewImageData,0,0);
            } else {
                ensureWorkingPreviewCanvas();
            }
            applyBackgroundRemoval(th);
            lastAppliedThreshold = th;
        }
    });
}
if (bgResetBtn) {
    bgResetBtn.addEventListener('click', () => {
        resetPreviewRemoval();
    });
}

function enableBgRemoveToolsIfPossible() {
    if (!bgRemoveTools) return;
    // 如果图片跨域且无法访问像素，则隐藏
    if (!originalPreviewImageData) {
        // 尝试创建一次（可能刚加载完）
        ensureWorkingPreviewCanvas();
    }
    if (originalPreviewImageData) {
        bgRemoveTools.style.display = 'block';
    } else {
        bgRemoveTools.style.display = 'none';
    }
}

if (customPreviewImg) {
    customPreviewImg.addEventListener('load', () => {
        if (suppressPreviewReimport) {
            // 这次是处理结果回写，跳过覆盖 original
            suppressPreviewReimport = false;
            enableBgRemoveToolsIfPossible();
            return;
        }
        // 新原图 / 重置后的图：重新建立原始数据
        ensureWorkingPreviewCanvas();
        enableBgRemoveToolsIfPossible();
    });
    // 取色点击
    customPreviewImg.addEventListener('click', (e) => {
        if (!bgRemoveTools || bgRemoveTools.style.display === 'none') return; // 无法取色
        if (!originalPreviewImageData) return;
        // 计算点击在图片中的相对坐标（考虑图片可能被 CSS 缩放）
        const rect = customPreviewImg.getBoundingClientRect();
        const scaleX = customPreviewImg.naturalWidth / rect.width;
        const scaleY = customPreviewImg.naturalHeight / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);
        if (x < 0 || y < 0 || x >= originalPreviewImageData.width || y >= originalPreviewImageData.height) return;
        const idx = (y * originalPreviewImageData.width + x) * 4;
        const d = originalPreviewImageData.data;
        const r = d[idx], g = d[idx+1], b = d[idx+2];
        pickedColor = { r, g, b };
        if (pickedColorSwatch) {
            pickedColorSwatch.style.background = `rgb(${r},${g},${b})`;
        }
        updatePickedColorInfo();
        if (pickedColorPlaceholder) pickedColorPlaceholder.style.display = 'none';
        if (pickedColorInfo) pickedColorInfo.style.display = 'block';
        if (bgThresholdWrapper) bgThresholdWrapper.style.display = 'flex';
        if (bgResetBtn) bgResetBtn.style.display = 'inline-block';
        // Sync big tools if open
        syncBigToolsFromSmall();
        // 立即应用当前阈值
        const th = parseInt(bgThresholdSlider.value,10) || 0;
        if (originalPreviewImageData) workingPreviewCtx.putImageData(originalPreviewImageData,0,0);
        applyBackgroundRemoval(th);
        lastAppliedThreshold = th;
    });
}

// 为放大预览添加取色能力（与小预览逻辑一致）
if (zoomPreviewImg) {
    zoomPreviewImg.addEventListener('click', (e) => {
        // 只有在已加载原始数据且工具可用时才能取色
        if (!originalPreviewImageData) return;
        // 如果小工具区由于跨域被隐藏，这里同样不提供取色（保持一致性）
        if (!bgRemoveTools || bgRemoveTools.style.display === 'none') return;
        const rect = zoomPreviewImg.getBoundingClientRect();
        const scaleX = zoomPreviewImg.naturalWidth / rect.width;
        const scaleY = zoomPreviewImg.naturalHeight / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);
        if (x < 0 || y < 0 || x >= originalPreviewImageData.width || y >= originalPreviewImageData.height) return;
        const idx = (y * originalPreviewImageData.width + x) * 4;
        const d = originalPreviewImageData.data;
        const r = d[idx], g = d[idx+1], b = d[idx+2];
        pickedColor = { r, g, b };
        // 更新小预览侧 UI（作为主状态）
        if (pickedColorSwatch) pickedColorSwatch.style.background = `rgb(${r},${g},${b})`;
        updatePickedColorInfo();
        if (pickedColorPlaceholder) pickedColorPlaceholder.style.display = 'none';
        if (pickedColorInfo) pickedColorInfo.style.display = 'block';
        if (bgThresholdWrapper) bgThresholdWrapper.style.display = 'flex';
        if (bgResetBtn) bgResetBtn.style.display = 'inline-block';
        // 同步到大预览工具
        syncBigToolsFromSmall();
        // 应用当前阈值
        const th = parseInt(bgThresholdSlider.value,10) || 0;
        if (originalPreviewImageData) workingPreviewCtx.putImageData(originalPreviewImageData,0,0);
        applyBackgroundRemoval(th);
        lastAppliedThreshold = th;
        // 更新大图展示（因为应用后的 processed 会写回 customPreviewImg.src）
        if (zoomPreviewImg && customPreviewImg) zoomPreviewImg.src = customPreviewImg.src;
    });
}

updateThresholdUI();

function clamp01(v){ return Math.max(0, Math.min(255, v)); }
function updatePickedColorInfo(){
    if (!pickedColorInfo) return;
    if (!pickedColor || !bgThresholdSlider){
        pickedColorInfo.innerHTML = '颜色: -  <br>阈值范围: -   <br><span id="picked-range-preview" style="display:inline-block; width:80px; height:14px; vertical-align:middle; border:1px solid #aaa; border-radius:4px; background:repeating-linear-gradient(45deg,#ddd,#ddd 6px,#f3f3f3 6px,#f3f3f3 12px);"></span>';
        return;
    }
    const t = parseInt(bgThresholdSlider.value,10) || 0;
    const {r,g,b} = pickedColor;
    const rMin = clamp01(r - t), rMax = clamp01(r + t);
    const gMin = clamp01(g - t), gMax = clamp01(g + t);
    const bMin = clamp01(b - t), bMax = clamp01(b + t);
    // 生成简易渐变：从 (rMin,g,b) -> (r,gMin,b) -> (r,g,bMin) -> (rMax,gMax,bMax)
    const grad = `linear-gradient(90deg, rgb(${rMin},${g},${b}) 0%, rgb(${r},${gMin},${b}) 33%, rgb(${r},${g},${bMin}) 66%, rgb(${rMax},${gMax},${bMax}) 100%)`;
    pickedColorInfo.innerHTML = `颜色: rgb(${r},${g},${b})  <br>阈值范围: (${rMin}-${rMax}, ${gMin}-${gMax}, ${bMin}-${bMax})  <br><span id="picked-range-preview" style="display:inline-block; width:110px; height:14px; vertical-align:middle; border:1px solid #aaa; border-radius:4px; background:${grad};"></span>`;
}

// ---- Zoom (Large Preview) logic ----
function openZoomModal(){
    if (!zoomModal) return;
    if (zoomPreviewImg && customPreviewImg) {
        zoomPreviewImg.src = customPreviewImg.src;
    }
    zoomModal.style.display = 'flex';
    requestAnimationFrame(()=>zoomModal.classList.add('active'));
    // Sync state
    syncBigToolsFromSmall();
}
function closeZoomModal(){
    if (!zoomModal) return;
    zoomModal.classList.remove('active');
    setTimeout(()=>{ if (!zoomModal.classList.contains('active')) zoomModal.style.display='none'; }, 220);
}
function syncBigToolsFromSmall(){
    if (!pickedColorSwatchBig) return;
    if (pickedColor){
        pickedColorSwatchBig.style.background = pickedColorSwatch.style.background;
        if (pickedColorPlaceholderBig) pickedColorPlaceholderBig.style.display='none';
        if (pickedColorInfoBig) pickedColorInfoBig.style.display='block';
        if (bgThresholdWrapperBig) bgThresholdWrapperBig.style.display='flex';
        if (bgResetBtnBig) bgResetBtnBig.style.display='inline-block';
        if (bgThresholdSliderBig && bgThresholdSlider) bgThresholdSliderBig.value = bgThresholdSlider.value;
        if (bgThresholdValBig && bgThresholdSliderBig) bgThresholdValBig.textContent = bgThresholdSliderBig.value;
        // Range preview replicate
        if (pickedColorInfoBig && pickedColorInfo){
            // 简化：直接复制小 info 的 innerHTML
            pickedColorInfoBig.innerHTML = pickedColorInfo.innerHTML.replace('picked-range-preview','picked-range-preview-big');
        }
    } else {
        if (pickedColorPlaceholderBig) pickedColorPlaceholderBig.style.display='inline';
        if (pickedColorInfoBig) pickedColorInfoBig.style.display='none';
        if (bgThresholdWrapperBig) bgThresholdWrapperBig.style.display='none';
        if (bgResetBtnBig) bgResetBtnBig.style.display='none';
    }
}
// Big threshold changes sync back
if (bgThresholdSliderBig){
    bgThresholdSliderBig.addEventListener('input', ()=>{
        if (!pickedColor) return; // ignore until color selected
        bgThresholdSlider.value = bgThresholdSliderBig.value;
        updateThresholdUI();
        const th = parseInt(bgThresholdSlider.value,10) || 0;
        if (originalPreviewImageData) workingPreviewCtx.putImageData(originalPreviewImageData,0,0);
        applyBackgroundRemoval(th);
        lastAppliedThreshold = th;
        // 更新大预览图片
        if (zoomPreviewImg && customPreviewImg) zoomPreviewImg.src = customPreviewImg.src;
    });
}
if (bgResetBtnBig){
    bgResetBtnBig.addEventListener('click', ()=>{ resetPreviewRemoval(); if (zoomPreviewImg && customPreviewImg) zoomPreviewImg.src = customPreviewImg.src; });
}
if (previewZoomBtn){
    // 按需显示
    const showZoomBtn = ()=>{ if (customPreview.style.display!=='none') previewZoomBtn.style.display='flex'; };
    showZoomBtn();
    previewZoomBtn.addEventListener('click', openZoomModal);
}
if (zoomCloseBtn){
    zoomCloseBtn.addEventListener('click', closeZoomModal);
    if (zoomModal) zoomModal.addEventListener('click', (e)=>{ if (e.target===zoomModal) closeZoomModal(); });
}
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
backgroundImg.src = 'background.svg';

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

// 选择与变换状态
let isSelected = false;            // 是否选中用户图片
let rotationRad = 0;               // 旋转角（弧度）（主图）
let isRotating = false;            // 正在旋转
let isScaling = false;             // 正在缩放
let activeHandle = null;           // 当前激活句柄：'rotate'|'scale-br'|'scale-bl'|'delete'
// 根据是否为触摸设备调整句柄大小（移动端更大）
const IS_TOUCH_DEVICE = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const HANDLE_BASE_RADIUS = 14;
const IS_NARROW_SCREEN = (typeof window !== 'undefined') ? window.innerWidth < 768 : false;
const HANDLE_RADIUS = (IS_NARROW_SCREEN ? Math.round(HANDLE_BASE_RADIUS * 2) : HANDLE_BASE_RADIUS);
let gestureCenter = null;          // 旋转/缩放时以中心为锚点
let startAngle = 0;                // 旋转起始角
let startRotation = 0;             // 旋转开始时角度
let startDist = 0;                 // （保留）
let startSliderValue = 0;          // 缩放起始时 slider 值
// 以左上角为锚点的缩放参数
let scaleAnchorTL = null;          // {x,y} 左上角世界坐标（旋转后）
let scaleStartDiag = 0;            // 起始对角距离（锚点到右下点）
let scaleStartW = 0, scaleStartH = 0; // 起始宽高
// 旋转吸附阈值（弧度），约 ±1°
const ROTATE_SNAP_RAD = Math.PI / 180;
// 新图片默认导入：宽度占画布宽度的 75%，高度按原始宽高比缩放
const DEFAULT_IMPORT_WIDTH_RATIO = 0.75; // 75%
// 句柄图标（SVG path）
const ICON_PATHS = {
    scale: [
        // 两段路径
        'M476.8 889.6h-176c-91.2 0-164.8-74.4-164.8-165.6v-424c0-91.2 73.6-165.6 164.8-165.6h422.4c91.2 0 164.8 74.4 164.8 165.6v176.8c0 13.6-10.4 24-24 24s-24-10.4-24-24V300c0-64.8-52-117.6-116.8-117.6H300.8c-64.8 0-116.8 52.8-116.8 117.6v424c0 64.8 52 117.6 116.8 117.6h176c13.6 0 24 10.4 24 24s-10.4 24-24 24z',
        'M806.4 889.6H633.6c-44.8 0-81.6-36.8-81.6-81.6V635.2c0-44.8 36.8-81.6 81.6-81.6h172.8c44.8 0 81.6 36.8 81.6 81.6V808c0 44.8-36.8 81.6-81.6 81.6z m-172.8-288c-19.2 0-33.6 14.4-33.6 33.6V808c0 19.2 14.4 33.6 33.6 33.6h172.8c19.2 0 33.6-14.4 33.6-33.6V635.2c0-19.2-14.4-33.6-33.6-33.6H633.6z'
    ],
    close: [
        'M571.01312 523.776l311.3472-311.35232c15.7184-15.71328 15.7184-41.6256 0-57.344l-1.69472-1.69984c-15.7184-15.71328-41.6256-15.71328-57.34912 0l-311.3472 311.77728-311.35232-311.77728c-15.7184-15.71328-41.63072-15.71328-57.344 0l-1.69984 1.69984a40.0128 40.0128 0 0 0 0 57.344L452.92544 523.776l-311.35232 311.35744c-15.71328 15.71328-15.71328 41.63072 0 57.33888l1.69984 1.69984c15.71328 15.7184 41.6256 15.7184 57.344 0l311.35232-311.35232 311.3472 311.35232c15.72352 15.7184 41.63072 15.7184 57.34912 0l1.69472-1.69984c15.7184-15.70816 15.7184-41.6256 0-57.33888l-311.3472-311.35744z'
    ],
    rotate: [
        'M164.778667 263.978667a425.258667 425.258667 0 0 1 236.8-164.096C629.162667 38.826667 863.146667 173.952 924.117333 401.493333c61.013333 227.626667-74.069333 461.610667-301.653333 522.581334C394.794667 985.173333 160.853333 850.048 99.84 622.506667l82.432-22.101334a341.333333 341.333333 0 1 0 54.570667-290.432l80.384 51.2-182.912 54.101334L85.333333 213.333333l79.445334 50.645334z',
        'M512 512m-85.333333 0a85.333333 85.333333 0 1 0 170.666666 0 85.333333 85.333333 0 1 0-170.666666 0Z'
    ],
    flipH: [
        'M160.9216 895.8464a21.1456 21.1456 0 0 1-17.5616-5.9904 60.3136 60.3136 0 0 1-35.072-30.0032C102.4 853.8112 102.4 841.8304 102.4 835.7888V188.0064C102.4 151.9616 125.7984 128 160.9216 128c11.6736 0 17.5616 0 23.3984 5.9904L418.304 254.0032c23.4496 11.9808 35.1232 29.952 35.1232 53.9648v407.9104c0 24.0128-11.6736 41.984-35.1232 54.016L184.32 889.7536c-5.8368 0-11.7248 6.0416-23.3984 6.0416z m0-707.8912v647.8848l234.0352-119.9616V307.968L160.9216 187.904z m702.1568 707.8912c-11.6736 0-17.5616 0-23.3984-5.9904l-234.0352-120.0128c-23.4496-11.9808-35.1232-29.952-35.1232-53.9648V307.968c0-24.0128 11.6736-41.984 35.1232-54.016L839.68 133.9904c5.8368-5.9904 17.5616-5.9904 23.3984-5.9904 35.1232 0 58.5216 24.0128 58.5216 60.0064v647.8336c0 11.9808 0 18.0224-5.8368 24.0128-7.2704 14.2848-19.968 25.088-35.1232 29.952a21.1456 21.1456 0 0 1-17.5616 6.0416z m0-707.84l-234.0352 119.9616v407.9104l234.0352 119.9616V187.9552z'
    ],
    flipV: [
        'M128.1536 160.9216A21.0944 21.0944 0 0 1 134.144 143.36c4.9664-15.2064 15.7696-27.8528 30.0032-35.1232C170.1888 102.4 182.1696 102.4 188.2112 102.4h647.8336c35.9936 0 59.9552 23.3984 59.9552 58.5216 0 11.6736 0 17.5104-5.9904 23.3984L770.048 418.304c-12.032 23.4496-30.0032 35.1232-54.016 35.1232H308.1216c-24.0128 0-41.984-11.7248-54.016-35.1232L134.1952 184.32c0-5.888-6.0416-11.7248-6.0416-23.4496z m707.8912 0H188.16l119.9616 234.0352h407.9104l120.0128-234.0352zM128.1536 863.0784c0-11.6736 0-17.5616 5.9904-23.3984l120.0128-234.0352c11.9808-23.4496 29.952-35.1232 53.9648-35.1232h407.9104c24.0128 0 41.984 11.6736 54.016 35.072l119.9616 234.0864c5.9904 5.8368 5.9904 17.5616 5.9904 23.3984 0 35.1232-23.9616 58.5216-60.0064 58.5216H188.16c-11.9808 0-17.9712 0-24.0128-5.8368a60.3648 60.3648 0 0 1-29.952-35.1232 21.248 21.248 0 0 1-6.0416-17.5616z m707.84 0l-119.9616-234.0352H308.1216l-119.9616 234.0352h647.8848z'
    ]
};
const HANDLE_BG_NEUTRAL = 'rgb(231, 223, 205)';
function drawIconPaths(pathList, x, y, sizePx, color = '#ffffff') {
    try {
        const s = sizePx / 1024;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);
        ctx.translate(-512, -512);
        ctx.fillStyle = color;
        for (const d of pathList) {
            const p = new Path2D(d);
            ctx.fill(p);
        }
        ctx.restore();
    } catch (e) {
        // Fallback will be handled by caller (draw text glyph)
        return false;
    }
    return true;
}
function drawHandleBox(cx, cy, size, fillColor) {
    const x = cx - size/2, y = cy - size/2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, size, size, Math.max(4, Math.floor(size*0.22)));
    else ctx.rect(x, y, size, size);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.stroke();
}

// 叠加层：支持插入多张静态图片（保持顺序绘制）。
// 每个元素：{ img, pos:{x,y}, size:{width,height}, rotationRad:number, scaleX:number, scaleY:number }
const overlays = [];
// 当前激活层：{ type: 'main' } 或 { type: 'overlay', index: number }
let activeLayer = { type: 'main', index: null };
// 主图镜像（缩放符号）
let mainScaleX = 1, mainScaleY = 1;

// 工具：获取指定层的属性引用
function getLayerProps(layer = activeLayer) {
    if (layer?.type === 'overlay' && typeof layer.index === 'number' && overlays[layer.index]) {
        const ol = overlays[layer.index];
        return { img: ol.img, pos: ol.pos, size: ol.size, rotationRad: ol.rotationRad ?? 0, scaleX: ol.scaleX ?? 1, scaleY: ol.scaleY ?? 1, _isMain: false, _ol: ol };
    }
    return { img: userImg, pos: userImgPos, size: userImgSize, rotationRad: rotationRad || 0, scaleX: mainScaleX, scaleY: mainScaleY, _isMain: true };
}
function setLayerRotation(rad, layer = activeLayer) {
    if (layer?.type === 'overlay' && overlays[layer.index]) overlays[layer.index].rotationRad = rad;
    else rotationRad = rad;
}
function setLayerPos(x, y, layer = activeLayer) {
    const p = getLayerProps(layer).pos; p.x = x; p.y = y;
}
function setLayerSize(w, h, layer = activeLayer) {
    const s = getLayerProps(layer).size; s.width = w; s.height = h;
}
function toggleLayerFlipH(layer = activeLayer) {
    if (layer?.type === 'overlay' && overlays[layer.index]) overlays[layer.index].scaleX = (overlays[layer.index].scaleX ?? 1) * -1;
    else mainScaleX *= -1;
}
function toggleLayerFlipV(layer = activeLayer) {
    if (layer?.type === 'overlay' && overlays[layer.index]) overlays[layer.index].scaleY = (overlays[layer.index].scaleY ?? 1) * -1;
    else mainScaleY *= -1;
}
function getLayerCenter(layer = activeLayer) {
    const lp = getLayerProps(layer);
    return { x: lp.pos.x + (lp.size.width || lp.img?.width || 0) / 2, y: lp.pos.y + (lp.size.height || lp.img?.height || 0) / 2 };
}
const snapThreshold = 10;
// 垂直吸附线：
const VERTICAL_SNAP_PCT = 0.38816;
function getContentMidY() {
    return canvas.height * VERTICAL_SNAP_PCT;
}
let isPointerActive = false; // 避免 pointer 与 mouse 双触发

// 多指缩放（捏合）状态
const activePointers = new Map(); // pointerId -> { x, y }
let isPinching = false;
let lastPinchAppliedValue = null; // 上次应用到 slider 的值，避免重复重绘
let pinchPrevDist = null; // 上一帧两指距离

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
    canvas.width = 886;
    canvas.height = 999;
    redrawCanvas();
};

function redrawCanvas(frameImage = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);

    // 先绘制叠加层
    for (const ol of overlays) {
        if (!ol || !ol.img) continue;
        const w = ol.size?.width || ol.img.width || 0;
        const h = ol.size?.height || ol.img.height || 0;
        const cx = (ol.pos?.x || 0) + w / 2;
        const cy = (ol.pos?.y || 0) + h / 2;
        ctx.save();
        ctx.translate(cx, cy);
        if (ol.rotationRad) ctx.rotate(ol.rotationRad);
        const sX = (ol.scaleX ?? 1), sY = (ol.scaleY ?? 1);
        if (sX !== 1 || sY !== 1) ctx.scale(sX, sY);
        ctx.drawImage(ol.img, -w / 2, -h / 2, w, h);
        ctx.restore();
    }

    // 绘制用户图（静态图）。GIF 动画在 tick 中绘制，这里仅用于静态或暂停状态
    const imgToDraw = frameImage || userImg;
    const canDraw = imgToDraw && (imgToDraw instanceof HTMLImageElement || imgToDraw instanceof HTMLCanvasElement || (typeof ImageBitmap !== 'undefined' && imgToDraw instanceof ImageBitmap));
    if (canDraw && (imgToDraw.complete === undefined || imgToDraw.complete)) {
        const w = Math.max(1, Math.round(userImgSize.width || imgToDraw.width || 0));
        const h = Math.max(1, Math.round(userImgSize.height || imgToDraw.height || 0));
        const cx = userImgPos.x + w / 2;
        const cy = userImgPos.y + h / 2;
        ctx.save();
        ctx.translate(cx, cy);
    if (rotationRad) ctx.rotate(rotationRad);
    const apMain = getLayerProps({ type: 'main' });
    if (apMain.scaleX !== 1 || apMain.scaleY !== 1) ctx.scale(apMain.scaleX, apMain.scaleY);
        ctx.drawImage(imgToDraw, -w / 2, -h / 2, w, h);
        ctx.restore();
    }

    // 绘制文字
    const fontSize = fontSizeSlider.value;
    const positionYPercent = TEXT_Y_PCT * 100;
    ctx.fillStyle = 'rgb(59, 66, 85)';
    ctx.font = `${fontSize}px 'HYWenHei-85W'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = textInput.value;
    const x = canvas.width / 2;
    const y = canvas.height * (positionYPercent / 100);
    ctx.fillText(text, x, y);

    // 选中态叠加：虚线边框与四角句柄；仅在交互中显示辅助线
    drawSelectionOverlay();
    if (isDragging || isRotating || isScaling) drawGuidelines();
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
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    // 主画布绘制时，同样关闭 GIF 的平滑
    ctx.imageSmoothingEnabled = isGif ? false : true;
    // 覆盖层先绘制
    for (const ol of overlays) {
        if (!ol || !ol.img) continue;
        const w1 = ol.size?.width || ol.img.width || 0;
        const h1 = ol.size?.height || ol.img.height || 0;
        const ocx = (ol.pos?.x || 0) + w1 / 2;
        const ocy = (ol.pos?.y || 0) + h1 / 2;
        ctx.save();
        ctx.translate(ocx, ocy);
        if (ol.rotationRad) ctx.rotate(ol.rotationRad);
    const sX = (ol.scaleX ?? 1), sY = (ol.scaleY ?? 1);
    if (sX !== 1 || sY !== 1) ctx.scale(sX, sY);
        ctx.drawImage(ol.img, -w1 / 2, -h1 / 2, w1, h1);
        ctx.restore();
    }
    // 旋转绘制 GIF 当前帧，使用当前 userImgSize
    const w = Math.max(1, Math.round(userImgSize.width || toDraw.width));
    const h = Math.max(1, Math.round(userImgSize.height || toDraw.height));
    const cx = userImgPos.x + w / 2;
    const cy = userImgPos.y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (rotationRad) ctx.rotate(rotationRad);
    const apMain = getLayerProps({ type: 'main' });
    if (apMain.scaleX !== 1 || apMain.scaleY !== 1) ctx.scale(apMain.scaleX, apMain.scaleY);
    ctx.drawImage(toDraw, -w / 2, -h / 2, w, h);
    ctx.restore();

    // 叠加文字
    const fontSize = fontSizeSlider.value;
    const positionYPercent = TEXT_Y_PCT * 100;
    ctx.fillStyle = 'rgb(59, 66, 85)';
    ctx.font = `${fontSize}px 'HYWenHei-85W'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = textInput.value;
    const x = canvas.width / 2;
    const y = canvas.height * (positionYPercent / 100);
    ctx.fillText(text, x, y);

    // 选中态叠加：虚线边框与四角句柄；仅在交互中显示辅助线
    drawSelectionOverlay();
    if (isDragging || isRotating || isScaling) drawGuidelines();

    requestAnimationFrame(tick);
}

// 计算图像中心点
function getImageCenter(layer = activeLayer) { return getLayerCenter(layer); }

// 将画布坐标点转换到图像局部坐标（考虑旋转，图像中心为原点）
function pointToLocal(px, py, layer = activeLayer) {
    const c = getImageCenter(layer);
    const dx = px - c.x;
    const dy = py - c.y;
    const rot = getLayerProps(layer).rotationRad || 0;
    const cosA = Math.cos(-rot);
    const sinA = Math.sin(-rot);
    return {
        x: dx * cosA - dy * sinA,
        y: dx * sinA + dy * cosA
    };
}

// 命中测试：点是否在旋转后的图像矩形内
function isPointInImage(px, py, layer = activeLayer) {
    const local = pointToLocal(px, py, layer);
    const lp = getLayerProps(layer);
    const hw = (lp.size.width) / 2;
    const hh = (lp.size.height) / 2;
    return Math.abs(local.x) <= hw && Math.abs(local.y) <= hh;
}

// 计算四个角的坐标（考虑旋转）
function getImageCorners(layer = activeLayer) {
    const c = getImageCenter(layer);
    const lp = getLayerProps(layer);
    const hw = lp.size.width / 2;
    const hh = lp.size.height / 2;
    const rot = lp.rotationRad || 0;
    const cosA = Math.cos(rot);
    const sinA = Math.sin(rot);
    function rotp(dx, dy) { return { x: c.x + dx * cosA - dy * sinA, y: c.y + dx * sinA + dy * cosA }; }
    return {
        tl: rotp(-hw, -hh),
        tr: rotp(hw, -hh),
        br: rotp(hw, hh),
        bl: rotp(-hw, hh),
        c
    };
}

// 若命中任何句柄，返回句柄类型
function getHandleAtPoint(px, py) {
    if (!isSelected) return null;
    const ap = getLayerProps();
    if (!ap.img) return null;
    const { tl, tr, br, bl } = getImageCorners();
    function hit(p) { const dx = px - p.x, dy = py - p.y; return Math.hypot(dx, dy) <= HANDLE_RADIUS * 1.2; }
    if (hit(tl)) return 'delete';     // 左上角：删除
    if (hit(tr)) return 'rotate';     // 右上角：旋转
    if (hit(br)) return 'scale-br';   // 右下角：缩放
    // 镜像按钮命中
    const fh = drawSelectionOverlay._flipHPos, fv = drawSelectionOverlay._flipVPos;
    if (fh && hit(fh)) return 'flip-h';
    if (fv && hit(fv)) return 'flip-v';
    return null;
}

// 绘制选中态叠加：虚线框和句柄
function drawSelectionOverlay() {
    if (!isSelected) return;
    const ap = getLayerProps();
    if (!ap.img || !ap.size.width || !ap.size.height) return;
    const { tl, tr, br, bl, c } = getImageCorners();
    // 虚线边框：使用变换简化
    const hw = ap.size.width / 2, hh = ap.size.height / 2;
    ctx.save();
    ctx.translate(c.x, c.y);
    if (ap.rotationRad) ctx.rotate(ap.rotationRad);
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
    ctx.setLineDash([]);
    ctx.restore();
    // 四角句柄
    function drawHandle(p, fill, glyph) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.stroke();
        if (glyph) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px system-ui, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(glyph, p.x, p.y + 0.5);
        }
    }
    // 左上角：关闭（红色背景）
    (function(){
        const p = tl;
        drawHandleBox(p.x, p.y, HANDLE_RADIUS * 2, '#e74c3c');
        const ok = drawIconPaths(ICON_PATHS.close, p.x, p.y, HANDLE_RADIUS * 2.0, '#ffffff');
        if (!ok) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px system-ui, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('×', p.x, p.y + 0.5);
        }
    })();
    // 右上角：旋转（统一中性背景）
    (function(){
        const p = tr;
        drawHandleBox(p.x, p.y, HANDLE_RADIUS * 2, HANDLE_BG_NEUTRAL);
        const ok = drawIconPaths(ICON_PATHS.rotate, p.x, p.y, HANDLE_RADIUS * 2.0, '#2E2F30');
        if (!ok) {
            ctx.fillStyle = '#2E2F30';
            ctx.font = '12px system-ui, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⟳', p.x, p.y + 0.5);
        }
    })();
    // 缩放（仅右下）：统一中性背景
    (function(){
        const p = br;
        drawHandleBox(p.x, p.y, HANDLE_RADIUS * 2, HANDLE_BG_NEUTRAL);
        const ok = drawIconPaths(ICON_PATHS.scale, p.x, p.y, HANDLE_RADIUS * 2.1, '#2E2F30');
        if (!ok) {
            // 兼容降级
            ctx.fillStyle = '#2E2F30';
            ctx.font = '12px system-ui, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('↔', p.x, p.y + 0.5);
        }
    })();
    // 左下角：镜像按钮（左右/上下）
    const offset = Math.round(HANDLE_RADIUS * 1.9); // 间距（在图像局部坐标系内）
    // 以左下角 bl 为基点，沿图像局部 +X（右）方向放置水平镜像按钮，沿 -Y（上）方向放置垂直镜像按钮
    const apRot = ap.rotationRad || 0;
    const cosR = Math.cos(apRot), sinR = Math.sin(apRot);
    // 局部 (dx,dy) 旋转到全局： (dx*cos - dy*sin, dx*sin + dy*cos)
    const flipHPos = {
        x: bl.x + offset * cosR - 0 * sinR,
        y: bl.y + offset * sinR + 0 * cosR
    };
    const flipVPos = {
        x: bl.x + 0 * cosR - (-offset) * sinR, // dy = -offset
        y: bl.y + 0 * sinR + (-offset) * cosR
    };
    // 水平镜像：
    (function(){
        const p = flipHPos;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(apRot); // 跟随选区旋转
        drawHandleBox(0, 0, HANDLE_RADIUS * 2, HANDLE_BG_NEUTRAL);
        const ok = drawIconPaths(ICON_PATHS.flipH, 0, 0, HANDLE_RADIUS * 2.1, '#2E2F30');
        if (!ok) {
            ctx.fillStyle = '#2E2F30';
            ctx.font = '12px system-ui, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('↔', 0, 0.5);
        }
        ctx.restore();
    })();
    // 垂直镜像：按钮与图层一起旋转
    (function(){
        const p = flipVPos;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(apRot);
        drawHandleBox(0, 0, HANDLE_RADIUS * 2, HANDLE_BG_NEUTRAL);
        const ok = drawIconPaths(ICON_PATHS.flipV, 0, 0, HANDLE_RADIUS * 2.1, '#2E2F30');
        if (!ok) {
            ctx.fillStyle = '#2E2F30';
            ctx.font = '12px system-ui, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('↕', 0, 0.5);
        }
        ctx.restore();
    })();
    // 保存按钮位置供命中检测
    drawSelectionOverlay._flipHPos = flipHPos;
    drawSelectionOverlay._flipVPos = flipVPos;

    // 旋转时在右上角旁显示角度标签
    if (isRotating) {
        const rot = getLayerProps().rotationRad || 0;
        const deg = Math.round(((rot % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI) * 180 / Math.PI);
        const text = `${deg}°`;
        const offset = { x: 18, y: -18 };
        const tx = tr.x + offset.x;
        const ty = tr.y + offset.y;
        ctx.save();
        ctx.font = '12px system-ui, Arial';
        const padding = 6;
        const metrics = ctx.measureText(text);
        const tw = Math.ceil(metrics.width) + padding * 2;
        const th = 18 + 2; // 高度近似
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        // 背板矩形
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(tx, ty - th/2, tw, th, 6) : ctx.rect(tx, ty - th/2, tw, th);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, tx + padding, ty);
        ctx.restore();
    }
}

function drawGuidelines() {
    const ap = getLayerProps();
    const imgCenterX = ap.pos.x + ap.size.width / 2;
    const canvasCenterX = canvas.width / 2;
    const imgCenterY = ap.pos.y + ap.size.height / 2;
    const contentMidY = getContentMidY();
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    if (Math.abs(imgCenterX - canvasCenterX) < 1) {
        ctx.beginPath();
        ctx.moveTo(canvasCenterX, 0);
        ctx.lineTo(canvasCenterX, canvas.height);
        ctx.stroke();
    }
    if (Math.abs(imgCenterY - contentMidY) < 1) {
        ctx.beginPath();
        ctx.moveTo(0, contentMidY);
        ctx.lineTo(canvas.width, contentMidY);
        ctx.stroke();
    }
    ctx.restore();
}

async function loadImage(src) {
    // 若已有主图，将其转存为静态叠加层（不移除）
    if (userImg) {
        overlays.push({
            img: userImg,
            pos: { x: userImgPos.x, y: userImgPos.y },
            size: { width: userImgSize.width, height: userImgSize.height },
            rotationRad: rotationRad || 0,
            scaleX: mainScaleX,
            scaleY: mainScaleY
        });
        // 选中状态重置为新图
        isSelected = false;
        activeLayer = { type: 'main', index: null };
    // 下一张主图不继承上一张的旋转/镜像
    rotationRad = 0;
    mainScaleX = 1;
    mainScaleY = 1;
    }

    // 重置 GIF 状态（用于新主图）
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
                // 新主图：重置旋转与镜像状态
                rotationRad = 0; mainScaleX = 1; mainScaleY = 1;
                // 重置导入尺寸为默认 50%
                const targetW = Math.max(1, Math.round(canvas.width * DEFAULT_IMPORT_WIDTH_RATIO));
                const scale = targetW / Math.max(1, userImg.width);
                const w = targetW;
                const h = Math.max(1, Math.round(userImg.height * scale));
                // 同步（隐藏的）slider/input 值为按百分比估算（与之前逻辑兼容缩放手势）
                const pct = Math.round(scale * 100);
                imageSizeSlider.value = String(pct);
                if (imageSizeInput) imageSizeInput.value = String(pct);
                // 默认位置：使图片中心位于吸附线交点（水平居中 + VERTICAL_SNAP_PCT 高度）
                const targetCx = canvas.width / 2;
                const targetCy = canvas.height * VERTICAL_SNAP_PCT;
                userImgPos.x = targetCx - w / 2;
                userImgPos.y = targetCy - h / 2;
                userImgSize.width = w; userImgSize.height = h;
                redrawCanvas(userImg);
                requestAnimationFrame(tick);
                if (formatSelect.value === 'gif') updateQualityEstimates();
                return;
            }
        } catch (e) {
            console.warn('GIF 解析失败，回退为静态图加载: ', e);
        }
    }

    // 非 GIF 或解析失败：按静态图加载
    const img = await createImage(src);
    userImg = img;
    // 新主图：重置旋转与镜像状态
    rotationRad = 0; mainScaleX = 1; mainScaleY = 1;
    // 重置导入尺寸为默认 50%
    const targetW = Math.max(1, Math.round(canvas.width * DEFAULT_IMPORT_WIDTH_RATIO));
    const scale = targetW / Math.max(1, userImg.width);
    const w = targetW;
    const h = Math.max(1, Math.round(userImg.height * scale));
    const pct = Math.round(scale * 100);
    imageSizeSlider.value = String(pct);
    if (imageSizeInput) imageSizeInput.value = String(pct);
    // 默认位置：使图片中心位于吸附线交点（水平居中 + VERTICAL_SNAP_PCT 高度）
    const targetCx = canvas.width / 2;
    const targetCy = canvas.height * VERTICAL_SNAP_PCT;
    userImgPos.x = targetCx - w / 2;
    userImgPos.y = targetCy - h / 2;
    userImgSize.width = w; userImgSize.height = h;
    activeLayer = { type: 'main', index: null };
    redrawCanvas();
    if (formatSelect.value === 'gif') updateQualityEstimates();
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

function getPinchInfo() {
    const pts = Array.from(activePointers.values());
    if (pts.length < 2) return null;
    const [p1, p2] = pts;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    return { dist, center };
}

// 滚轮缩放：在鼠标位于图片区域时，按光标为中心缩放图片
function onCanvasWheel(e) {
    // 命中顶层图层后，对该图层缩放
    const { x: mx, y: my } = getCanvasPos(e);
    // 命中顺序：主图在最上层，然后叠加层从后往前
    let target = null;
    if (userImg && isPointInImage(mx, my, { type: 'main' })) target = { type: 'main' };
    if (!target) {
        for (let i = overlays.length - 1; i >= 0; i--) {
            if (isPointInImage(mx, my, { type: 'overlay', index: i })) { target = { type: 'overlay', index: i }; break; }
        }
    }
    if (!target) return;

    e.preventDefault(); // 避免页面滚动

    const cur = parseFloat(imageSizeSlider.value);
    const min = parseFloat(imageSizeSlider.min || '1');
    const max = parseFloat(imageSizeSlider.max || '500');
    // 每次滚动“变动 1 单位”（向上放大 +1，向下缩小 -1）
    let next = cur + (e.deltaY < 0 ? 1 : -1);
    next = Math.max(min, Math.min(max, next));
    if (next === cur) return;

    // 以鼠标处为缩放锚点，保持该点在图像上的相对位置不变
    const tp = getLayerProps(target);
    const px = (mx - tp.pos.x) / (tp.size.width || 1);
    const py = (my - tp.pos.y) / (tp.size.height || 1);

    // 基于当前显示尺寸按比例推算新尺寸（避免依赖原始像素宽高）
    const scaleRatio = next / cur;
    const newW = Math.max(1, tp.size.width * scaleRatio);
    const newH = Math.max(1, tp.size.height * scaleRatio);

    // 调整位置以实现光标居中缩放
    setLayerPos(mx - px * newW, my - py * newH, target);
    setLayerSize(newW, newH, target);
    // 选中命中的图层
    activeLayer = target; isSelected = true;

    // 同步控件并重绘
    imageSizeSlider.value = String(next);
    if (imageSizeInput) imageSizeInput.value = String(next);
    redrawCanvas();
}

function onPointerDown(e) {
    isPointerActive = true;
    // 记录多指位置
    try { activePointers.set(e.pointerId, getCanvasPos(e)); } catch {}
    if (activePointers.size >= 2) {
        // 进入捏合模式，关闭拖动
        isPinching = true;
        isDragging = false;
    lastPinchAppliedValue = parseFloat(imageSizeSlider.value);
    const info = getPinchInfo();
    pinchPrevDist = info ? info.dist : null;
        e.preventDefault();
        return;
    }
    const { x: mouseX, y: mouseY } = getCanvasPos(e);
    // 点击先尝试命中句柄（当前选中层）
        // 句柄命中优先
        const handle = getHandleAtPoint(mouseX, mouseY);
        if (isSelected && handle) {
            activeHandle = handle;
            if (handle === 'delete') {
                // 移除当前层
                if (activeLayer?.type === 'overlay' && overlays[activeLayer.index]) {
                    overlays.splice(activeLayer.index, 1);
                } else {
                    userImg = null; isGif = false; gifFrames = []; gifFrameScaleCache.clear();
                }
                isSelected = false; activeLayer = { type: 'main', index: null };
                redrawCanvas();
            } else if (handle === 'rotate') {
                isRotating = true;
                const c = getImageCenter();
                gestureCenter = c;
                startAngle = Math.atan2(mouseY - c.y, mouseX - c.x);
                startRotation = getLayerProps().rotationRad || 0;
            } else if (handle === 'scale-br') {
                isScaling = true;
                // 缩放锚定左上角（旋转后）
                const corners = getImageCorners();
                scaleAnchorTL = { x: corners.tl.x, y: corners.tl.y };
                // 起始对角距离（锚点到当前指针）
                scaleStartDiag = Math.max(1, Math.hypot(mouseX - scaleAnchorTL.x, mouseY - scaleAnchorTL.y));
                startSliderValue = parseFloat(imageSizeSlider.value);
                const ap = getLayerProps();
                scaleStartW = ap.size.width; scaleStartH = ap.size.height;
            } else if (handle === 'flip-h') {
                toggleLayerFlipH();
                redrawCanvas();
                e.preventDefault();
                return;
            } else if (handle === 'flip-v') {
                toggleLayerFlipV();
                redrawCanvas();
                e.preventDefault();
                return;
            }
            if (canvas.setPointerCapture && e.pointerId !== undefined) {
                try { canvas.setPointerCapture(e.pointerId); } catch {}
            }
            e.preventDefault();
            return;
        }
    // 命中任一图层：主图优先，其次叠加层自上而下
    if (userImg && isPointInImage(mouseX, mouseY, { type: 'main' })) {
        activeLayer = { type: 'main', index: null }; isSelected = true; isDragging = true;
        dragStart = { x: mouseX, y: mouseY, imgX: userImgPos.x, imgY: userImgPos.y };
        if (canvas.setPointerCapture && e.pointerId !== undefined) { try { canvas.setPointerCapture(e.pointerId); } catch {} }
        e.preventDefault(); redrawCanvas(); return;
    }
    for (let i = overlays.length - 1; i >= 0; i--) {
        if (isPointInImage(mouseX, mouseY, { type: 'overlay', index: i })) {
            activeLayer = { type: 'overlay', index: i }; isSelected = true; isDragging = true;
            const ol = overlays[i];
            dragStart = { x: mouseX, y: mouseY, imgX: ol.pos.x, imgY: ol.pos.y };
            if (canvas.setPointerCapture && e.pointerId !== undefined) { try { canvas.setPointerCapture(e.pointerId); } catch {} }
            e.preventDefault(); redrawCanvas(); return;
        }
    }
    
    // 点击空白处取消选中
    if (isSelected) { isSelected = false; redrawCanvas(); }
}

function onPointerMove(e) {
    // 更新指针位置（用于捏合）
    try { if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, getCanvasPos(e)); } catch {}

    // 捏合缩放（命中当前选中层或最上层命中图层）
    if (isPinching) {
        const info = getPinchInfo();
        if (info && pinchPrevDist) {
            const center = info.center;
            // 选中层优先，否则命中最上层
            let target = null;
            if (isSelected && getLayerProps().img && isPointInImage(center.x, center.y)) {
                target = activeLayer;
            } else {
                if (userImg && isPointInImage(center.x, center.y, { type: 'main' })) target = { type: 'main' };
                if (!target) {
                    for (let i = overlays.length - 1; i >= 0; i--) {
                        if (isPointInImage(center.x, center.y, { type: 'overlay', index: i })) { target = { type: 'overlay', index: i }; break; }
                    }
                }
            }
            if (target) {
                const curVal = parseFloat(imageSizeSlider.value);
                const min = parseFloat(imageSizeSlider.min || '1');
                const max = parseFloat(imageSizeSlider.max || '500');
                // 距离比例（加入阻尼，降低灵敏度）
                const rawRatio = info.dist / pinchPrevDist;
                let ratio = (!Number.isFinite(rawRatio) || rawRatio <= 0) ? 1 : rawRatio;
                // 应用阻尼：只取真实变化的 30%
                ratio = 1 + (ratio - 1) * 0.7;
                // 单次变化再夹到 ±10% 以内，进一步降低灵敏度
                ratio = Math.max(0.9, Math.min(1.1, ratio));

                let nextVal = Math.max(min, Math.min(max, curVal * ratio));
                // 提高触发阈值，避免频繁微动
                if (Math.abs(nextVal - curVal) >= 0.5) {
                    const tp = getLayerProps(target);
                    const scaleRatio = nextVal / curVal;
                    const newW = Math.max(1, tp.size.width * scaleRatio);
                    const newH = Math.max(1, tp.size.height * scaleRatio);
                    // 以两指中心为锚点保持相对位置
                    const px = (center.x - tp.pos.x) / (tp.size.width || 1);
                    const py = (center.y - tp.pos.y) / (tp.size.height || 1);
                    setLayerPos(center.x - px * newW, center.y - py * newH, target);
                    setLayerSize(newW, newH, target);
                    activeLayer = target; isSelected = true;
                    // 同步 UI
                    imageSizeSlider.value = String(Math.round(nextVal));
                    if (imageSizeInput) imageSizeInput.value = String(Math.round(nextVal));
                    redrawCanvas();
                    lastPinchAppliedValue = nextVal;
                }
                pinchPrevDist = info.dist;
            } else {
                // 中心不在图像上，不缩放但更新参考距离，等待进入图像
                pinchPrevDist = info.dist;
            }
        }
        e.preventDefault();
        return;
    }
    // 旋转
    if (isRotating && getLayerProps().img && gestureCenter) {
        const { x, y } = getCanvasPos(e);
        const ang = Math.atan2(y - gestureCenter.y, x - gestureCenter.x);
        let next = startRotation + (ang - startAngle);
        // 对 0°, 90°, 180°, 270°（即 90°的整数倍）进行吸附
        const HALF_PI = Math.PI / 2;
        const nearest = Math.round(next / HALF_PI) * HALF_PI; // 最近的 90°倍数
        if (Math.abs(next - nearest) < ROTATE_SNAP_RAD) next = nearest;
        setLayerRotation(next);
        redrawCanvas();
        e.preventDefault();
        return;
    }
    // 句柄缩放（以中心为锚点等比缩放）
    if (isScaling && getLayerProps().img && scaleAnchorTL) {
        const { x, y } = getCanvasPos(e);
        const curDist = Math.max(1, Math.hypot(x - scaleAnchorTL.x, y - scaleAnchorTL.y));
        let ratio = curDist / (scaleStartDiag || 1);
        ratio = Math.max(0.1, Math.min(10, ratio));
        const min = parseFloat(imageSizeSlider.min || '1');
        const max = parseFloat(imageSizeSlider.max || '500');
        let nextVal = Math.max(min, Math.min(max, startSliderValue * ratio));
        // 新宽高
        const newW = Math.max(1, scaleStartW * (nextVal / startSliderValue));
        const newH = Math.max(1, scaleStartH * (nextVal / startSliderValue));
        const ap2 = getLayerProps();
        ap2.size.width = newW; ap2.size.height = newH;
        // 计算新的中心，让左上角（旋转后的 tl）保持不动
        const hw = newW / 2, hh = newH / 2;
        const rot = getLayerProps().rotationRad || 0; const cosA = Math.cos(rot), sinA = Math.sin(rot);
        const dx = hw * cosA - hh * sinA;
        const dy = hw * sinA + hh * cosA;
        const newCenterX = scaleAnchorTL.x + dx;
        const newCenterY = scaleAnchorTL.y + dy;
        setLayerPos(newCenterX - newW / 2, newCenterY - newH / 2);
        // 同步控件
        imageSizeSlider.value = String(Math.round(nextVal));
        if (imageSizeInput) imageSizeInput.value = String(Math.round(nextVal));
        redrawCanvas();
        e.preventDefault();
        return;
    }
    if (!isDragging) return;
    const { x, y } = getCanvasPos(e);
    // 以起点差值移动（不依赖旋转）
    let newX = dragStart.imgX + (x - dragStart.x);
    let newY = dragStart.imgY + (y - dragStart.y);
    const ap3 = getLayerProps();
    const imgCenterX = newX + ap3.size.width / 2;
    const canvasCenterX = canvas.width / 2;
    if (Math.abs(imgCenterX - canvasCenterX) < snapThreshold) {
        newX = canvasCenterX - ap3.size.width / 2;
    }
    // 垂直吸附到内容中线
    const contentMidY = getContentMidY();
    const imgCenterY = newY + ap3.size.height / 2;
    if (Math.abs(imgCenterY - contentMidY) < snapThreshold) {
        newY = contentMidY - ap3.size.height / 2;
    }
    setLayerPos(newX, newY);
    redrawCanvas();
    e.preventDefault();
}

function onPointerUp(e) {
    isDragging = false;
    isPointerActive = false;
    try { activePointers.delete(e.pointerId); } catch {}
    if (activePointers.size < 2) {
        isPinching = false;
        lastPinchAppliedValue = null;
        // 清理上次距离记录
        pinchPrevDist = null;
    }
    isRotating = false;
    isScaling = false;
    activeHandle = null;
    gestureCenter = null;
    scaleAnchorTL = null;
    redrawCanvas();
    if (canvas.releasePointerCapture && e.pointerId !== undefined) {
        try { canvas.releasePointerCapture(e.pointerId); } catch {}
    }
}

function onPointerCancel(e) {
    try { activePointers.delete(e.pointerId); } catch {}
    if (activePointers.size < 2) {
        isPinching = false;
        pinchPrevDist = null;
    }
    isDragging = false;
    isRotating = false;
    isScaling = false;
    activeHandle = null;
    gestureCenter = null;
    scaleAnchorTL = null;
    redrawCanvas();
}

canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
canvas.addEventListener('pointermove', onPointerMove, { passive: false });
canvas.addEventListener('pointerup', onPointerUp, { passive: false });
canvas.addEventListener('pointercancel', onPointerCancel, { passive: false });
canvas.addEventListener('wheel', onCanvasWheel, { passive: false });

// 使用 pointer 事件统一处理拖动/缩放/旋转

textInput.addEventListener('input', () => { redrawCanvas(); if (formatSelect.value === 'gif') updateQualityEstimates(); });
fontSizeSlider.addEventListener('input', () => { redrawCanvas(); if (formatSelect.value === 'gif') updateQualityEstimates(); });
// 已移除文字垂直位置滑块（固定为 TEXT_Y_PCT）
imageSizeSlider.addEventListener('input', () => {
    imageSizeInput.value = imageSizeSlider.value;
    redrawCanvas();
    if (formatSelect.value === 'gif') updateQualityEstimates();
});
function clampImageSizeValue(raw) {
    const minV = parseInt(imageSizeSlider.min, 10) || 1;
    const maxV = parseInt(imageSizeSlider.max, 10) || 500;
    let v = parseInt(raw, 10);
    if (Number.isNaN(v)) v = parseInt(imageSizeSlider.value, 10) || minV;
    return Math.min(maxV, Math.max(minV, v));
}
// 实时输入：边输入边更新画布，体验更顺滑
imageSizeInput.addEventListener('input', () => {
    const v = clampImageSizeValue(imageSizeInput.value);
    imageSizeSlider.value = String(v);
    // 不改写 input 的值，允许继续编辑，但画布先跟随
    redrawCanvas();
    if (formatSelect.value === 'gif') updateQualityEstimates();
});
// 失焦或回车：规范化值并重绘
imageSizeInput.addEventListener('change', () => {
    const v = clampImageSizeValue(imageSizeInput.value);
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
            // 每次新图重置抠图状态
            resetPreviewRemoval();
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
        resetPreviewRemoval();
    }
});

// 自定义图片：使用按钮
if (customUseBtn) {
    customUseBtn.addEventListener('click', async () => {
    const raw = (pendingCustomSrc || '').trim();
    if (!raw) { showTipModal('请先上传图片或输入 URL'); return; }
    // 如果有处理结果且已经应用过阈值（pickedColor != null），使用处理后的 dataURL
    const finalSrc = (processedPreviewDataURL && pickedColor && lastAppliedThreshold !== null) ? processedPreviewDataURL : raw;
    await loadImage(finalSrc);
    if (raw.startsWith('http')) addToRecents(raw, true); // 记录原始 URL（而不是 dataURL）
    if (typeof closeGalleryModal === 'function') closeGalleryModal();
    });
}

downloadBtn.addEventListener('click', async () => {
    const format = formatSelect.value;
    // 导出前暂时隐藏编辑框（虚线与句柄）
    const prevSelected = isSelected; const prevRotating = isRotating; const prevScaling = isScaling; const prevHandle = activeHandle;
    isSelected = false; isRotating = false; isScaling = false; activeHandle = null; redrawCanvas();
    if (format === 'gif') {
        if (isExportingGif) return;
        isExportingGif = true;
        const originalText = downloadBtn.textContent;
        const restoreBtn = () => { 
            downloadBtn.textContent = originalText; 
            downloadBtn.disabled = false; 
            downloadBtn.classList.remove('btn-progress');
            downloadBtn.style.removeProperty('--progress');
            isExportingGif = false; 
        };
        downloadBtn.disabled = true;
        downloadBtn.textContent = '准备中…';
        downloadBtn.classList.add('btn-progress');
        downloadBtn.style.setProperty('--progress', '0%');
        // 导出为 GIF：对于静态图也可导出为单帧动图
        try {
            const workerScriptURL = await getGifWorkerScriptURL();
            const qp = getQualityParams();
            const outW = Math.max(1, Math.round(canvas.width * qp.scale));
            const outH = Math.max(1, Math.round(canvas.height * qp.scale));
            const encoder = new window.GIF({
                workers: 2,
                quality: qp.encoderQuality,
                width: outW,
                height: outH,
                repeat: 0,
                workerScript: workerScriptURL
            });
            encoder.on('progress', (p) => {
                const pct = Math.max(0, Math.min(100, Math.round(p * 100)));
                downloadBtn.textContent = `渲染中 ${pct}%`;
                downloadBtn.style.setProperty('--progress', pct + '%');
            });
            // 将每一帧渲染到离屏 canvas 后加入 encoder
            const off = document.createElement('canvas');
            off.width = outW; off.height = outH;
            const octx = off.getContext('2d', { willReadFrequently: true });

            if (isGif && gifFrames.length > 0) {
                for (const fr of gifFrames) {
                    octx.clearRect(0, 0, off.width, off.height);
                    // 背景缩放绘制
                    octx.drawImage(backgroundImg, 0, 0, off.width, off.height);
                    // 叠加层先绘制
                    for (const ol of overlays) {
                        if (!ol || !ol.img) continue;
                        const ow = Math.max(1, Math.round((ol.size?.width || ol.img.width) * qp.scale));
                        const oh = Math.max(1, Math.round((ol.size?.height || ol.img.height) * qp.scale));
                        const ox = Math.round((ol.pos?.x || 0) * qp.scale);
                        const oy = Math.round((ol.pos?.y || 0) * qp.scale);
                        octx.save();
                        octx.translate(ox + ow / 2, oy + oh / 2);
                        if (ol.rotationRad) octx.rotate(ol.rotationRad);
                        const sX = (ol.scaleX ?? 1), sY = (ol.scaleY ?? 1);
                        if (sX !== 1 || sY !== 1) octx.scale(sX, sY);
                        octx.drawImage(ol.img, -ow / 2, -oh / 2, ow, oh);
                        octx.restore();
                    }
                    // 主图旋转绘制（使用当前尺寸与角度）
                    const w = Math.max(1, Math.round((userImgSize.width || fr.image.width) * qp.scale));
                    const h = Math.max(1, Math.round((userImgSize.height || fr.image.height) * qp.scale));
                    const ox = Math.round(userImgPos.x * qp.scale);
                    const oy = Math.round(userImgPos.y * qp.scale);
                    const cx = ox + w / 2, cy = oy + h / 2;
                    octx.imageSmoothingEnabled = false;
                    octx.save();
                    octx.translate(cx, cy);
                    if (rotationRad) octx.rotate(rotationRad);
                    if (mainScaleX !== 1 || mainScaleY !== 1) octx.scale(mainScaleX, mainScaleY);
                    octx.drawImage(fr.image, -w / 2, -h / 2, w, h);
                    octx.restore();
                    // 叠加文字
                    const fontSize = fontSizeSlider.value * qp.scale;
                    const positionYPercent = TEXT_Y_PCT * 100;
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
                octx.drawImage(backgroundImg, 0, 0, off.width, off.height);
                // 叠加层
                for (const ol of overlays) {
                    if (!ol || !ol.img) continue;
                    const ow = Math.max(1, Math.round((ol.size?.width || ol.img.width) * qp.scale));
                    const oh = Math.max(1, Math.round((ol.size?.height || ol.img.height) * qp.scale));
                    const ox = Math.round((ol.pos?.x || 0) * qp.scale);
                    const oy = Math.round((ol.pos?.y || 0) * qp.scale);
                    octx.save();
                    octx.translate(ox + ow / 2, oy + oh / 2);
                    if (ol.rotationRad) octx.rotate(ol.rotationRad);
                    const sX = (ol.scaleX ?? 1), sY = (ol.scaleY ?? 1);
                    if (sX !== 1 || sY !== 1) octx.scale(sX, sY);
                    octx.drawImage(ol.img, -ow / 2, -oh / 2, ow, oh);
                    octx.restore();
                }
                if (userImg) {
                    const w = Math.max(1, Math.round((userImgSize.width || userImg.width) * qp.scale));
                    const h = Math.max(1, Math.round((userImgSize.height || userImg.height) * qp.scale));
                    const ox = Math.round(userImgPos.x * qp.scale);
                    const oy = Math.round(userImgPos.y * qp.scale);
                    const cx = ox + w / 2, cy = oy + h / 2;
                    octx.save();
                    octx.translate(cx, cy);
                    if (rotationRad) octx.rotate(rotationRad);
                    if (mainScaleX !== 1 || mainScaleY !== 1) octx.scale(mainScaleX, mainScaleY);
                    octx.drawImage(userImg, -w / 2, -h / 2, w, h);
                    octx.restore();
                }
                const fontSize = fontSizeSlider.value * qp.scale;
                const positionYPercent = TEXT_Y_PCT * 100;
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
                // 恢复编辑框显示状态
                isSelected = prevSelected; isRotating = prevRotating; isScaling = prevScaling; activeHandle = prevHandle; redrawCanvas();
            });
            encoder.render();
        } catch (e) {
            console.error(e);
            showTipModal('GIF 导出失败，请重试。', { duration: 2200 });
            restoreBtn();
            // 恢复编辑框显示状态
            isSelected = prevSelected; isRotating = prevRotating; isScaling = prevScaling; activeHandle = prevHandle; redrawCanvas();
        }
        return;
    }
    // 其他格式按原逻辑
    const dataURL = canvas.toDataURL(`image/${format}`);
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `image-with-text.${format}`;
    link.click();
    // 恢复编辑框显示状态
    isSelected = prevSelected; isRotating = prevRotating; isScaling = prevScaling; activeHandle = prevHandle; redrawCanvas();
});

copyBtn.addEventListener('click', () => {
    // 复制前隐藏编辑框
    const prevSelected = isSelected; const prevRotating = isRotating; const prevScaling = isScaling; const prevHandle = activeHandle;
    isSelected = false; isRotating = false; isScaling = false; activeHandle = null; redrawCanvas();
    canvas.toBlob(blob => {
        if (navigator.clipboard && navigator.clipboard.write) {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
                showTipModal('图片已复制到剪贴板！', { duration: 1400 });
            }).catch(err => showTipModal('复制失败！', { duration: 1800 }));
        } else {
            showTipModal('浏览器不支持复制功能。', { duration: 2000 });
        }
        // 恢复编辑框显示状态
        isSelected = prevSelected; isRotating = prevRotating; isScaling = prevScaling; activeHandle = prevHandle; redrawCanvas();
    }, 'image/png');
});

// 根据导出格式控制复制按钮的显示/隐藏
function updateCopyButtonVisibility() {
    const format = formatSelect.value;
    if (format === 'gif') {
        copyBtn.style.display = 'none';
    } else {
        copyBtn.style.display = '';
    }
}

// 监听格式选择变化
formatSelect.addEventListener('change', updateCopyButtonVisibility);

// 初始化时设置按钮状态
updateCopyButtonVisibility();

// 根据导出格式显示/隐藏质量选择（仅 GIF 有效）
function updateQualityVisibility() {
    const isGifFmt = formatSelect.value === 'gif';
    if (qualitySelect && qualityLabel) {
        qualitySelect.style.display = isGifFmt ? '' : 'none';
        qualityLabel.style.display = isGifFmt ? '' : 'none';
    }
}
formatSelect.addEventListener('change', () => {
    updateQualityVisibility();
    if (formatSelect.value === 'gif') {
        // 切换到 GIF 时刷新预估
        updateQualityEstimates();
    }
});
updateQualityVisibility();

// 质量对应的缩放因子与编码采样参数
function getQualityParams() {
    const v = (qualitySelect && qualitySelect.value) || 'none';
    switch (v) {
        case '20': return { scale: 0.2, encoderQuality: 24 };
        case '40': return { scale: 0.4, encoderQuality: 20 };
        case '60': return { scale: 0.6, encoderQuality: 16 };
        case '80': return { scale: 0.8, encoderQuality: 12 };
        default:   return { scale: 1.0, encoderQuality: 10 }; // 不压缩
    }
}

// 简易 bytes 格式化
function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '—';
    const units = ['B','KB','MB','GB'];
    let i = 0; let val = bytes;
    while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
    return `${val.toFixed(i === 0 ? 0 : (i === 1 ? 0 : 1))}${units[i]}`;
}

// 估算 GIF 大小：抽样 2-3 帧，将缩放后的帧导出为 PNG 估算帧体积，乘以帧数再乘以折扣系数
async function estimateGifSizeBytes(scale) {
    try {
        const off = document.createElement('canvas');
        const w = Math.max(1, Math.round(canvas.width * scale));
        const h = Math.max(1, Math.round(canvas.height * scale));
        off.width = w; off.height = h;
        const octx = off.getContext('2d', { willReadFrequently: true });

        // 选择要采样的帧
        let samples = [];
        if (isGif && gifFrames.length > 0) {
            const idxs = new Set([0, Math.floor(gifFrames.length / 2), gifFrames.length - 1]);
            samples = Array.from(idxs).filter(i => i >= 0 && i < gifFrames.length).map(i => gifFrames[i]);
        } else {
            samples = [{ image: userImg }];
        }
        if (samples.length === 0) return 0;

        const getBlobSize = (canvasEl) => new Promise(resolve => {
            if (canvasEl.toBlob) {
                canvasEl.toBlob(b => resolve(b ? b.size : 0), 'image/png');
            } else {
                try {
                    const dataURL = canvasEl.toDataURL('image/png');
                    const size = Math.max(0, Math.floor((dataURL.length - 'data:image/png;base64,'.length) * 3 / 4));
                    resolve(size);
                } catch { resolve(0); }
            }
        });

        let totalSampleBytes = 0;
        for (const fr of samples) {
            octx.clearRect(0, 0, w, h);
            // 背景
            octx.drawImage(backgroundImg, 0, 0, w, h);
            // 叠加层（粗略估算，不计旋转差异）
            for (const ol of overlays) {
                if (!ol || !ol.img) continue;
                const ow = Math.max(1, Math.round((ol.size?.width || ol.img.width) * scale));
                const oh = Math.max(1, Math.round((ol.size?.height || ol.img.height) * scale));
                const ox = Math.round((ol.pos?.x || 0) * scale);
                const oy = Math.round((ol.pos?.y || 0) * scale);
                octx.drawImage(ol.img, ox, oy, ow, oh);
            }
            // 主图
            const drawW = Math.max(1, Math.round((userImgSize.width || (fr.image?.width || userImg?.width || 0)) * scale));
            const drawH = Math.max(1, Math.round((userImgSize.height || (fr.image?.height || userImg?.height || 0)) * scale));
            const drawX = Math.round(userImgPos.x * scale);
            const drawY = Math.round(userImgPos.y * scale);
            octx.imageSmoothingEnabled = false;
            octx.drawImage(fr.image || userImg, drawX, drawY, drawW, drawH);
            // 文本
            const fontSize = fontSizeSlider.value * scale;
            const positionYPercent = TEXT_Y_PCT * 100;
            octx.fillStyle = 'rgb(59, 66, 85)';
            octx.font = `${fontSize}px 'HYWenHei-85W'`;
            octx.textAlign = 'center';
            octx.textBaseline = 'middle';
            const text = textInput.value;
            const x = w / 2;
            const y = h * (positionYPercent / 100);
            octx.fillText(text, x, y);

            totalSampleBytes += await getBlobSize(off);
        }
        const avgPerFrame = totalSampleBytes / samples.length;
        const framesCount = isGif && gifFrames.length > 0 ? gifFrames.length : 1;
        // GIF 通常比 PNG 更小，取 0.6 系数粗略估计
        const estimate = avgPerFrame * framesCount * 0.6;
        return Math.floor(estimate);
    } catch { return 0; }
}

let qualityEstimateTimer = null;
async function updateQualityEstimates() {
    if (!qualitySelect) return;
    // 去抖
    if (qualityEstimateTimer) clearTimeout(qualityEstimateTimer);
    qualityEstimateTimer = setTimeout(async () => {
        const opts = Array.from(qualitySelect.options);
        // 顺序：none, 80, 60, 40, 20
        const mapping = {
            '80': 0.8,
            '60': 0.6,
            '40': 0.4,
            '20': 0.2
        };
        for (const opt of opts) {
            const isNone = opt.value === 'none';
            const scale = isNone ? 1.0 : mapping[opt.value];
            const bytes = await estimateGifSizeBytes(scale || 1.0);
            if (isNone) {
                opt.textContent = `100%（预计${formatBytes(bytes)}）`;
            } else {
                opt.textContent = `${opt.value}%（预计${formatBytes(bytes)}）`;
            }
        }
    }, 150);
}

if (qualitySelect) {
    qualitySelect.addEventListener('change', () => {
        // 选择质量时，若当前是 GIF，刷新一次预估
        if (formatSelect.value === 'gif') updateQualityEstimates();
    });
}

// Show first-load tip modal once per browser (先显示以便统计进度)
showFirstLoadTipIfNeeded();
// Initialize the gallery（开始加载分类 JSON，会驱动进度条推进）
initGallery();
