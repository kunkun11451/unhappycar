// DOM 元素
const audio = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressWrapper = document.getElementById('progressWrapper');
const progressBar = document.getElementById('progress');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const bookTitleEl = document.getElementById('bookTitle');
const chapterTitleEl = document.getElementById('chapterTitle');
const playerContainer = document.querySelector('.player-container');

// 模态框
const menuBtn = document.getElementById('menuBtn');
const settingsBtn = document.getElementById('settingsBtn');
const timerBtn = document.getElementById('timerBtn');

const menuModal = document.getElementById('menuModal');
const timerModal = document.getElementById('timerModal');
const settingsModal = document.getElementById('settingsModal');
const closeBtns = document.querySelectorAll('.close-btn');

// 历史记录与章节进度
const MAX_HISTORY = 50;
let playHistory = [];
let chapterProgressMap = {};  // key: "bookIndex-chapterIndex", value: { currentTime, duration, progress }

// 设置项 DOM
const subtitleToggle = document.getElementById('subtitleToggle');
const lyricsContainer = document.getElementById('lyricsContainer');
const lyricsContent = document.getElementById('lyricsContent');
const speedSlider = document.getElementById('speedSlider');
const speedValueDisplay = document.getElementById('speedValueDisplay');


// 状态
let flatPlaylist = [];
let currentIndex = 0; // Index in flatPlaylist
let currentPlayId = '';

function buildPlaylist() {
    flatPlaylist = [];
    if (typeof libraryData === 'undefined') return;
    libraryData.forEach(node => {
        if (node.type === 'series') {
            node.books.forEach(book => {
                book.chapters.forEach(chap => {
                    const playId = node.id + ':' + book.id + ':' + chap.id;
                    flatPlaylist.push({
                        playId: playId,
                        seriesId: node.id,
                        bookId: book.id,
                        chapterId: chap.id,
                        seriesTitle: node.title,
                        bookTitle: book.title,
                        chapterTitle: chap.title,
                        audioUrl: chap.audioUrl,
                        coverUrl: book.coverUrl || node.coverUrl
                    });
                });
            });
        } else if (node.type === 'book') {
            node.chapters.forEach(chap => {
                const playId = 'none:' + node.id + ':' + chap.id;
                flatPlaylist.push({
                    playId: playId,
                    seriesId: null,
                    bookId: node.id,
                    chapterId: chap.id,
                    seriesTitle: null,
                    bookTitle: node.title,
                    chapterTitle: chap.title,
                    audioUrl: chap.audioUrl,
                    coverUrl: node.coverUrl
                });
            });
        }
    });
}
let isPlaying = false;
let sleepTimer = null;
let timerSeconds = 0;
let sleepTimerEndTime = 0;
let episodesMode = false;
let targetEpisodes = 0;
let episodesPlayed = 0;
let isDraggingProgress = false;
let lastSavedSecond = -1;
let wasPlayingBeforeDrag = false;

// 歌词状态
let currentSyltData = [];
let lyricsEnabled = true;
let isUserScrolling = false;
let userScrollTimeout = null;
let currentScrollAnimation = null;

// 屏幕常亮
let wakeLock = null;

async function updateWakeLock() {
    // 条件：正在播放 && 开启了字幕 && 当前章节有字幕数据 && 页面在最前台
    const shouldWakeLock = isPlaying && lyricsEnabled && currentSyltData && currentSyltData.length > 0 && document.visibilityState === 'visible';

    if (shouldWakeLock) {
        if (!wakeLock && 'wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => {
                    wakeLock = null;
                });
            } catch (err) {
                console.warn(`WakeLock request error:`, err);
            }
        }
    } else {
        if (wakeLock) {
            wakeLock.release()
                .then(() => { wakeLock = null; })
                .catch(err => console.warn(`WakeLock release error:`, err));
        }
    }
}

// 页面可见性改变时，重新评估常亮状态
document.addEventListener('visibilitychange', () => {
    updateWakeLock();
});

// 自定义平滑滚动
function smoothScrollTo(element, target, duration) {
    if (currentScrollAnimation) cancelAnimationFrame(currentScrollAnimation);
    
    const start = element.scrollTop;
    const change = target - start;
    let startTime = null;

    function animateScroll(currentTime) {
        if (!startTime) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        // Easing: easeOutCubic (starts fast, smoothly decelerates)
        const ease = 1 - Math.pow(1 - progress, 3);
        
        element.scrollTop = start + change * ease;
        
        if (timeElapsed < duration) {
            currentScrollAnimation = requestAnimationFrame(animateScroll);
        } else {
            currentScrollAnimation = null;
        }
    }
    currentScrollAnimation = requestAnimationFrame(animateScroll);
}

// 统一数据存储管理
const STORAGE_KEY = 'stories';

function loadStoriesData(key) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : {};
        return data[key];
    } catch(e) {
        return undefined;
    }
}

function saveStoriesData(key, value) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : {};
        data[key] = value;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e) {}
}


// 初始化
function init() {
    buildPlaylist();
    loadSavedState();
    loadChapterProgress();
    loadPlayHistory();
    loadPlayHistory();
    loadChapterByIndex(currentIndex, false);
    setupEventListeners();
}

// 恢复保存的进度
function loadSavedState() {
    const state = loadStoriesData('state');
    if (state) {
        try {
            currentPlayId = state.playId;
            const foundIdx = flatPlaylist.findIndex(p => p.playId === currentPlayId);
            if (foundIdx !== -1) {
                currentIndex = foundIdx;
            } else {
                currentIndex = 0;
            }
            // 稍后加载音频后跳转时间
            audio.dataset.savedTime = state.currentTime || 0;
            audio.playbackRate = state.speed || 1.0;
            updateSpeedUI(audio.playbackRate);
            
            if (state.lyricsEnabled !== undefined) {
                lyricsEnabled = state.lyricsEnabled;
                subtitleToggle.checked = lyricsEnabled;
            }
        } catch (e) {
            console.error('进度读取失败', e);
        }
    }
}

// 保存进度
function saveState() {
    if (!flatPlaylist[currentIndex]) return;
    const state = {
        playId: flatPlaylist[currentIndex].playId,
        currentTime: Math.round(audio.currentTime),
        playbackRate: audio.playbackRate,
        speed: audio.playbackRate, // fallback name
        lyricsEnabled: subtitleToggle ? subtitleToggle.checked : false
    };
    saveStoriesData('state', state);
    // 同步保存当前章节的播放进度
    saveChapterProgress();
}

// ============= 章节进度追踪 =============
function getChapterKey() {
    return currentPlayId;
}

function saveChapterProgress() {
    if (!audio.duration || isNaN(audio.duration)) return;
    const key = currentPlayId;
    const ct = Math.round(audio.currentTime);
    const dur = Math.round(audio.duration);
    const progress = dur > 0 ? ct / dur : 0;
    chapterProgressMap[key] = {
        currentTime: ct,
        duration: dur,
        progress: Math.round(progress * 1000) / 1000
    };
    saveStoriesData('chapter_progress', chapterProgressMap);
}

function loadChapterProgress() {
    try {
        const saved = loadStoriesData('chapter_progress');
        if (saved) chapterProgressMap = saved;
    } catch (e) {
        console.error('章节进度读取失败', e);
        chapterProgressMap = {};
    }
}

// ============= 播放历史记录 =============
function loadPlayHistory() {
    try {
        const saved = loadStoriesData('play_history');
        if (saved) playHistory = saved;
    } catch (e) {
        console.error('历史记录读取失败', e);
        playHistory = [];
    }
}

function savePlayHistory() {
    saveStoriesData('play_history', playHistory);
}

function addPlayHistory(item) {
    if (!item) return;
    const key = item.playId;
    const progressInfo = chapterProgressMap[key];

    // 查找是否已有相同章节的记录
    const existingIdx = playHistory.findIndex(r => r.playId === key);

    if (existingIdx !== -1) {
        // 已存在：更新进度，移到顶部
        const existing = playHistory.splice(existingIdx, 1)[0];
        existing.currentTime = progressInfo ? progressInfo.currentTime : existing.currentTime;
        existing.duration = progressInfo ? progressInfo.duration : existing.duration;
        existing.progress = progressInfo ? progressInfo.progress : existing.progress;
        existing.timestamp = Date.now();
        playHistory.unshift(existing);
    } else {
        // 新记录
        const record = {
            playId: item.playId,
            seriesTitle: item.seriesTitle,
            bookTitle: item.bookTitle,
            chapterTitle: item.chapterTitle,
            currentTime: progressInfo ? progressInfo.currentTime : 0,
            duration: progressInfo ? progressInfo.duration : 0,
            progress: progressInfo ? progressInfo.progress : 0,
            timestamp: Date.now()
        };
        playHistory.unshift(record);
        if (playHistory.length > MAX_HISTORY) playHistory.pop();
    }
    savePlayHistory();
}

function updateLatestHistory() {
    if (playHistory.length === 0) return;
    const last = playHistory[0];
    if (last.playId === currentPlayId) {
        if (!isNaN(audio.duration) && audio.duration > 0) {
            last.currentTime = Math.round(audio.currentTime);
            last.duration = Math.round(audio.duration);
            last.progress = Math.round((audio.currentTime / audio.duration) * 1000) / 1000;
            savePlayHistory();
            // 如果历史面板正在显示，实时刷新 DOM
            const historyPanel = document.getElementById('historyPanel');
            if (historyPanel && historyPanel.classList.contains('active')) {
                renderHistory();
            }
        }
    }
}

function clearPlayHistory() {
    playHistory = [];
    savePlayHistory();
    renderHistory();
}

function formatTimestamp(ts) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    if (isToday) return `今天 ${timeStr}`;
    if (isYesterday) return `昨天 ${timeStr}`;
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${timeStr}`;
}

function renderHistory() {
    const listContainer = document.getElementById('historyList');
    const footer = document.getElementById('historyFooter');
    listContainer.innerHTML = '';

    if (playHistory.length === 0) {
        listContainer.innerHTML = '<div class="history-empty"><i class="fas fa-history"></i><span>暂无播放记录</span></div>';
        footer.style.display = 'none';
        return;
    }

    footer.style.display = 'block';

    playHistory.forEach((record, index) => {
        const div = document.createElement('div');
        const progressPercent = Math.min(Math.round((record.progress || 0) * 100), 100);
        const isCompleted = progressPercent >= 95;
        div.className = `history-item${isCompleted ? ' completed' : ''}`;

        const currentTimeStr = formatTime(record.currentTime || 0);
        const durationStr = formatTime(record.duration || 0);
        const progressLabel = isCompleted ? '✓ 已听完' : `${currentTimeStr} / ${durationStr}`;

        div.innerHTML = `
            <div class="history-progress-fill" style="width: ${progressPercent}%"></div>
            <div class="history-content">
                <div class="history-book-title">${record.seriesTitle ? record.seriesTitle + ' - ' : ''}${record.bookTitle}</div>
                <div class="history-chapter-title">${record.chapterTitle}</div>
                <div class="history-meta">
                    <span class="history-progress-label">${progressLabel}</span>
                    <span>${formatTimestamp(record.timestamp)}</span>
                </div>
            </div>
        `;

        div.onclick = () => {
            const foundIdx = flatPlaylist.findIndex(p => p.playId === record.playId);
            if (foundIdx !== -1) {
                loadChapterByIndex(foundIdx);
            } else {
                alert('该章节已被移除');
                return;
            }
            // 恢复到记录的播放位置
            audio.addEventListener('loadedmetadata', function seekToHistory() {
                if (!isCompleted && record.currentTime > 0) {
                    audio.currentTime = record.currentTime;
                }
                audio.removeEventListener('loadedmetadata', seekToHistory);
            });
            if (!isPlaying) togglePlay();
            else audio.play();
            saveState();
            closeModal(menuModal);
        };

        listContainer.appendChild(div);
    });
}

function updateSpeedUI(speed) {
    const speedValues = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const index = speedValues.indexOf(speed);
    if (index !== -1 && speedSlider && speedValueDisplay) {
        speedSlider.value = index;
        speedValueDisplay.textContent = speed + 'x';
    }
}


// 重新计算并触发跑马灯效果
function updateMarquee(element) {
    element.classList.remove('scroll');
    element.style.transform = '';
    
    // 给浏览器一帧运算时间，准确获取宽度
    requestAnimationFrame(() => {
        const parentWidth = element.parentElement.clientWidth;
        const scrollWidth = element.scrollWidth;
        if (scrollWidth > parentWidth) {
            const distance = scrollWidth - parentWidth;
            element.style.setProperty('--scroll-dist', `-${distance}px`);
            
            const duration = Math.max(10, distance / 15);
            element.style.animationDuration = `${duration}s`;
            
            element.classList.add('scroll');
        }
    });
}

// 加载章节
function loadChapterByIndex(index, autoplay = true) {
    if (index < 0 || index >= flatPlaylist.length) return;
    currentIndex = index;
    const item = flatPlaylist[currentIndex];
    currentPlayId = item.playId;
    const chapter = { title: item.chapterTitle, audioUrl: item.audioUrl };
    const book = { title: item.bookTitle, coverUrl: item.coverUrl };
    
    if (!chapter) {
        bookTitleEl.textContent = item.bookTitle;
        chapterTitleEl.textContent = "敬请期待";
        updateMarquee(bookTitleEl);
        updateMarquee(chapterTitleEl);
        audio.src = "";
        currentSyltData = [];
        renderLyrics();
        return;
    }

    bookTitleEl.textContent = item.bookTitle;
    chapterTitleEl.textContent = chapter.title;
    
    updateMarquee(bookTitleEl);
    updateMarquee(chapterTitleEl);

    audio.src = item.audioUrl;
    
    // 恢复章节播放进度（未完成的章节从上次记录位置继续）
    const progressInfo = chapterProgressMap[item.playId];
    if (progressInfo) {
        audio.addEventListener('loadedmetadata', function seekToSaved() {
            const progressPercent = Math.min(Math.round((progressInfo.progress || 0) * 100), 100);
            if (progressPercent < 95 && progressInfo.currentTime > 0) {
                audio.currentTime = progressInfo.currentTime;
            }
            audio.removeEventListener('loadedmetadata', seekToSaved);
        });
    }

    // 切换章节时进入加载态，清空时间显示
    currentTimeEl.textContent = '--:--';
    durationEl.textContent = '--:--';
    progressWrapper.classList.add('loading');
    updatePlayBtn();
    updatePlayBtnLoadingState();
    
    audio.load();

    // 更新系统媒体会话信息 (Media Session API)
    updateSystemMediaMetadata();

    // 重置并加载歌词
    currentSyltData = [];
    renderLyrics();
    updateLyricsDisplay();
    
    fetchAndParseSYLT(chapter.audioUrl).then(sylt => {
        currentSyltData = sylt;
        renderLyrics();
        updateLyricsDisplay();
        updateWakeLock();
    });

    // 实时更新图书馆所有视图的高亮状态
    updateLibraryHighlights();

    // 记录播放历史
    addPlayHistory(item);
}

function updateLibraryHighlights() {
    const currentItem = flatPlaylist[currentIndex];
    if (!currentItem) return;

    // 更新书架卡片高亮 (book 和 series)
    document.querySelectorAll('.book-card').forEach(card => {
        const isPlayingThis = (card.dataset.type === 'series' && card.dataset.id === String(currentItem.seriesId)) ||
                              (card.dataset.type === 'book' && card.dataset.id === String(currentItem.bookId));
        
        if (isPlayingThis) {
            if (!card.classList.contains('playing')) {
                card.classList.add('playing');
                const coverWrapper = card.querySelector('.book-cover-wrapper');
                if (coverWrapper && !coverWrapper.querySelector('.book-playing-badge')) {
                    const badge = document.createElement('div');
                    badge.className = 'book-playing-badge';
                    badge.innerHTML = '<i class="fas fa-volume-up"></i>';
                    coverWrapper.appendChild(badge);
                }
            }
        } else {
            card.classList.remove('playing');
            const badge = card.querySelector('.book-playing-badge');
            if (badge) badge.remove();
        }
    });

    // 更新章节列表项高亮与进度
    document.querySelectorAll('.chapter-item').forEach(item => {
        const playId = item.dataset.id;
        const isPlayingThis = (playId === currentItem.playId);
        const progressInfo = chapterProgressMap[playId];

        if (isPlayingThis) {
            item.classList.add('playing');
            item.classList.remove('completed', 'has-progress');
            const idx = item.querySelector('.chapter-index');
            if (idx) idx.textContent = '';

            // 实时更新正在播放项的进度条
            const fill = item.querySelector('.chapter-progress-fill');
            if (fill && !isNaN(audio.duration) && audio.duration > 0) {
                const percent = Math.min(Math.round((audio.currentTime / audio.duration) * 100), 100);
                fill.style.width = `${percent}%`;

                // 更新进度文字
                let progressText = item.querySelector('.chapter-progress-text');
                if (!progressText) {
                    progressText = document.createElement('span');
                    progressText.className = 'chapter-progress-text';
                    item.querySelector('.chapter-text')?.appendChild(progressText);
                }
                progressText.textContent = `${percent}%`;
            }
        } else {
            item.classList.remove('playing');
            const idx = item.querySelector('.chapter-index');
            if (idx && item.dataset.index !== undefined && idx.textContent === '') {
                idx.textContent = parseInt(item.dataset.index) + 1;
            }

            // 非播放项：从 chapterProgressMap 恢复进度显示
            if (progressInfo) {
                const percent = Math.min(Math.round((progressInfo.progress || 0) * 100), 100);
                const isCompleted = percent >= 95;
                const fill = item.querySelector('.chapter-progress-fill');
                if (fill) fill.style.width = `${percent}%`;

                item.classList.toggle('completed', isCompleted);
                item.classList.toggle('has-progress', percent > 0 && !isCompleted);

                let progressText = item.querySelector('.chapter-progress-text');
                if (isCompleted) {
                    if (!progressText) {
                        progressText = document.createElement('span');
                        progressText.className = 'chapter-progress-text';
                        item.querySelector('.chapter-text')?.appendChild(progressText);
                    }
                    progressText.textContent = '✓ 已听完';
                } else if (percent > 0) {
                    if (!progressText) {
                        progressText = document.createElement('span');
                        progressText.className = 'chapter-progress-text';
                        item.querySelector('.chapter-text')?.appendChild(progressText);
                    }
                    progressText.textContent = `${percent}%`;
                }
            }
        }
    });
}



const defaultMediaArtwork = [
    { 
        src: 'https://upload-bbs.miyoushe.com/upload/2026/02/02/284249424/69cdea8060c889a0302415294ca0600b_6320169270240776196.png', 
        sizes: '512x512', 
        type: 'image/png' 
    }
];

function updateSystemMediaMetadata() {
    if ('mediaSession' in navigator) {
        const item = flatPlaylist[currentIndex];
        if (!item) return;
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: item.chapterTitle,
            artist: item.bookTitle,
            album: '睡前故事',
            artwork: defaultMediaArtwork
        });
    }
}

// 二进制解析 ID3v2 查找 SYLT 标签
async function fetchAndParseSYLT(url) {
    try {
        // 第一步：只请求文件的前 10 个字节，用来读取 ID3 标签的头部
        const headResponse = await fetch(url, { headers: { 'Range': 'bytes=0-9' } });
        if (!headResponse.ok && headResponse.status !== 206) {
            // 如果不支持 Range 请求，退回请求前 1MB
            const fallbackResponse = await fetch(url, { headers: { 'Range': 'bytes=0-1048575' } });
            return parseSYLT(await fallbackResponse.arrayBuffer());
        }
        
        const headBuffer = await headResponse.arrayBuffer();
        const headView = new Uint8Array(headBuffer);
        
        // 检查是否包含 "ID3"
        if (headView.length >= 10 && headView[0] === 0x49 && headView[1] === 0x44 && headView[2] === 0x33) {
            // 计算 ID3 标签的总大小 (Synchsafe integer)
            const id3Size = (headView[6] << 21) | (headView[7] << 14) | (headView[8] << 7) | headView[9];
            const totalId3Size = id3Size + 10; // 加上头部本身的 10 字节
            
            // 第二步：精确请求整个 ID3 标签所在的字节范围
            const tagResponse = await fetch(url, { headers: { 'Range': `bytes=0-${totalId3Size - 1}` } });
            const tagBuffer = await tagResponse.arrayBuffer();
            return parseSYLT(tagBuffer);
        } else {
            // 如果开头不是 ID3，返回空
            return [];
        }
    } catch (e) {
        console.error("Failed to fetch audio for ID3 parsing", e);
        return [];
    }
}

function parseSYLT(buffer) {
    const view = new DataView(buffer);
    let offset = 0;
    
    if (buffer.byteLength < 10) return [];
    if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) return []; // 不是 ID3
    
    const version = view.getUint8(3);
    
    // ID3 Size is syncsafe (7 bits per byte)
    const size = (view.getUint8(6) << 21) | (view.getUint8(7) << 14) | (view.getUint8(8) << 7) | view.getUint8(9);
    offset = 10;
    const end = Math.min(offset + size, buffer.byteLength);
    
    while (offset < end) {
        if (offset + 10 > buffer.byteLength) break;
        const frameId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2), view.getUint8(offset+3));
        
        let frameSize;
        if (version === 4) {
            frameSize = (view.getUint8(offset+4) << 21) | (view.getUint8(offset+5) << 14) | (view.getUint8(offset+6) << 7) | view.getUint8(offset+7);
        } else {
            frameSize = view.getUint32(offset + 4);
        }
        
        offset += 10;
        
        if (frameId === "SYLT") {
            return extractSYLTData(buffer, offset, frameSize);
        }
        offset += frameSize;
    }
    return [];
}

function extractSYLTData(buffer, start, size) {
    const view = new DataView(buffer);
    let offset = start;
    
    if (offset + size > buffer.byteLength) return [];
    
    const encoding = view.getUint8(offset++);
    const lang = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2));
    offset += 3;
    const timeFormat = view.getUint8(offset++); // 1 = ms, 2 = frames
    const contentType = view.getUint8(offset++);
    
    // 跳过 Descriptor
    if (encoding === 0 || encoding === 3) {
        while (offset < start + size && view.getUint8(offset) !== 0) offset++;
        offset++;
    } else {
        while (offset < start + size && view.getUint16(offset, true) !== 0) offset += 2;
        offset += 2;
    }
    
    const sylt = [];
    const textDecoder = new TextDecoder(encoding === 3 ? "utf-8" : "utf-16le");
    
    while (offset < start + size) {
        const textStart = offset;
        if (encoding === 0 || encoding === 3) {
            while (offset < start + size && view.getUint8(offset) !== 0) offset++;
            if (offset >= start + size) break;
            const textBuffer = buffer.slice(textStart, offset);
            const text = textDecoder.decode(textBuffer);
            offset++;
            if (offset + 4 > start + size) break;
            const time = view.getUint32(offset);
            offset += 4;
            sylt.push({ text, time });
        } else {
            while (offset < start + size && view.getUint16(offset, true) !== 0) offset += 2;
            if (offset >= start + size) break;
            const textBuffer = buffer.slice(textStart, offset);
            const text = textDecoder.decode(textBuffer);
            offset += 2;
            if (offset + 4 > start + size) break;
            const time = view.getUint32(offset);
            offset += 4;
            sylt.push({ text, time });
        }
    }
    return sylt;
}

// 渲染歌词 UI
function renderLyrics() {
    lyricsContent.innerHTML = '';
    if (currentSyltData.length === 0) {
        lyricsContent.innerHTML = '<p class="lyric-line placeholder">本章节暂无同步字幕</p>';
        return;
    }
    
    currentSyltData.forEach((line, index) => {
        const p = document.createElement('p');
        p.className = 'lyric-line';
        p.textContent = line.text;
        p.dataset.index = index;
        p.dataset.time = line.time;
        
        p.addEventListener('click', () => {
            if (progressWrapper.classList.contains('loading')) return;
            audio.currentTime = line.time / 1000;
            if(!isPlaying) togglePlay();
        });
        
        lyricsContent.appendChild(p);
    });
}

function updateLyricsDisplay() {
    if (lyricsEnabled && currentSyltData.length > 0) {
        playerContainer.classList.add('has-lyrics');
        lyricsContainer.style.display = 'block';
        // Give browser time to apply display block before syncing
        requestAnimationFrame(() => syncLyrics());
    } else {
        playerContainer.classList.remove('has-lyrics');
        // Delay hiding container to allow CSS height transition
        setTimeout(() => {
            if (!playerContainer.classList.contains('has-lyrics')) {
                lyricsContainer.style.display = 'none';
            }
        }, 400); 
    }
}

function syncLyrics(forceScroll = false) {
    if (!lyricsEnabled || currentSyltData.length === 0 || lyricsContainer.style.display === 'none') return;
    
    const currentMs = audio.currentTime * 1000;
    let activeIndex = -1;
    
    for (let i = 0; i < currentSyltData.length; i++) {
        if (currentMs >= currentSyltData[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }
    
    if (activeIndex !== -1) {
        const lines = lyricsContent.querySelectorAll('.lyric-line');
        const prevActive = lyricsContent.querySelector('.lyric-line.active');
        const activeLine = lines[activeIndex];
        
        let changed = false;
        if (prevActive !== activeLine) {
            if (prevActive) prevActive.classList.remove('active');
            if (activeLine) activeLine.classList.add('active');
            changed = true;
        }

        if ((changed || forceScroll) && activeLine && !isUserScrolling) {
            const containerHeight = lyricsContainer.clientHeight;
            const offsetTop = activeLine.offsetTop;
            
            if (activeIndex > 0) {
                const prevLine = lines[activeIndex - 1];
                const targetScroll = prevLine.offsetTop;
                smoothScrollTo(lyricsContainer, targetScroll, 400);
            } else {
                const targetScroll = offsetTop - containerHeight * 0.3;
                smoothScrollTo(lyricsContainer, targetScroll, 400);
            }
        }
    } else {
        const prevActive = lyricsContent.querySelector('.lyric-line.active');
        if (prevActive) {
            prevActive.classList.remove('active');
        }
    }
}


// 事件监听
function setupEventListeners() {
    window.addEventListener('resize', () => {
        updateMarquee(bookTitleEl);
        updateMarquee(chapterTitleEl);
        syncLyrics(true); // 屏幕改变时重新居中歌词
    });
    
    const handleUserInteraction = () => {
        isUserScrolling = true;
        lyricsContainer.classList.add('is-scrolling');
        if (currentScrollAnimation) {
            cancelAnimationFrame(currentScrollAnimation);
            currentScrollAnimation = null;
        }
        clearTimeout(userScrollTimeout);
        userScrollTimeout = setTimeout(() => {
            isUserScrolling = false;
            lyricsContainer.classList.remove('is-scrolling');
            syncLyrics(true); // 3秒后强制回正
        }, 3000);
    };

    lyricsContainer.addEventListener('wheel', handleUserInteraction, {passive: true});
    lyricsContainer.addEventListener('touchstart', handleUserInteraction, {passive: true});
    lyricsContainer.addEventListener('touchmove', handleUserInteraction, {passive: true});

    // 播放/暂停
    playBtn.addEventListener('click', togglePlay);
    
    // 上下曲
    prevBtn.addEventListener('click', playPrev);
    nextBtn.addEventListener('click', playNext);
    
    // 快进快退10秒
    document.getElementById('backward10Btn')?.addEventListener('click', () => { if(audio.duration) audio.currentTime = Math.max(audio.currentTime - 10, 0); });
    document.getElementById('forward10Btn')?.addEventListener('click', () => { if(audio.duration) audio.currentTime = Math.min(audio.currentTime + 10, audio.duration); });

    // 绑定系统级媒体控制键 (锁屏/外部控制)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => { audio.play(); isPlaying = true; updatePlayBtn(); });
        navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); isPlaying = false; updatePlayBtn(); });
        navigator.mediaSession.setActionHandler('previoustrack', playPrev);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
        navigator.mediaSession.setActionHandler('seekbackward', () => { audio.currentTime = Math.max(audio.currentTime - 15, 0); });
        navigator.mediaSession.setActionHandler('seekforward', () => { audio.currentTime = Math.min(audio.currentTime + 15, audio.duration); });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.fastSeek && ('fastSeek' in audio)) {
                audio.fastSeek(details.seekTime);
                return;
            }
            audio.currentTime = details.seekTime;
        });
    }

    // 音频缓冲/加载状态事件
    audio.addEventListener('loadstart', () => {
        progressWrapper.classList.add('loading');
        updatePlayBtnLoadingState();
    });
    audio.addEventListener('waiting', () => {
        progressWrapper.classList.add('loading');
        updatePlayBtnLoadingState();
    });
    audio.addEventListener('canplay', () => {
        progressWrapper.classList.remove('loading');
        updatePlayBtnLoadingState();
    });
    audio.addEventListener('playing', () => {
        progressWrapper.classList.remove('loading');
        updatePlayBtnLoadingState();
    });
    audio.addEventListener('error', () => {
        progressWrapper.classList.remove('loading');
        updatePlayBtnLoadingState();
        currentTimeEl.textContent = '错误';
        durationEl.textContent = '错误';
    });

    // 音频事件
    audio.addEventListener('loadedmetadata', () => {
        progressWrapper.classList.remove('loading');
        updatePlayBtnLoadingState();
        durationEl.textContent = formatTime(audio.duration);
        // 如果有保存的时间，跳过去
        if (audio.dataset.savedTime) {
            audio.currentTime = parseFloat(audio.dataset.savedTime);
            audio.dataset.savedTime = ''; // 清除记录
        }
        
        // 初始化系统媒体进度状态
        if ('mediaSession' in navigator && !isNaN(audio.duration)) {
            navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: audio.playbackRate,
                position: audio.currentTime
            });
        }
    });

    audio.addEventListener('timeupdate', () => {
        if (!isDraggingProgress) {
            if (audio.readyState >= 1) {
                currentTimeEl.textContent = formatTime(audio.currentTime);
                const progressPercent = (audio.duration) ? (audio.currentTime / audio.duration) * 100 : 0;
                progressBar.style.width = `${progressPercent}%`;
            }
        }
        
        syncLyrics();
        
        // 更新系统媒体进度状态
        if ('mediaSession' in navigator && !isNaN(audio.duration)) {
            navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: audio.playbackRate,
                position: audio.currentTime
            });
        }

        // 节流保存：每1秒保存一次进度
        const sec = Math.floor(audio.currentTime);
        if (sec !== lastSavedSecond) {
            lastSavedSecond = sec;
            saveState();
            updateLatestHistory();
            updateLibraryHighlights();
        }
    });

    audio.addEventListener('ended', () => {
        // 播放结束时标记章节为已完成
        const key = currentPlayId;
        if (!isNaN(audio.duration) && audio.duration > 0) {
            chapterProgressMap[key] = {
                currentTime: audio.duration,
                duration: audio.duration,
                progress: 1.0
            };
            saveStoriesData('chapter_progress', chapterProgressMap);
        }
        updateLatestHistory();
        playNext();
    });

    // 进度条拖拽与点击解析
    let updateProgressUI = (x) => {
        const width = progressWrapper.clientWidth;
        let percent = x / width;
        if(percent < 0) percent = 0;
        if(percent > 1) percent = 1;
        progressBar.style.width = `${percent * 100}%`;
        return percent;
    };

    let startDrag = (e) => {
        if(isNaN(audio.duration)) return;
        isDraggingProgress = true;
        wasPlayingBeforeDrag = isPlaying;
        if (isPlaying) audio.pause();
        progressWrapper.classList.add('dragging');
        
        const rect = progressWrapper.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        updateProgressUI(clientX - rect.left);
        currentTimeEl.textContent = formatTime(updateProgressUI(clientX - rect.left) * audio.duration);
    };

    let onDrag = (e) => {
        if (!isDraggingProgress) return;
        const rect = progressWrapper.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        let p = updateProgressUI(clientX - rect.left);
        currentTimeEl.textContent = formatTime(p * audio.duration);
    };

    let stopDrag = (e) => {
        if (!isDraggingProgress) return;
        isDraggingProgress = false;
        progressWrapper.classList.remove('dragging');
        
        const rect = progressWrapper.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
        let percent = updateProgressUI(clientX - rect.left);
        
        audio.currentTime = percent * audio.duration;
        if (wasPlayingBeforeDrag) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => console.warn('Play interrupted:', e));
            }
        }
        syncLyrics();
    };

    // 进度条拖拽与点击事件绑定
    progressWrapper.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    progressWrapper.addEventListener('touchstart', startDrag, {passive: true});
    document.addEventListener('touchmove', onDrag, {passive: true});
    document.addEventListener('touchend', stopDrag);

    // 模态框开关
    menuBtn.addEventListener('click', () => {
        renderRootGrid();
        renderHistory();
        showShelfView(currentViewLevel);
        openModal(menuModal);
    });
    timerBtn.addEventListener('click', () => openModal(timerModal));
    settingsBtn.addEventListener('click', () => openModal(settingsModal));

    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal-overlay'));
        });
    });

    // 点击外部关闭模态框
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    // Tab 切换逻辑
    document.querySelectorAll('.drawer-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.drawer-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.dataset.tab === 'shelf' ? 'shelfPanel' : 'historyPanel';
            document.getElementById(targetId).classList.add('active');
            // 切换到书架 Tab 时重置到封面视图
            if (tab.dataset.tab === "shelf") {
                showShelfView(currentViewLevel);
            } else {
                // 切换到历史 Tab 时隐藏返回按钮
                document.getElementById('shelfBackBtn').classList.remove('visible');
            }
        });
    });

    // 返回按钮
    

    // 清空历史
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
        clearPlayHistory();
    });

    // ============= 高级设置面板控制 =============
    
    // 倍速设置
    const speedValues = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    speedSlider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        const speed = speedValues[val];
        speedValueDisplay.textContent = speed + 'x';
        audio.playbackRate = speed;
    });
    speedSlider?.addEventListener('change', () => saveState());


    // 字幕开关
    subtitleToggle?.addEventListener('change', (e) => {
        lyricsEnabled = e.target.checked;
        saveState();
        updateLyricsDisplay();
        updateWakeLock();
    });

    // ============= 定时器设置 =============
    document.querySelector('#timerModal li[data-time="0"]').addEventListener('click', (e) => {
        setTimer(0);
    });

    const timeValues = [15, 30, 45, 60, 90, 120];
    const timeSlider = document.getElementById('timeSlider');
    const timeValueDisplay = document.getElementById('timeValueDisplay');
    const timeOptionLi = document.getElementById('timeOptionLi');

    timeOptionLi?.addEventListener('click', () => {
        const val = parseInt(timeSlider.value);
        const minutes = timeValues[val];
        setTimer(minutes);
    });

    timeSlider?.addEventListener('input', (e) => {
        const val = parseInt(timeSlider.value);
        const minutes = timeValues[val];
        timeValueDisplay.textContent = minutes + '分钟';
        setTimer(minutes);
    });

    const episodeSlider = document.getElementById('episodeSlider');
    const episodeValueDisplay = document.getElementById('episodeValueDisplay');
    const episodeOptionLi = document.getElementById('episodeOptionLi');

    episodeOptionLi?.addEventListener('click', () => {
        const episodes = parseInt(episodeSlider.value);
        setEpisodeTimer(episodes);
    });

    episodeSlider?.addEventListener('input', (e) => {
        const episodes = parseInt(episodeSlider.value);
        episodeValueDisplay.textContent = episodes + '集';
        setEpisodeTimer(episodes);
    });
}

// ============= 定时器核心函数=============
function updateTimerUI(type) {
    document.querySelectorAll('#timerModal .options-list li').forEach(l => l.classList.remove('active'));
    document.getElementById('timeSliderWrapper').classList.remove('active');
    document.getElementById('episodeSliderWrapper').classList.remove('active');
    
    document.getElementById('timeCountdownDisplay').style.display = 'none';
    document.getElementById('episodeCountdownDisplay').style.display = 'none';
    
    if (type === 0) {
        document.querySelector('#timerModal li[data-time="0"]').classList.add('active');
    } else if (type === 'time') {
        document.getElementById('timeSliderWrapper').classList.add('active');
        document.getElementById('timeCountdownDisplay').style.display = 'block';
    } else if (type === 'episode') {
        document.getElementById('episodeOptionLi').classList.add('active');
        document.getElementById('episodeSliderWrapper').classList.add('active');
        document.getElementById('episodeCountdownDisplay').style.display = 'block';
    }
}

function setEpisodeTimer(episodes) {
    if (sleepTimer) {
        clearInterval(sleepTimer);
        sleepTimer = null;
    }
    episodesMode = true;
    targetEpisodes = episodes;
    episodesPlayed = 0;
    
    updateTimerUI('episode');
    document.getElementById('episodeRemaining').textContent = `${targetEpisodes}`;
    timerBtn.style.color = '#4ade80';
}

function setTimer(minutes) {
    episodesMode = false;
    if (sleepTimer) {
        clearInterval(sleepTimer);
        sleepTimer = null;
    }
    
    if (minutes === 0) {
        timerBtn.style.color = '#fff';
        updateTimerUI(0);
        return;
    }

    timerBtn.style.color = '#4ade80';
    timerSeconds = minutes * 60;
    sleepTimerEndTime = Date.now() + timerSeconds * 1000;
    
    updateTimerUI('time');
    updateTimerDisplay();

    sleepTimer = setInterval(() => {
        timerSeconds = Math.max(0, Math.ceil((sleepTimerEndTime - Date.now()) / 1000));
        updateTimerDisplay();
        
        if (timerSeconds <= 0) {
            clearInterval(sleepTimer);
            if (isPlaying) {
                togglePlay();
            }
            timerBtn.style.color = '#fff';
            updateTimerUI(0);
        }
    }, 1000);
}

function updateTimerDisplay() {
    if (episodesMode) return;
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    document.getElementById('timeRemaining').textContent = 
        `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}


function togglePlay() {
    if (isPlaying) {
        audio.pause();
    } else {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => console.warn('Play interrupted:', e));
        }
    }
    isPlaying = !isPlaying;
    updatePlayBtn();
    updatePlayBtnLoadingState();
    updateWakeLock();
}

function updatePlayBtn() {
    const icon = playBtn.querySelector('i');
    if (isPlaying) {
        icon.className = 'fas fa-pause';
        playerContainer.classList.add('isPlaying');
    } else {
        icon.className = 'fas fa-play';
        playerContainer.classList.remove('isPlaying');
    }
}

function updatePlayBtnLoadingState() {
    const isLoading = progressWrapper.classList.contains('loading');
    if (isLoading) {
        playBtn.classList.add('loading');
    } else {
        playBtn.classList.remove('loading');
    }
}

function playNext() {
    if (episodesMode) {
        episodesPlayed++;
        if (episodesPlayed >= targetEpisodes) {
            if (isPlaying) togglePlay();
            episodesMode = false;
            document.getElementById('timerBtn').style.color = '#fff';
            updateTimerUI(0);
            return;
        } else {
            document.getElementById('episodeRemaining').textContent = (targetEpisodes - episodesPlayed);
        }
    }

    if (currentIndex < flatPlaylist.length - 1) {
        currentIndex++;
        loadChapterByIndex(currentIndex);
        if(isPlaying) {
            const playPromise = audio.play();
            if (playPromise !== undefined) playPromise.catch(e => console.warn('Play interrupted:', e));
        }
        saveState();
    }
}

function playPrev() {
    if (audio.currentTime > 5) {
        audio.currentTime = 0;
        return;
    }
    if (currentIndex > 0) {
        currentIndex--;
        loadChapterByIndex(currentIndex);
        if(isPlaying) {
            const playPromise = audio.play();
            if (playPromise !== undefined) playPromise.catch(e => console.warn('Play interrupted:', e));
        }
        saveState();
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Modal logic
function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    if (modal) {
        modal.classList.remove('active');
    }
}


// ============= 书架多级视图切换 =============
let currentViewLevel = 1; // 1: series, 2: books, 3: chapters
let selectedSeriesId = null;
let selectedBookId = null;

function showShelfView(level) {
    currentViewLevel = level;
    const seriesView = document.getElementById('seriesGridView');
    const bookView = document.getElementById('bookGridView');
    const chapterView = document.getElementById('chapterListView');
    const backBtn = document.getElementById('shelfBackBtn');

    seriesView.style.display = 'none';
    bookView.style.display = 'none';
    chapterView.style.display = 'none';

    if (level === 1) {
        seriesView.style.display = 'flex';
        backBtn.classList.remove('visible');
    } else if (level === 2) {
        bookView.style.display = 'flex';
        backBtn.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => backBtn.classList.add('visible')));
    } else if (level === 3) {
        chapterView.style.display = 'flex';
        backBtn.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => backBtn.classList.add('visible')));
    }
}

document.getElementById('shelfBackBtn')?.addEventListener('click', () => {
    if (currentViewLevel === 3) {
        if (selectedSeriesId) {
            showShelfView(2); // Go back to books in series
        } else {
            showShelfView(1); // Standalone book goes back to root
        }
    } else if (currentViewLevel === 2) {
        showShelfView(1);
    }
});

function renderRootGrid() {
    const gridContainer = document.getElementById('seriesGrid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    if (typeof libraryData === 'undefined') return;

    libraryData.forEach((node) => {
        const card = document.createElement('div');
        card.dataset.id = node.id;
        card.dataset.type = node.type;
        const isPlayingThis = (node.type === 'series' && flatPlaylist[currentIndex]?.seriesId === node.id) || 
                              (node.type === 'book' && flatPlaylist[currentIndex]?.bookId === node.id);
        
        card.className = `book-card${isPlayingThis ? ' playing' : ''}`;
        
        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'book-cover-wrapper';
        
        const img = document.createElement('img');
        img.src = node.coverUrl || 'https://upload-bbs.miyoushe.com/upload/2026/02/02/284249424/69cdea8060c889a0302415294ca0600b_6320169270240776196.png';
        coverWrapper.appendChild(img);

        if (isPlayingThis) {
            const badge = document.createElement('div');
            badge.className = 'book-playing-badge';
            badge.innerHTML = '<i class="fas fa-volume-up"></i>';
            coverWrapper.appendChild(badge);
        }

        card.appendChild(coverWrapper);
        
        const title = document.createElement('div');
        title.className = 'book-card-title';
        title.textContent = node.title;
        card.appendChild(title);
        
        card.onclick = () => {
            if (node.type === 'series') {
                selectedSeriesId = node.id;
                renderSeriesBooks(node);
                showShelfView(2);
            } else {
                selectedSeriesId = null;
                selectedBookId = node.id;
                openBookChapterList(node);
            }
        };
        
        gridContainer.appendChild(card);
    });
}

function renderSeriesBooks(seriesNode) {
    const gridContainer = document.getElementById('bookGrid');
    gridContainer.innerHTML = '';
    
    seriesNode.books.forEach(book => {
        const card = document.createElement('div');
        card.dataset.id = book.id;
        card.dataset.type = 'book';
        const isPlayingBook = flatPlaylist[currentIndex]?.bookId === book.id;
        card.className = `book-card${isPlayingBook ? ' playing' : ''}`;
        
        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'book-cover-wrapper';
        
        const img = document.createElement('img');
        img.src = book.coverUrl || seriesNode.coverUrl;
        coverWrapper.appendChild(img);

        if (isPlayingBook) {
            const badge = document.createElement('div');
            badge.className = 'book-playing-badge';
            badge.innerHTML = '<i class="fas fa-volume-up"></i>';
            coverWrapper.appendChild(badge);
        }

        card.appendChild(coverWrapper);
        
        const title = document.createElement('div');
        title.className = 'book-card-title';
        title.textContent = book.title;
        card.appendChild(title);
        
        card.onclick = () => {
            selectedBookId = book.id;
            openBookChapterList(book, seriesNode);
        };
        gridContainer.appendChild(card);
    });
}

function openBookChapterList(bookNode, seriesNode = null) {
    const header = document.getElementById('chapterListHeader');
    header.innerHTML = `
        <div class="header-cover">
            <img src="${bookNode.coverUrl || (seriesNode ? seriesNode.coverUrl : '')}" alt="${bookNode.title}">
        </div>
        <div class="header-info">
            <div class="header-book-title">${bookNode.title}</div>
            <div class="header-chapter-count">共 ${bookNode.chapters.length} 章</div>
        </div>
    `;
    renderChapterList(bookNode, seriesNode);
    showShelfView(3);
    setTimeout(() => scrollToPlayingChapter(), 150);
}

function renderChapterList(bookNode, seriesNode = null) {
    const listContainer = document.getElementById('bookList');
    listContainer.innerHTML = '';
    
    const chapList = document.createElement('div');
    chapList.className = 'chapter-list';

    bookNode.chapters.forEach((chap, cIndex) => {
        const cDiv = document.createElement('div');
        const playId = (seriesNode ? seriesNode.id : 'none') + ':' + bookNode.id + ':' + chap.id;
        const isPlayingThis = (currentPlayId === playId);
        const progressInfo = chapterProgressMap[playId];
        
        let progressPercent = 0;
        let isCompleted = false;
        let hasProgress = false;

        if (progressInfo) {
            progressPercent = Math.min(Math.round((progressInfo.progress || 0) * 100), 100);
            isCompleted = progressPercent >= 95;
            hasProgress = progressPercent > 0 && !isCompleted;
        }

        let classes = 'chapter-item';
        if (isPlayingThis) classes += ' playing';
        else if (isCompleted) classes += ' completed';
        else if (hasProgress) classes += ' has-progress';
        cDiv.className = classes;
        cDiv.dataset.id = playId;
        cDiv.dataset.index = cIndex;

        const fillDiv = document.createElement('div');
        fillDiv.className = 'chapter-progress-fill';
        if (!isPlayingThis) fillDiv.style.width = `${progressPercent}%`;
        cDiv.appendChild(fillDiv);

        const textDiv = document.createElement('div');
        textDiv.className = 'chapter-text';

        const indexSpan = document.createElement('span');
        indexSpan.className = 'chapter-index';
        indexSpan.textContent = isPlayingThis ? '' : (cIndex + 1);
        textDiv.appendChild(indexSpan);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'chapter-name';
        nameSpan.textContent = chap.title;
        textDiv.appendChild(nameSpan);

        if (isCompleted) {
            const progressSpan = document.createElement('span');
            progressSpan.className = 'chapter-progress-text';
            progressSpan.textContent = '✓ 已听完';
            textDiv.appendChild(progressSpan);
        } else if (hasProgress) {
            const progressSpan = document.createElement('span');
            progressSpan.className = 'chapter-progress-text';
            progressSpan.textContent = `${progressPercent}%`;
            textDiv.appendChild(progressSpan);
        }

        cDiv.appendChild(textDiv);

        cDiv.onclick = () => {
            const targetIdx = flatPlaylist.findIndex(p => p.playId === playId);
            if (targetIdx !== -1) {
                loadChapterByIndex(targetIdx);
                if (!isPlaying) togglePlay();
                else audio.play();
                saveState();
                closeModal(menuModal);
            }
        };
        chapList.appendChild(cDiv);
    });
    
    listContainer.appendChild(chapList);
}

function scrollToPlayingChapter() {
    const playingEl = document.querySelector('#bookList .chapter-item.playing');
    if (playingEl) {
        playingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// 初始化入口
document.addEventListener('DOMContentLoaded', init);

// ============= 均衡器模块 =============
(function() {
    let audioCtx = null;
    let sourceNode = null;
    let bassFilter = null;
    let midFilter = null;
    let trebleFilter = null;
    let analyser = null;
    let eqEnabled = false;
    let eqAnimFrameId = null;

    // EQ 增益值（-12 ~ +12 dB）
    let eqValues = { bass: 0, mid: 0, treble: 0 };

    const EQ_STORAGE_KEY = 'eq_settings';
    const DOT_RADIUS = 8;
    const DOT_HIT_RADIUS = 24; // 触摸友好的点击区域

    function getEQSettings() {
        try {
            const saved = loadStoriesData('eq_settings');
            return saved ? saved : { enabled: true, bass: 2, mid: -1, treble: -3 };
        } catch(e) {}
        return { enabled: true, bass: 2, mid: -1, treble: -3 };
    }

    function saveEQSettings() {
        const settings = { enabled: eqEnabled, ...eqValues };
        saveStoriesData('eq_settings', settings);
    }

    function initAudioContext() {
        if (audioCtx) return;
        
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioCtx.createMediaElementSource(audio);

        // 创建三段滤波器
        bassFilter = audioCtx.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 250;
        bassFilter.gain.value = eqValues.bass;

        midFilter = audioCtx.createBiquadFilter();
        midFilter.type = 'peaking';
        midFilter.frequency.value = 1000;
        midFilter.Q.value = 1;
        midFilter.gain.value = eqValues.mid;

        trebleFilter = audioCtx.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 4000;
        trebleFilter.gain.value = eqValues.treble;

        // 创建分析器节点（用于可视化）
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        // 连接链路
        sourceNode.connect(bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(analyser);
        analyser.connect(audioCtx.destination);

        // Safari 后台恢复
        document.addEventListener('visibilitychange', () => {
            if (audioCtx && document.visibilityState === 'visible') {
                if (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted') {
                    audioCtx.resume().catch(() => {});
                }
            }
        });

        audioCtx.onstatechange = () => {
            if (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted') {
                audioCtx.resume().catch(() => {});
            }
        };
    }

    function applyEQGains() {
        if (!bassFilter) return;
        bassFilter.gain.value = eqValues.bass;
        midFilter.gain.value = eqValues.mid;
        trebleFilter.gain.value = eqValues.treble;
        saveEQSettings();
    }

    // ---- Canvas 交互 ----
    // 计算三个控制点的 Canvas 坐标
    function getControlPoints(W, H) {
        const padTop = 28, padBot = 28;
        const usableH = H - padTop - padBot;
        const centerY = padTop + usableH / 2;
        const keys = ['bass', 'mid', 'treble'];
        const xPositions = [W * 0.18, W * 0.5, W * 0.82];
        return keys.map((k, i) => ({
            key: k,
            x: xPositions[i],
            y: centerY - (eqValues[k] / 12) * (usableH / 2)
        }));
    }

    // dB 值从 Canvas 纵坐标反算
    function yToDb(y, H) {
        const padTop = 28, padBot = 28;
        const usableH = H - padTop - padBot;
        const centerY = padTop + usableH / 2;
        let db = -((y - centerY) / (usableH / 2)) * 12;
        return Math.round(Math.max(-12, Math.min(12, db)));
    }

    // Canvas 绘制
    function drawEQVisualizer() {
        const canvas = document.getElementById('eqCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const hasAnalyser = analyser != null;
        const bufferLength = hasAnalyser ? analyser.frequencyBinCount : 0;
        const dataArray = hasAnalyser ? new Uint8Array(bufferLength) : null;

        function draw() {
            const settingsModal = document.getElementById('settingsModal');
            if (!settingsModal || !settingsModal.classList.contains('active')) {
                eqAnimFrameId = null;
                return;
            }
            
            eqAnimFrameId = requestAnimationFrame(draw);
            if (hasAnalyser) analyser.getByteFrequencyData(dataArray);

            // 适配高清屏
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            const W = rect.width;
            const H = rect.height;

            ctx.clearRect(0, 0, W, H);

            // 绘制中线（0dB 参考线）
            const padTop = 28, padBot = 28;
            const centerY = padTop + (H - padTop - padBot) / 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(W, centerY);
            ctx.stroke();
            ctx.setLineDash([]);

            // 绘制频谱柱状条
            if (hasAnalyser && dataArray) {
                const barCount = Math.min(bufferLength, 64);
                const barWidth = (W / barCount) * 0.7;
                const gap = (W / barCount) * 0.3;

                for (let i = 0; i < barCount; i++) {
                    const val = dataArray[i] / 255;
                    const barH = val * H * 0.8;
                    const x = i * (barWidth + gap) + gap / 2;
                    const y = H / 2 - barH / 2;

                    const ratio = i / barCount;
                    let r, g, b;
                    if (ratio < 0.33) {
                        const t = ratio / 0.33;
                        r = Math.round(255 * (1 - t * 0.6));
                        g = Math.round(220 + t * 35);
                        b = Math.round(50 + t * 180);
                    } else if (ratio < 0.66) {
                        const t = (ratio - 0.33) / 0.33;
                        r = Math.round(100 * (1 - t));
                        g = Math.round(255 * (1 - t * 0.3));
                        b = Math.round(230 + t * 25);
                    } else {
                        const t = (ratio - 0.66) / 0.34;
                        r = Math.round(30 * (1 - t));
                        g = Math.round(180 * (1 - t * 0.4));
                        b = 255;
                    }
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
                    ctx.fillRect(x, y, barWidth, barH);
                }
            }

            // 绘制 EQ 曲线与控制点
            const points = getControlPoints(W, H);

            // 渐变曲线
            const gradient = ctx.createLinearGradient(0, 0, W, 0);
            gradient.addColorStop(0, 'rgba(255, 180, 50, 0.9)');
            gradient.addColorStop(0.5, 'rgba(160, 230, 80, 0.9)');
            gradient.addColorStop(1, 'rgba(60, 160, 255, 0.9)');

            ctx.beginPath();
            ctx.moveTo(0, points[0].y);
            // 用贝塞尔曲线精确穿过控制点
            ctx.bezierCurveTo(points[0].x * 0.4, points[0].y, points[0].x * 0.8, points[0].y, points[0].x, points[0].y);
            ctx.bezierCurveTo(points[0].x + (points[1].x - points[0].x)/2, points[0].y, points[1].x - (points[1].x - points[0].x)/2, points[1].y, points[1].x, points[1].y);
            ctx.bezierCurveTo(points[1].x + (points[2].x - points[1].x)/2, points[1].y, points[2].x - (points[2].x - points[1].x)/2, points[2].y, points[2].x, points[2].y);
            ctx.bezierCurveTo(points[2].x + (W - points[2].x)*0.2, points[2].y, W - (W - points[2].x)*0.2, points[2].y, W, points[2].y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // 竖向虚线参考线（每个控制点位置）
            ctx.setLineDash([3, 5]);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            const labels = ['低', '中', '高'];
            const keys = ['bass', 'mid', 'treble'];
            points.forEach((p, i) => {
                ctx.beginPath();
                ctx.moveTo(p.x, padTop);
                ctx.lineTo(p.x, H - padBot);
                ctx.stroke();
                
                // 绘制"低/中/高"标签
                ctx.font = '12px -apple-system, sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.textAlign = 'center';
                ctx.fillText(labels[i], p.x, H - padBot + 18);

                // 绘制 dB 标签 (虚线上方)
                const val = eqValues[keys[i]];
                const dBLabel = (val > 0 ? '+' : '') + val + 'dB';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillText(dBLabel, p.x, padTop - 8);
            });
            ctx.setLineDash([]);

            // 控制点圆形
            const dotColors = ['rgba(255, 180, 50, 1)', 'rgba(160, 230, 80, 1)', 'rgba(60, 160, 255, 1)'];
            points.forEach((p, i) => {
                // 外圈光晕
                ctx.beginPath();
                ctx.arc(p.x, p.y, DOT_RADIUS + 4, 0, Math.PI * 2);
                ctx.fillStyle = dotColors[i].replace('1)', '0.2)');
                ctx.fill();

                // 实心圆
                ctx.beginPath();
                ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = dotColors[i];
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });
        }
        
        draw();
    }

    function startEQVisualization() {
        if (!eqAnimFrameId && eqEnabled) {
            drawEQVisualizer();
        }
    }

    function stopEQVisualization() {
        if (eqAnimFrameId) {
            cancelAnimationFrame(eqAnimFrameId);
            eqAnimFrameId = null;
        }
    }

    // ---- Canvas 拖拽交互 ----
    function setupCanvasDrag() {
        const canvas = document.getElementById('eqCanvas');
        if (!canvas) return;

        let draggingIndex = -1;

        function getCanvasXY(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        }

        function findNearestDot(pos) {
            const rect = canvas.getBoundingClientRect();
            const points = getControlPoints(rect.width, rect.height);
            for (let i = 0; i < points.length; i++) {
                const dx = pos.x - points[i].x;
                const dy = pos.y - points[i].y;
                if (Math.sqrt(dx * dx + dy * dy) < DOT_HIT_RADIUS) return i;
            }
            return -1;
        }

        function onStart(e) {
            const pos = getCanvasXY(e);
            draggingIndex = findNearestDot(pos);
            if (draggingIndex >= 0) e.preventDefault();
        }

        function onMove(e) {
            if (draggingIndex < 0) return;
            e.preventDefault();
            const pos = getCanvasXY(e);
            const rect = canvas.getBoundingClientRect();
            const keys = ['bass', 'mid', 'treble'];
            eqValues[keys[draggingIndex]] = yToDb(pos.y, rect.height);
            applyEQGains();
        }

        function onEnd() {
            draggingIndex = -1;
        }

        canvas.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        canvas.addEventListener('touchstart', onStart, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
    }

    // 初始化 EQ 事件绑定
    document.addEventListener('DOMContentLoaded', () => {
        const eqToggle = document.getElementById('eqToggle');
        const eqPanel = document.getElementById('eqPanel');

        // 恢复保存的设置
        const saved = getEQSettings();
        eqValues.bass = saved.bass !== undefined ? saved.bass : 2;
        eqValues.mid = saved.mid !== undefined ? saved.mid : -1;
        eqValues.treble = saved.treble !== undefined ? saved.treble : -3;

        if (saved.enabled) {
            eqEnabled = true;
            eqToggle.checked = true;
            eqPanel.style.display = 'block';
        }

        // 设置 Canvas 拖拽
        setupCanvasDrag();

        // EQ 开关
        eqToggle.addEventListener('change', () => {
            eqEnabled = eqToggle.checked;
            eqPanel.style.display = eqEnabled ? 'block' : 'none';
            
            if (eqEnabled) {
                initAudioContext();
                applyEQGains();
                startEQVisualization();
            } else {
                if (bassFilter) {
                    bassFilter.gain.value = 0;
                    midFilter.gain.value = 0;
                    trebleFilter.gain.value = 0;
                }
                stopEQVisualization();
            }
            saveEQSettings();
        });



        // 设置弹窗打开时启动可视化
        const settingsBtnEl = document.getElementById('settingsBtn');
        if (settingsBtnEl) {
            settingsBtnEl.addEventListener('click', () => {
                if (eqEnabled && audioCtx) {
                    if (audioCtx.state === 'suspended') {
                        audioCtx.resume().catch(() => {});
                    }
                    startEQVisualization();
                }
            });
        }

        // 如果之前保存了 enabled 状态，在首次用户交互时初始化
        if (saved.enabled) {
            const initOnInteraction = () => {
                if (!audioCtx) {
                    initAudioContext();
                    applyEQGains();
                    eqEnabled = true;
                }
                document.removeEventListener('click', initOnInteraction);
                document.removeEventListener('touchstart', initOnInteraction);
            };
            document.addEventListener('click', initOnInteraction);
            document.addEventListener('touchstart', initOnInteraction);
        }
    });
})();
