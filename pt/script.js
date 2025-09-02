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
const imageUrlInput = document.getElementById('image-url-input');
const galleryBtn = document.getElementById('gallery-btn');
const galleryModal = document.getElementById('gallery-modal');
const modalClose = document.querySelector('.modal-close');
const categoryContainer = document.getElementById('category-container');
const imageGallery = document.getElementById('image-gallery');

const backgroundImg = new Image();
backgroundImg.src = 'input.png';

let userImg = null;
let userImgPos = { x: 100, y: 100 };
let userImgSize = { width: 200, height: 200 };

let isDragging = false;
let dragStart = { x: 0, y: 0 };
const snapThreshold = 10;
let isPointerActive = false; // 避免 pointer 与 mouse 双触发

// --- Gallery Data ---
const jsonFiles = [
    "原神×瑞幸咖啡联动.json", "小红书×心海联动.json", "抖音×八重神子联动.json",
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

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImg, 0, 0);

    if (userImg && userImg.complete) {
        const scale = imageSizeSlider.value / 100;
        const w = userImg.width * scale;
        const h = userImg.height * scale;
        userImgSize = { width: w, height: h };
        ctx.drawImage(userImg, userImgPos.x, userImgPos.y, w, h);
    }

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

function loadImage(src) {
    const img = new Image();
    if (!src.startsWith('data:')) {
        img.crossOrigin = "anonymous";
    }
    img.onload = () => {
        userImg = img;
        const scale = imageSizeSlider.value / 100;
        const w = userImg.width * scale;
        const h = userImg.height * scale;
        userImgPos.x = (canvas.width - w) / 2;
        userImgPos.y = (canvas.height - h) / 2;
    redrawCanvas();
    };
    img.onerror = () => {
        alert('图片加载失败！请检查URL或确保图片服务器允许跨域。');
    };
    img.src = src;
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
    const firstCategory = (recentImages && recentImages.length > 0)
        ? '最近使用'
        : Object.keys(galleryData).find(k => k !== '最近使用');
    if (firstCategory) displayCategory(firstCategory);
}

function populateCategories() {
    // 重建分类条，保证顺序：最近使用 -> 其他
    categoryContainer.innerHTML = '';
    const order = ['最近使用', ...Object.keys(galleryData).filter(n => n !== '最近使用')];
    for (const categoryName of order) {
        const urls = galleryData[categoryName];
        if (!urls || urls.length === 0) {
            // “最近使用”允许为空也展示按钮；其他无图跳过
            if (categoryName !== '最近使用') continue;
        }

        const btn = document.createElement('div');
        btn.className = 'category-btn';
        btn.dataset.category = categoryName;

    const img = document.createElement('img');
    img.src = (urls && urls[0]) || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
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

    // Populate images
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
            galleryModal.style.display = 'none';
        });
        imageGallery.appendChild(img);
    });
}

galleryBtn.addEventListener('click', () => {
    galleryModal.style.display = 'flex';
});

modalClose.addEventListener('click', () => {
    galleryModal.style.display = 'none';
});

galleryModal.addEventListener('click', (e) => {
    if (e.target === galleryModal) {
        galleryModal.style.display = 'none';
    }
});

// --- Event Listeners & Init ---

// Pointer events（移动端拖动适配，桌面也可用）
function getCanvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.clientX ?? (evt.touches && evt.touches[0] && evt.touches[0].clientX) ?? 0;
    const clientY = evt.clientY ?? (evt.touches && evt.touches[0] && evt.touches[0].clientY) ?? 0;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
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

canvas.addEventListener('mousedown', (e) => {
    if (isPointerActive) return; // 避免重复
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
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
        let newX = e.offsetX - dragStart.x;
        let newY = e.offsetY - dragStart.y;
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

textInput.addEventListener('input', redrawCanvas);
fontSizeSlider.addEventListener('input', redrawCanvas);
positionYSlider.addEventListener('input', redrawCanvas);
imageSizeSlider.addEventListener('input', redrawCanvas);
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => loadImage(event.target.result);
        reader.readAsDataURL(file);
    }
});
imageUrlInput.addEventListener('change', (e) => {
    const url = e.target.value;
    if (url) loadImage(url);
});

downloadBtn.addEventListener('click', () => {
    const format = formatSelect.value;
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
                alert('图片已复制到剪贴板！');
            }).catch(err => alert('复制失败！'));
        } else {
            alert('浏览器不支持复制功能。');
        }
    }, 'image/png');
});

// Initialize the gallery
initGallery();
