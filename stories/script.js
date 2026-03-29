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
const speedBtn = document.getElementById('speedBtn');

const menuModal = document.getElementById('menuModal');
const timerModal = document.getElementById('timerModal');
const speedModal = document.getElementById('speedModal');
const closeBtns = document.querySelectorAll('.close-btn');

// 状态
let currentBookIndex = 0;
let currentChapterIndex = 0;
let isPlaying = false;
let sleepTimer = null;
let timerSeconds = 0;
let sleepTimerEndTime = 0;
let episodesMode = false;
let targetEpisodes = 0;
let episodesPlayed = 0;
let isDraggingProgress = false;
let wasPlayingBeforeDrag = false;

// 初始化
function init() {
    loadSavedState();
    renderBookList();
    loadChapter(currentBookIndex, currentChapterIndex);
    setupEventListeners();
}

// 恢复保存的进度
function loadSavedState() {
    const saved = localStorage.getItem('audiobook_state');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            currentBookIndex = state.bookIndex || 0;
            currentChapterIndex = state.chapterIndex || 0;
            // 稍后加载音频后跳转时间
            audio.dataset.savedTime = state.currentTime || 0;
            audio.playbackRate = state.speed || 1.0;
            updateSpeedUI(audio.playbackRate);
        } catch (e) {
            console.error('进度读取失败', e);
        }
    }
}

// 保存进度
function saveState() {
    const state = {
        bookIndex: currentBookIndex,
        chapterIndex: currentChapterIndex,
        currentTime: audio.currentTime,
        speed: audio.playbackRate
    };
    localStorage.setItem('audiobook_state', JSON.stringify(state));
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
function loadChapter(bIndex, cIndex) {
    const book = library[bIndex];
    const chapter = book.chapters[cIndex];

    bookTitleEl.textContent = book.title;
    chapterTitleEl.textContent = chapter.title;
    
    updateMarquee(bookTitleEl);
    updateMarquee(chapterTitleEl);

    audio.src = chapter.audioUrl;
    audio.load();

    // 更新系统媒体会话信息 (Media Session API)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: chapter.title,
            artist: book.title,
            album: '旱抽讲故事',
            artwork: [
                { 
                    src: 'https://upload-bbs.miyoushe.com/upload/2026/02/02/284249424/69cdea8060c889a0302415294ca0600b_6320169270240776196.png', 
                    sizes: '512x512', 
                    type: 'image/png' 
                }
            ]
        });
    }

    // 更新列表样式
    renderBookList();
}

// 事件监听
function setupEventListeners() {
    window.addEventListener('resize', () => {
        updateMarquee(bookTitleEl);
        updateMarquee(chapterTitleEl);
    });

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

    // 音频事件
    audio.addEventListener('loadedmetadata', () => {
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
            currentTimeEl.textContent = formatTime(audio.currentTime);
            const progressPercent = (audio.duration) ? (audio.currentTime / audio.duration) * 100 : 0;
            progressBar.style.width = `${progressPercent}%`;
        }
        
        // 更新系统媒体进度状态
        if ('mediaSession' in navigator && !isNaN(audio.duration)) {
            navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: audio.playbackRate,
                position: audio.currentTime
            });
        }

        // 节流保存：每一秒保存一次进度以免太频繁
        if (Math.floor(audio.currentTime) % 2 === 0) {
            saveState();
        }
    });

    audio.addEventListener('ended', playNext);

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
            audio.play();
        }
    };

    progressWrapper.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
    
    progressWrapper.addEventListener('touchstart', startDrag, {passive: true});
    window.addEventListener('touchmove', onDrag, {passive: true});
    window.addEventListener('touchend', stopDrag);

    // 模态框开关
    menuBtn.addEventListener('click', () => openModal(menuModal));
    timerBtn.addEventListener('click', () => openModal(timerModal));
    speedBtn.addEventListener('click', () => openModal(speedModal));
    
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

    // 倍速设置
    const speedValues = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const speedSlider = document.getElementById('speedSlider');
    const speedValueDisplay = document.getElementById('speedValueDisplay');
    
    speedSlider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        const speed = speedValues[val];
        speedValueDisplay.textContent = speed + 'x';
        audio.playbackRate = speed;
        speedBtn.textContent = speed + 'x';
    });

    speedSlider?.addEventListener('change', (e) => {
        saveState();
    });

    // 定时器设置
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
        const val = parseInt(e.target.value);
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
        const episodes = parseInt(e.target.value);
        episodeValueDisplay.textContent = episodes + '集';
        setEpisodeTimer(episodes);
    });
}

function togglePlay() {
    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
    isPlaying = !isPlaying;
    updatePlayBtn();
}

function updatePlayBtn() {
    const icon = playBtn.querySelector('i');
    if (isPlaying) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        playerContainer.classList.add('isPlaying');
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        playerContainer.classList.remove('isPlaying');
    }
}

function playNext() {
    const book = library[currentBookIndex];
    
    // 集数定时判定
    if (episodesMode) {
        episodesPlayed++;
        if (episodesPlayed >= targetEpisodes) {
            if (isPlaying) togglePlay();
            episodesMode = false;
            timerBtn.style.color = '#fff';
            updateTimerUI(0);
            return;
        } else {
            document.getElementById('episodeRemaining').textContent = `${targetEpisodes - episodesPlayed}`;
        }
    }

    if (currentChapterIndex < book.chapters.length - 1) {
        currentChapterIndex++;
    } else if (currentBookIndex < library.length - 1) {
        currentBookIndex++;
        currentChapterIndex = 0;
    } else {
        // 到底了
        return;
    }
    loadChapter(currentBookIndex, currentChapterIndex);
    if(isPlaying) audio.play();
    saveState();
}

function playPrev() {
    if (audio.currentTime > 5) {
        audio.currentTime = 0;
        return;
    }
    
    if (currentChapterIndex > 0) {
        currentChapterIndex--;
    } else if (currentBookIndex > 0) {
        currentBookIndex--;
        currentChapterIndex = library[currentBookIndex].chapters.length - 1;
    }
    loadChapter(currentBookIndex, currentChapterIndex);
    if(isPlaying) audio.play();
    saveState();
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
    if(modal) modal.classList.remove('active');
}

function updateSpeedUI(speed) {
    speedBtn.textContent = speed + 'x';
    const speedValues = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const index = speedValues.indexOf(speed);
    const speedSlider = document.getElementById('speedSlider');
    const speedValueDisplay = document.getElementById('speedValueDisplay');
    if (index !== -1 && speedSlider && speedValueDisplay) {
        speedSlider.value = index;
        speedValueDisplay.textContent = speed + 'x';
    }
}

// 选集渲染
function renderBookList() {
    const bookSelect = document.getElementById('bookSelect');
    const listContainer = document.getElementById('bookList');
    
    // 初始化书籍下拉框 (如果还没初始化)
    if (bookSelect.options.length === 0) {
        library.forEach((book, bIndex) => {
            const option = document.createElement('option');
            option.value = bIndex;
            option.text = book.title;
            bookSelect.appendChild(option);
        });
        
        // 绑定下拉框切换事件
        bookSelect.addEventListener('change', (e) => {
            renderChapterList(parseInt(e.target.value));
        });
    }
    
    // 更新当前选中的书籍并在下方渲染章节
    bookSelect.value = currentBookIndex;
    renderChapterList(currentBookIndex);
}

function renderChapterList(bIndex) {
    const listContainer = document.getElementById('bookList');
    listContainer.innerHTML = '';
    
    const book = library[bIndex];
    if (!book) return;

    const chapList = document.createElement('div');
    chapList.className = 'chapter-list';

    book.chapters.forEach((chap, cIndex) => {
        const cDiv = document.createElement('div');
        const isPlayingThis = (bIndex === currentBookIndex && cIndex === currentChapterIndex);
        cDiv.className = `chapter-item ${isPlayingThis ? 'playing' : ''}`;
        cDiv.innerText = chap.title;
        
        cDiv.onclick = (e) => {
            currentBookIndex = bIndex;
            currentChapterIndex = cIndex;
            loadChapter(currentBookIndex, currentChapterIndex);
            if (!isPlaying) togglePlay();
            else audio.play();
            saveState();
            closeModal(menuModal);
        };
        chapList.appendChild(cDiv);
    });
    
    listContainer.appendChild(chapList);
}

// 定时器逻辑
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

    timerBtn.style.color = '#4ade80'; // 激活颜色
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

// 启动
window.addEventListener('DOMContentLoaded', init);
